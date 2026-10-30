/** Private loopback relay. Session material is RAM-only; never logged or persisted. */
import{createServer}from'node:http';import{readFile,writeFile}from'node:fs/promises';import{recoveredHttp}from'../../scripts/recovery/recovered-http.mjs';import{targetEnvironment,TARGET,targetSql}from'../../scripts/recovery/local-target.mjs';import{ORIGIN,SOURCE,STAFF,READS,accountScope,authRoute,safeCode}from'./policy.mjs';
import{SOURCE_USER_ID,EXISTING_PREVIEW,existingUserOtpRequest,sourceMagicLinkHash,sourceCredentialRoute}from'./source-user-policy.mjs';
import{sourceAuthHttp}from'./source-transport.mjs';
import{finalRecoveryAuthGate}from'./final-gate.mjs';import{readSourceMetadata}from'../../scripts/recovery/read-source.mjs';import{archiveMetadata}from'../../scripts/recovery/archive-metadata.mjs';
const replay=JSON.parse(await readFile('.local/recovery-v3/security-replay-result.json'));if(!replay.pass)throw Error('REPLAY_REQUIRED');
const sourceConfig=JSON.parse(await readFile('.local/legacy-key-migration/config.json'));if(sourceConfig.url!==SOURCE||!sourceConfig.publicKey.startsWith('sb_publishable_'))throw Error('SOURCE_PUBLIC_CONFIG');
const env=await targetEnvironment(TARGET.storage),ids=JSON.parse(await targetSql("begin read only;select json_agg(id)from auth.users;rollback;",{database:'soma_recovery_v3_retry_20261028'}));
const localUser=JSON.parse(await readFile('.local/recovery-v3/local-user-result.json'));if(!localUser.pass||!localUser.cleanup_pass)throw Error('LOCAL_USER_GATE_REQUIRED');
const sourceUser=JSON.parse(await targetSql("begin read only;select jsonb_build_object('id',id,'email',email,'confirmed',email_confirmed_at is not null)from auth.users where id='"+SOURCE_USER_ID+"';rollback;",{database:'soma_recovery_v3_retry_20261028'}));if(sourceUser?.id!==SOURCE_USER_ID||sourceUser.confirmed!==true||Object.values(STAFF).includes(sourceUser.id))throw Error('SOURCE_USER_SCOPE');
const archive=await archiveMetadata();archive.database.fill(0);const sourceCredentialWitness=archive.inventory.security_snapshot.users.find(x=>x.id===SOURCE_USER_ID)?.credential_digest;if(!sourceCredentialWitness)throw Error('SOURCE_USER_WITNESS');
const evidence={},custody=new Map();let serial=Promise.resolve(),emailRequested=false,emailSent=false;
const claims=t=>{try{return JSON.parse(Buffer.from(t.split('.')[1],'base64url'))}catch{throw Error('INVALID_ACCESS_TOKEN')}};
async function user(access){const r=await recoveredHttp('auth','/user',{headers:{Authorization:'Bearer '+access}});if(r.status!==200)throw Error('TARGET_SESSION_INVALID');return r.data;}
async function rpc(name,access,body={}){return recoveredHttp('rest','/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify(body)});}
async function record(role,phase,data){evidence[role]??={};evidence[role][phase]=data;await writeFile('.local/recovery-v3/private-auth-review-result.json',JSON.stringify({evidence,summary:finalRecoveryAuthGate(localUser,evidence),updated_at:new Date().toISOString()},null,2),{mode:0o600});}
async function proof(path,b){
 if(path==='/source-user-email-request'){
  if(emailRequested)throw Error('SOURCE_EMAIL_ALREADY_REQUESTED');emailRequested=true;
  const current=(await readSourceMetadata('security')).users.find(x=>x.id===SOURCE_USER_ID);if(!current||current.credential_digest!==sourceCredentialWitness)throw Error('SOURCE_USER_STATE_CHANGED_STOP');
  const r=await sourceAuthHttp('/auth/v1/otp?redirect_to='+encodeURIComponent(EXISTING_PREVIEW),{method:'POST',headers:{apikey:sourceConfig.publicKey,'Content-Type':'application/json'},body:JSON.stringify(existingUserOtpRequest(sourceUser.email))});if(r.status!==200)throw Error(r.status===429?'SOURCE_EMAIL_COOLDOWN_STOP':'SOURCE_EMAIL_REQUEST_FAILED');emailSent=true;return{pass:true,email_requested:true,new_accounts_allowed:false};
 }
 if(path==='/source-user-email-complete'){
  if(!emailRequested)throw Error('SOURCE_EMAIL_REQUEST_REQUIRED');const hash=sourceMagicLinkHash(b.link);
  const r=await sourceAuthHttp('/auth/v1/verify',{method:'POST',headers:{apikey:sourceConfig.publicKey,'Content-Type':'application/json'},body:JSON.stringify({token_hash:hash,type:'magiclink'})});if(r.status!==200)throw Error('SOURCE_EMAIL_VERIFY_FAILED');const s=r.data;if(s.user?.id!==SOURCE_USER_ID||typeof s.access_token!=='string'||typeof s.refresh_token!=='string')throw Error('SOURCE_EMAIL_IDENTITY_MISMATCH');
  const p=await proof('/source-proof',{role:'USER',access:s.access_token,refresh:s.refresh_token});return{...p,local_user_gate:localUser.pass,local_fixture_cleaned:localUser.cleanup_pass,source_and_local_users_deliberately_separate:true};
 }
 if(path==='/source-proof'){
  if(typeof b.access!=='string'||b.access.split('.').length!==3||typeof b.refresh!=='string'||b.refresh.length<16)throw Error('SOURCE_CAPABILITIES_REQUIRED');
  const r=await sourceAuthHttp('/auth/v1/user',{headers:{apikey:sourceConfig.publicKey,Authorization:'Bearer '+b.access}});if(r.status!==200)throw Error('SOURCE_SESSION_INVALID');const u=r.data;accountScope(b.role,u.id,ids);const c=claims(b.access);if(c.sub!==u.id||b.role!=='USER'&&c.aal!=='aal2')throw Error('SOURCE_FRESH_AAL2_REQUIRED');
  const target=await recoveredHttp('auth','/user',{headers:{Authorization:'Bearer '+b.access}}),rest=await recoveredHttp('rest','/profiles?select=id&limit=1',{headers:{Authorization:'Bearer '+b.access}});if(![401,403].includes(target.status)||rest.status!==401)throw Error('SOURCE_JWT_ACCEPTED');
  const refresh=await recoveredHttp('auth','/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:b.refresh})});if(![400,401,403].includes(refresh.status)||refresh.data?.access_token||refresh.data?.session)throw Error('SOURCE_REFRESH_ACCEPTED');
  const result={pass:true,source_session_verified:true,source_aal:c.aal,auth_status:target.status,rest_status:rest.status,refresh_status:refresh.status};custody.set(b.role,u.id);await record(b.role,'source',result);return result;
 }
 if(path==='/target-proof'){
  if(!custody.has(b.role))throw Error('SOURCE_PROOF_REQUIRED');const u=await user(b.access);accountScope(b.role,u.id,ids);if(custody.get(b.role)!==u.id)throw Error('TARGET_IDENTITY_MISMATCH');const c=claims(b.access),aal=c.aal;const checks=[];
  if(b.phase==='aal1'&&aal!=='aal1'||b.phase==='allowed'&&b.role!=='USER'&&aal!=='aal2')throw Error('TARGET_AAL_REQUIRED');
  for(const name of READS){const allowed=b.phase==='allowed'&&b.role!=='USER'&&(b.role==='ADMIN'||name==='moderation_review_queue'),r=await rpc(name,b.access);checks.push({operation:name,expected:allowed?'allowed':'denied',pass:allowed?r.status===200:r.data?.code==='42501'});}
  if(b.role==='MODERATOR'){const r=await rpc('moderation_role_set',b.access,{target_user:null,new_role:'INVALID',operation_id:null});checks.push({operation:'role_management',expected:'denied',pass:r.data?.code==='42501'});}
  if(b.role==='USER'&&b.phase==='allowed'){
   for(const name of['my_account_status','my_matches']){const r=await rpc(name,b.access);checks.push({operation:name,expected:'allowed',pass:r.status===200});}
   const own=await recoveredHttp('rest','/profiles?select=id&id=eq.'+u.id,{headers:{Authorization:'Bearer '+b.access}});checks.push({operation:'profile_owner_read',expected:'allowed',pass:own.status===200&&Array.isArray(own.data)&&own.data.every(x=>x.id===u.id)});
   const other=ids.find(x=>x!==u.id),r=await recoveredHttp('rest','/profiles?select=id&id=eq.'+other,{headers:{Authorization:'Bearer '+b.access}});checks.push({operation:'other_profile_direct_read',expected:'denied',pass:r.status===200&&Array.isArray(r.data)&&r.data.length===0});
  }
  const result={pass:checks.every(x=>x.pass),aal,checks};if(!result.pass)throw Error('TARGET_AUTHORIZATION_FAILED');await record(b.role,b.phase,result);return result;
 }
 if(path==='/logout-proof'){
  if(!custody.has(b.role))throw Error('SOURCE_PROOF_REQUIRED');const checks=[];for(const name of READS){const r=await rpc(name,b.access);checks.push({operation:name,denied:[401,403].includes(r.status)||r.data?.code==='42501'});}if(checks.some(x=>!x.denied))throw Error('STALE_PRIVILEGE_REMAINS');const result={pass:true,checks};await record(b.role,'logout',result);return result;
 }throw Error('PROOF_ROUTE');
}
const server=createServer((req,res)=>{const work=async()=>{
 const end=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'self' ${SOURCE}; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`});res.end(type==='application/json'?JSON.stringify(data):data)};
 try{
  if(req.headers.host!=='127.0.0.1:4297'||req.headers.origin&&req.headers.origin!==ORIGIN)return end(403,{code:'ORIGIN'});const url=new URL(req.url,ORIGIN);
  if(req.method==='GET'&&url.pathname==='/config')return end(200,{source:SOURCE,sourceRelay:ORIGIN+'/source',sourcePublic:sourceConfig.publicKey,target:ORIGIN,targetPublic:env.ANON_KEY,staff:STAFF,sourceUser:{id:sourceUser.id,email:sourceUser.email},localUser:{pass:true,cleaned:true,scope:'RECOVERY-ONLY — NOT RECOVERED'}});
  if(req.method==='GET'&&url.pathname==='/summary')return end(200,{local_user:localUser.pass,local_user_cleaned:localUser.cleanup_pass,email:{attempted:emailRequested,requested:emailSent,verified:evidence.USER?.source?.pass===true},manual:finalRecoveryAuthGate(localUser,evidence)});
  const assets={'/':['index.html','text/html'],'/review.js':['review.js','text/javascript'],'/style.css':['style.css','text/css']};if(req.method==='GET'&&assets[url.pathname]){const[f,type]=assets[url.pathname];return end(200,await readFile('.local/recovery-v3/review/'+f),type);}
  let body='';for await(const x of req){body+=x;if(body.length>48000)throw Error('REQUEST_TOO_LARGE');}
  if(url.pathname.startsWith('/source/auth/v1/')){
   const path=url.pathname.slice('/source/auth/v1'.length);
   if(!sourceCredentialRoute(req.method,path,url.search))return end(403,{code:'SOURCE_AUTH_ROUTE'});
   const headers={apikey:sourceConfig.publicKey,'Content-Type':'application/json'};if(req.headers.authorization)headers.Authorization=req.headers.authorization;
   const r=await sourceAuthHttp('/auth/v1'+path+url.search,{method:req.method,headers,body:body||undefined});res.writeHead(r.status,{'Content-Type':r.contentType||'application/json','Cache-Control':'no-store'});return res.end(r.bytes);
  }
  if(url.pathname.startsWith('/auth/v1/')){
   const path=url.pathname.slice('/auth/v1'.length);if(!authRoute(req.method,path))return end(403,{code:'AUTH_ROUTE'});
   if(path==='/token'&&url.search!=='?grant_type=password')return end(403,{code:'PASSWORD_LOGIN_ONLY'});
   if(req.method==='POST'&&path.startsWith('/factors')){const token=req.headers.authorization?.replace(/^Bearer /i,''),u=await user(token);const role=Object.keys(STAFF).find(x=>STAFF[x]===u.id);if(!role||custody.get(role)!==u.id)throw Error('VERIFIED_STAFF_CUSTODY_REQUIRED');}
   const headers={'Content-Type':'application/json'};if(req.headers.authorization)headers.Authorization=req.headers.authorization;
   const r=await recoveredHttp('auth',path+url.search,{method:req.method,headers,body:body||undefined});res.writeHead(r.status,{'Content-Type':r.contentType||'application/json','Cache-Control':'no-store'});return res.end(r.bytes);
  }
  if(req.method==='POST'&&['/source-proof','/target-proof','/logout-proof','/source-user-email-request','/source-user-email-complete'].includes(url.pathname)){if(req.headers.origin!==ORIGIN)throw Error('ORIGIN');return end(200,await proof(url.pathname,JSON.parse(body)));}
  return end(404,{code:'NOT_FOUND'});
 }catch(e){end(400,{code:safeCode(e)});}
 };serial=serial.then(work,work);});
server.listen(4297,'127.0.0.1',()=>console.log('Recovery Auth review: http://127.0.0.1:4297 — proof only; no token/OTP logging.'));
