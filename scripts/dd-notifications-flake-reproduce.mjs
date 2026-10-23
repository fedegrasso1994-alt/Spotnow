/** Fixed diagnostic matrix: local disposable PGlite only. Not a retry-until-pass runner. */
import {readFile,writeFile,mkdir}from'node:fs/promises';import assert from'node:assert/strict';
import{qodDatabase,ids,asUser,admin,call}from'../tests/helpers/qod-database.js';
const results=[];
// Fixed before running: twelve seeds, every seed evaluated exactly once.
for(let seed=1;seed<=12;seed++){
 const d=await qodDatabase({after(){}});try{
  await admin(d);await d.exec(await readFile('supabase/migrations/049_notifications_mvp.sql','utf8'));
  await d.exec('update spot_private.notification_control set enabled=true,delivery_enabled=true');
  for(const[u,k,suffix]of[[ids.a,'a','a'],[ids.b,'b','b']]){await asUser(d,u);await call(d,'notification_register($1,$2,$3,$4)',['https://fcm.googleapis.com/synthetic-'+suffix,'B'.repeat(87),'C'.repeat(22),k.repeat(64)]);}
  await admin(d);const generation=`00000000-0000-4000-8000-${String(seed).padStart(12,'0')}`;
  await d.query("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at,generation_id)select local_date,slot,2,starts_at,ends_at,$1 from spot_private.dd_clock_at(clock_timestamp())",[generation]);
  const fixture=(await d.query("select count(*)::int members,count(*)filter(where spot_private.ora_eligible(user_id))::int eligible from spot_private.tribe_memberships where venue_id=$1",[ids.v])).rows[0];
  await d.exec('update spot_private.soma_v2_control set discovery_enabled=true;update spot_private.discovery_policy set enabled=true,paused=false where version=2');await asUser(d,ids.a);
  const first=await call(d,'my_daily_discovery()');await admin(d);
  const events=(await d.query('select kind,count(*)::int n from spot_private.notification_events group by kind')).rows;
  const peers=first.profiles.map(p=>p.id);
  results.push({generation,fixture,server_now:first.server_now,status:first.status,profiles_count:peers.length,a_sees_b:peers.includes(ids.b),legacy_items_present:'items'in first,legacy_people_present:'people'in first,original_assertion_passes:Boolean(first.items?.length||first.people?.length||JSON.stringify(first).includes(ids.b)),notification_counts:events});
  assert.ok(first.profiles.length>0&&first.profiles.length<=4);assert.deepEqual(events,[{kind:'dd',n:2}]);
 }finally{await d.close();}
}
assert.ok(results.some(x=>!x.original_assertion_passes),'Matrix did not reproduce failure');assert.ok(results.some(x=>x.original_assertion_passes),'Matrix did not reproduce false positive');
await mkdir('docs/evidence/dd-notifications-flake',{recursive:true});await writeFile('docs/evidence/dd-notifications-flake/reproduction.json',JSON.stringify({scope:'Twelve independent local PGlite databases; fixed server noon Rome; six eligible Tribe members; two subscribed; only generation seed varies.',results},null,2)+'\n');
console.log(JSON.stringify({cases:results.length,original_pass:results.filter(x=>x.original_assertion_passes).length,original_fail:results.filter(x=>!x.original_assertion_passes).length,actual_dd_and_notifications_pass:results.length}));
