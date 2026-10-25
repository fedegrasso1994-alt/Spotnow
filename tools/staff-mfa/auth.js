// Operator-only local tool. Never imported by the product application.
export const STAGING='https://zjinjtkekmaqtxsuyvho.supabase.co';
export function validateConfig(config){
 if(config.url!==STAGING)throw Error('STAGING_REQUIRED');
 const key=config.publicKey;
 if(typeof key!=='string')throw Error('PUBLIC_KEY_REQUIRED');
 if(!key.startsWith('sb_publishable_')){
  let claims;try{claims=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw Error('PUBLIC_KEY_REQUIRED');}
  if(key.split('.').length!==3||claims.role!=='anon'||claims.ref!=='zjinjtkekmaqtxsuyvho')throw Error('PUBLIC_KEY_REQUIRED');
 }
 const accounts=config.accounts;
 const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 if(!Array.isArray(accounts)||!accounts.length||new Set(accounts.map(a=>a.id)).size!==accounts.length||new Set(accounts.map(a=>a.label)).size!==accounts.length||accounts.some(a=>!['ADMIN','MODERATOR'].includes(a.label)||!uuid.test(a.id)))throw Error('EXPLICIT_ACCOUNTS_REQUIRED');
 if(config.repair){
  if(accounts.length!==1||accounts[0].label!=='ADMIN'||config.repair.accountId!==accounts[0].id||!uuid.test(config.repair.factorId)||!/^admin-[a-z0-9-]{1,64}$/.test(config.repair.attemptKey))throw Error('ADMIN_REPAIR_ONLY');
 }else if(config.scopeAccountId){
  if(accounts.length!==1||accounts[0].id!==config.scopeAccountId)throw Error('EXPLICIT_ACCOUNTS_REQUIRED');
 }else if(accounts.length!==2)throw Error('EXPLICIT_ACCOUNTS_REQUIRED');
 return config;
}
export function stagingAuthFetch(fetcher){
 return (input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url);
  const path=url.pathname;
  if(url.origin!==STAGING||url.username||url.password||!(path==='/auth/v1/token'||path==='/auth/v1/user'||path==='/auth/v1/logout'||/^\/auth\/v1\/factors(?:\/[a-f0-9-]+(?:\/(?:challenge|verify))?)?$/.test(path)))throw Error('AUTH_ONLY_STAGING');
  return fetcher(input,init);
 };
}
// Codes/status only: never surface provider messages or success payloads with QR/session.
export function safeError(error){return [error?.message==='AUTH_OPERATION_FAILED'?'AUTH_OPERATION_FAILED':/^[A-Z][A-Z0-9_]{1,80}$/.test(error?.message||'')?error.message:'OPERATION_FAILED',typeof error?.authCode==='string'&&/^[a-z0-9_]{1,80}$/.test(error.authCode)?error.authCode:null,Number.isInteger(error?.httpStatus)?'HTTP '+error.httpStatus:null].filter(Boolean).join(' · ');}
function ok(result){if(result.error){const e=Error('AUTH_OPERATION_FAILED');e.authCode=result.error.code;e.httpStatus=result.error.status;throw e;}return result.data;}
export function normalizeSvgQr(raw){
 if(typeof raw!=='string'||raw.length>1024*1024)throw Error('ENROLLMENT_INCOMPLETE');
 const image=raw.replace(/^data:image\/svg\+xml;utf-8,/, '');
 const root=image.replace(/^\uFEFF?\s*(?:<\?xml\s[^?]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*/,'');
 if(!/^<svg(?:\s|>)/.test(root)||!/<\/svg>\s*$/.test(root)||/<!DOCTYPE|<!ENTITY|<\?/i.test(root))throw Error('ENROLLMENT_INCOMPLETE');
 if(typeof DOMParser!=='undefined'){
  const parsed=new DOMParser().parseFromString(image,'image/svg+xml');
  if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg'||parsed.documentElement.namespaceURI!=='http://www.w3.org/2000/svg')throw Error('ENROLLMENT_INCOMPLETE');
 }
 return image;
}
export function createStaffSetup(client,expectedId,{repair=null,claimEnrollment=null}={}){
 let factor=null,qr=null,enrollmentAttempted=false,removalAttempted=false,removalCompleted=false;
 async function identity(){
  const data=ok(await client.auth.getUser());
  if(data.user?.id!==expectedId||data.user.is_anonymous||!data.user.email_confirmed_at)throw Error('DEDICATED_CONFIRMED_ACCOUNT_REQUIRED');
 }
 async function status(){
  await identity();
  const factors=ok(await client.auth.mfa.listFactors());
  const level=ok(await client.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel;
  const verified=(factors.totp||[]).filter(f=>f.status==='verified');
  return {id:expectedId,verified:verified.length>0,aal:level};
 }
 return {
  async login(email,password){
   ok(await client.auth.signInWithPassword({email,password}));
   try{return await status();}catch(error){await client.auth.signOut({scope:'local'});throw error;}
  },
  async enroll(){
   await identity();if(qr)return qr;
   if(repair&&enrollmentAttempted)throw Error('ENROLLMENT_ATTEMPT_ALREADY_USED');
   const factors=ok(await client.auth.mfa.listFactors());
   if((factors.all||[]).length)throw Error('EXISTING_FACTOR_USE_VERIFY_OR_REVIEW');
   if(repair){
    if(repair.accountId!==expectedId||typeof claimEnrollment!=='function'||!removalCompleted)throw Error('ADMIN_REPAIR_ONLY');
    enrollmentAttempted=true;await claimEnrollment();
   }
   const enrolled=ok(await client.auth.mfa.enroll({factorType:'totp',friendlyName:'SOMA staging staff'}));
   if(enrolled.type!=='totp'||!enrolled.id)throw Error('ENROLLMENT_INCOMPLETE');
   const image=normalizeSvgQr(enrolled.totp?.qr_code);
   factor=enrolled.id;qr=image;return qr;
  },
  async removeIncompleteFactor(){
   await identity();
   if(!repair||repair.accountId!==expectedId||removalAttempted)throw Error('ADMIN_REPAIR_ONLY');
   const factors=ok(await client.auth.mfa.listFactors()).all||[];
   const level=ok(await client.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel;
   const target=factors.find(f=>f.id===repair.factorId);
   // AAL1 is intentional: provider denies deleting a concurrently verified factor
   // without AAL2. Never elevate or reset global MFA to make deletion succeed.
   if(level!=='aal1'||factors.length!==1||target?.factor_type!=='totp'||target.status!=='unverified')throw Error('REPAIR_FACTOR_NOT_UNVERIFIED');
   removalAttempted=true;ok(await client.auth.mfa.unenroll({factorId:repair.factorId}));
   if((ok(await client.auth.mfa.listFactors()).all||[]).length)throw Error('REPAIR_FACTOR_REMAINS');
   removalCompleted=true;
   return {removed:true};
  },
  async verify(code){
   await identity();if(!/^\d{6}$/.test(code))throw Error('SIX_DIGITS_REQUIRED');
   if(!factor){const factors=ok(await client.auth.mfa.listFactors());factor=(factors.totp||[]).find(f=>f.status==='verified')?.id;}
   if(!factor)throw Error('ENROLL_FIRST');
   ok(await client.auth.mfa.challengeAndVerify({factorId:factor,code}));
   qr=null;const result=await status();
   if(!result.verified||result.aal!=='aal2')throw Error('AAL2_REQUIRED');return result;
  },
  async logout(){
   // Revoke only the session created by this tool, never all account sessions.
   const response=await client.auth.signOut({scope:'local'});factor=null;qr=null;ok(response);
  },
  status
 };
}
