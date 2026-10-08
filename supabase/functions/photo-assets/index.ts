import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {photoUploadHandler} from '../_shared/photo-upload.js';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
Deno.serve(photoUploadHandler({admin,url,serviceKey,memory:()=>Deno.memoryUsage(),normalizeLegacy:false}));
