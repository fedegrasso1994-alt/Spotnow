import {createHash}from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from 'node:fs/promises';
import {spotDatabase,ids,asUser,admin,send,exposure}from './helpers/spot-database.js';
import {profilePhotoHandler}from '../supabase/functions/_shared/profile-photo.js';
import {profileAuthorizationEnabled,createProfileAuthorizationApi}from '../src/profile-authorization.js';
async function setup(t){const d=await spotDatabase(t);await admin(d);await d.exec(await readFile('supabase/migrations/036_profile_photo_authorization.sql','utf8'));await asUser(d,ids.a);return d;}
const ref=(id,path)=>`profile:${id}:${createHash('md5').update(path).digest('hex')}:canonical`;
const profile=async(d,id=ids.b)=>(await d.query('select * from authorized_profile($1)',[id])).rows;
const exit=async(d,id)=>{await asUser(d,id);const p=(await d.query('select my_presence()v')).rows[0].v;if(p)await d.query('select end_ora($1)',[p.presence_id]);};
async function resolve(d,viewer,ref){await admin(d);return(await d.query('select * from resolve_authorized_photos($1,$2)',[viewer,[ref]])).rows;}

test('AUTHZ live ORA minimal projection + self RLS/edit; explicit signer resolution and no direct Storage signing',async t=>{
 const d=await setup(t);const p=(await profile(d))[0];assert.ok(p);assert.deepEqual(Object.keys(p).sort(),['id','name','age','gender','occupation','photo_path','thumbnail_path','detail_path'].sort());assert.equal(p.photo_path,ref(ids.b,ids.b+'/b.png'));
 assert.equal((await d.query('select * from profiles')).rows.length,1);assert.equal((await profile(d,ids.a)).length,1);await d.query("update profiles set occupation='Synthetic'where id=$1",[ids.a]);assert.equal((await d.query('select occupation from profiles')).rows[0].occupation,'Synthetic');
 assert.equal((await d.query('select * from storage.objects')).rows.length,0);await assert.rejects(d.query('select * from resolve_authorized_photos($1,$2)',[ids.a,[]]),/permission denied/);
 assert.equal((await resolve(d,ids.a,ref(ids.b,ids.b+'/b.png'))).length,1);assert.equal((await resolve(d,ids.a,ids.a+'/a.png')).length,1);
});
test('AUTHZ same Tribe/known UUID/social UUID/past membership/pending Spot never authorize after live exit',async t=>{
 const d=await setup(t);for(const u of[ids.a,ids.b]){await asUser(d,u);await d.query('select join_tribe($1)',[ids.v]);}await asUser(d,ids.a);await send(d,ids.b);await exit(d,ids.b);await asUser(d,ids.a);
 assert.equal((await profile(d)).length,0);assert.equal((await profile(d,crypto.randomUUID())).length,0);assert.equal((await d.query('select * from profiles where id=$1',[ids.b])).rows.length,0);
 for(const call of['visible_profiles()','location_people($1,false)','location_people_page($1,false)','location_people_photos_page($1,false)'])await assert.rejects(d.query('select * from '+call,call.includes('$1')?[ids.v]:[]),/permission denied/);
 assert.equal((await resolve(d,ids.a,ref(ids.b,ids.b+'/b.png'))).length,0);assert.equal((await resolve(d,ids.a,ids.b+'/b.png')).length,0);
});
test('AUTHZ ORA zero-Tribe QR, different Place, expired target/viewer, historical presence',async t=>{
 const d=await setup(t);await admin(d);assert.equal((await d.query('select count(*)n from spot_private.tribe_memberships')).rows[0].n,0);await exit(d,ids.a);await d.query('select start_ora_qr($1)',[ids.q]);assert.equal((await profile(d)).length,1);
 await asUser(d,ids.b);await d.query('select start_ora_manual($1)',[ids.w]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);
 await asUser(d,ids.b);await d.query('select start_ora_manual($1)',[ids.v]);for(const u of[ids.b,ids.a]){await admin(d);await d.query("update checkins set checked_in_at=now()-interval '5 hours',expires_at=now()-interval '1 hour'where user_id=$1",[u]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);await asUser(d,u);await d.query('select start_ora_manual($1)',[ids.v]);}
});
test('AUTHZ reciprocal Spot Match persists ORA exit/Tribe leave/consent revoke; block overrides Match',async t=>{
 const d=await setup(t);await send(d,ids.b);await asUser(d,ids.b);const m=await send(d,ids.a);assert.ok(m.match_id);await exit(d,ids.a);await exit(d,ids.b);await asUser(d,ids.a);assert.equal((await profile(d)).length,1);
 await d.query('select join_tribe($1)',[ids.v]);await d.query('select leave_tribe($1)',[ids.v]);await d.query('select revoke_dating_consent($1)',[crypto.randomUUID()]);assert.equal((await profile(d)).length,1);assert.equal((await d.query('select * from my_matches_photos_page()')).rows[0].photo_path,ref(ids.b,ids.b+'/b.png'));
 await d.query('insert into blocks values($1,$2)',[ids.a,ids.b]);assert.equal((await profile(d)).length,0);assert.equal((await resolve(d,ids.a,ref(ids.b,ids.b+'/b.png'))).length,0);
});
test('AUTHZ controlled DD structural exposure expires; membership leave and feature OFF invalidate; pending Spot not browsing permission',async t=>{
 const d=await setup(t);const e=await exposure(d,ids.a,ids.b);await asUser(d,ids.a);await send(d,ids.b,crypto.randomUUID(),'tribe',e);await exit(d,ids.a);await exit(d,ids.b);await asUser(d,ids.a);assert.equal((await profile(d)).length,1);
 await admin(d);await d.exec("update spot_private.discovery_windows set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour'");await asUser(d,ids.a);assert.equal((await profile(d)).length,0);
 await admin(d);await d.exec("update spot_private.discovery_windows set ends_at=now()+interval '1 hour';update spot_private.soma_v2_control set discovery_enabled=false");await asUser(d,ids.a);assert.equal((await profile(d)).length,0);
 await admin(d);await d.exec('update spot_private.soma_v2_control set discovery_enabled=true');await asUser(d,ids.b);await d.query('select leave_tribe($1)',[ids.v]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);
});
test('AUTHZ SPOTTED future seam grants nothing in either direction; private helper inaccessible; safety/ban/AGE override live access',async t=>{
 const d=await setup(t);await admin(d);for(const [a,b]of[[ids.a,ids.b],[ids.b,ids.a]])assert.equal((await d.query('select spot_private.profile_request_authorized($1,$2)v',[a,b])).rows[0].v,false);
 await d.query("update auth.users set banned_until=now()+interval '1 day'where id=$1",[ids.b]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);await assert.rejects(d.query('select spot_private.profile_request_authorized($1,$2)',[ids.a,ids.b]),/permission denied/);
 await admin(d);await d.query('update auth.users set banned_until=null where id=$1',[ids.b]);await d.query("update spot_private.account_eligibility set status='confirmation_required'where user_id=$1",[ids.b]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);
});
function fakeAdmin(){const calls=[];return {calls,auth:{getUser:async token=>token==='valid'?{data:{user:{id:ids.a,is_anonymous:false}}}:{error:{}}},rpc:async(name,args)=>{calls.push({name,args});return {data:args.refs.filter(r=>r==='allowed').map(ref=>({ref,object_name:'private/canonical.jpg'}))};},storage:{from:()=>({createSignedUrls:async(paths,ttl)=>{calls.push({paths,ttl});return {data:paths.map(path=>({path,signedUrl:'https://signed.invalid/short'}))};}})}};}
const req=(body,token='valid')=>new Request('https://staging.invalid/profile-photo',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('AUTHZ photo endpoint validates Auth subject, never trusts viewer/TTL/path assertion, bounded body and server TTL',async()=>{
 const a=fakeAdmin(),handler=profilePhotoHandler({admin:a});assert.equal((await handler(req({refs:['allowed']},'invalid'))).status,401);
 const response=await handler(req({refs:['allowed','denied'],viewer:ids.b,expiresIn:999999}));assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{photos:[{ref:'allowed',url:'https://signed.invalid/short'}],expires_in:30});assert.equal(a.calls[0].args.viewer,ids.a);assert.equal(a.calls[1].ttl,30);
 assert.equal((await handler(req({refs:Array(49).fill('x')}))).status,400);assert.equal((await handler(req({refs:['x'.repeat(9000)]}))).status,400);assert.deepEqual(await(await handler(req({refs:['denied']}))).json(),{photos:[],expires_in:30});
});
test('AUTHZ frontend staging isolation and authorized profile/reference API',async()=>{
 assert.equal(profileAuthorizationEnabled({}),false);assert.throws(()=>profileAuthorizationEnabled({VITE_PROFILE_AUTHORIZATION_V2:'true',VITE_SUPABASE_URL:'https://production.invalid'}));const a=createProfileAuthorizationApi({rpc:async()=>({data:[]}),functions:{invoke:async()=>({data:{photos:[]}})}});assert.equal(await a.profile(ids.b),null);assert.equal((await a.photos(['x'])).size,0);
});

test('AUTHZ legacy readers cannot be reactivated via definer wrapper; anonymous/Storage/helper grants closed',async t=>{
 const d=await setup(t);await admin(d);for(const call of['location_people($1,false)','location_people_page($1,false)','location_people_photos_page($1,false)'])await assert.rejects(d.query('select * from '+call,[ids.v]),/PROFILE_READER_RETIRED/);
 assert.equal((await d.query('select * from visible_profiles()')).rows.length,0);await d.exec('set role anon');await assert.rejects(profile(d),/permission denied/);await asUser(d,ids.a);await assert.rejects(d.query('select * from photo_asset_status($1)',[ids.b+'/b.png']),/permission denied/);
});
test('AUTHZ current photo reference/version cannot point to replaced or arbitrary Storage file; variants governed by same graph',async t=>{
 const d=await setup(t);await admin(d);const base=ids.b+'/b.png';await d.query("insert into storage.objects(bucket_id,name)values('profile-photos',$1),('profile-photos',$2)",[base+'.thumb.jpg',base+'.detail.jpg']);
 assert.equal((await resolve(d,ids.a,ref(ids.b,base).replace(':canonical',':thumb'))).length,1);assert.equal((await resolve(d,ids.a,ref(ids.b,'invented'))).length,0);
 await exit(d,ids.b);assert.equal((await resolve(d,ids.a,ref(ids.b,base).replace(':canonical',':detail'))).length,0);
});
test('AUTHZ integrated social/rights/board/delete remains owner scoped after restrictive Storage boundary',async t=>{
 const d=await setup(t);await send(d,ids.b);await asUser(d,ids.b);const m=await send(d,ids.a);await d.query("select send_message($1,'SYNTHETIC',$2)",[m.match_id,crypto.randomUUID()]);await asUser(d,ids.a);assert.equal((await d.query('select body from messages where match_id=$1',[m.match_id])).rows[0].body,'SYNTHETIC');
 assert.equal((await d.query("select my_rights_page('profile')v")).rows[0].v.owner_id,ids.a);await d.query('select join_tribe($1)',[ids.v]);await admin(d);await d.query("update spot_private.account_deletions set user_id=user_id where false");await d.query('delete from auth.users where id=$1',[ids.b]);await asUser(d,ids.a);assert.equal((await profile(d)).length,0);assert.equal((await d.query('select * from matches')).rows.length,0);
});
