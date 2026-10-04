import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestQueue} from '../src/request-queue.js';
import {createBackend} from '../src/backend.js';
import {database,seed,ids,asUser,admin} from './helpers/database.js';

test('10,000 photos keep at most four signing requests active and one failed group does not blank the rest',async()=>{
 let active=0,peak=0,calls=0;const api=createBackend({storage:{from:()=>({createSignedUrls:async paths=>{const request=++calls;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;if(request===2)return {error:Error('offline')};return {data:paths.map(path=>({path,signedUrl:`/photo/${path}`,error:null}))};}})}});
 const paths=Array.from({length:10000},(_,i)=>`user-${i}/photo`),result=await api.photoUrls(paths);assert.equal(peak,4);assert.equal(calls,100);assert.equal(result.size,10000);assert.equal(result.get('user-0/photo'),'/photo/user-0/photo');assert.equal(result.get('user-100/photo'),null);assert.equal(result.get('user-9999/photo'),'/photo/user-9999/photo');
});
test('request queue continues after rejection without starving later requests',async()=>{
 const queue=createRequestQueue(2);const results=await Promise.allSettled(Array.from({length:1000},(_,i)=>queue.run(()=>{if(i%17===0)throw Error('transient');return i;})));assert.equal(results.at(-1).value,999);assert.equal(results.filter(r=>r.status==='fulfilled').length,941);
});
test('chat reads latest 100 first and applies a deterministic older-message cursor',async()=>{
 const actions=[],rows=[{id:'b',created_at:'2026-10-04T12:00:00.000Z'},{id:'a',created_at:'2026-10-04T11:00:00.000Z'}];
 const query={select:v=>{actions.push(['select',v]);return query;},eq:(...v)=>{actions.push(['eq',...v]);return query;},or:v=>{actions.push(['or',v]);return query;},order:(...v)=>{actions.push(['order',...v]);return query;},limit:n=>{actions.push(['limit',n]);return Promise.resolve({data:[...rows]});}};
 const api=createBackend({from:()=>query});assert.deepEqual((await api.messages('match')).map(m=>m.id),['a','b']);assert.ok(actions.some(a=>a[0]==='limit'&&a[1]===100));assert.ok(actions.some(a=>a[0]==='order'&&a[2].ascending===false));
 actions.length=0;await api.messages('match',{created_at:'2026-10-04T11:00:00.000Z',id:'a'});assert.match(actions.find(a=>a[0]==='or')[1],/created_at\.lt\..*id\.lt\.a/);
});
test('paged discovery and matches preserve every permission, exclusion and historical match access',async()=>{
 const db=await database();try{
 await seed(db);const {a,b,c,v,w,q}=ids;
 await asUser(db,a);await db.query(`select public.check_in('${q}')`);await asUser(db,b);await db.query(`select public.check_in('${q}')`);await admin(db);await db.exec(`update public.checkins set checked_in_at=now()-interval '90 minutes',expires_at=now() where user_id='${b}';`);await asUser(db,a);
 async function equivalent(){const old=(await db.query(`select * from public.location_people('${v}',false)`)).rows,newRows=(await db.query(`select * from public.location_people_page('${v}',false,49,0)`)).rows;assert.deepEqual(newRows.map(p=>p.id),old.map(p=>p.id));for(const row of newRows){assert.equal(row.checked_in_at,null);assert.equal(row.expires_at,null);}return newRows;}
 assert.equal((await equivalent()).length,1);await assert.rejects(db.query(`select * from public.location_people_page('${w}',false,49,0)`));
 await db.query(`select public.send_spot('${b}','${v}')`);await asUser(db,b);await db.query(`select public.send_spot('${a}','${v}')`);await asUser(db,a);
 const m=(await db.query('select * from public.my_matches_page()')).rows[0];assert.equal(m.person_id,b);assert.equal((await db.query(`select * from public.my_matches_page(1,0,'${m.id}',null)`)).rows.length,1);
 await asUser(db,c);assert.equal((await db.query(`select * from public.my_matches_page(1,0,'${m.id}',null)`)).rows.length,0);
 await admin(db);await db.exec(`insert into public.blocks values('${b}','${a}',now())`);await asUser(db,a);assert.equal((await equivalent()).length,0);assert.equal((await db.query('select * from public.my_matches_page()')).rows.length,0);
 await admin(db);await db.exec(`delete from public.blocks;insert into spot_private.suspensions(user_id,reason) values('${b}','Test')`);await asUser(db,a);assert.equal((await equivalent()).length,0);
 await admin(db);await db.exec(`delete from spot_private.suspensions;insert into spot_private.account_deletions(user_id) values('${b}')`);await asUser(db,a);assert.equal((await equivalent()).length,0);
 await admin(db);await db.exec(`delete from spot_private.account_deletions;update auth.users set is_anonymous=true where id='${b}'`);await asUser(db,a);assert.equal((await equivalent()).length,0);
 await admin(db);await db.exec(`set role anon`);await assert.rejects(db.query(`select * from public.location_people_page('${v}',false,49,0)`));await assert.rejects(db.query('select * from public.my_matches_page()'));
 }finally{await db.close();}
});
test('over 1,000 profiles remain reachable through deterministic pages without duplicates',async()=>{
 const db=await database();try{
 await seed(db);const {a,v,q}=ids;await asUser(db,a);await db.query(`select public.check_in('${q}')`);await admin(db);
 await db.exec(`insert into auth.users select ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,false from generate_series(1,1200) n;
 insert into public.profiles(id,name,age,gender,preference,photo_path) select id,'Stesso nome',25,'F','ALL',id::text||'/photo' from auth.users where id::text like '60000000%';
 insert into spot_private.tribe_memberships select id,'${v}',now() from public.profiles where id::text like '60000000%';`);await asUser(db,a);
 const found=[];for(let offset=0;offset<1200;offset+=48){const page=(await db.query(`select * from public.location_people_page('${v}',false,49,${offset})`)).rows;assert.equal(Number(page[0].total_count),1200);found.push(...page.slice(0,48).map(p=>p.id));}assert.equal(found.length,1200);assert.equal(new Set(found).size,1200);
 }finally{await db.close();}
});


test('rapid reads share identical requests, cap concurrency at six and cancelled discovery can retry',async()=>{
 let active=0,peak=0,calls=0;const api=createBackend({rpc:async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return {data:[]};}});
 await Promise.all(Array.from({length:1000},()=>api.matchesPage(0)));assert.equal(calls,1);
 await Promise.all(Array.from({length:100},(_,i)=>api.matchesPage(i*48)));assert.equal(peak,6);assert.equal(calls,101);
 const obsolete=api.locationPeoplePage('place',false,0);api.cancelDiscoveryReads();await assert.rejects(obsolete,/annullata/);assert.deepEqual(await api.locationPeoplePage('place',false,0),{items:[],total:0,hasMore:false});
});


test('a stalled read times out, releases its shared slot and permits retry',async()=>{
 let calls=0;const api=createBackend({rpc:()=>++calls===1?new Promise(()=>{}):Promise.resolve({data:[]})},{readTimeoutMs:10});
 await assert.rejects(api.matchesPage(0),/troppo lenta/);assert.deepEqual(await api.matchesPage(0),{items:[],total:0,hasMore:false});assert.equal(calls,2);
});
