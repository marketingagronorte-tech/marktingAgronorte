import {callSupabase} from '../../../lib/storage-vercel.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 try{const health=await callSupabase(process.env,'health');if(!health?.owner_present)throw Error('Not initialized');return Response.json({ok:true,storage:'Supabase'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}});}
}
