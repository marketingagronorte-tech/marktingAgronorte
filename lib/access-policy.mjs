export const ACCESS_ROLES=['solicitante','leitor','colaborador','admin'];
export function accessSubmission(body,user){
 if(!user?.email||!user?.userId)throw Error('Entre e confirme seu e-mail antes de solicitar acesso.');
 const text=(key,min,max)=>{const v=body[key];if(typeof v!=='string'||v.trim().length<min||v.length>max)throw Error('Preencha nome, departamento e motivo dentro dos limites.');return v.trim();};
 return {email:user.email.toLowerCase(),name:text('name',2,180),department:text('department',2,180),reason:text('reason',5,1000)};
}
export function accessDecision(body){
 if(typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))throw Error('E-mail inválido.');
 if(!['approved','rejected'].includes(body.decision)||body.decision==='approved'&&!ACCESS_ROLES.includes(body.role))throw Error('Decisão ou perfil inválido.');
 if(typeof body.updatedAt!=='string'||body.updatedAt.length>80||!Number.isFinite(Date.parse(body.updatedAt)))throw Error('Atualize a lista de solicitações.');
 if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>1000))throw Error('Observação inválida.');
 return {email:body.email.toLowerCase(),decision:body.decision,role:body.decision==='approved'?body.role:null,updatedAt:body.updatedAt,note:body.note?.trim()||''};
}
