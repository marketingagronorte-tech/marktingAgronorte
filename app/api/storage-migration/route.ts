import {env} from 'cloudflare:workers';
import {callSupabase,createStorage,storageState} from '../../../lib/storage.mjs';
import {QUERIES} from '../../../lib/storage-queries.mjs';
import {SITE_ID,snapshotFingerprint,encode} from '../../../supabase/functions/agronorte-store/protocol.mjs';
export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
function equalSecret(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function POST(req:Request){
 const config=env as any;
 const expected=config.AGRONORTE_STORAGE_MIGRATION_TOKEN;
 const supplied=req.headers.get('x-agronorte-migration-token')||'';
 if(!expected||supplied.length>256||!equalSecret(supplied,expected))return reply({error:'Acesso não autorizado'},403);
 const db=config.DB;
 let lockValue='';
 try{
  const body=await req.json() as any;
  if(!['status','migrate'].includes(body?.action))return reply({error:'Operação inválida'},400);
  const state=await storageState(config);
  if(body.action==='status'||state==='active'){
   const health=await callSupabase(config,'health');
   let serverReadVerified=null;
   if(state==='active'){
    const store=createStorage(config);
    const owner=await store.prepare(QUERIES.owner_get).first();
    const records=await store.prepare(QUERIES.records_admin).all();
    serverReadVerified=!!owner===health.owner_present&&records.results.length===Math.min(2000,health.records);
   }
   return reply({ok:true,state,health,serverReadVerified});
  }
  const now=Date.now();
  const oldLock=await db.prepare("SELECT value FROM marketing_system WHERE key='supabase_migration_lock'").first();
  if(oldLock){const previous=JSON.parse(oldLock.value);if(previous.expiresAt>now)return reply({error:'A transferência já está em andamento'},409);}
  lockValue=JSON.stringify({attempt:crypto.randomUUID(),expiresAt:now+300000});
  const acquire=await db.batch([
   db.prepare("DELETE FROM marketing_system WHERE key='supabase_migration_lock' AND value=?").bind(oldLock?.value||''),
   db.prepare("INSERT OR IGNORE INTO marketing_system(key,value) VALUES('supabase_migration_lock',?)").bind(lockValue),
   db.prepare("INSERT INTO marketing_system(key,value) SELECT 'supabase_state','copying' WHERE EXISTS(SELECT 1 FROM marketing_system WHERE key='supabase_migration_lock' AND value=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(lockValue)
  ]);
  if(acquire[1].meta.changes!==1)return reply({error:'A transferência já está em andamento'},409);
  const source=await db.batch([
   db.prepare('SELECT * FROM marketing_records ORDER BY id'),
   db.prepare('SELECT * FROM marketing_members ORDER BY email'),
   db.prepare("SELECT * FROM marketing_system WHERE key NOT LIKE 'supabase_%' ORDER BY key")
  ]);
  const snapshot={records:source[0].results,members:source[1].results,system:source[2].results};
  if(encode(JSON.stringify(snapshot)).length>4_500_000)throw Error('O acervo exige transferência em lotes; o banco atual foi mantido.');
  const fingerprint=await snapshotFingerprint(snapshot);
  const imported=await callSupabase(config,'snapshot_import',[{...snapshot,schema_version:'agronorte-v1',source_site_id:SITE_ID,fingerprint}]);
  const copy=await callSupabase(config,'snapshot_export');
  if(await snapshotFingerprint(copy)!==fingerprint)throw Error('A conferência da cópia não passou; o banco atual foi mantido.');
  await callSupabase(config,'import_finalize',[fingerprint]);
  const activated=await db.batch([
   db.prepare("UPDATE marketing_system SET value='active' WHERE key='supabase_state' AND EXISTS(SELECT 1 FROM marketing_system WHERE key='supabase_migration_lock' AND value=?)").bind(lockValue),
   db.prepare("DELETE FROM marketing_system WHERE key='supabase_migration_lock' AND value=?").bind(lockValue)
  ]);
  if(activated[0].meta.changes!==1)throw Error('A transferência perdeu sua reserva; verifique o estado antes de tentar novamente.');
  lockValue='';
  return reply({ok:true,state:'active',verified:true,counts:{records:imported.record_count,members:imported.member_count,system:imported.system_count},fingerprint,health:await callSupabase(config,'health')});
 }catch(e){
  if(lockValue)await db.batch([
   db.prepare("UPDATE marketing_system SET value='d1' WHERE key='supabase_state' AND value='copying' AND EXISTS(SELECT 1 FROM marketing_system WHERE key='supabase_migration_lock' AND value=?)").bind(lockValue),
   db.prepare("DELETE FROM marketing_system WHERE key='supabase_migration_lock' AND value=?").bind(lockValue)
  ]);
  return reply({error:e instanceof Error?e.message:'Não foi possível conectar o banco'},503);
 }
}
