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
