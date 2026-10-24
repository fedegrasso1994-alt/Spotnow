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
 if(!Array.isArray(accounts)||accounts.length!==2||new Set(accounts.map(a=>a.id)).size!==2||new Set(accounts.map(a=>a.label)).size!==2||accounts.some(a=>!['ADMIN','MODERATOR'].includes(a.label)||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(a.id)))throw Error('EXPLICIT_ACCOUNTS_REQUIRED');
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
function ok(result){if(result.error)throw Error('AUTH_OPERATION_FAILED');return result.data;}
export function createStaffSetup(client,expectedId){
 let factor=null,qr=null;
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
   const factors=ok(await client.auth.mfa.listFactors());
   if((factors.all||[]).length)throw Error('EXISTING_FACTOR_USE_VERIFY_OR_REVIEW');
   const enrolled=ok(await client.auth.mfa.enroll({factorType:'totp',friendlyName:'SOMA staging staff'}));
   const image=enrolled.totp?.qr_code?.replace(/^data:image\/svg\+xml;utf-8,/, '');
   if(enrolled.type!=='totp'||!enrolled.id||typeof image!=='string'||!image.startsWith('<svg'))throw Error('ENROLLMENT_INCOMPLETE');
   factor=enrolled.id;qr=image;return qr;
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
