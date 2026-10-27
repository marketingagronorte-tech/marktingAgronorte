import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {verifiedIdentity} from './lib/auth-policy.mjs';
export async function proxy(req:NextRequest){
 let response=NextResponse.next({request:req});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.redirect(new URL('/entrar?erro=configuracao',req.url));
 const supabase=createServerClient(url,key,{cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll(){return req.cookies.getAll();},setAll(values){for(const {name,value} of values)req.cookies.set(name,value);response=NextResponse.next({request:req});for(const {name,value,options} of values)response.cookies.set(name,value,options);}}});
 const {data,error}=await supabase.auth.getUser();
 if(error||!verifiedIdentity(data.user))return NextResponse.redirect(new URL('/entrar',req.url));
 response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/']};
