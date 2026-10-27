export const SITE_ID='appgprj_6ad2d343a1748191a74fa49384d22c74';
export const OPERATIONS=new Set(['owner_get','member_get','records_admin','records_requester','records_reader','members_list','record_get','owner_init','member_upsert','member_delete','record_delete','record_update','record_insert','health','snapshot_export','snapshot_import','import_finalize']);
export const encode=value=>new TextEncoder().encode(value);
export function toBase64url(bytes){let text='';for(const b of new Uint8Array(bytes))text+=String.fromCharCode(b);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function fromBase64url(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export const signingInput=(time,nonce,body)=>encode(`${time}\n${nonce}\n${body}`);
export async function signedRequest(url,privateJwk,operation,args=[],now=Date.now()){
 if(!OPERATIONS.has(operation))throw Error('Unsupported storage operation');
 const body=JSON.stringify({version:1,site_id:SITE_ID,operation,arguments:args});
 const time=String(Math.floor(now/1000)),nonce=crypto.randomUUID();
 const key=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,signingInput(time,nonce,body));
 return new Request(url,{method:'POST',headers:{'Content-Type':'application/json','x-agronorte-time':time,'x-agronorte-nonce':nonce,'x-agronorte-signature':toBase64url(signature)},body});
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export function normalizeSnapshot(snapshot){
 return {records:[...snapshot.records].map(r=>({...r,payload:typeof r.payload==='string'?JSON.parse(r.payload):r.payload})).sort((a,b)=>a.id.localeCompare(b.id)),
 members:[...snapshot.members].map(m=>({...m,user_id:m.user_id??null})).sort((a,b)=>a.email.localeCompare(b.email)),
 system:[...snapshot.system].sort((a,b)=>a.key.localeCompare(b.key))};
}
export async function snapshotFingerprint(snapshot){const bytes=encode(JSON.stringify(canonical(normalizeSnapshot(snapshot))));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
