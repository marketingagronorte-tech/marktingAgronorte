export const TRUST={issuer:'https://oidc.vercel.com/markting2',audience:'https://vercel.com/markting2',subject:'owner:markting2:project:agronorte-marketing:environment:production',ownerId:'team_Uy3yIU2Saiik92azub5JP7Nt',projectId:'prj_750MA2Tf3laimTA4CkROEniUWTJt'};
export const ALLOWED_OPERATIONS=new Set(['access_get','access_list','access_submit','access_decide','owner_get','member_get','records_admin','records_requester','records_reader','members_list','record_get','member_upsert','member_delete','record_delete','record_update','record_insert','health']);
export function assertDeploymentClaims(payload){if(payload.owner_id!==TRUST.ownerId||payload.project_id!==TRUST.projectId||payload.environment!=='production')throw Error('Untrusted deployment');}
export async function verifyDeployment(token,jwks,jwtVerify){
 const {payload}=await jwtVerify(token,jwks,{issuer:TRUST.issuer,audience:TRUST.audience,subject:TRUST.subject,algorithms:['RS256'],requiredClaims:['exp','iat','nbf','owner_id','project_id','environment']});
 assertDeploymentClaims(payload);return payload;
}
export function makeVercelHandler(verify,rpc){return async req=>{
 const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const token=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token)return reply({error:'Unauthorized'},401);
 try{await verify(token);}catch{return reply({error:'Unauthorized'},401);}
 if(Number(req.headers.get('content-length')||0)>40000)return reply({error:'Request too large'},413);
 let input;try{const text=await req.text();if(new TextEncoder().encode(text).length>40000)return reply({error:'Request too large'},413);input=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
 if(input?.version!==1||!ALLOWED_OPERATIONS.has(input.operation)||!Array.isArray(input.arguments)||input.arguments.length>8)return reply({error:'Invalid operation'},400);
 try{return reply({ok:true,result:await rpc(input.operation,input.arguments)});}catch(error){return reply({error:'Storage operation failed'},error?.code==='23505'?409:503);}
};}
