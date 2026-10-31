// Disposable local PostgreSQL multi-session proof. No staging credentials/data.
import{PGlite}from'@electric-sql/pglite';import{spawn,execFile}from'node:child_process';import{promisify}from'node:util';
import{mkdir,writeFile,rm,access}from'node:fs/promises';import{randomBytes,randomUUID}from'node:crypto';import{resolve}from'node:path';import assert from'node:assert/strict';
const docker='/Applications/Docker.app/Contents/Resources/bin/docker',name='soma-romantic060-local',root='.local/spotted-one-day-native',out='docs/evidence/spotted-one-day',exec=promisify(execFile);
if(process.argv[2]!=='--run-disposable-proof')throw Error('EXPLICIT_LOCAL_PROOF_REQUIRED');
try{await access(root);throw Error('LOCAL_PROOF_ALREADY_STARTED');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(root,{recursive:true,mode:0o700});await mkdir(out,{recursive:true});await writeFile(root+'/db.env','POSTGRES_PASSWORD='+randomBytes(24).toString('hex')+'\n',{mode:0o600});
const quote=x=>x===null?'null':typeof x==='number'?String(x):typeof x==='boolean'?String(x):"'"+String(x).replaceAll("'","''")+"'";
function processSql(s){return new Promise((yes,no)=>{const p=spawn(docker,['exec','-i',name,'psql','-U','supabase_admin','-d','romantic_qa','-XAtq','-v','ON_ERROR_STOP=1']);let o='',e='';p.stdout.on('data',x=>o+=x);p.stderr.on('data',x=>e+=x);p.on('error',no);p.on('close',c=>c?no(Error(e)):yes(o.trim()));p.stdin.end(s);});}
const actor=(id,s,application='romantic_actor')=>processSql(`set application_name=${quote(application)};set role authenticated;select set_config('request.jwt.claim.sub',${quote(id)},false);${s}`).then(s=>s.split('\n').at(-1));
const results={scope:'isolated local native PostgreSQL, existing QA Auth/Storage scaffold',source_staging_mutations:false,photo_uploads:false};let created=false;
try{
 const capture=[],oe=PGlite.prototype.exec,oq=PGlite.prototype.query;PGlite.prototype.exec=function(s,...a){capture.push(s);return oe.call(this,s,...a);};PGlite.prototype.query=function(s,a=[],...r){capture.push(s.replace(/\$(\d+)/g,(_,n)=>quote(a[+n-1]))+';');return oq.call(this,s,a,...r);};
 const{romanticDatabase,ids}=await import('../../tests/helpers/romantic-database.js');const d=await romanticDatabase({after(){}});await d.close();PGlite.prototype.exec=oe;PGlite.prototype.query=oq;
 const schema=capture.join(';\n').replace(/create role (anon|authenticated|service_role);/g,(_,r)=>`do $$begin if not exists(select 1 from pg_roles where rolname='${r}')then create role ${r};end if;end$$;`);
 await exec(docker,['run','-d','--name',name,'--network','none','--env-file',resolve(root+'/db.env'),'ghcr.io/supabase/postgres:17.11.0.004']);created=true;
 let ready=false;for(let i=0;i<30;i++){try{await exec(docker,['exec',name,'pg_isready','-U','supabase_admin']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}assert.ok(ready);
 await exec(docker,['exec',name,'createdb','-U','supabase_admin','romantic_qa']);await processSql(schema);
 // Only two quota-related clock calls are redirected in the disposable fixture DB.
 // The actual board lock, counter UPSERT, RLS and application function bodies remain.
 await processSql("reset role;create schema local_romantic_qa;revoke all on schema local_romantic_qa from public,anon,authenticated,service_role;create table local_romantic_qa.clock(value timestamptz);insert into local_romantic_qa.clock values('2030-03-30T23:59:59+01:00');create function local_romantic_qa.now()returns timestamptz language sql volatile security definer set search_path='' as $$select value from local_romantic_qa.clock$$;");
 for(const signature of['public.spotted_romantic_submit(uuid,text,uuid)','public.spotted_romantic_settings()']){const definition=await processSql(`select pg_get_functiondef(${quote(signature)}::regprocedure);`);await processSql(definition.replaceAll('clock_timestamp()','local_romantic_qa.now()').replaceAll('statement_timestamp()','local_romantic_qa.now()'));}
 for(const id of[ids.a,ids.b,ids.c])await actor(id,`select join_tribe('${ids.w}');`);
 const makePost=(id,place,label)=>actor(id,`select spotted_create_post('${place}',${quote(label)},board_operation('${place}'));`);
 const posts={};for(const id of[ids.a,ids.c])posts[id]=[await makePost(id,ids.v,'SYNTHETIC QUOTA V'),await makePost(id,ids.w,'SYNTHETIC QUOTA W')];
 async function race(targets,nextClock){
  let release;const locked=new Promise((yes,no)=>{const p=spawn(docker,['exec','-i',name,'psql','-U','supabase_admin','-d','romantic_qa','-XAtq','-v','ON_ERROR_STOP=1']);let text='';p.stdout.on('data',x=>{text+=x;if(text.includes('QUOTA_LOCK_READY'))yes(p);});p.on('error',no);p.stdin.write("begin;select spot_private.board_lock();\n\\echo QUOTA_LOCK_READY\n");});
  const holder=await locked;const done=new Promise((yes,no)=>{holder.on('close',c=>c?no(Error('HOLDER_FAILED')):yes());});
  try{const calls=targets.map((p,i)=>actor(ids.b,`select spotted_romantic_submit('${p}','post','${randomUUID()}');`,'romantic_race_'+i));
   let waiting=0;for(let i=0;i<20;i++){waiting=Number(await processSql("select count(*)from pg_stat_activity where application_name like 'romantic_race_%'and wait_event_type='Lock';"));if(waiting===2)break;await new Promise(r=>setTimeout(r,50));}assert.equal(waiting,2,'Both independent sessions must wait on real advisory lock');
   holder.stdin.end((nextClock?`update local_romantic_qa.clock set value=${quote(nextClock)};`:'')+"commit;\n\\q\n");await done;const values=await Promise.all(calls);assert.ok(values.every(x=>JSON.parse(x).submitted===true));return{independent_sessions:2,observed_lock_waiters:waiting,public_responses:'uniform neutral; acceptance measured by durable quota/attempt/request rows'};
  }catch(e){holder.stdin.end('rollback;\n\\q\n');throw e;}
 }
 results.same_day_race=await race([posts[ids.a][0],posts[ids.c][1]]);
 let counts=JSON.parse(await processSql("select json_build_object('attempts',(select count(*)from spot_private.board_request_attempts),'requests',(select count(*)from spot_private.board_romantic_requests),'used',(select max(used)from spot_private.board_request_quota));"));assert.deepEqual(counts,{attempts:1,requests:1,used:1});results.same_day_race.counts=counts;
 const accepted=JSON.parse(await processSql("select row_to_json(x)from(select operation_id,coalesce(origin_post_id,origin_comment_id)content_id from spot_private.board_request_attempts limit 1)x;"));await actor(ids.b,`select spotted_romantic_submit('${accepted.content_id}','post','${accepted.operation_id}');`);assert.equal(Number(await processSql('select count(*)from spot_private.board_request_attempts')),1);results.idempotent_replay=true;
 const oldRecipient=await processSql('select recipient_id from spot_private.board_romantic_requests limit 1;'),nextRecipient=oldRecipient===ids.a?ids.c:ids.a;
 results.midnight_race=await race(posts[nextRecipient],'2030-03-31T00:00:00+01:00');
 counts=JSON.parse(await processSql("select json_build_object('attempts',(select count(*)from spot_private.board_request_attempts),'requests',(select count(*)from spot_private.board_romantic_requests),'days',(select count(*)from spot_private.board_request_quota),'max_used',(select max(used)from spot_private.board_request_quota),'matches',(select count(*)from matches));"));assert.deepEqual(counts,{attempts:2,requests:2,days:2,max_used:1,matches:0});results.midnight_race.counts=counts;
 results.pass=true;console.log('Native independent-session quota races PASS');
}finally{if(created)await exec(docker,['rm','-fv',name]);await rm(root,{recursive:true});results.local_target_removed=true;results.secrets_removed=true;await writeFile(out+'/native-races.json',JSON.stringify(results,null,2)+'\n');}
