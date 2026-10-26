import {stagingServerKey,stagingAdminClient} from '../_shared/server-key.js';
/** Pre-017 compatibility artifact: deploy AS photo-assets only while schema is 016. */
import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {photoUploadHandler} from '../_shared/photo-upload.js';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=stagingServerKey(name=>Deno.env.get(name));
const admin=stagingAdminClient(createClient,url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
Deno.serve(photoUploadHandler({admin,url,serviceKey,memory:()=>Deno.memoryUsage(),normalizeLegacy:false,protocol:'bridge01'}));
