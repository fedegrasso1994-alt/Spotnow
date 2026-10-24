import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {STAGING,validateConfig,stagingAuthFetch,createStaffSetup} from '../tools/staff-mfa/auth.js';
import {localServer} from '../tools/staff-mfa/server.mjs';
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002';
const config={url:STAGING,publicKey:'sb_publishable_synthetic_fixture',accounts:[{id:a,label:'ADMIN'},{id:b,label:'MODERATOR'}]};
function fixture(){
 const state={id:a,verified:false,aal:'aal1',enrollments:0,signouts:[],calls:[]};
 const data=value=>({data:value,error:null});
 const client={auth:{
  async signInWithPassword(){state.aal='aal1';return data({});},
  async getUser(){return data({user:{id:state.id,is_anonymous:false,email_confirmed_at:'2026-10-24'}});},
  async signOut(options){state.signouts.push(options);state.aal='aal1';return {error:null};},
  mfa:{
   async listFactors(){const factors=state.factor?[{id:state.factor,status:state.verified?'verified':'unverified'}]:[];return data({all:factors,totp:factors});},
   async getAuthenticatorAssuranceLevel(){return data({currentLevel:state.aal});},
   async enroll(){state.enrollments++;state.factor='factor-synthetic';return data({id:state.factor,type:'totp',totp:{qr_code:'data:image/svg+xml;utf-8,<svg></svg>'}});},
   async challengeAndVerify(options){state.calls.push(options.factorId);if(options.code!=='123456')return {error:{message:'wrong'}};state.verified=true;state.aal='aal2';return data({});}
  }
 }};return {state,setup:createStaffSetup(client,a)};
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
