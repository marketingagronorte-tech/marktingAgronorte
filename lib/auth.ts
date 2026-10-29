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
// Confirming an email establishes identity only; getActor still denies all data until approval.
export async function canRequestLogin(email:string){return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
