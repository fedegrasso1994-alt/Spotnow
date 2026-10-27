/** One synthetic account. Real public Auth/user JWT + modern server transport. */
import{readFile,writeFile,rm}from'node:fs/promises';import{execFile}from'node:child_process';import{promisify}from'node:util';import{createHash,randomUUID}from'node:crypto';import assert from'node:assert/strict';import{createClient}from'@supabase/supabase-js';
import{stagingAdminClient}from'../supabase/functions/_shared/server-key.js';import{preflightCanaryFixtures}from'../tests/fixtures/photo-canary-generator.mjs';
const exec=promisify(execFile),c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));assert.equal(c.url,'https://zjinjtkekmaqtxsuyvho.supabase.co');
const a=stagingAdminClient(createClient,c.url,c.serverKey,{auth:{persistSession:false,autoRefreshToken:false}}),u=createClient(c.url,c.publicKey,{auth:{persistSession:false,autoRefreshToken:false}}),b=createClient(c.url,c.publicKey,{auth:{persistSession:false,autoRefreshToken:false}}),results=[];let id,otherId,path;
const ok=r=>{if(r.error)throw Error('SMOKE_OPERATION_FAILED');return r.data;};const record=async()=>writeFile('.local/legacy-key-migration/product-smoke.json',JSON.stringify({synthetic_id:id,other_synthetic_id:otherId,photo_path:path,results},null,2));
try{
 const fixtures=await preflightCanaryFixtures(),password=randomUUID()+'aA1!',email='soma-key-'+randomUUID()+'@example.invalid';
 id=ok(await a.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{synthetic:true,purpose:'legacy-key-migration'}})).user.id;await record();
 const session=ok(await u.auth.signInWithPassword({email,password})).session;assert.equal(session.user.id,id);results.push({step:'real-public-auth',pass:true});
 const otherPassword=randomUUID()+'bB2!',otherEmail='soma-key-isolation-'+randomUUID()+'@example.invalid';
 otherId=ok(await a.auth.admin.createUser({email:otherEmail,password:otherPassword,email_confirm:true,user_metadata:{synthetic:true,purpose:'legacy-key-isolation'}})).user.id;await record();
 ok(await b.auth.signInWithPassword({email:otherEmail,password:otherPassword}));
 for(const name of ['photo02_staging_scheduler','admin_analytics_dashboard','moderation_reports'])assert.ok((await u.rpc(name,name==='photo02_staging_scheduler'?{enable:false}:{})).error);
 ok(await u.rpc('attest_adult_checkbox',{declared:true,operation_id:randomUUID()}));const challenge=ok(await u.rpc('dating_consent_challenge'));ok(await u.rpc('accept_dating_consent',{challenge:challenge.token,operation_id:randomUUID()}));
 const upload=await fetch(c.url+'/functions/v1/photo-assets',{method:'POST',headers:{apikey:c.publicKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/octet-stream','X-Photo-Request-Id':randomUUID()},body:fixtures.values().next().value,signal:AbortSignal.timeout(60000)});const photo=await upload.json();assert.equal(upload.status,200);assert.equal(photo.ready,true);path=photo.photo_path;assert.ok(path.startsWith(id+'/'));await record();results.push({step:'real-photo-upload-worker-canonicalization',pass:true});
 ok(await u.from('profiles').insert({id,name:'SYNTHETIC KEY MIGRATION',age:24,gender:'M',preference:'ALL',photo_path:path}));assert.equal(ok(await u.from('profiles').select('id').eq('id',id)).length,1);
 const signed=ok(await u.functions.invoke('profile-photo',{body:{refs:[path]}}));assert.equal(signed.photos.length,1);results.push({step:'profile-owner-save-and-photo-authorized-endpoint',pass:true});
 const otherProfile=await b.from('profiles').select('id').eq('id',id);assert.ok(otherProfile.error||otherProfile.data.length===0);
 const otherPhoto=ok(await b.functions.invoke('profile-photo',{body:{refs:[path]}}));assert.equal(otherPhoto.photos.length,0);
 assert.ok((await b.storage.from('profile-photos').download(path)).error);
 const publicBytes=await fetch(c.url+'/storage/v1/object/public/profile-photos/'+path,{signal:AbortSignal.timeout(15000)});assert.ok(!publicBytes.ok);await publicBytes.body?.cancel();
 results.push({step:'other-user-RLS-photo-ownership-and-private-storage-denied',pass:true});
 const refreshed=ok(await u.auth.refreshSession()).session;assert.equal(refreshed.user.id,id);assert.equal(ok(await u.from('profiles').select('id').eq('id',id)).length,1);results.push({step:'user-JWT-refresh-owner-continuity',pass:true});
 const local='.local/legacy-key-migration/synthetic-canonical.jpg';await exec('/opt/homebrew/bin/supabase',['storage','cp','--experimental','--project-ref','zjinjtkekmaqtxsuyvho','ss:///profile-photos/'+path,local],{env:{...process.env,SUPABASE_AUTH_SERVICE_ROLE_KEY:c.serverKey},maxBuffer:1e6});
 const expected=new Uint8Array(await ok(await a.storage.from('profile-photos').download(path)).arrayBuffer());const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(await readFile(local)),hash(expected));results.push({step:'CLI-modern-override-no-legacy-resolution-SHA256',pass:true});
 const recoveryCopy='.local/legacy-key-migration/synthetic-recovery-copy.jpg',recoveryEnv={...process.env};delete recoveryEnv.SUPABASE_AUTH_SERVICE_ROLE_KEY;
 await exec('/opt/homebrew/bin/supabase',['storage','cp','--experimental','--project-ref','zjinjtkekmaqtxsuyvho','ss:///profile-photos/'+path,recoveryCopy],{env:recoveryEnv,maxBuffer:1e6});assert.equal(hash(await readFile(recoveryCopy)),hash(expected));results.push({step:'recovery-checkpoint-default-CLI-selection-SHA256',pass:true});
 await rm(local);await rm(recoveryCopy);
 const deleted=ok(await u.functions.invoke('delete-account',{body:{confirm:true}}));assert.equal(deleted.deleted,true);assert.ok((await a.auth.admin.getUserById(id)).error);assert.equal(ok(await a.from('profiles').select('id').eq('id',id)).length,0);assert.equal(ok(await a.storage.from('profile-photos').list(id)).length,0);results.push({step:'normal-delete-auth-profile-storage-clean',pass:true});
 assert.equal(ok(await b.functions.invoke('delete-account',{body:{confirm:true}})).deleted,true);assert.ok((await a.auth.admin.getUserById(otherId)).error);results.push({step:'isolation-fixture-normal-delete-clean',pass:true});
 await record();console.log(JSON.stringify({results,fixture_deleted:true}));
}catch{await record();console.log(JSON.stringify({status:'STOP',results,synthetic_id:id,photo_path:path}));process.exitCode=1;}
