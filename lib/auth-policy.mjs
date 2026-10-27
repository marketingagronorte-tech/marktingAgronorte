export function verifiedIdentity(user){
 if(!user?.id||!user.email||!user.email_confirmed_at||user.is_anonymous)return null;
 const email=user.email.toLowerCase();
 return {userId:user.id,email,displayName:email.split('@')[0],fullName:null};
}
export function resolveActor(user,ownerId,memberRole,ownerEmail){
 if(!user)return null;
 if(!ownerId)return {...user,role:'denied'};
 if(user.email===ownerEmail.toLowerCase())return {...user,userId:ownerId,displayName:'Maiely Guimarães',role:'admin'};
 return {...user,role:['admin','colaborador','solicitante','leitor'].includes(memberRole)?memberRole:'denied'};
}
export function validOrigin(req){return req.headers.get('origin')===new URL(req.url).origin;}
export function loginDeliveryFailure(error){
 if(error?.code==='over_email_send_rate_limit')return {status:429,error:'O serviço de e-mail atingiu o limite temporário de envios. Use apenas o link mais recente que recebeu. Se já entrou, abra a Central; caso contrário, tente novamente mais tarde.'};
 if(error?.code==='over_request_rate_limit'||error?.status===429)return {status:429,error:'Há muitas solicitações de acesso em pouco tempo. Aguarde antes de solicitar outro link e use apenas a mensagem mais recente.'};
 return {status:503,error:'Não foi possível enviar o link de acesso neste momento. Tente novamente mais tarde.'};
}
