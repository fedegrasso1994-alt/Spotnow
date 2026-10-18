import {readFile}from 'node:fs/promises';
import {database,seed,ids,asUser,admin}from './database.js';
export {ids,asUser,admin};
export const users=Array.from({length:12},(_,i)=>`10000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
export async function spotDatabase(t,{legacy=false}={}){
 const d=await database();t.after(()=>d.close());await seed(d);
 for(const id of users.slice(3))await d.query(`insert into auth.users values($1,false);`,[id]);
 for(const id of users.slice(3)){await d.query("insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)values($1,$2,'data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1)",[id+'/fixture.jpg',id]);await d.query("insert into public.profiles(id,name,age,gender,preference,photo_path)values($1,'SYNTHETIC',25,'M','ALL',$2)",[id,id+'/fixture.jpg']);}
 await d.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb,add column banned_until timestamptz');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql','028_ora_spot_quota_schema_off.sql','030_tribe_membership_engine.sql','031_signup_without_qr.sql','032_places_ora_v2.sql','033_privacy_welcome_checkbox.sql']){if(f.startsWith('025'))await d.exec("update spot_private.privacy_environment set environment='staging'");await d.exec(await readFile('supabase/migrations/'+f,'utf8'));}
 await d.exec(`set soma.photo_protocol='PHOTO02';update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into spot_private.consent_state(user_id,status,version)select u.id,'active',v.version from auth.users u cross join spot_private.consent_versions v where v.required;
 update public.profiles set preference='ALL';insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues;
 update public.venues set ora_enabled=true;update spot_private.soma_v2_control set ora_enabled=true;`);
 if(legacy)await d.query("insert into spot_private.interests(sender_id,recipient_id,venue_id,created_at)values($1,$2,$3,now()-interval '2 days')",[ids.a,ids.b,ids.v]);
 await d.exec(await readFile('supabase/migrations/034_spot_v2_engine.sql','utf8'));
 await d.exec(await readFile('supabase/migrations/035_spot_v2_isolation_guard.sql','utf8'));
 await d.exec('update spot_private.soma_v2_control set spot_enabled=true;update spot_private.ora_spot_policy set enabled=true');
 for(const u of users){await asUser(d,u);await d.query('select start_ora_manual($1)',[ids.v]);}await asUser(d,ids.a);return d;
}
export const send=(d,to,op=crypto.randomUUID(),origin='ora',exposure=null)=>d.query('select send_spot_v2($1,$2,$3,$4)v',[to,op,origin,exposure]).then(r=>r.rows[0].v);
export const budget=d=>d.query('select my_ora_spot_budget()v').then(r=>r.rows[0].v);
export async function exposure(d,a,b){await admin(d);await d.exec("update spot_private.soma_v2_control set discovery_enabled=true;update spot_private.discovery_policy set enabled=true,paused=false;");for(const u of[a,b]){await asUser(d,u);await d.query('select join_tribe($1)',[ids.v]);}await admin(d);
 const w=(await d.query("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at,state)values(current_date,'morning',1,now()-interval '1 hour',now()+interval '1 hour','ready')on conflict(local_date,slot)do update set state='ready' returning id")).rows[0].id;
 return(await d.query('insert into spot_private.discovery_exposures(window_id,user_a,user_b,tribe_id,membership_a,membership_b)select $1,least($2::uuid,$3::uuid),greatest($2::uuid,$3::uuid),$4,a.membership_id,b.membership_id from spot_private.tribe_memberships a join spot_private.tribe_memberships b on b.venue_id=a.venue_id where a.user_id=least($2::uuid,$3::uuid)and b.user_id=greatest($2::uuid,$3::uuid)and a.venue_id=$4 returning id',[w,a,b,ids.v])).rows[0].id;
}
