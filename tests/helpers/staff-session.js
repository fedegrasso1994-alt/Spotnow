import {admin,asUser,uuid} from './qod-database.js';
// Synthetic PostgreSQL Auth rows only, never provider JWTs or real sessions.
export async function staffSession(d,person,level='aal2',sessionId=null){
 await admin(d);
 const sid=sessionId||uuid();
 // The DD fixture freezes pg_catalog.clock_timestamp: explicitly model a
 // later login at full PostgreSQL microsecond precision, no wall-clock sleeps.
 if(!sessionId)await d.query("select set_config('soma.test_clock',(greatest(clock_timestamp(),(select max(session_not_before)from spot_private.moderation_roles))+interval '1 microsecond')::text,false)");
 if(!sessionId)await d.query(`insert into auth.sessions(id,user_id,aal,factor_id)
 values($1,$2,$3,(select id from auth.mfa_factors where user_id=$2 and status='verified' limit 1))`,[sid,person,level]);
 await asUser(d,person);
 await d.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({aal:level,session_id:sid})]);
 return sid;
}
