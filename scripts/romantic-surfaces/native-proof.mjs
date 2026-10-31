// Actual concurrent PostgreSQL sessions, isolated disposable fixture database only.
import{PGlite}from'@electric-sql/pglite';import{spawn,execFile}from'node:child_process';import{promisify}from'node:util';import{mkdir,writeFile,rm,access}from'node:fs/promises';import{randomBytes,randomUUID}from'node:crypto';import{resolve}from'node:path';import assert from'node:assert/strict';
const docker='/Applications/Docker.app/Contents/Resources/bin/docker',name='soma-romantic-surfaces-local',root='.local/romantic-surfaces-native',out='docs/evidence/romantic-surfaces',exec=promisify(execFile),q=x=>x===null?'null':typeof x==='number'?String(x):typeof x==='boolean'?String(x):"'"+String(x).replaceAll("'","''")+"'";
if(process.argv[2]!=='--run-disposable-proof')throw Error('EXPLICIT_LOCAL_PROOF_REQUIRED');try{await access(root);throw Error('PROOF_ALREADY_STARTED');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(root,{recursive:true,mode:0o700});await mkdir(out,{recursive:true});await writeFile(root+'/db.env','POSTGRES_PASSWORD='+randomBytes(24).toString('hex')+'\n',{mode:0o600});
function sql(s){return new Promise((yes,no)=>{const p=spawn(docker,['exec','-i',name,'psql','-U','supabase_admin','-d','ora_qa','-XAtq','-v','ON_ERROR_STOP=1']);let o='',e='';p.stdout.on('data',x=>o+=x);p.stderr.on('data',x=>e+=x);p.on('error',no);p.on('close',c=>c?no(Error(e)):yes(o.trim()));p.stdin.end(s);});}
const actor=(id,s,application='ora_actor')=>sql(`set application_name=${q(application)};set role authenticated;select set_config('request.jwt.claim.sub',${q(id)},false);${s}`).then(s=>({ok:true,value:s.split('\n').at(-1)}),e=>({ok:false,error:e.message}));
const result={scope:'isolated PostgreSQL 17.11, synthetic fixture; source not mutated',photo_uploads:false};let created=false;
try{
 const capture=[],oe=PGlite.prototype.exec,oq=PGlite.prototype.query;PGlite.prototype.exec=function(s,...a){capture.push(s);return oe.call(this,s,...a);};PGlite.prototype.query=function(s,a=[],...r){capture.push(s.replace(/\$(\d+)/g,(_,n)=>q(a[+n-1]))+';');return oq.call(this,s,a,...r);};
 const{romanticSurfacesDatabase,ids,admin}=await import('../../tests/helpers/romantic-surfaces-database.js');const{users}=await import('../../tests/helpers/spot-database.js');const{places}=await import('../../tests/helpers/ora-quota-database.js');const d=await romanticSurfacesDatabase({after(){}});await admin(d);for(const id of places.slice(2))await d.query("insert into venues(id,name,address,ora_enabled)values($1,'SYNTHETIC CONCURRENCY','Test',true)",[id]);await d.close();PGlite.prototype.exec=oe;PGlite.prototype.query=oq;
 const schema=capture.filter(s=>!s.includes("set_config('soma.test_clock'")&&!s.includes('create or replace function pg_catalog.clock_timestamp()')&&!s.includes('create or replace function pg_catalog.statement_timestamp()')).join(';\n').replace(/create role (anon|authenticated|service_role);/g,(_,r)=>`do $$begin if not exists(select 1 from pg_roles where rolname='${r}')then create role ${r};end if;end$$;`);
 await exec(docker,['run','-d','--name',name,'--network','none','--env-file',resolve(root+'/db.env'),'ghcr.io/supabase/postgres:17.11.0.004']);created=true;
 // Official entrypoint temporary init server is socket-only; TCP readiness
 // identifies the final server, including the Nix .postgres-wrapp process.
 let ready=false;for(let i=0;i<30;i++){try{await exec(docker,['exec',name,'pg_isready','-h','127.0.0.1','-U','supabase_admin']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}assert.ok(ready);await exec(docker,['exec',name,'createdb','-U','supabase_admin','ora_qa']);await sql(schema);
 await sql("reset role;create schema local_ora_qa;revoke all on schema local_ora_qa from public,anon,authenticated,service_role;create table local_ora_qa.clock(value timestamptz);insert into local_ora_qa.clock values('2030-03-30T23:59:59+01:00');create function local_ora_qa.now()returns timestamptz language sql volatile security definer set search_path=''as $$select value from local_ora_qa.clock$$;");
 // One private clock, only in this disposable DB. Actual quota/lock/guard SQL unchanged.
 const definitions=JSON.parse(await sql("select coalesce(json_agg(pg_get_functiondef(p.oid)),'[]')from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f'and p.prosrc~'(clock_timestamp|statement_timestamp)';"));
 for(const body of definitions)await sql(body.replaceAll('clock_timestamp()','local_ora_qa.now()').replaceAll('statement_timestamp()','local_ora_qa.now()'));

 const start=(id,p)=>actor(id,`select start_ora_manual('${p}');`);for(const id of users)assert.ok((await start(id,places[0])).ok);assert.ok((await start(ids.a,places[1])).ok);
 async function race(calls,nextClock){
  const holder=await new Promise((yes,no)=>{const p=spawn(docker,['exec','-i',name,'psql','-U','supabase_admin','-d','ora_qa','-XAtq','-v','ON_ERROR_STOP=1']);let out='';p.stdout.on('data',x=>{out+=x;if(out.includes('ORA_LOCK_READY'))yes(p);});p.on('error',no);p.stdin.write("begin;select spot_private.board_lock();\n\\echo ORA_LOCK_READY\n");});
  const done=new Promise((yes,no)=>holder.on('close',c=>c?no(Error('LOCK_HOLDER_FAILED')):yes()));
  const pending=calls.map((c,i)=>actor(c.id,c.sql,'ora_race_'+i));
  try{let waiting=0;for(let i=0;i<25;i++){waiting=Number(await sql("select count(*)from pg_stat_activity where application_name like 'ora_race_%'and wait_event_type='Lock';"));if(waiting===calls.length)break;await new Promise(r=>setTimeout(r,50));}assert.equal(waiting,calls.length);
   holder.stdin.end((nextClock?`update local_ora_qa.clock set value=${q(nextClock)};`:'')+"commit;\n\\q\n");await done;return{independent_sessions:calls.length,observed_lock_waiters:waiting,results:await Promise.all(pending)};
  }catch(e){holder.stdin.end('rollback;\n\\q\n');throw e;}
 }
 let r=await race(places.slice(2).map(p=>({id:ids.a,sql:`select start_ora_manual('${p}');`})));
 assert.equal(r.results.filter(x=>x.ok).length,1);assert.match(r.results.find(x=>!x.ok).error,/ORA_LOCATION_DAILY_QUOTA/);result.third_fourth_race={sessions:r.independent_sessions,lock_waiters:r.observed_lock_waiters,allowed:1,denied:1};
 const ops=[randomUUID(),randomUUID()];const spots=[ids.c,users[3]].map((peer,i)=>({id:ids.b,sql:`select send_spot_v2('${peer}','${ops[i]}');`}));r=await race(spots);assert.equal(r.results.filter(x=>x.ok).length,1);assert.match(r.results.find(x=>!x.ok).error,/SPOT_PLACE_QUOTA/);result.same_location_spot_race={sessions:r.independent_sessions,lock_waiters:r.observed_lock_waiters,allowed:1,denied:1};
 const accepted=r.results.findIndex(x=>x.ok);assert.ok((await actor(ids.b,spots[accepted].sql)).ok);result.idempotent_retry=true;
 r=await race([{id:ids.b,sql:`select start_ora_manual('${places[0]}');`},{id:ids.b,sql:`select send_spot_v2('${users[4]}','${randomUUID()}');`}]);assert.ok(r.results[0].ok);assert.equal(r.results[1].ok,false);assert.match(r.results[1].error,/SPOT_PLACE_QUOTA/);result.concurrent_recheck_no_reset=true;
 r=await race([users[4],users[5]].map(peer=>({id:ids.b,sql:`select send_spot_v2('${peer}','${randomUUID()}');`})),'2030-03-31T00:00:00+01:00');assert.equal(r.results.filter(x=>x.ok).length,1);assert.match(r.results.find(x=>!x.ok).error,/SPOT_PLACE_QUOTA/);result.midnight_spot_race={sessions:r.independent_sessions,lock_waiters:r.observed_lock_waiters,allowed:1,denied:1};
 // Both public neutral responses succeed, but exactly one durable romantic initiative is accepted.
 for(const id of [ids.a,ids.b,ids.c])assert.ok((await actor(id,`select join_tribe('${ids.w}');`)).ok);
 const post=async(id,place)=>(await actor(id,`select spotted_create_post('${place}','SYNTHETIC CROSS-SURFACE',board_operation('${place}'));`)).value;
 const p1=await post(ids.a,ids.v),p2=await post(ids.c,ids.w);
 const before=await sql("select coalesce(json_agg(q order by user_id,local_date,place_id),'[]')from spot_private.ora_spot_place_quota q;");
 r=await race([p1,p2].map(p=>({id:ids.b,sql:`select spotted_romantic_submit('${p}','post','${randomUUID()}');`})));
 assert.ok(r.results.every(x=>x.ok&&JSON.parse(x.value).submitted===true));
 const romantic=JSON.parse(await sql("select json_build_object('attempts',(select count(*)from spot_private.board_request_attempts),'used',(select max(used)from spot_private.board_request_quota));"));assert.deepEqual(romantic,{attempts:1,used:1});
 assert.equal(await sql("select coalesce(json_agg(q order by user_id,local_date,place_id),'[]')from spot_private.ora_spot_place_quota q;"),before);
 result.cross_board_romantic_race={independent_sessions:r.independent_sessions,lock_waiters:r.observed_lock_waiters,...romantic,ora_unchanged:true};
 const quotas=await sql("select json_build_object('ora',(select json_agg(q order by user_id,local_date,place_id)from spot_private.ora_spot_place_quota q),'romantic',(select json_agg(q order by user_id,day)from spot_private.board_request_quota q));");
 r=await race([{id:ids.a,sql:'select my_chances();'},{id:ids.b,sql:'select my_chances();'}]);assert.ok(r.results.every(x=>x.ok));
 const pairs=await sql("select coalesce(json_agg(e order by id),'[]')from spot_private.discovery_exposures e;");await sql('select spot_private.chance_release_due();');assert.equal(await sql("select coalesce(json_agg(e order by id),'[]')from spot_private.discovery_exposures e;"),pairs);
 assert.equal(await sql("select json_build_object('ora',(select json_agg(q order by user_id,local_date,place_id)from spot_private.ora_spot_place_quota q),'romantic',(select json_agg(q order by user_id,day)from spot_private.board_request_quota q));"),quotas);
 result.concurrent_chance_reads_and_tick={independent_sessions:2,idempotent:true,other_quotas_unchanged:true};
 const n=JSON.parse(await sql(`select json_build_object('max_used',(select max(used)from spot_private.ora_spot_place_quota),'actor_spots',(select sum(used)from spot_private.ora_spot_place_quota where user_id='${ids.b}'),'max_locations',(select max(n)from(select count(*)n from spot_private.ora_spot_place_quota group by user_id,local_date)x));`));assert.deepEqual(n,{max_used:1,actor_spots:2,max_locations:3});result.counts=n;result.pass=true;console.log('Consolidated native independent-session races PASS');
}finally{if(created)await exec(docker,['rm','-fv',name]);await rm(root,{recursive:true});result.local_target_removed=true;result.credentials_removed=true;await writeFile(out+'/native-races.json',JSON.stringify(result,null,2)+'\n');}
