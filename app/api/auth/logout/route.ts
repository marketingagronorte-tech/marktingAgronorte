import {authClient} from '../../../../lib/supabase-server';
import {validOrigin} from '../../../../lib/auth-policy.mjs';
export async function POST(req:Request){
 if(!validOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});
 const client=await authClient();const {error}=await client.auth.signOut({scope:'local'});
 if(error)return Response.json({error:'Não foi possível sair.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
 return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
}
