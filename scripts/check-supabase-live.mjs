import assert from 'node:assert/strict';
import {signedRequest} from '../supabase/functions/agronorte-store/protocol.mjs';
const endpoint='https://khuislaiuorbrqgjnctf.supabase.co/functions/v1/agronorte-store';
export async function verifySupabaseConnection(privateJwk){
 const checks=[];
 const send=async(op,args=[])=>{
  const request=await signedRequest(endpoint,privateJwk,op,args);
  const response=await fetch(request,{signal:AbortSignal.timeout(30000)});
  const body=await response.json();assert.equal(response.status,200,`${op}: HTTP ${response.status}`);assert.equal(body.ok,true);return body.result;
 };
 const denied=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 assert.equal(denied.status,401);checks.push('unsigned_request_denied');
 const initial=await send('health');assert.equal(initial.provider,'Supabase');checks.push('signed_health_read');
 const request=await signedRequest(endpoint,privateJwk,'health');
 assert.equal((await fetch(request.clone())).status,200);
 assert.equal((await fetch(request.clone())).status,409);checks.push('replay_denied');
 const id=crypto.randomUUID(),at=new Date().toISOString(),later=new Date(Date.now()+1).toISOString();
 const data={title:'Verificação técnica temporária',date:'2026-10-27',type:'Reunião',status:'Planejado'};
 try{
  assert.equal((await send('record_insert',[id,'event',JSON.stringify(data),'integration-verification',at,at])).meta.changes,1);checks.push('insert');
  const row=(await send('record_get',[id])).results[0];assert.equal(row.payload.title,data.title);checks.push('read');
  assert.equal((await send('record_update',[JSON.stringify({...data,title:'Verificação técnica atualizada'}),later,id,at])).meta.changes,1);checks.push('update');
  assert.equal((await send('record_update',[JSON.stringify(data),later,id,at])).meta.changes,0);checks.push('stale_update_rejected');
 }finally{await send('record_delete',[id]);}
 assert.equal((await send('record_get',[id])).results.length,0);checks.push('temporary_record_removed');
 const end=await send('health');assert.equal(end.records,initial.records);checks.push('original_record_count_preserved');
 return {passed:checks.length,checks,health:end};
}
