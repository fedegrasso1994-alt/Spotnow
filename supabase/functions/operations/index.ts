import {retentionPhaseA,retentionServiceAuthorized} from '../_shared/retention-phase-a.js';
import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {operationalHandler,operationalRecorder} from '../_shared/operational-edge.js';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(5000)})}});
// Fixed manual service-only entry; no cron, arbitrary RPC, account or product target.
Deno.serve(async request=>{
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(new URL(url).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')return reply({error:'STAGING_ONLY'},503);
 if(request.method!=='POST')return reply({error:'METHOD'},405);
 const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!await retentionServiceAuthorized(token,{url,key}))return reply({error:'AUTH'},403);
 let body;try{const text=await request.text();if(text.length>256)return reply({error:'INPUT'},400);body=JSON.parse(text);}catch{return reply({error:'INPUT'},400);}
 if(body.action==='phase_a_run'){try{return reply(await retentionPhaseA(admin,body));}catch{return reply({error:'INPUT'},400);}}
 if(!['diagnostic_purge','analytics_purge'].includes(body.action)||typeof body.dry_run!=='boolean')return reply({error:'INPUT'},400);
 return operationalHandler(body.action==='analytics_purge'?'analytics.purge':'ops.purge',async()=>{const r=await admin.rpc(body.action==='analytics_purge'?'analytics_purge':'ops_purge',{dry_run:body.dry_run});return r.error?reply({error:'PURGE_FAILED'},503):reply(r.data);},{record:operationalRecorder(admin),job:true,summary:true})(request);
});
