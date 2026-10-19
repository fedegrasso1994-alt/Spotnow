import {readFile} from 'node:fs/promises';
import {policyDatabase,enableFixture,admin,asUser,ids} from './discovery-policy-database.js';
export {admin,asUser,ids};
export async function wrapperDatabase(t,n=6,{fixed=true}={}){
 const d=await policyDatabase(t,n);await admin(d);
 await d.exec(await readFile('supabase/migrations/039_dd_outgoing_spot_state.sql','utf8'));
 if(fixed)await d.exec(await readFile('supabase/migrations/040_dd_idempotent_window_read.sql','utf8'));
 await enableFixture(d);await admin(d);
 // Disposable local database only. Frozen synthetic current bounds keep CI tests
 // deterministic even at night; the hosted policy/clock is never changed.
 await d.exec(`create table spot_private.fixture_dd_clock as select (clock_timestamp()at time zone 'Europe/Rome')::date local_date,'morning'::text slot,greatest(clock_timestamp()-interval '1 minute',((clock_timestamp()at time zone 'Europe/Rome')::date)::timestamp at time zone 'Europe/Rome')starts_at,least(clock_timestamp()+interval '10 minutes',(((clock_timestamp()at time zone 'Europe/Rome')::date+1)::timestamp at time zone 'Europe/Rome'))ends_at;
 create or replace function spot_private.dd_clock_at(stamp timestamptz)returns table(local_date date,slot text,starts_at timestamptz,ends_at timestamptz,next_window_starts_at timestamptz)language sql stable security definer set search_path=''as $$select c.local_date,c.slot,c.starts_at,c.ends_at,c.ends_at from spot_private.fixture_dd_clock c$$`);
 await asUser(d,ids.a);return d;
}
export const current=d=>d.query('select public.my_daily_discovery()v').then(r=>r.rows[0].v);
export async function snapshot(d){await admin(d);const r=(await d.query(`select jsonb_build_object('windows',(select jsonb_agg(to_jsonb(w)order by id)from spot_private.discovery_windows w),'allocations',(select jsonb_agg(to_jsonb(a)order by user_id,window_id)from spot_private.discovery_allocations a),'exposures',(select jsonb_agg(to_jsonb(e)order by id)from spot_private.discovery_exposures e),'fairness',(select jsonb_agg(to_jsonb(f)order by user_id,bucket_date)from spot_private.discovery_fairness_buckets f),'memory',(select jsonb_agg(to_jsonb(m)order by user_a,user_b)from spot_private.discovery_pair_memory m),'intents',(select jsonb_agg(to_jsonb(i)order by id)from spot_private.spot_v2_intents i),'operations',(select jsonb_agg(to_jsonb(o)order by operation_id)from spot_private.spot_v2_operations o))v`)).rows[0].v;await asUser(d,ids.a);return r;}
