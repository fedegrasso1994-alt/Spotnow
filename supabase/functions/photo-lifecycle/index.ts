import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {photoLifecycleHandler} from '../_shared/photo-lifecycle.js';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
Deno.serve(photoLifecycleHandler({admin,serviceKey,authorize:async token=>{const r=await fetch(url+'/rest/v1/rpc/photo_processing_authorized',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});return r.ok&&(await r.json())===true;},log:summary=>console.log(JSON.stringify(summary))}));
