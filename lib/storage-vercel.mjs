import {getVercelOidcToken} from '@vercel/oidc';
import {QUERIES} from './storage-queries.mjs';
export class StorageError extends Error{constructor(message,status=503){super(message);this.status=status;}}
export const BRIDGE_URL='https://khuislaiuorbrqgjnctf.supabase.co/functions/v1/agronorte-vercel-store';
export async function storageInfo(){return {provider:'Supabase',migrating:false};}
export async function callSupabase(env,operation,args=[],transport={token:getVercelOidcToken,fetch}){
 if(env.AGRONORTE_SUPABASE_BRIDGE_URL!==BRIDGE_URL)throw new StorageError('A conexão com o banco ainda não está configurada.');
 let response;
 try{const token=await transport.token();response=await transport.fetch(BRIDGE_URL,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({version:1,operation,arguments:args}),signal:AbortSignal.timeout(45000),cache:'no-store'});}catch{throw new StorageError('Não foi possível confirmar a conexão com o Supabase. Tente novamente.');}
 let body;try{body=await response.json();}catch{throw new StorageError('Resposta inválida do banco. Os registros não foram alterados.');}
 if(!response.ok||body.ok!==true)throw new StorageError(response.status===409?'O registro mudou. Atualize antes de tentar novamente.':'Não foi possível confirmar a operação no banco.',response.status===409?409:503);
 return body.result;
}
function normalize(result){return {...result,results:(result.results||[]).map(row=>row.payload&&typeof row.payload!=='string'?{...row,payload:JSON.stringify(row.payload)}:row)};}
export function createStorage(env){return {prepare(sql){
 const operation=Object.keys(QUERIES).find(k=>QUERIES[k]===sql);
 if(!operation||operation==='owner_init')throw new StorageError('Operação de banco não permitida.');
 let values=[];
 const statement={bind(...args){values=args;return statement;},async execute(){return normalize(await callSupabase(env,operation,values));},async first(){return (await statement.execute()).results[0]??null;},all(){return statement.execute();},run(){return statement.execute();}};
 return statement;
}};}
