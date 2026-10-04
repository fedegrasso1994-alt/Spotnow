import {database,asUser,admin} from '../tests/helpers/database.js';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const db=await database(),users=10000,me='10000000-0000-0000-0000-000000000001',venue='20000000-0000-0000-0000-000000000001';
const report={environment:'Isolated local PostgreSQL (PGlite); synthetic users; no production traffic',users,measurements:[],at:new Date().toISOString()};
async function measure(name,sql){const start=performance.now(),result=await db.query(sql);const ms=Math.round((performance.now()-start)*10)/10;report.measurements.push({name,ms,rows:result.rows.length});console.log(JSON.stringify(report.measurements.at(-1)));return result;}
await db.exec(`insert into auth.users select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,false from generate_series(1,${users}) n;
insert into public.profiles(id,name,age,gender,preference,photo_path) select id,'Utente '||lpad(row_number() over(order by id)::text,6,'0'),25,case when row_number() over(order by id)%2=0 then 'F' else 'M' end,'ALL',id::text||'/photo.webp' from auth.users;
insert into public.venues(id,name,address) select ('20000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Luogo '||n,'Simulazione' from generate_series(1,10) n;
insert into spot_private.venue_codes select id,('30000000-0000-0000-0000-'||right(id::text,12))::uuid from public.venues;
insert into spot_private.tribe_memberships select p.id,v.id,now() from public.profiles p cross join public.venues v where v.id='${venue}' or p.id='${me}' or right(p.id::text,1)=right(v.id::text,1);
insert into public.checkins select id,'${venue}',now(),now()+interval '90 minutes' from public.profiles order by id limit 1000;
insert into public.matches(user_a,user_b,venue_id) select '${me}',id,'${venue}' from public.profiles where id<>'${me}' order by id limit 2000;
insert into public.messages(match_id,sender_id,body,created_at,client_nonce) select (select id from public.matches order by user_b limit 1),'${me}','Messaggio simulato '||n,now()-interval '1 day'+n*interval '1 second',gen_random_uuid() from generate_series(1,20000) n;
analyze;`);
await asUser(db,me);
await measure('QR landing aggregate',`select * from public.venue_preview('30000000-0000-0000-0000-000000000001')`);
await measure('10 Tribe counts',`select * from public.my_tribes()`);
await measure('baseline Tribe 9000 offline profiles',`select * from public.location_people('${venue}',false)`);
await measure('baseline Ora 999 live profiles',`select * from public.location_people('${venue}',true)`);
await measure('baseline 2000 matches',`select * from public.my_matches()`);
await measure('baseline 20000 messages',`select * from public.messages where match_id=(select id from public.my_matches() order by person_id limit 1) order by created_at,id`);
if((await db.query("select to_regprocedure('public.location_people_page(uuid,boolean,integer,integer)') is not null as present")).rows[0].present){
 await measure('paged Tribe first 49',`select * from public.location_people_page('${venue}',false,49,0)`);
 await measure('paged Tribe near end',`select * from public.location_people_page('${venue}',false,49,8800)`);
 await measure('paged matches first 49',`select * from public.my_matches_page(49,0)`);
 await measure('latest 100 messages',`select * from public.messages where match_id=(select id from public.my_matches_page(1,0,null,'10000000-0000-0000-0000-000000000002')) order by created_at desc,id desc limit 100`);
 await measure('older 100 messages',`select * from public.messages where match_id=(select id from public.my_matches_page(1,0,null,'10000000-0000-0000-0000-000000000002')) and created_at<(select min(created_at) from (select created_at from public.messages where match_id=(select id from public.my_matches_page(1,0,null,'10000000-0000-0000-0000-000000000002')) order by created_at desc,id desc limit 100) newest) order by created_at desc,id desc limit 100`);
 await measure('paged Ora first 49',`select * from public.location_people_page('${venue}',true,49,0)`);
}
await admin(db);report.memberships=Number((await db.query('select count(*) as n from spot_private.tribe_memberships')).rows[0].n);report.messages=20000;report.matches=2000;
await writeFile(process.argv[2]||'docs/load-review-results.json',JSON.stringify(report,null,2));await db.close();
