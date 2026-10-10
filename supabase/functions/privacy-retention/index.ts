import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {privacyRetentionHandler} from '../_shared/privacy-retention.js';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(request=>privacyRetentionHandler(request,{admin,serviceKey,url}));
