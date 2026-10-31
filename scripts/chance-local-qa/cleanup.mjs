import assert from'node:assert/strict';import{readFile,rm}from'node:fs/promises';
import{docker,container,network,root,run,sql,receipt}from'./environment.mjs';
if(process.argv[2]!=='--destroy-disposable-local')throw Error('EXPLICIT_LOCAL_CLEANUP');
const proof=JSON.parse(await sql("select json_build_object('users',(select count(*)from auth.users),'profiles',(select count(*)from profiles),'jobs',(select count(*)from cron.job));"));assert.equal(proof.jobs,0);
const pid=Number(await readFile(root+'/app.pid','utf8'));
if(Number.isInteger(pid)&&pid>1){try{const r=await run('ps',['-p',String(pid),'-o','command=']);assert.match(r.stdout,/node .*scripts\/chance-local-qa\/app\.mjs/);process.kill(pid,'SIGTERM');}catch(e){if(e.code!==1)throw e;}}
for(const name of['soma-chance-qa-rest-20261030',container]){
 const r=await run(docker,['inspect',name,'--format','{{json .NetworkSettings.Networks}}']);assert.ok(Object.hasOwn(JSON.parse(r.stdout),network));
 await run(docker,['rm','-fv',name]);
}
for(const n of['soma-chance-qa-frontend-20261030',network])await run(docker,['network','rm',n]);
await rm(root,{recursive:true});
for(const p of['tests/fixtures/chance-local-preview.js','tests/fixtures/chance-local-review.html'])await rm(p,{force:true});
const remaining=(await run(docker,['ps','-a','--filter','name=soma-chance-qa','--format','{{.Names}}'])).stdout.trim();assert.equal(remaining,'');
await receipt('cleanup',{before:proof,target_removed:true,anonymous_volumes_removed:true,local_secrets_removed:true,generated_browser_fixture_removed:true,remaining_local_qa_containers:0,remaining_jobs:0,source_staging_fixture_created:false,recovery_containers_untouched:true});console.log('Disposable Chance QA cleanup PASS');
