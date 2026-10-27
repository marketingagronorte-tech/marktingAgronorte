import {signedRequest} from '../supabase/functions/agronorte-store/protocol.mjs';
import {QUERIES,GUARDED_WRITES,STATE_QUERY} from './storage-queries.mjs';
export class StorageError extends Error{constructor(message,status=503){super(message);this.status=status;}}
export async function storageState(env){return (await env.DB.prepare(STATE_QUERY).first())?.value||'d1';}
export async function storageInfo(env){const state=await storageState(env);return {provider:state==='active'?'Supabase':'Sites D1',migrating:state==='copying'};}
export async function callSupabase(env,operation,args=[]){
 if(!env.AGRONORTE_SUPABASE_BRIDGE_URL||!env.AGRONORTE_SUPABASE_SIGNING_KEY)throw new StorageError('A conexão com o banco ainda não está configurada.');
 const url=new URL(env.AGRONORTE_SUPABASE_BRIDGE_URL);
 if(url.protocol!=='https:'||url.hostname!=='khuislaiuorbrqgjnctf.supabase.co'||url.pathname!=='/functions/v1/agronorte-store')throw new StorageError('Configuração do banco inválida.');
 let response;
 try{const request=await signedRequest(url,JSON.parse(env.AGRONORTE_SUPABASE_SIGNING_KEY),operation,args);response=await fetch(request,{signal:AbortSignal.timeout(45000)});}catch{throw new StorageError('Não foi possível confirmar a operação no Supabase. Atualize a Central antes de tentar novamente.');}
 const body=await response.json();
 if(!response.ok||body.ok!==true)throw new StorageError(response.status===409?'Este pedido já foi processado ou o registro mudou. Atualize antes de tentar novamente.':'Não foi possível confirmar a operação no banco. Atualize a Central antes de tentar novamente.',response.status===409?409:503);
 return body.result;
}
function normalize(result){return {...result,results:(result.results||[]).map(row=>row.payload&&typeof row.payload!=='string'?{...row,payload:JSON.stringify(row.payload)}:row)};}
export function createStorage(env){return {prepare(sql){
 const operation=Object.keys(QUERIES).find(k=>QUERIES[k]===sql);
 if(!operation)throw new StorageError('Operação de banco não reconhecida.');
 let values=[];
 const statement={
  bind(...args){values=args;return statement;},
  async execute(mode){
   const state=await storageState(env);
   if(state==='active')return normalize(await callSupabase(env,operation,values));
   if(mode==='run'){
    if(state==='copying')throw new StorageError('Atualização do banco em andamento. Aguarde e tente novamente.');
    const batch=await env.DB.batch([env.DB.prepare(STATE_QUERY),env.DB.prepare(GUARDED_WRITES[operation]).bind(...values)]);
    const current=batch[0].results[0]?.value;
    if(current==='active')return normalize(await callSupabase(env,operation,values));
    if(current==='copying')throw new StorageError('Atualização do banco em andamento. Aguarde e tente novamente.');
    return batch[1];
   }
   return env.DB.prepare(sql).bind(...values).all();
  },
  async first(){return (await statement.execute('all')).results[0]??null;},
  all(){return statement.execute('all');},
  run(){return statement.execute('run');}
 };
 return statement;
}};}
