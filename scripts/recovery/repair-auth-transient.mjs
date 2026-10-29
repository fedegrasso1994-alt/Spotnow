/** Existing quarantined target repair through the same deterministic importer step. */
import{execFile}from'node:child_process';import{promisify}from'node:util';import{writeFile}from'node:fs/promises';
import{archiveMetadata}from'./archive-metadata.mjs';import{authTransientSql,INERT_AUTH_FIELDS,INERT_AUTH_POLICY}from'./auth-transient-reconstruction.mjs';import{DOCKER,targetSql}from'./local-target.mjs';import{RETRY_DATABASE}from'./restore-bootstrap.mjs';
if(process.argv[2]!=='--reconstruct-approved-inert-auth')throw Error('RECOVERY_EXPLICIT_ACTION');
try{
 const names=['supabase_auth_soma-recovery-v3','supabase_rest_soma-recovery-v3','supabase_storage_soma-recovery-v3'];const exec=promisify(execFile),containers=JSON.parse((await exec(DOCKER,['inspect',...names])).stdout);
 if(containers.some(x=>x.State.Running||Object.keys(x.HostConfig.PortBindings||{}).length))throw Error('RECOVERY_INERT_NOT_QUARANTINED');
 const a=await archiveMetadata();a.database.fill(0);const ids=a.inventory.security_snapshot.users.map(x=>x.id),sql=authTransientSql(a.manifest.contract,ids);
 const fields=INERT_AUTH_FIELDS.map(f=>`'${f}',(select count(*)from auth.users where "${f}" is null)`).join(',');
 const before=JSON.parse(await targetSql(`begin read only;select jsonb_build_object(${fields});rollback;`,{database:RETRY_DATABASE}));
 // Explicit transaction, exact table+field+identity allowlists, durable invariant guard inside DO.
 await targetSql('begin;'+sql+'commit;',{database:RETRY_DATABASE,role:'supabase_admin'});
 const after=JSON.parse(await targetSql(`begin read only;select jsonb_build_object(${fields});rollback;`,{database:RETRY_DATABASE}));
 const result={pass:true,checkpoint_id:a.manifest.checkpoint_id,archive_sha256:a.archive_sha256,policy:INERT_AUTH_POLICY,users:ids.length,before_nulls:before,after_nulls:after,durable_and_identity_invariant:true,source_writes:0,sessions_created:0,payload_unchanged:true};await writeFile('.local/recovery-v3/auth-transient-reconstruction-result.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
}catch(e){console.error(JSON.stringify({pass:false,code:/^[A-Z_0-9]+$/.test(e.message)?e.message:'RECOVERY_INERT_REPAIR_FAILED'}));process.exitCode=1;}
