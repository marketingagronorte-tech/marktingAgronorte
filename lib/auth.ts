import 'server-only';
import {authClient} from './supabase-server';
import {verifiedIdentity,resolveActor} from './auth-policy.mjs';
import {createStorage} from './storage-vercel.mjs';
export async function getAuthenticatedUser(){const supabase=await authClient();const {data,error}=await supabase.auth.getUser();return error?null:verifiedIdentity(data.user);}
export async function getActor(){
 const user=await getAuthenticatedUser();if(!user)return null;
 const db=createStorage(process.env);const root=await db.prepare("SELECT value FROM marketing_system WHERE key = 'owner'").first();
 const ownerEmail=process.env.AGRONORTE_OWNER_EMAIL;if(!ownerEmail)throw Error('Conta administradora não configurada.');
 const member=user.email===ownerEmail.toLowerCase()?null:await db.prepare('SELECT role FROM marketing_members WHERE email = ?').bind(user.email).first();
 return resolveActor(user,root?.value,member?.role,ownerEmail);
}
export async function canRequestLogin(email:string){
 const owner=process.env.AGRONORTE_OWNER_EMAIL;if(!owner)throw Error('Conta administradora não configurada.');
 if(email===owner.toLowerCase())return true;
 const member=await createStorage(process.env).prepare('SELECT role FROM marketing_members WHERE email = ?').bind(email).first();
 return ['admin','colaborador','solicitante','leitor'].includes(member?.role);
}
