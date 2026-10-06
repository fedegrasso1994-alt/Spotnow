import test from 'node:test';
import assert from 'node:assert/strict';
import {database,seed,asUser,admin,ids} from './helpers/database.js';
const {a,b,c,v,q}=ids;
const noPrivateFields=rows=>{for(const row of rows){assert.equal(Object.hasOwn(row,'preference'),false);if(Object.hasOwn(row,'checked_in_at'))assert.equal(row.checked_in_at,null);if(Object.hasOwn(row,'expires_at'))assert.equal(row.expires_at,null);}};
const discovery=async(db,live)=>Promise.all([
 db.query('select * from public.location_people($1,$2)',[v,live]),
 db.query('select * from public.location_people_page($1,$2)',[v,live]),
 db.query('select * from public.location_people_photos_page($1,$2)',[v,live])
]);

test('SEC-01 SELF: own full profile, first INSERT and UPSERT RETURNING keep preference',async t=>{
 const db=await database();t.after(()=>db.close());await seed(db);await asUser(db,a);
 assert.equal((await db.query('select * from public.profiles where id=$1',[a])).rows[0].preference,'ALL');
 const upsert=(await db.query(`insert into public.profiles(id,name,age,gender,preference,photo_path) values($1,'Anna',24,'F','M',$2) on conflict(id) do update set preference=excluded.preference returning *`,[a,`${a}/a.png`])).rows[0];assert.equal(upsert.preference,'M');
 await db.query("update public.profiles set preference='F' where id=$1 returning *",[a]);assert.equal((await db.query('select preference from public.profiles')).rows[0].preference,'F');
 const d='10000000-0000-0000-0000-000000000004';await admin(db);await db.query('insert into auth.users(id) values($1)',[d]);await db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)",[`${d}/d.png`]);await asUser(db,d);
 const inserted=(await db.query(`insert into public.profiles(id,name,age,gender,preference,photo_path) values($1,'Demo',22,'M','ALL',$2) returning *`,[d,`${d}/d.png`])).rows[0];assert.equal(inserted.preference,'ALL');
});

test('SEC-01 adversarial: authorized peers cannot read each other through direct, JSON, join, filter or write-returning queries',async t=>{
 const db=await database();t.after(()=>db.close());await seed(db);
 for(const user of [a,b]){await asUser(db,user);await db.query('select public.check_in($1)',[q]);}
 for(const [caller,target] of [[a,b],[b,a]]){
  await asUser(db,caller);
  const publicRows=(await db.query('select * from public.visible_profiles()')).rows;assert.deepEqual(publicRows.map(p=>p.id),[target]);noPrivateFields(publicRows);
  for(const sql of [
   'select * from public.profiles where id=$1',
   'select preference from public.profiles where id=$1',
   'select to_jsonb(p) from public.profiles p where id=$1',
   'select p from public.profiles p where id=$1',
   'select p.preference from public.venues v join public.profiles p on p.id=$1',
   "select id from public.profiles where id=$1 and preference in ('M','F','ALL')",
   "update public.profiles set preference='ALL' where id=$1 returning preference"
  ])assert.deepEqual((await db.query(sql,[target])).rows,[],sql);
  assert.deepEqual((await db.query('select id from public.profiles')).rows.map(p=>p.id),[caller]);
  for(const result of await discovery(db,true))noPrivateFields(result.rows);
 }
 await admin(db);await db.exec('set role anon');await assert.rejects(db.query('select * from public.profiles'));await assert.rejects(db.query('select * from public.visible_profiles()'));
});

test('SEC-01 discovery: all M/F/ALL filters remain server-side in Ora and Tribe; LOC-01 stays minimized',async t=>{
 const db=await database();t.after(()=>db.close());await seed(db);
 for(const user of [a,b,c]){await asUser(db,user);await db.query('select public.check_in($1)',[q]);}
 const checkFilters=async live=>{for(const [preference,expected] of [['M',[b]],['F',[c]],['ALL',[b,c]]]){
  await db.query('update public.profiles set preference=$1 where id=$2',[preference,a]);
  for(const result of await discovery(db,live)){assert.deepEqual(result.rows.map(p=>p.id).sort(),expected.slice().sort());noPrivateFields(result.rows);}
 }};
 await asUser(db,a);await checkFilters(true);
 await admin(db);await db.query("update public.checkins set checked_in_at=now()-interval '90 minutes',expires_at=now() where user_id<>$1",[a]);await asUser(db,a);
 for(const result of await discovery(db,true))assert.deepEqual(result.rows,[]);await checkFilters(false);
});

test('SEC-01 compatibility: Spot, Match, Chat, private photo APIs, Report and Block expose no preference',async t=>{
 const db=await database();t.after(()=>db.close());await seed(db);
 const path=`${b}/b.png`,preview='data:image/jpeg;base64,YQ==';
 await asUser(db,b);await db.query('select public.check_in($1)',[q]);await db.query('select public.save_my_photo_preview($1,$2)',[path,preview]);
 await asUser(db,a);await db.query('select public.check_in($1)',[q]);assert.equal((await db.query('select name from storage.objects where name=$1',[path])).rows.length,1);
 const photo=(await db.query('select * from public.photo_asset_status($1)',[path])).rows;assert.equal(photo.length,1);noPrivateFields(photo);
 await db.query('select public.send_spot($1,$2)',[b,v]);await asUser(db,b);const match=(await db.query('select public.send_spot($1,$2) as id',[a,v])).rows[0].id;assert.ok(match);
 await asUser(db,a);for(const rpc of ['my_matches','my_matches_page','my_matches_photos_page']){const rows=(await db.query(`select * from public.${rpc}()`)).rows;assert.equal(rows[0].person_id,b);noPrivateFields(rows);}
 await db.query('select public.send_message($1,$2,gen_random_uuid())',[match,'Ciao']);await asUser(db,b);assert.equal((await db.query('select body from public.messages where match_id=$1',[match])).rows[0].body,'Ciao');
 await asUser(db,a);await db.query("select public.report_profile($1,'other','Test',false,gen_random_uuid())",[b]);await admin(db);await db.query('insert into spot_private.moderators(user_id) values($1)',[a]);await asUser(db,a);
 const reports=(await db.query('select public.moderation_reports() as reports')).rows[0].reports;assert.equal(reports.length,1);noPrivateFields(reports);
 await db.query('select public.block_profile($1)',[b]);assert.deepEqual((await db.query('select * from public.visible_profiles()')).rows,[]);assert.deepEqual((await db.query('select * from public.photo_asset_status($1)',[path])).rows,[]);assert.deepEqual((await db.query('select * from public.my_matches()')).rows,[]);
});
