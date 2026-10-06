import test from 'node:test';
import assert from 'node:assert/strict';
import {database,seed,asUser,admin,ids} from './helpers/database.js';

test('LOC-01: all discovery RPCs hide presence times, preserve expiry, own session and Tribe/Spot/Match',async()=>{
 const db=await database();const {a,b,v,w,q}=ids;
 const discover=async live=>Promise.all([
  db.query(`select * from public.location_people('${v}',${live})`),
  db.query(`select * from public.location_people_page('${v}',${live},49,0)`),
  db.query(`select * from public.location_people_photos_page('${v}',${live},49,0)`)
 ]);
 const minimized=rows=>{assert.deepEqual(rows.map(p=>p.id),[b]);for(const person of rows){assert.equal(person.checked_in_at,null);assert.equal(person.expires_at,null);assert.equal(person.name,'Luca');assert.equal(person.photo_path,`${b}/b.png`);}};
 try{
  await seed(db);
  await asUser(db,b);await db.query(`select public.check_in('${q}')`);
  await asUser(db,a);const own=(await db.query(`select (public.check_in('${q}')).*`)).rows[0];
  assert.equal(new Date(own.expires_at)-new Date(own.checked_in_at),90*60*1000);
  for(const result of await discover(true))minimized(result.rows);
  assert.equal((await db.query(`select * from public.location_people_page('${v}',true,1,1)`)).rows.length,0);
  await assert.rejects(db.query(`select * from public.location_people_page('${w}',true)`));
  const ownRows=(await db.query('select * from public.checkins')).rows;
  assert.deepEqual(ownRows.map(c=>c.user_id),[a]);assert.ok(ownRows[0].checked_in_at);assert.ok(ownRows[0].expires_at);
  await admin(db);
  await db.exec(`update public.checkins set checked_in_at=now()-interval '90 minutes',expires_at=now() where user_id='${b}'`);
  await asUser(db,a);
  for(const result of await discover(true))assert.deepEqual(result.rows,[]);
  for(const result of await discover(false))minimized(result.rows);
  assert.equal((await db.query('select * from public.my_tribes()')).rows[0].member_count,2);
  await db.query(`select public.send_spot('${b}','${v}')`);
  for(const result of await discover(false))assert.equal(result.rows[0].interest_sent,true);
  await asUser(db,b);const match=(await db.query(`select public.send_spot('${a}','${v}') as id`)).rows[0].id;assert.ok(match);
  await asUser(db,a);assert.equal((await db.query('select * from public.my_matches_photos_page()')).rows[0].id,match);
  await admin(db);
  const retained=(await db.query(`select * from public.checkins where user_id='${b}'`)).rows[0];assert.ok(retained.checked_in_at);assert.ok(retained.expires_at);
  await db.exec(`update public.checkins set checked_in_at=now()-interval '90 minutes',expires_at=now() where user_id='${a}';`);
  await asUser(db,a);
  for(const result of await discover(true))assert.deepEqual(result.rows,[]);
  for(const result of await discover(false))minimized(result.rows);
 }finally{await db.close();}
});
