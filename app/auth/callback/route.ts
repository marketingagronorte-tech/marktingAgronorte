import {NextResponse} from 'next/server';
import {authClient} from '../../../lib/supabase-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url),code=url.searchParams.get('code');
 if(code&&code.length<=2000){try{const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error){const response=NextResponse.redirect(new URL('/',url.origin));response.headers.set('Cache-Control','private, no-store');return response;}}catch{}}
 return NextResponse.redirect(new URL('/entrar?erro=link',url.origin));
}
