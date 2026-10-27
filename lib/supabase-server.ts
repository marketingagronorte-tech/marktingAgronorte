import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function authConfig(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('O acesso à Central ainda está sendo configurado.');
 return {url,key};
}
export async function authClient(){
 const {url,key}=authConfig();const jar=await cookies();
 return createServerClient(url,key,{cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll(){return jar.getAll();},setAll(values){for(const {name,value,options} of values)jar.set(name,value,options);}}});
}
