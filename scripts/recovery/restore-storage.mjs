/** Isolated byte restore through the provider file backend; no Storage DB upsert. */
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openCheckpoint} from './checkpoint-artifact.mjs';
import {DOCKER,TARGET,targetSql,targetEnvironment} from './local-target.mjs';
import {RETRY_DATABASE} from './restore-bootstrap.mjs';
import {storageRestorePlan,storageRecoveryEnvironment} from './storage-recovery-contract.mjs';
const exec=promisify(execFile),IMAGE='ghcr.io/supabase/storage-api:v1.82.1';
const VOLUME='soma-recovery-v3-storage-20261028',SERVER='supabase_storage_soma-recovery-v3',ROOT=resolve('.local/recovery-v3');
const PHYSICAL=`(async()=>{try{
 const fs=require('fs/promises'),{Readable}=require('stream'),{createHash}=require('crypto');let input='';for await(const c of process.stdin)input+=c;const p=JSON.parse(input);
 const{FileBackend}=require('/app/dist/storage/backend/file.js'),{TenantLocation}=require('/app/dist/storage/locator.js'),{getConfig}=require('/app/dist/config.js');
 const cfg=getConfig(),backend=new FileBackend(),location=new TenantLocation(cfg.storageS3Bucket);let checked=0;
 if(cfg.storageFilePath!=='/mnt'||process.env.TENANT_ID!=='stub')throw Error('STORAGE_ROOT');
 for(const e of p.entries){const bytes=Buffer.from(e.bytes,'base64');if(bytes.length!==e.size||createHash('sha256').update(bytes).digest('hex')!==e.sha256)throw Error('STORAGE_INPUT_HASH');
 const key=location.getKeyLocation({tenantId:'stub',bucketId:e.bucket,objectName:e.key}),url=await backend.privateAssetUrl(location.getRootLocation(),key,e.version),path=url.slice('local://'.length);
 let exists=false;try{await fs.stat(path);exists=true}catch(x){if(x.code!=='ENOENT')throw x}if(exists)throw Error('STORAGE_NO_OVERWRITE');
 await backend.uploadObject(location.getRootLocation(),key,e.version,Readable.from([bytes]),e.contentType,e.cacheControl,undefined,e.size,e.contentEncoding);
 const obj=await backend.getObject(location.getRootLocation(),key,e.version),hash=createHash('sha256');let size=0;for await(const chunk of obj.body){hash.update(chunk);size+=chunk.length}
 if(size!==e.size||hash.digest('hex')!==e.sha256||obj.metadata.mimetype!=='image/jpeg')throw Error('STORAGE_OUTPUT_HASH');checked++;
 }
 let files=0;async function walk(root){for(const e of await fs.readdir(root,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('STORAGE_SYMLINK');if(e.isDirectory())await walk(root+'/'+e.name);else if(e.isFile())files++;}}await walk('/mnt');if(files!==p.entries.length)throw Error('STORAGE_ORPHAN');
 console.log('SOMA_STORAGE_RESULT '+JSON.stringify({pass:true,verified:checked,physical_files:files,orphans:0}));
 }catch(e){console.log('SOMA_STORAGE_RESULT '+JSON.stringify({pass:false,code:/^[A-Z_]+$/.test(e.message)?e.message:'STORAGE_BACKEND_FAILURE',native_code:typeof e.code==='string'&&/^[A-Z0-9_]+$/.test(e.code)?e.code:null}));process.exitCode=1}})();`;
async function docker(args,input){const p=spawn(DOCKER,args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);const done=new Promise((ok,bad)=>{p.on('error',()=>bad(Error('STORAGE_DOCKER')));p.on('close',code=>ok({code,out,err}))});p.stdin.end(input);return done;}
async function inventory(){return JSON.parse(await targetSql("begin read only;select jsonb_build_object('rows',(select jsonb_agg(jsonb_build_object('bucket_id',o.bucket_id,'name',o.name,'version',o.version,'metadata',o.metadata,'public',b.public)order by o.name)from storage.objects o join storage.buckets b on b.id=o.bucket_id),'required',(select jsonb_agg(x.path)from(select distinct unnest(array[p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg'])path from public.profiles p where p.photo_path is not null)x),'storage_digest',(select md5(jsonb_agg(to_jsonb(o)order by bucket_id,name)::text)from storage.objects o),'photo_digest',md5(jsonb_build_array((select jsonb_agg(to_jsonb(a)order by photo_path)from spot_private.photo_assets a),(select jsonb_agg(to_jsonb(s)order by photo_path)from spot_private.photo_lifecycle_sets s),(select jsonb_agg(to_jsonb(v)order by photo_path)from spot_private.validated_photos v))::text));rollback;",{database:RETRY_DATABASE}));}
if(process.argv[2]!=='--execute-isolated-storage-restore')throw Error('RECOVERY_EXPLICIT_ACTION');
process.umask(0o077);const capture=resolve('.local/recovery-v3/capture-20261028-b'),plain=join(ROOT,'storage-restore-decrypted');const evidence={database:RETRY_DATABASE,volume:VOLUME,container:SERVER,db_reused:true};let phase='preflight';
try{
 const old=JSON.parse(await readFile(join(capture,'bootstrap-retry-result.json'),'utf8'));if(!old.pass||!old.security?.pass||old.database!==RETRY_DATABASE)throw Error('STORAGE_DB_GATE');
 const existing=await docker(['volume','inspect',VOLUME]);if(existing.code===0)throw Error('STORAGE_VOLUME_ALREADY_EXISTS');
 const summary=JSON.parse(await readFile(join(capture,'sealed-summary.json'),'utf8')),key=await readFile(resolve('.local/recovery-keys',summary.checkpoint_id+'.key'));let manifest;try{manifest=await openCheckpoint({input:join(capture,summary.checkpoint_id+'.soma.enc'),key,outputDir:plain})}finally{key.fill(0)}
 const before=await inventory(),plan=storageRestorePlan(manifest,before.rows,before.required);
 const env=storageRecoveryEnvironment(await targetEnvironment(TARGET.storage));await mkdir(join(ROOT,'containers'),{recursive:true,mode:0o700});const envFile=join(ROOT,'containers/storage.env');await writeFile(envFile,Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
 phase='create-private-local-volume';let r=await docker(['volume','create','--label','soma.recovery=v3',VOLUME]);if(r.code)throw Error('STORAGE_VOLUME_CREATE');
 const entries=[];for(const e of plan)entries.push({...e,bytes:(await readFile(join(plain,e.name))).toString('base64')});
 phase='provider-backend-byte-restore';r=await docker(['run','--rm','-i','--network','none','--env-file',envFile,'--mount','type=volume,source='+VOLUME+',target=/mnt','--entrypoint','node',IMAGE,'-e',PHYSICAL],JSON.stringify({entries}));
 const line=r.out.split('\n').find(x=>x.startsWith('SOMA_STORAGE_RESULT '));if(!line)throw Error('STORAGE_BACKEND_RESULT');evidence.backend=JSON.parse(line.slice('SOMA_STORAGE_RESULT '.length));if(r.code||!evidence.backend.pass)throw Error(evidence.backend.code||'STORAGE_BACKEND_FAILURE');
 const after=await inventory();if(before.storage_digest!==after.storage_digest||before.photo_digest!==after.photo_digest)throw Error('STORAGE_METADATA_CHANGED');
 evidence.db_metadata_unchanged=true;evidence.photo_ledger_unchanged=true;evidence.required_canonical_objects=before.required.length;evidence.storage_digest=before.storage_digest;evidence.photo_digest=before.photo_digest;
 phase='private-storage-api-start';r=await docker(['run','-d','--name',SERVER,'--network',TARGET.network,'--env-file',envFile,'--mount','type=volume,source='+VOLUME+',target=/mnt',IMAGE]);if(r.code)throw Error('STORAGE_API_START');
 evidence.api_started=true;evidence.ports_published=false;evidence.pass=true;
 console.log(JSON.stringify(evidence));
}catch(e){evidence.pass=false;evidence.phase=phase;evidence.code=/^[A-Z_]+$/.test(e.message)?e.message:'STORAGE_RESTORE_FAILED';console.error(JSON.stringify(evidence));process.exitCode=1;
}finally{await rm(plain,{recursive:true,force:true});await writeFile(join(ROOT,'storage-restore-result.json'),JSON.stringify(evidence,null,2),{mode:0o600});}
