import {createRemoteJWKSet,jwtVerify} from 'npm:jose@6.2.13';
import {TRUST,verifyDeployment,makeVercelHandler} from './policy.mjs';
const jwks=createRemoteJWKSet(new URL(`${TRUST.issuer}/.well-known/jwks`));
const url=Deno.env.get('SUPABASE_URL');
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!serviceKey)throw Error('Backend configuration missing');
async function rpc(operation:string,args:unknown[]){
 const result=await fetch(url+'/rest/v1/rpc/agronorte_store',{method:'POST',headers:{apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_operation:operation,p_args:args})});
 const body=await result.json();if(!result.ok){const error=new Error('Database operation failed');Object.assign(error,{code:body.code});throw error;}return body;
}
// Authentication is performed here against the pinned Vercel team/project/environment.
Deno.serve(makeVercelHandler((token:string)=>verifyDeployment(token,jwks,jwtVerify),rpc));
