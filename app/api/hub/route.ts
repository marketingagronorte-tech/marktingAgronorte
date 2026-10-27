import { env } from "cloudflare:workers";
import {createStorage,storageInfo,StorageError} from "../../../lib/storage.mjs";
import { getChatGPTUser } from "../../chatgpt-auth";
import { dateValid, safeUrl, STATUSES, PLATFORMS } from "../../../lib/domain.mjs";
export const dynamic = "force-dynamic";
const roles=["admin","solicitante","colaborador","leitor"];
const kinds=["request","event","content","employee","metric","resource","settings"];
function reply(v:any,status=200){return Response.json(v,{status,headers:{"Cache-Control":"private, no-store"}});}
function db(){return createStorage(env as any); }
async function actor(){const u=await getChatGPTUser();if(!u)return null; const root=await db().prepare("SELECT value FROM marketing_system WHERE key = 'owner'").first(); if(!root)return {...u,role:"uninitialized"}; if(root.value===u.userId)return {...u,role:"admin"};
const m=await db().prepare("SELECT role FROM marketing_members WHERE email = ?").bind(u.email.toLowerCase()).first();return {...u,role:m?.role||"denied"};}
export async function GET(){
 try{const u=await actor();if(!u)return reply({error:"Entre com sua conta ChatGPT para acessar.",signIn:"/signin-with-chatgpt?return_to=%2F"},401);
 if(u.role==="uninitialized")return reply({user:u,initialized:false,records:[],members:[],storage:await storageInfo(env)});
 if(u.role==="denied")return reply({error:"Seu acesso à aplicação ainda não foi autorizado pela gestão."},403);
 let rows; if(u.role==="admin"||u.role==="colaborador") rows=await db().prepare("SELECT * FROM marketing_records ORDER BY updated_at DESC LIMIT 2000").all();
 else if(u.role==="solicitante")rows=await db().prepare("SELECT * FROM marketing_records WHERE (kind = 'request' AND owner = ?) OR kind = 'settings' ORDER BY updated_at DESC LIMIT 500").bind(u.userId).all();
 else rows=await db().prepare("SELECT * FROM marketing_records WHERE kind IN ('content','event','resource') ORDER BY updated_at DESC LIMIT 1000").all();
 const members=u.role==="admin"?(await db().prepare("SELECT email, role FROM marketing_members ORDER BY email LIMIT 200").all()).results:[];
 return reply({user:u,initialized:true,records:rows.results.map((r:any)=>({...r,data:JSON.parse(r.payload),payload:undefined})),members,storage:await storageInfo(env)});
 }catch{return reply({error:"Não foi possível carregar a central. Os registros não foram alterados. Tente novamente."},503);}
}
const metricCounts=["followers","reach","views","impressions","likes","comments","shares","saves","visits","clicks","contacts"];
const textFields:Record<string,string[]>={
 request:["title","service","department","description","desiredDate","confirmedDate","status","requester","priority","channels","materials","scope","owner","approval"],
 event:["title","date","type","description","time","endTime","status","owner","url"],
 content:["title","date","platform","pillar","status","description","url","approval","metric"],
 employee:["title","department","monthDay","consentDate","evidence","notes"],
 metric:["title","platform","start","end","collectedAt","source","traffic","notes"],
 resource:["title","category","url","description","permission","evidence"],
 settings:["calendar","drive","holidays",...PLATFORMS]
};
function clean(kind:string,input:any,previous:any=null){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Dados inválidos");
 if(JSON.stringify(input).length>24000)throw Error("Registro muito grande");
 const d:any={};
 for(const k of textFields[kind])if(input[k]!==undefined){
  const limit=["description","notes"].includes(k)?10000:["url","materials","source","evidence","approval","drive","holidays"].includes(k)||PLATFORMS.includes(k)?2000:180;
  if(typeof input[k]!=="string"||input[k].length>limit)throw Error("Texto inválido: "+k);
  d[k]=input[k].trim();
 }
 const required=(...keys:string[])=>{if(keys.some(k=>!d[k]))throw Error("Preencha os campos obrigatórios: "+keys.join(", "));};
 const choice=(key:string,values:string[],fallback?:string)=>{if(d[key]===undefined&&fallback)d[key]=fallback;if(!values.includes(d[key]))throw Error("Valor inválido: "+key);};
 if(kind!=="settings"&&(!d.title||d.title.length<2))throw Error("Informe um título de 2 a 180 caracteres");
 for(const k of ["date","desiredDate","confirmedDate","start","end","collectedAt","consentDate"])if(d[k]&&!dateValid(d[k]))throw Error("Data inválida: "+k);
 if(d.url&&!safeUrl(d.url))throw Error("Use um link HTTPS válido");
 if(kind==="request"){
  required("service","department","description","desiredDate");choice("status",STATUSES,"Recebida");choice("priority",["Normal","Importante","Urgente — a avaliar"],"Normal");choice("scope",["A alinhar","Contratado","Adicional — a alinhar"],"A alinhar");
  if(input.briefingComplete!==undefined&&typeof input.briefingComplete!=="boolean")throw Error("Confirmação do briefing inválida");d.briefingComplete=input.briefingComplete??false;
  d.hours=input.hours===""||input.hours==null?null:input.hours;if(d.hours!==null&&(typeof d.hours!=="number"||!Number.isFinite(d.hours)||d.hours<0))throw Error("Esforço estimado inválido");
  if(["Aprovada","Concluída"].includes(d.status))required("approval");
 }
 if(kind==="event"){
  required("date","type");choice("type",["Reunião","Captação de fotos","Captação de vídeo","Entrega","Evento da cooperativa","Campanha interna","Treinamento"]);choice("status",["Planejado","Confirmado","Concluído","Cancelado"],"Planejado");
  if(d.time||d.endTime){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time||"")||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.endTime||"")||d.endTime<=d.time)throw Error("Informe horário final posterior ao início");}
 }
 if(kind==="content"){
  choice("platform",[...PLATFORMS,"WhatsApp interno","Mural interno","Site"]);choice("pillar",["Institucional","Produtos e oportunidades comerciais","Agronomia e educação","Cooperativismo","Pessoas e cultura","Negócios e comércio internacional","Conscientização","Bastidores"]);choice("status",["Planejada","Em produção","Em aprovação","Aprovada","Publicada","Cancelada"],"Planejada");
  if(["Aprovada","Publicada"].includes(d.status))required("approval");
 }
 if(kind==="employee"){
  if(!/^\d{2}-\d{2}$/.test(d.monthDay||"")||!dateValid("2000-"+d.monthDay))throw Error("Aniversário inválido");
  if(typeof input.consent!=="boolean"||input.imageConsent!==undefined&&typeof input.imageConsent!=="boolean")throw Error("Autorização inválida");
  if(!previous&&!input.consent)throw Error("Registre autorização antes de cadastrar o colaborador");
  d.consent=input.consent;d.imageConsent=input.imageConsent??false;
  if(previous&&!d.consent){d.consentDate=previous.consentDate;d.evidence=previous.evidence;}
  if(!d.consentDate||!dateValid(d.consentDate)||typeof d.evidence!=="string"||!d.evidence.trim())throw Error("Registre autorização, data e referência da autorização");
 }
 if(kind==="metric"){
  choice("platform",PLATFORMS);choice("traffic",["Orgânico","Pago","Total"]);required("start","end","source","collectedAt");if(d.end<d.start)throw Error("Fim do período anterior ao início");
  for(const k of [...metricCounts,"spend"]){const v=input[k];if(v===""||v==null){d[k]=null;continue;}if(typeof v!=="number"||!Number.isFinite(v)||v<0||k!=="spend"&&!Number.isSafeInteger(v))throw Error("Métrica inválida: "+k);d[k]=v;}
 }
 if(kind==="resource"){
  required("url");choice("category",["Fotografia","Vídeo","Arte","Manual de marca","Ficha de produto","Apresentação","Autorização","Outro"]);choice("permission",["Pendente","Autorizado — evidência registrada","Restrito / não reutilizar"]);
  if(d.permission==="Autorizado — evidência registrada")required("evidence");
 }
 if(kind==="settings"){
  if(input.weeklyHours!==undefined){const v=input.weeklyHours;if(v!==""&&(typeof v!=="number"&&typeof v!=="string"||typeof v==="string"&&!/^\d+(\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>80))throw Error("Horas semanais inválidas");d.weeklyHours=v;}
  if(d.holidays&&d.holidays.split(",").some((x:string)=>x.trim()&&!dateValid(x.trim())))throw Error("Feriados devem usar AAAA-MM-DD, separados por vírgula");
  for(const p of [...PLATFORMS,"drive"])if(d[p]&&!safeUrl(d[p]))throw Error("Link inválido de "+p);
  if(input.services!==undefined){
   if(!Array.isArray(input.services)||input.services.length<1||input.services.length>20)throw Error("Cadastre de 1 a 20 serviços");
   d.services=input.services.map((s:any)=>{if(!s||typeof s!=="object"||Array.isArray(s)||typeof s.name!=="string"||!s.name.trim()||s.name.length>180||s.description!==undefined&&(typeof s.description!=="string"||s.description.length>1000)||!Number.isInteger(s.days)||s.days<1||s.days>60||typeof s.hours!=="number"||!Number.isFinite(s.hours)||s.hours<0||s.hours>200)throw Error("Prazos ou esforço inválidos");return {name:s.name.trim(),description:s.description?.trim()||"",days:s.days,hours:s.hours};});
   if(new Set(d.services.map((s:any)=>s.name.toLowerCase())).size!==d.services.length)throw Error("Os nomes dos serviços devem ser únicos");
  }
 }
 return d;
}
export async function POST(req:Request){
 try{const origin=req.headers.get("origin");if(!origin||origin!==new URL(req.url).origin)return reply({error:"Origem inválida"},403);
 const size=Number(req.headers.get("content-length")||0);if(size>40000)return reply({error:"Dados muito grandes"},413);
 const raw=await req.text();if(raw.length>40000)return reply({error:"Dados muito grandes"},413);
 const body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Dados inválidos"},400);const u=await actor();if(!u)return reply({error:"Acesso não autenticado"},401);
 if(body.action==="bootstrap"){if(u.role!=="uninitialized")return reply({error:"Central já ativada"},409);
 await db().prepare("INSERT OR IGNORE INTO marketing_system (key,value) VALUES ('owner',?)").bind(u.userId).run();return reply({ok:true});}
 if(u.role==="uninitialized"||u.role==="denied")return reply({error:"Acesso não autorizado"},403);
 if(body.action==="member"){if(u.role!=="admin")return reply({error:"Somente a gestão pode alterar permissões"},403);
 const email=typeof body.email==="string"?body.email.toLowerCase().trim():"";if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!roles.includes(body.role))return reply({error:"E-mail ou perfil inválido"},400);
 await db().prepare("INSERT INTO marketing_members (email,role) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role").bind(email,body.role).run();return reply({ok:true});}
 if(body.action==="removeMember"){if(u.role!=="admin")return reply({error:"Acesso não autorizado"},403);if(typeof body.email!=="string"||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))return reply({error:"E-mail inválido"},400);await db().prepare("DELETE FROM marketing_members WHERE email = ?").bind(body.email.trim().toLowerCase()).run();return reply({ok:true});}
 if(!kinds.includes(body.kind))return reply({error:"Tipo inválido"},400);
 if(body.action!=="save"&&body.action!=="delete")return reply({error:"Operação inválida"},400);
 if(body.id!==undefined&&(typeof body.id!=="string"||!(body.kind==="settings"?body.id==="settings":/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))))return reply({error:"Identificador inválido"},400);
 if(u.role==="solicitante"&&(body.kind!=="request"||body.id!==undefined||body.action!=="save"))return reply({error:"Você pode enviar novas solicitações; alterações devem ser alinhadas à gestão"},403);
 if(u.role==="leitor")return reply({error:"Perfil de consulta"},403);
 if(body.kind==="settings"&&u.role!=="admin")return reply({error:"Configurações restritas à gestão"},403);
 const lookupId=body.kind==="settings"?"settings":body.id;
 const existing=lookupId?await db().prepare("SELECT * FROM marketing_records WHERE id=?").bind(lookupId).first():null;
 if(body.action==="delete"){if(u.role!=="admin")return reply({error:"Somente gestão pode excluir"},403);if(!existing||existing.kind!==body.kind)return reply({error:"Registro não encontrado"},404);await db().prepare("DELETE FROM marketing_records WHERE id=?").bind(body.id).run();return reply({ok:true});}
 if(existing&&existing.kind!==body.kind)return reply({error:"Registro inválido"},400);
 if(body.id!==undefined&&!existing)return reply({error:"Registro não encontrado; crie um novo registro sem identificador"},404);
 if(existing&&(body.id!==existing.id||typeof body.updatedAt!=="string"||body.updatedAt!==existing.updated_at))return reply({error:"Este registro mudou. Atualize a página antes de salvar."},409);
 if(!body.data||typeof body.data!=="object"||Array.isArray(body.data))return reply({error:"Dados inválidos"},400);
 const input={...body.data};if(u.role==="solicitante"){input.status="Recebida";delete input.confirmedDate;delete input.approval;input.requester=u.email;input.briefingComplete=false;input.scope="A alinhar";input.owner="";input.hours=null;}
 const data=clean(body.kind,input,existing?JSON.parse(existing.payload):null);
 const id=body.kind==="settings"?"settings":existing?.id||crypto.randomUUID();
 const now=new Date().toISOString();
 if(existing){const changed=await db().prepare("UPDATE marketing_records SET payload=?,updated_at=? WHERE id=? AND updated_at=?").bind(JSON.stringify(data),now,id,existing.updated_at).run();if(changed.meta.changes===0)return reply({error:"Atualize a página para obter a versão mais recente"},409);}
 else await db().prepare("INSERT INTO marketing_records (id,kind,payload,owner,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(id,body.kind,JSON.stringify(data),u.userId,now,now).run();
 return reply({ok:true,id});
 }catch(e){return reply({error:e instanceof Error?e.message:"Não foi possível salvar"},e instanceof StorageError?e.status:400);}
}

