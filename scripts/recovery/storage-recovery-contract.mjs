/** Byte restoration is independent of user-upload admission and never upserts DB metadata. */
import {TARGET} from './local-target.mjs';
import {RETRY_DATABASE} from './restore-bootstrap.mjs';
const pathOK=x=>typeof x==='string'&&/^[A-Za-z0-9_/-]+(?:\.[A-Za-z0-9_-]+)+$/.test(x)&&!x.startsWith('/')&&!x.split('/').some(x=>!x||x==='.'||x==='..');
export function storageRestorePlan(manifest,rows,required){
 const files=manifest.files.filter(x=>x.kind==='photo'),db=new Map(rows.map(x=>[x.name,x]));
 if(!files.length||files.length!==rows.length||db.size!==rows.length)throw Error('RECOVERY_STORAGE_COUNT');
 const keys=new Set();
 const plan=files.map(f=>{
  const r=db.get(f.storage_key);
  if(f.bucket!=='profile-photos'||!pathOK(f.storage_key)||keys.has(f.storage_key)||!r||r.bucket_id!==f.bucket||r.public!==false||r.metadata?.mimetype!=='image/jpeg'||Number(r.metadata.size)!==f.size)throw Error('RECOVERY_STORAGE_MAPPING');
  if(r.version!==null&&(typeof r.version!=='string'||!/^[a-f0-9-]{36}$/.test(r.version)))throw Error('RECOVERY_STORAGE_VERSION');
  keys.add(f.storage_key);return {name:f.name,key:f.storage_key,bucket:f.bucket,version:r.version,size:f.size,sha256:f.sha256,contentType:'image/jpeg',cacheControl:r.metadata.cacheControl||'no-cache',contentEncoding:r.metadata.contentEncoding};
 });
 if(required.some(x=>!keys.has(x)))throw Error('RECOVERY_CANONICAL_MISSING');
 return plan;
}
export function storageRecoveryEnvironment(env){
 const u=new URL(env.DATABASE_URL);
 if(u.username!=='supabase_storage_admin'||u.hostname!==TARGET.db)throw Error('RECOVERY_STORAGE_DATABASE_SCOPE');
 const result={...env,DATABASE_URL:((u.pathname='/'+RETRY_DATABASE),u.toString()),STORAGE_BACKEND:'file',FILE_STORAGE_BACKEND_PATH:'/mnt',LOG_LEVEL:'error'};
 for(const [key,value]of Object.entries(result))if(!/^[A-Z_][A-Z0-9_]*$/.test(key)||/[\r\n\0]/.test(value))throw Error('RECOVERY_STORAGE_ENV_FORMAT');
 for(const value of Object.values(result))if(value.includes('zjinjtkekmaqtxsuyvho')||value.includes('qlucwdjcjomwyziegxrn'))throw Error('RECOVERY_STORAGE_SOURCE_REFERENCE');
 return result;
}
