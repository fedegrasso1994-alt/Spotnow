import{readFile}from'node:fs/promises';import{spotDatabase,ids,users,asUser,admin}from'./spot-database.js';
export{ids,users,asUser,admin};
export async function discoveryDatabase(t,n=12){const d=await spotDatabase(t);await admin(d);await d.exec(await readFile('supabase/migrations/036_profile_photo_authorization.sql','utf8'));await d.exec(await readFile('supabase/migrations/037_daily_discovery_engine.sql','utf8'));
 await d.exec("delete from public.checkins;update spot_private.discovery_policy set enabled=true,paused=false,exposure_retention=interval '2 days',fairness_retention=interval '14 days',pair_memory_retention=interval '14 days';update spot_private.soma_v2_control set discovery_enabled=true;");
 for(const id of users.slice(0,n)){await asUser(d,id);await d.query('select join_tribe($1)',[ids.v]);}await asUser(d,ids.a);return d;
}
export async function window(d,slot='morning',generation='10000000-0000-4000-8000-000000000001'){
 await admin(d);const w=(await d.query("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at,generation_id)values((clock_timestamp()at time zone 'Europe/Rome')::date,$1,1,greatest(clock_timestamp()-interval '1 minute',((clock_timestamp()at time zone 'Europe/Rome')::date)::timestamp at time zone 'Europe/Rome'),least(clock_timestamp()+interval '20 minutes',(((clock_timestamp()at time zone 'Europe/Rome')::date+1)::timestamp at time zone 'Europe/Rome')),$2)returning id",[slot,generation])).rows[0].id;await asUser(d,ids.a);return w;
}
export const drop=d=>d.query('select my_daily_discovery()v').then(r=>r.rows[0].v);
export const tribeSpot=(d,to,op=crypto.randomUUID())=>d.query('select send_tribe_spot($1,$2)v',[to,op]).then(r=>r.rows[0].v);
export async function closeWindow(d,w){await admin(d);await d.query("update spot_private.discovery_windows set state='closed'where id=$1",[w]);await asUser(d,ids.a);}
