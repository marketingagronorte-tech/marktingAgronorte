import {makeHandler} from './handler.mjs';
import {PUBLIC_KEY} from './public-key.ts';
// Supabase provides these only inside the hosted Edge Function.
const url=Deno.env.get('SUPABASE_URL');
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const serviceKey=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!serviceKey)throw Error('Supabase backend configuration missing');
async function rpc(operation:string,args:unknown[]){
 const result=await fetch(url+'/rest/v1/rpc/agronorte_store',{method:'POST',headers:{apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_operation:operation,p_args:args})});
 const body=await result.json();
 if(!result.ok){const error=new Error('Database operation failed');Object.assign(error,{code:body.code});throw error;}
 return body;
}
Deno.serve(makeHandler(PUBLIC_KEY,rpc));
