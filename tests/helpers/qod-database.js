import{readFile}from'node:fs/promises';
import{romanticDatabase,ids,users,asUser,admin,call,uuid}from'./romantic-database.js';
import{freezeDiscoveryTestClock}from'./discovery-test-clock.js';
export{ids,users,asUser,admin,call,uuid};
export async function editorial(d){await admin(d);await d.query("select set_config('request.jwt.claim.sub','',false)");}
export async function qodDatabase(t){const d=await romanticDatabase(t);await editorial(d);await d.exec(await readFile('supabase/migrations/047_spotted_qod.sql','utf8'));await freezeDiscoveryTestClock(d,'2026-10-21T12:00:00+02:00');await d.exec('update spot_private.soma_v2_control set system_posts_enabled=true');await asUser(d,ids.a);return d;}
export async function publish(d,place=ids.v,day='2026-10-21'){await editorial(d);const id=await call(d,'spot_private.qod_publish($1,$2,$3)',[place,day,'Quale piccolo gesto ti fa sorridere?']);await asUser(d,ids.a);return id;}
export const nonce=(d,place=ids.v)=>call(d,'board_operation($1)',[place]);
export const answer=async(d,q,text='Una risposta sintetica',op=null)=>call(d,'spotted_qod_answer($1,$2,$3)',[q,text,op||await nonce(d)]);
export const question=(d,place=ids.v)=>call(d,'spotted_qod($1)',[place]);
export const answers=(d,q,after=null)=>call(d,'spotted_qod_answers($1,$2)',[q,after]);
