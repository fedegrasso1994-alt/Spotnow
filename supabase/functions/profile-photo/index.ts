import {createClient}from 'npm:@supabase/supabase-js@2.117.2';
import {profilePhotoHandler}from '../_shared/profile-photo.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
Deno.serve(profilePhotoHandler({admin}));
