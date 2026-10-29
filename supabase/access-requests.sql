create table if not exists public.agronorte_marketing_access_requests (
 email text primary key check(email=lower(email) and length(email)<=254), name text not null check(length(name) between 2 and 180),
 department text not null check(length(department) between 2 and 180), reason text not null check(length(reason) between 5 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 role text check(role in ('admin','solicitante','leitor','colaborador')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 reviewed_at timestamptz,reviewed_by text,review_note text not null default '' check(length(review_note)<=1000)
);
alter table public.agronorte_marketing_access_requests enable row level security;
revoke all on public.agronorte_marketing_access_requests from public,anon,authenticated;
grant select,insert,update on public.agronorte_marketing_access_requests to service_role;
create policy agronorte_access_backend_only on public.agronorte_marketing_access_requests to service_role using(true) with check(true);
create or replace function public.agronorte_access(p_operation text,p_args jsonb) returns jsonb language plpgsql security invoker set search_path='' as $access$
declare rows jsonb:='[]'::jsonb;changed bigint:=0;r public.agronorte_marketing_access_requests%rowtype;
begin
 case p_operation
 when 'access_get' then
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select email,name,status,created_at,role from public.agronorte_marketing_access_requests where email=p_args->>0)q;
 when 'access_list' then
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select * from public.agronorte_marketing_access_requests order by created_at desc limit 500)q;
 when 'access_submit' then
 if exists(select 1 from public.agronorte_marketing_members where email=p_args->>0) or p_args->>0='marketing@agronorte.coop.py' then raise exception 'Access already granted';end if;
 insert into public.agronorte_marketing_access_requests(email,name,department,reason) values(p_args->>0,p_args->>1,p_args->>2,p_args->>3) on conflict(email) do nothing;
 get diagnostics changed=row_count;
 when 'access_decide' then
 if not exists(select 1 from public.agronorte_marketing_system where key='owner' and value=p_args->>0) and not exists(select 1 from public.agronorte_marketing_members where email=p_args->>6 and role='admin') then raise exception 'Forbidden';end if;
 select * into r from public.agronorte_marketing_access_requests where email=p_args->>1 for update;
 if not found or r.status<>'pending' or r.updated_at<>(p_args->>4)::timestamptz then return jsonb_build_object('results',rows,'meta',jsonb_build_object('changes',0));end if;
 if p_args->>2 not in ('approved','rejected') then raise exception 'Invalid decision';end if;
 if p_args->>2='approved' then
 if p_args->>3 is null or p_args->>3 not in ('admin','solicitante','leitor','colaborador') then raise exception 'Invalid role';end if;
 insert into public.agronorte_marketing_members(email,role) values(r.email,p_args->>3) on conflict(email) do update set role=excluded.role;
 end if;
 update public.agronorte_marketing_access_requests set status=p_args->>2,role=case when p_args->>2='approved' then p_args->>3 else null end,reviewed_at=now(),updated_at=now(),reviewed_by=p_args->>6,review_note=coalesce(p_args->>5,'') where email=r.email;
 get diagnostics changed=row_count;
 else raise exception 'Unsupported access operation';
 end case;
 return jsonb_build_object('results',rows,'meta',jsonb_build_object('changes',changed));
end $access$;
revoke all on function public.agronorte_access(text,jsonb) from public,anon,authenticated;
grant execute on function public.agronorte_access(text,jsonb) to service_role;
DO $patch$
declare definition text;
begin
 select pg_get_functiondef('public.agronorte_store(text,jsonb)'::regprocedure) into definition;
 if position('access_get' in definition)=0 then
 definition:=replace(definition,'case p_operation', 'case p_operation
 when ''access_get'',''access_list'',''access_submit'',''access_decide'' then return public.agronorte_access(p_operation,p_args);');
 execute definition;
 end if;
end $patch$;
