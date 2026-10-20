import {readFile}from'node:fs/promises';
import {spotDatabase,ids,users,asUser,admin}from'./spot-database.js';
export{ids,users,asUser,admin};
export const uuid=()=>crypto.randomUUID();
export const call=async(d,q,args=[])=>(await d.query('select '+q+' v',args)).rows[0].v;
export async function romanticDatabase(t){
 const d=await spotDatabase(t);await admin(d);
 for(const f of ['036_profile_photo_authorization.sql','037_daily_discovery_engine.sql','038_daily_discovery_policy.sql','039_dd_outgoing_spot_state.sql','040_dd_idempotent_window_read.sql','041_dd_controlled_admission.sql','042_spotted_social_core.sql','043_spotted_romantic_requests.sql','044_romantic_overquota_minimization.sql','046_spotted_remove_daily_post_quota.sql'])await d.exec(await readFile('supabase/migrations/'+f,'utf8'));
 await d.exec('delete from public.checkins;update spot_private.soma_v2_control set comments_enabled=true,requests_enabled=true,discovery_enabled=false');
 for(const u of users.slice(0,6)){await asUser(d,u);await d.query('select join_tribe($1)',[ids.v]);}
 await asUser(d,ids.a);return d;
}
export const post=async(d,text='Synthetic romantic origin',place=ids.v)=>call(d,'spotted_create_post($1,$2,$3)',[place,text,await call(d,'board_operation($1)',[place])]);
export const submit=(d,id,kind='post',op=uuid())=>call(d,'spotted_romantic_submit($1,$2,$3)',[id,kind,op]);
export const inbox=d=>call(d,'spotted_romantic_inbox()');
export const decide=(d,id,accept)=>call(d,'spotted_romantic_decide($1,$2)',[id,accept]);
export const setting=d=>call(d,'spotted_romantic_settings()');
export const opt=(d,value)=>call(d,'spotted_romantic_opt_in($1)',[value]);
export const profile=(d,id)=>d.query('select *from authorized_profile($1)',[id]).then(r=>r.rows);
export const count=async(d,table)=>{await admin(d);return Number((await d.query('select count(*)n from '+table)).rows[0].n);};
