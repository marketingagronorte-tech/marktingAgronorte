import {authClient} from '../../../../lib/supabase-server';
import {canRequestLogin} from '../../../../lib/auth';
import {validOrigin} from '../../../../lib/auth-policy.mjs';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req:Request){
 if(!validOrigin(req))return reply({error:'Origem inválida.'},403);
 if(Number(req.headers.get('content-length')||0)>2000)return reply({error:'Dados inválidos.'},413);
 try{
  const raw=await req.text();if(raw.length>2000)return reply({error:'Dados inválidos.'},413);
  const data=JSON.parse(raw),email=typeof data?.email==='string'?data.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Informe um e-mail válido.'},400);
  if(await canRequestLogin(email)){
   const client=await authClient();const origin=new URL(req.url).origin;
   const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:origin+'/auth/callback'}});
   if(error)return reply({error:'Não foi possível enviar o link. Aguarde um minuto e tente novamente.'},429);
  }
  return reply({ok:true,message:'Se o e-mail tiver acesso à Central, você receberá um link para entrar.'});
 }catch{return reply({error:'Não foi possível iniciar o acesso. Tente novamente em instantes.'},503);}
}
