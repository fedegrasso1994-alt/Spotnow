import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {STAGING,validateConfig,stagingAuthFetch,createStaffSetup,normalizeSvgQr,safeError} from '../tools/staff-mfa/auth.js';
import {localServer} from '../tools/staff-mfa/server.mjs';
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002';
const config={url:STAGING,publicKey:'sb_publishable_synthetic_fixture',accounts:[{id:a,label:'ADMIN'},{id:b,label:'MODERATOR'}]};
function fixture(options={}){
 const state={id:a,verified:false,aal:'aal1',enrollments:0,signouts:[],calls:[],removed:[]};
 const data=value=>({data:value,error:null});
 const client={auth:{
  async signInWithPassword(){state.aal='aal1';return data({});},
  async getUser(){return data({user:{id:state.id,is_anonymous:false,email_confirmed_at:'2026-10-24'}});},
  async signOut(options){state.signouts.push(options);state.aal='aal1';return {error:null};},
  mfa:{
   async listFactors(){const factors=state.factor?[{id:state.factor,factor_type:'totp',status:state.verified?'verified':'unverified'}]:[];return data({all:factors,totp:factors});},
   async getAuthenticatorAssuranceLevel(){return data({currentLevel:state.aal});},
   async enroll(){state.enrollments++;if(state.enrollError)return {error:state.enrollError};state.factor='factor-synthetic';return data({id:state.factor,type:'totp',totp:{qr_code:state.xml||'data:image/svg+xml;utf-8,<svg></svg>'}});},
   async unenroll({factorId}){state.removed.push(factorId);assert.equal(factorId,state.factor);state.factor=null;return data({});},
   async challengeAndVerify(options){state.calls.push(options.factorId);if(options.code!=='123456')return {error:{message:'wrong'}};state.verified=true;state.aal='aal2';return data({});}
  }
 }};return {state,client,setup:createStaffSetup(client,a,options)};
}
test('staff MFA config rejects other project, privileged keys, and missing/duplicated identities',()=>{
 assert.equal(validateConfig(config),config);
 assert.throws(()=>validateConfig({...config,url:'https://other.supabase.co'}),/STAGING_REQUIRED/);
 for(const publicKey of ['sb_secret_fixture','invalid',`x.${btoa(JSON.stringify({role:'service_role',ref:'zjinjtkekmaqtxsuyvho'}))}.x`])assert.throws(()=>validateConfig({...config,publicKey}),/PUBLIC_KEY_REQUIRED/);
 assert.throws(()=>validateConfig({...config,accounts:[config.accounts[0],config.accounts[0]]}),/EXPLICIT_ACCOUNTS_REQUIRED/);
});
test('staff MFA transport permits only staging Auth, never database/functions/storage or another origin',async()=>{
 const calls=[],fetcher=stagingAuthFetch(async url=>{calls.push(url);return 'ok';});
 for(const path of ['/auth/v1/token?grant_type=password','/auth/v1/user','/auth/v1/factors','/auth/v1/factors/1234/verify','/auth/v1/logout?scope=local'])await fetcher(STAGING+path);
 for(const target of [STAGING+'/rest/v1/rpc/moderation_role_set',STAGING+'/functions/v1/photo-assets',STAGING+'/storage/v1/object/a','https://other.supabase.co/auth/v1/user'])assert.throws(()=>fetcher(target),/AUTH_ONLY_STAGING/);
 assert.equal(calls.length,5);
});
test('staff MFA wrong-account login signs out locally and cannot enroll',async()=>{
 const {state,setup}=fixture();state.id=b;
 await assert.rejects(setup.login('synthetic@example.invalid','test-only'),/DEDICATED_CONFIRMED_ACCOUNT_REQUIRED/);
 await assert.rejects(setup.enroll(),/DEDICATED_CONFIRMED_ACCOUNT_REQUIRED/);
 assert.deepEqual(state.signouts,[{scope:'local'}]);assert.equal(state.enrollments,0);
});
test('staff MFA actual SDK QR shape, enrollment retry, wrong code, AAL2 and fresh-login challenge',async()=>{
 const {state,setup}=fixture();assert.equal((await setup.login('synthetic@example.invalid','test-only')).aal,'aal1');
 assert.equal(await setup.enroll(),'<svg></svg>');assert.equal(await setup.enroll(),'<svg></svg>');assert.equal(state.enrollments,1);
 await assert.rejects(setup.verify('000000'),/AUTH_OPERATION_FAILED/);
 assert.equal(state.verified,false);assert.equal((await setup.verify('123456')).aal,'aal2');
 await setup.logout();assert.equal((await setup.login('synthetic@example.invalid','test-only')).aal,'aal1');
 assert.equal((await setup.verify('123456')).aal,'aal2');assert.equal(state.enrollments,1);
 await setup.logout();assert.deepEqual(state.signouts,[{scope:'local'},{scope:'local'}]);
});
test('staff MFA existing unverified factor is preserved, no automatic duplicate or unenrollment',async()=>{
 const {state,setup}=fixture();state.factor='previous-unverified';
 await setup.login('synthetic@example.invalid','test-only');
 await assert.rejects(setup.enroll(),/EXISTING_FACTOR_USE_VERIFY_OR_REVIEW/);
 await assert.rejects(setup.verify('123456'),/ENROLL_FIRST/);assert.equal(state.enrollments,0);
});
test('staff MFA loopback static server rejects foreign Host/Origin, POST and arbitrary file paths; no-store and CSP',async t=>{
 const dir=await mkdtemp(tmpdir()+'/soma-mfa-unit-');t.after(()=>rm(dir,{recursive:true,force:true}));
 await writeFile(dir+'/index.html','synthetic local page');const server=localServer({config,assets:dir});
 const request=(url,headers={},method='GET')=>new Promise(resolve=>{
  const response={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){resolve({status:this.statusCode,headers:this.headers,body});}};
  server.emit('request',{url,method,headers:{host:'127.0.0.1:4197',...headers}},response);
 });
 const good=await request('/');assert.equal(good.status,200);assert.equal(good.headers['Cache-Control'],'no-store');assert.match(good.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
 assert.equal((await request('/',{host:'foreign.test'})).status,403);
 assert.equal((await request('/',{origin:'https://foreign.test'})).status,403);
 assert.equal((await request('/',{},'POST')).status,405);
 assert.equal((await request('/../../.env')).status,404);
 assert.deepEqual(JSON.parse((await request('/config.json')).body),config);
});
test('staff MFA UI contains no storage persistence, secret output, role assignment, CDN or application mount',async()=>{
 const page=await readFile('tools/staff-mfa/page.js','utf8'),html=await readFile('tools/staff-mfa/index.html','utf8');
 assert.match(page,/persistSession:false/);assert.match(page,/detectSessionInUrl:false/);
 assert.doesNotMatch(page,/console\.|localStorage|sessionStorage|moderation_role_set|serviceWorker|\.rpc\(/);
 assert.match(page,/\$\('password'\)\.value=''/);assert.match(page,/\$\('code'\)\.value=''/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);assert.match(html,/nessun ruolo/i);
});

const repair={accountId:a,factorId:b,attemptKey:'admin-unit-test'};
test('staff MFA single-account scope excludes every other account and cannot broaden repair',()=>{
 const scoped={...config,accounts:[config.accounts[1]],scopeAccountId:b};
 assert.equal(validateConfig(scoped),scoped);
 assert.throws(()=>validateConfig({...scoped,scopeAccountId:a}),/EXPLICIT_ACCOUNTS_REQUIRED/);
 assert.throws(()=>validateConfig({...scoped,accounts:config.accounts}),/EXPLICIT_ACCOUNTS_REQUIRED/);
 assert.throws(()=>validateConfig({...scoped,repair}),/ADMIN_REPAIR_ONLY/);
});
test('staff MFA SVG accepts real XML prolog/comment SDK format, keeps image isolated and rejects non-SVG/entity documents',()=>{
 const svg='<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
 assert.equal(normalizeSvgQr('data:image/svg+xml;utf-8,'+svg),svg);
 assert.equal(normalizeSvgQr(svg),svg);
 assert.equal(normalizeSvgQr('\uFEFF'+svg),'\uFEFF'+svg);
 for(const bad of ['<html></html>','<!DOCTYPE svg><svg></svg>','<svg><!ENTITY bad></svg>','<svg><?bad?></svg>','<svg>','<svgx></svg>','https://foreign.test/qr.svg'])assert.throws(()=>normalizeSvgQr(bad),/ENROLLMENT_INCOMPLETE/);
});
test('staff MFA repair config exposes only nominated ADMIN; normal mode still requires two distinct accounts',()=>{
 assert.equal(validateConfig({...config,accounts:[config.accounts[0]],repair}).repair,repair);
 assert.throws(()=>validateConfig({...config,repair}),/ADMIN_REPAIR_ONLY/);
 assert.throws(()=>validateConfig({...config,accounts:[config.accounts[1]],repair}),/ADMIN_REPAIR_ONLY/);
 assert.throws(()=>validateConfig({...config,accounts:[config.accounts[0]]}),/EXPLICIT_ACCOUNTS_REQUIRED/);
});
test('staff MFA repair removes only exact unverified TOTP at AAL1 and refuses verified, wrong target, wrong owner or elevated session',async()=>{
 const good=fixture({repair});good.state.factor=b;await good.setup.removeIncompleteFactor();assert.deepEqual(good.state.removed,[b]);
 for(const kind of ['verified','wrong-target','wrong-owner','aal2']){
  const {state,setup}=fixture({repair});state.factor=kind==='wrong-target'?a:b;
  if(kind==='verified')state.verified=true;if(kind==='wrong-owner')state.id=b;if(kind==='aal2')state.aal='aal2';
  await assert.rejects(setup.removeIncompleteFactor(),/REPAIR_FACTOR_NOT_UNVERIFIED|DEDICATED_CONFIRMED_ACCOUNT_REQUIRED/);
  assert.deepEqual(state.removed,[]);
 }
});
test('staff MFA repair one enrollment after exact removal; XML accepted; verification and second login remain available',async()=>{
 let claims=0;const {state,setup}=fixture({repair,claimEnrollment:async()=>{claims++;}});state.factor=b;
 state.xml='<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>';
 await setup.login('synthetic@example.invalid','test-only');await setup.removeIncompleteFactor();
 assert.equal(await setup.enroll(),state.xml);assert.equal(await setup.enroll(),state.xml);
 assert.equal(claims,1);assert.equal(state.enrollments,1);
 assert.equal((await setup.verify('123456')).aal,'aal2');await setup.logout();
 await setup.login('synthetic@example.invalid','test-only');assert.equal((await setup.verify('123456')).aal,'aal2');
 assert.equal(state.enrollments,1);assert.deepEqual(state.removed,[b]);
});
test('staff MFA repair enrollment failure stops once, returns precise safe Auth code/status without raw provider message',async()=>{
 let claims=0;const {state,setup}=fixture({repair,claimEnrollment:async()=>{claims++;}});state.factor=b;
 await setup.removeIncompleteFactor();state.enrollError={code:'mfa_totp_enroll_not_enabled',status:422,message:'PRIVATE_PROVIDER_DETAIL'};
 await assert.rejects(setup.enroll(),e=>{assert.equal(safeError(e),'AUTH_OPERATION_FAILED · mfa_totp_enroll_not_enabled · HTTP 422');return true;});
 await assert.rejects(setup.enroll(),/ENROLLMENT_ATTEMPT_ALREADY_USED/);
 assert.equal(claims,1);assert.equal(state.enrollments,1);assert.deepEqual(state.removed,[b]);
 assert.doesNotMatch(safeError(Error('private arbitrary response')),/private arbitrary response/);
});
test('staff MFA local repair claim is durable, atomic under concurrent requests, origin guarded and cannot be reset via API',async t=>{
 const dir=await mkdtemp(tmpdir()+'/soma-mfa-claim-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const claimPath=dir+'/attempt.json';const c={...config,accounts:[config.accounts[0]],repair};
 const server=localServer({config:c,assets:dir,claimPath});
 const request=(url,method='GET',origin='http://127.0.0.1:4197')=>new Promise(resolve=>server.emit('request',{url,method,headers:{host:'127.0.0.1:4197',origin}},{setHeader(){},end(body){resolve({status:this.statusCode,body});}}));
 assert.equal((await request('/repair/claim','POST','https://foreign.test')).status,403);
 assert.equal(JSON.parse((await request('/repair/status')).body).used,false);
 const pair=await Promise.all([request('/repair/claim','POST'),request('/repair/claim','POST')]);
 assert.deepEqual(pair.map(x=>x.status).sort(),[201,409]);
 assert.equal(JSON.parse((await request('/repair/status')).body).used,true);
 assert.equal((await request('/repair/claim','POST')).status,409);
 assert.equal((await request('/repair/claim','DELETE')).status,405);
 assert.deepEqual(Object.keys(JSON.parse(await readFile(claimPath,'utf8'))).sort(),['claimed_at','state']);
});
