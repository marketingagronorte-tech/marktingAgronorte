import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet,jwtVerify} from 'jose';
import {TRUST,verifyDeployment,makeVercelHandler} from '../supabase/functions/agronorte-vercel-store/policy.mjs';
import {verifiedIdentity,resolveActor,validOrigin} from '../lib/auth-policy.mjs';

test('Only confirmed, non-anonymous Supabase identities are accepted',()=>{
 assert.equal(verifiedIdentity({id:'a',email:'x@example.com'}),null);
 assert.equal(verifiedIdentity({id:'a',email:'x@example.com',email_confirmed_at:'2026-10-27',is_anonymous:true}),null);
 const user=verifiedIdentity({id:'a',email:'PERSON@EXAMPLE.COM',email_confirmed_at:'2026-10-27',user_metadata:{role:'admin'}});
 assert.equal(user.email,'person@example.com');assert.equal(user.role,undefined);
});
test('Owner identity preserves existing record ownership without granting others admin',()=>{
 const owner={userId:'new-auth-id',email:'marketing@agronorte.coop.py'};
 assert.equal(resolveActor(owner,'original-owner',null,owner.email).userId,'original-owner');
 assert.equal(resolveActor(owner,'original-owner',null,owner.email).role,'admin');
 assert.equal(resolveActor({...owner,email:'outsider@example.com'},'original-owner','evil',owner.email).role,'denied');
 assert.equal(resolveActor({...owner,email:'member@example.com'},'original-owner','solicitante',owner.email).role,'solicitante');
 assert.equal(resolveActor(owner,null,null,owner.email).role,'denied');
});
test('Mutations require a matching browser Origin',()=>{
 assert.equal(validOrigin(new Request('https://central.example/api/hub',{headers:{origin:'https://evil.example'}})),false);
 assert.equal(validOrigin(new Request('https://central.example/api/hub')),false);
 assert.equal(validOrigin(new Request('https://central.example/api/hub',{headers:{origin:'https://central.example'}})),true);
});
test('Vercel JWT trust pins signature, issuer, audience, team, project and production',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test-only';
 const jwks=createLocalJWKSet({keys:[jwk]});
 const mint=(overrides={})=>new SignJWT({iss:TRUST.issuer,aud:TRUST.audience,sub:TRUST.subject,owner_id:TRUST.ownerId,project_id:TRUST.projectId,environment:'production',...overrides}).setProtectedHeader({alg:'RS256',kid:'test-only'}).setIssuedAt().setNotBefore('0s').setExpirationTime('5m').sign(privateKey);
 assert.equal((await verifyDeployment(await mint(),jwks,jwtVerify)).project_id,TRUST.projectId);
 for(const claims of [{project_id:'prj_other'},{owner_id:'team_other'},{environment:'preview'},{iss:'https://evil.example'},{aud:'other'},{sub:'owner:other:project:other:environment:production'}])await assert.rejects(()=>mint(claims).then(token=>verifyDeployment(token,jwks,jwtVerify)));
 await assert.rejects(()=>verifyDeployment('not-a-jwt',jwks,jwtVerify));
});
test('The public Edge endpoint rejects unauthenticated callers before any RPC',async()=>{
 let calls=0;const handler=makeVercelHandler(async()=>{throw Error('invalid');},async()=>{calls++;});
 assert.equal((await handler(new Request('https://edge.example',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer invalid'}}))).status,401);
 assert.equal(calls,0);
});
test('The Vercel bridge cannot initialize or import/replace the existing database',async()=>{
 const called=[];const handler=makeVercelHandler(async()=>true,async(op,args)=>{called.push([op,args]);return {results:[]};});
 const request=operation=>new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer valid-test-token'},body:JSON.stringify({version:1,operation,arguments:[]})});
 for(const operation of ['owner_init','snapshot_import','snapshot_export','import_finalize','arbitrary_sql'])assert.equal((await handler(request(operation))).status,400);
 assert.equal((await handler(request('health'))).status,200);assert.equal(called.length,1);
});
