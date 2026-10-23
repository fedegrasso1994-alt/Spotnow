import {operationalHandler,operationalRecorder} from '../_shared/operational-edge.js';
import {createClient}from 'npm:@supabase/supabase-js@2.117.2';
import {profilePhotoHandler}from '../_shared/profile-photo.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
Deno.serve(operationalHandler('photo.sign',profilePhotoHandler({admin}),{record:operationalRecorder(admin),job:false,summary:false}));
