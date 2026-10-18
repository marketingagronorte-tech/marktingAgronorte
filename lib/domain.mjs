export const SERVICES = [
 {name:"Arte simples",days:3,hours:1.5,description:"Uma peça com texto e materiais completos."},
 {name:"Carrossel",days:5,hours:3,description:"Até 5 telas; texto e objetivo definidos."},
 {name:"Edição de vídeo curto",days:5,hours:4,description:"Até 60 segundos; arquivos recebidos e direitos confirmados."},
 {name:"Captação de fotos",days:5,hours:3,description:"Antecedência para reservar a sessão; deslocamento a alinhar."},
 {name:"Captação de vídeo",days:5,hours:4,description:"Antecedência; roteiro, local e participantes confirmados."},
 {name:"Campanha",days:10,hours:8,description:"Estimativa inicial; volume e canais precisam de briefing."},
 {name:"Cobertura de evento",days:10,hours:6,description:"Antecedência da solicitação; data e duração a confirmar."},
 {name:"Comunicação interna",days:3,hours:1.5,description:"Comunicado simples com informações aprovadas."},
 {name:"Site / formulário",days:10,hours:0,description:"Triagem técnica; execução depende de orçamento e programador."}
];
export const PLATFORMS=["Instagram","Facebook","TikTok","YouTube"];
export const STATUSES=["Recebida","Em triagem","Aguardando materiais","Planejada","Em produção","Em aprovação","Aprovada","Concluída","Cancelada"];
export function addBusinessDays(date,days,holidays=[]){
 const d=new Date(date+"T12:00:00Z"); if(!Number.isFinite(d.getTime())) throw Error("Data inválida");
 for(let n=0;n<days;){d.setUTCDate(d.getUTCDate()+1); const day=d.getUTCDay();if(day!==0&&day!==6&&!holidays.includes(d.toISOString().slice(0,10))) n++;}
 return d.toISOString().slice(0,10);
}
export function dateValid(v){return typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+"T12:00:00Z"))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;}
export function diffPercent(previous,current){if(previous==null||current==null||previous===0)return null;return (current-previous)/previous*100;}
export function safeUrl(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:null;}catch{return null;}}
export function periodDays(start,end){return Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;}
export function compareMetrics(a,b,key){
 if(!a||!b||a.platform!==b.platform||a.traffic!==b.traffic||periodDays(a.start,a.end)!==periodDays(b.start,b.end)||a.end>=b.start)return null;
 const x=a[key],y=b[key]; if(x==null||y==null||x===" "||y===" ")return null;return {difference:Number(y)-Number(x),percent:diffPercent(Number(x),Number(y))};
}
export function calendarUrl(data,calendarId){
 const params=new URLSearchParams({action:"TEMPLATE",text:data.title,details:(data.description||"")+"\nRegistro da Central Agronorte. Confirmar no Google Calendar.",ctz:"America/Asuncion",src:calendarId});
 if(data.date){const end=new Date(data.date+"T12:00:00Z");end.setUTCDate(end.getUTCDate()+1);
 if(data.time&&data.endTime){params.set("dates",data.date.replaceAll("-","")+"T"+data.time.replace(":","")+"00/"+data.date.replaceAll("-","")+"T"+data.endTime.replace(":","")+"00");}
 else params.set("dates",data.date.replaceAll("-","")+"/"+end.toISOString().slice(0,10).replaceAll("-",""));}
 return "https://calendar.google.com/calendar/render?"+params;
}
export function nextBirthday(monthDay,today){
 const year=Number(today.slice(0,4));let date=year+"-"+monthDay;if(date<today)date=(year+1)+"-"+monthDay;
 if(!dateValid(date)&&monthDay==="02-29")date=date.slice(0,4)+"-02-28";return date;
}

