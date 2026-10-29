import test from 'node:test';import assert from 'node:assert/strict';
import{storageRestorePlan,storageRecoveryEnvironment}from'../scripts/recovery/storage-recovery-contract.mjs';
import{TARGET}from'../scripts/recovery/local-target.mjs';
const key='10000000-0000-0000-0000-000000000001/canonical.jpg',version='20000000-0000-0000-0000-000000000001';
const file={kind:'photo',name:'photos/000000.jpg',storage_key:key,bucket:'profile-photos',size:3,sha256:'a'.repeat(64)};
const row={name:key,version,bucket_id:'profile-photos',public:false,metadata:{size:3,mimetype:'image/jpeg',cacheControl:'max-age=3600'}};
test('Storage restore preserves exact names/versions and requires all canonical bytes',()=>{
 const p=storageRestorePlan({files:[file]},[row],[key]);assert.equal(p[0].version,version);assert.equal(p[0].key,key);assert.equal(p[0].sha256,file.sha256);
 assert.throws(()=>storageRestorePlan({files:[file]},[row],[key+'.thumb.jpg']),/CANONICAL_MISSING/);
 for(const patch of[{public:true},{version:'../outside'},{metadata:{size:4,mimetype:'image/jpeg'}},{bucket_id:'other'}])assert.throws(()=>storageRestorePlan({files:[file]},[{...row,...patch}],[key]),/RECOVERY_/);
 assert.throws(()=>storageRestorePlan({files:[file,file]},[row,row],[key]),/STORAGE_COUNT/);
 assert.throws(()=>storageRestorePlan({files:[{...file,storage_key:'../outside.jpg'}]},[row],[]),/STORAGE_MAPPING/);
});
test('Storage service remains its own DB role on the recovered target only',()=>{
 const env={DATABASE_URL:'postgres://supabase_storage_admin:SYNTHETIC@'+TARGET.db+':5432/postgres',TENANT_ID:'stub'};
 const next=storageRecoveryEnvironment(env),u=new URL(next.DATABASE_URL);assert.equal(u.username,'supabase_storage_admin');assert.equal(u.pathname,'/soma_recovery_v3_retry_20261028');assert.equal(next.FILE_STORAGE_BACKEND_PATH,'/mnt');
 assert.throws(()=>storageRecoveryEnvironment({...env,DATABASE_URL:env.DATABASE_URL.replace('supabase_storage_admin','supabase_admin')}),/DATABASE_SCOPE/);
 assert.throws(()=>storageRecoveryEnvironment({...env,DATABASE_URL:'postgres://supabase_storage_admin:SYNTHETIC@outside.invalid/postgres'}),/DATABASE_SCOPE/);
 assert.throws(()=>storageRecoveryEnvironment({...env,UNEXPECTED:'a\nb'}),/ENV_FORMAT/);
});
