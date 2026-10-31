// Disposable PostgreSQL test fixture: latest combined romantic-surface contract.
import {readFile} from 'node:fs/promises';
import {chanceFullDatabase,admin,asUser,ids} from './chance-full-database.js';
import {chanceClock,enableChance} from './chance-database.js';
export {admin,asUser,ids};
export async function romanticSurfacesDatabase(t){
 const d=await chanceFullDatabase(t);await admin(d);
 await d.exec(await readFile('supabase/migrations/061_ora_location_daily_quota.sql','utf8'));
 await d.exec("create or replace function pg_catalog.statement_timestamp()returns timestamptz language sql stable as $$select current_setting('soma.test_clock')::timestamptz$$");
 await d.exec('insert into spot_private.analytics_admission select id from auth.users;update spot_private.analytics_control set enabled=true');
 await chanceClock(d,'2030-06-10T07:00:00Z');await enableChance(d);await chanceClock(d,'2030-06-10T19:31:00Z');return d;
}
export async function quotaSnapshot(d,actor=ids.a){
 await admin(d);
 return (await d.query(`select jsonb_build_object(
 'chance',(select coalesce(jsonb_agg(to_jsonb(s) order by s.exposure_id),'[]')from spot_private.chance_state s where user_id=$1),
 'romantic',(select coalesce(jsonb_agg(to_jsonb(q) order by day),'[]')from spot_private.board_request_quota q where user_id=$1),
 'ora',(select coalesce(jsonb_agg(to_jsonb(q) order by local_date,place_id),'[]')from spot_private.ora_spot_place_quota q where user_id=$1))v`,[actor])).rows[0].v;
}
