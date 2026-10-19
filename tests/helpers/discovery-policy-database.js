import{readFile}from'node:fs/promises';import{discoveryDatabase,admin,asUser,ids}from'./discovery-database.js';
export{admin,asUser,ids};
export async function policyDatabase(t,n=6){const d=await discoveryDatabase(t,n);await admin(d);await d.exec('update spot_private.soma_v2_control set discovery_enabled=false');await d.exec(await readFile('supabase/migrations/038_daily_discovery_policy.sql','utf8'));return d;}
export async function enableFixture(d){await admin(d);await d.exec('update spot_private.soma_v2_control set discovery_enabled=true;update spot_private.discovery_policy set enabled=true,paused=false where version=2');await asUser(d,ids.a);}
export async function projection(d,user=ids.a){await admin(d);await d.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);const r=(await d.query('select spot_private.dd_current_projection()v')).rows[0].v;await asUser(d,user);return r;}
