import{readFile}from'node:fs/promises';
import{spotDatabase,ids,users,asUser,admin,send,budget,exposure}from'./spot-database.js';
export{ids,users,asUser,admin,send,budget,exposure};
export const places=[ids.v,ids.w,'ef610000-0000-4000-8000-000000000003','ef610000-0000-4000-8000-000000000004'];
export async function oraQuotaDatabase(t){const d=await spotDatabase(t);await admin(d);for(const id of places.slice(2))await d.query("insert into public.venues(id,name,address,ora_enabled)values($1,'SYNTHETIC ORA QUOTA','Synthetic',true)",[id]);await d.exec(await readFile('supabase/migrations/061_ora_location_daily_quota.sql','utf8'));await asUser(d,ids.a);return d;}
export const start=(d,p)=>d.query('select start_ora_manual($1)v',[p]).then(r=>r.rows[0].v);
export async function setClock(d,stamp){await admin(d);await d.query("select set_config('soma.test_clock',$1,false)",[stamp]);await d.exec("create or replace function pg_catalog.clock_timestamp()returns timestamptz language sql volatile as $$select current_setting('soma.test_clock')::timestamptz$$;create or replace function pg_catalog.statement_timestamp()returns timestamptz language sql stable as $$select current_setting('soma.test_clock')::timestamptz$$");await asUser(d,ids.a);}
