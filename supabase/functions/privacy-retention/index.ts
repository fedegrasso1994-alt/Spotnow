import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {privacyRetentionHandler} from '../_shared/privacy-retention.js';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
// A previously issued service JWT may differ from the runtime key. Verify its database role,
// never trust an unsigned JWT payload or a successful generic Auth request.
const authorizeService=async(token:string)=>{
 const r=await fetch(url+'/rest/v1/rpc/privacy_retention_status',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
 if(!r.ok)return false;const data=await r.json();return typeof data?.paused==='boolean'&&Array.isArray(data?.policies);
};
Deno.serve(request=>privacyRetentionHandler(request,{admin,serviceKey,url,authorizeService}));
