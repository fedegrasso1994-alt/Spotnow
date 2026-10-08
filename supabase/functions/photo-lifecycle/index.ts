import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {photoLifecycleHandler} from '../_shared/photo-lifecycle.js';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
Deno.serve(photoLifecycleHandler({admin,serviceKey,log:summary=>console.log(JSON.stringify(summary))}));
