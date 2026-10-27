import {SITE_ID,OPERATIONS,encode,fromBase64url,signingInput} from './protocol.mjs';
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export function makeHandler(publicJwk,rpc,now=()=>Date.now()){
 const key=crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 return async req=>{
  if(req.method!=='POST')return response({error:'Method not allowed'},405);
  const time=req.headers.get('x-agronorte-time')||'',nonce=req.headers.get('x-agronorte-nonce')||'',signature=req.headers.get('x-agronorte-signature')||'';
  if(!/^\d{10}$/.test(time)||Math.abs(now()/1000-Number(time))>90||!/^[a-f0-9-]{36}$/i.test(nonce)||!/^[A-Za-z0-9_-]{86}$/.test(signature))return response({error:'Unauthorized'},401);
  if(Number(req.headers.get('content-length')||0)>5_000_000)return response({error:'Request too large'},413);
  try{
   const body=await req.text();if(encode(body).length>5_000_000)return response({error:'Request too large'},413);
   if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},await key,fromBase64url(signature),signingInput(time,nonce,body)))return response({error:'Unauthorized'},401);
   const input=JSON.parse(body);
   if(input.version!==1||input.site_id!==SITE_ID||!OPERATIONS.has(input.operation)||!Array.isArray(input.arguments)||input.arguments.length>8)return response({error:'Invalid storage request'},400);
   const claimed=await rpc('claim_nonce',[nonce]);
   if(claimed?.meta?.changes!==1)return response({error:'Request already used'},409);
   return response({ok:true,result:await rpc(input.operation,input.arguments)});
  }catch(error){return response({error:'Storage operation failed'},error?.code==='23505'?409:503);}
 };
}
