-- Supabase backend for Agronorte. Sites remains responsible for visitor identity.
-- No browser role can access these tables or invoke this service-only RPC.
create table public.agronorte_marketing_records (
 id text primary key, kind text not null check (kind in ('request','event','content','employee','metric','resource','settings')),
 payload jsonb not null check (jsonb_typeof(payload)='object'), owner text not null,
 created_at text not null, updated_at text not null,
 check (kind <> 'settings' or id='settings')
);
create index agronorte_records_kind_updated on public.agronorte_marketing_records(kind,updated_at desc);
create index agronorte_records_owner_kind_updated on public.agronorte_marketing_records(owner,kind,updated_at desc);
create table public.agronorte_marketing_members (
 email text primary key, role text not null check(role in ('admin','colaborador','solicitante','leitor')), user_id text
);
create table public.agronorte_marketing_system (key text primary key, value text not null);
create table public.agronorte_marketing_nonces (id uuid primary key, expires_at timestamptz not null);
create index agronorte_nonces_expiry on public.agronorte_marketing_nonces(expires_at);
create table public.agronorte_marketing_imports (
 id text primary key, source_site_id text not null, fingerprint text not null,
 record_count integer not null, member_count integer not null, system_count integer not null,
 state text not null check(state in ('staged','active')), imported_at timestamptz not null default now()
);
alter table public.agronorte_marketing_records enable row level security;
alter table public.agronorte_marketing_members enable row level security;
alter table public.agronorte_marketing_system enable row level security;
alter table public.agronorte_marketing_nonces enable row level security;
alter table public.agronorte_marketing_imports enable row level security;
revoke all on public.agronorte_marketing_records, public.agronorte_marketing_members, public.agronorte_marketing_system, public.agronorte_marketing_nonces, public.agronorte_marketing_imports from public,anon,authenticated;
grant select,insert,update,delete on public.agronorte_marketing_records, public.agronorte_marketing_members, public.agronorte_marketing_system, public.agronorte_marketing_nonces, public.agronorte_marketing_imports to service_role;
create policy agronorte_backend_only on public.agronorte_marketing_records to service_role using(true) with check(true);
create policy agronorte_backend_only on public.agronorte_marketing_members to service_role using(true) with check(true);
create policy agronorte_backend_only on public.agronorte_marketing_system to service_role using(true) with check(true);
create policy agronorte_backend_only on public.agronorte_marketing_nonces to service_role using(true) with check(true);
create policy agronorte_backend_only on public.agronorte_marketing_imports to service_role using(true) with check(true);

create function public.agronorte_store(p_operation text,p_args jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare rows jsonb := '[]'::jsonb; changed bigint := 0; snapshot jsonb; previous_import public.agronorte_marketing_imports%rowtype;
begin
 if jsonb_typeof(p_args)<>'array' or jsonb_array_length(p_args)>8 then raise exception 'Invalid arguments'; end if;
 case p_operation
 when 'owner_get' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select value from public.agronorte_marketing_system where key='owner') r;
 when 'member_get' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select role from public.agronorte_marketing_members where email=p_args->>0) r;
 when 'records_admin' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select * from public.agronorte_marketing_records order by updated_at desc limit 2000) r;
 when 'records_requester' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select * from public.agronorte_marketing_records where (kind='request' and owner=p_args->>0) or kind='settings' order by updated_at desc limit 500) r;
 when 'records_reader' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select * from public.agronorte_marketing_records where kind in ('content','event','resource') order by updated_at desc limit 1000) r;
 when 'members_list' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select email,role from public.agronorte_marketing_members order by email limit 200) r;
 when 'record_get' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select * from public.agronorte_marketing_records where id=p_args->>0) r;
 when 'owner_init' then
  insert into public.agronorte_marketing_system(key,value) values('owner',p_args->>0) on conflict(key) do nothing;
  get diagnostics changed = row_count;
 when 'member_upsert' then
  insert into public.agronorte_marketing_members(email,role) values(p_args->>0,p_args->>1) on conflict(email) do update set role=excluded.role;
  get diagnostics changed = row_count;
 when 'member_delete' then
  delete from public.agronorte_marketing_members where email=p_args->>0;
  get diagnostics changed = row_count;
 when 'record_delete' then
  delete from public.agronorte_marketing_records where id=p_args->>0;
  get diagnostics changed = row_count;
 when 'record_update' then
  update public.agronorte_marketing_records set payload=(p_args->>0)::jsonb,updated_at=p_args->>1 where id=p_args->>2 and updated_at=p_args->>3;
  get diagnostics changed = row_count;
 when 'record_insert' then
  insert into public.agronorte_marketing_records(id,kind,payload,owner,created_at,updated_at) values(p_args->>0,p_args->>1,(p_args->>2)::jsonb,p_args->>3,p_args->>4,p_args->>5);
  get diagnostics changed = row_count;
 when 'claim_nonce' then
  delete from public.agronorte_marketing_nonces where expires_at<now();
  insert into public.agronorte_marketing_nonces(id,expires_at) values((p_args->>0)::uuid,now()+interval '5 minutes') on conflict do nothing;
  get diagnostics changed = row_count;
 when 'health' then
  return jsonb_build_object('provider','Supabase','records',(select count(*) from public.agronorte_marketing_records),'members',(select count(*) from public.agronorte_marketing_members),'owner_present',exists(select 1 from public.agronorte_marketing_system where key='owner'));
 when 'snapshot_export' then
  return jsonb_build_object('records',coalesce((select jsonb_agg(to_jsonb(r) order by id) from public.agronorte_marketing_records r),'[]'),
   'members',coalesce((select jsonb_agg(to_jsonb(m) order by email) from public.agronorte_marketing_members m),'[]'),
   'system',coalesce((select jsonb_agg(to_jsonb(s) order by key) from public.agronorte_marketing_system s),'[]'));
 when 'snapshot_import' then
  snapshot := p_args->0;
  if snapshot->>'schema_version' is distinct from 'agronorte-v1' or jsonb_typeof(snapshot->'records') is distinct from 'array' or jsonb_typeof(snapshot->'members') is distinct from 'array' or jsonb_typeof(snapshot->'system') is distinct from 'array'
   or coalesce(snapshot->>'source_site_id','')='' or coalesce(snapshot->>'fingerprint','') !~ '^[a-f0-9]{64}$'
   or jsonb_array_length(snapshot->'records')>10000 or jsonb_array_length(snapshot->'members')>1000 then raise exception 'Invalid snapshot'; end if;
  perform pg_catalog.pg_advisory_xact_lock(712604271);
  select * into previous_import from public.agronorte_marketing_imports where id='sites-d1-initial';
  if found then
   if previous_import.fingerprint<>snapshot->>'fingerprint' or previous_import.source_site_id<>snapshot->>'source_site_id' then raise exception 'A different import is already staged; manual reconciliation required'; end if;
   return to_jsonb(previous_import);
  end if;
  if exists(select 1 from public.agronorte_marketing_records) or exists(select 1 from public.agronorte_marketing_members) or exists(select 1 from public.agronorte_marketing_system) then raise exception 'Destination must be empty before initial import'; end if;
  insert into public.agronorte_marketing_records(id,kind,payload,owner,created_at,updated_at)
   select r->>'id',r->>'kind',case when jsonb_typeof(r->'payload')='string' then (r->>'payload')::jsonb else r->'payload' end,r->>'owner',r->>'created_at',r->>'updated_at' from jsonb_array_elements(snapshot->'records') r;
  insert into public.agronorte_marketing_members(email,role,user_id)
   select r->>'email',r->>'role',r->>'user_id' from jsonb_array_elements(snapshot->'members') r;
  insert into public.agronorte_marketing_system(key,value)
   select r->>'key',r->>'value' from jsonb_array_elements(snapshot->'system') r;
  insert into public.agronorte_marketing_imports(id,source_site_id,fingerprint,record_count,member_count,system_count,state)
   values('sites-d1-initial',snapshot->>'source_site_id',snapshot->>'fingerprint',jsonb_array_length(snapshot->'records'),jsonb_array_length(snapshot->'members'),jsonb_array_length(snapshot->'system'),'staged') returning * into previous_import;
  return to_jsonb(previous_import);
 when 'import_finalize' then
  update public.agronorte_marketing_imports set state='active' where id='sites-d1-initial' and fingerprint=p_args->>0;
  get diagnostics changed = row_count;
 else raise exception 'Unsupported operation';
 end case;
 return jsonb_build_object('results',rows,'meta',jsonb_build_object('changes',changed));
end $$;
revoke all on function public.agronorte_store(text,jsonb) from public,anon,authenticated;
grant execute on function public.agronorte_store(text,jsonb) to service_role;
