// Manual staging-only canary. Never imported by application or CI.
import'./dns.mjs';import{readFile}from'node:fs/promises';import{createClient}from'@supabase/supabase-js';import{createBackend}from'../../src/backend.js';import{createChanceApi}from'../../src/chance-api.js';
export const root='.local/chance-staging';
const config=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));
if(config.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co'||!config.publicKey.startsWith('sb_publishable_')||!config.serverKey.startsWith('sb_secret_'))throw Error('STAGING_MODERN_CONFIG_REQUIRED');
export const fixtures=JSON.parse(await readFile(root+'/fixtures.json','utf8'));
export const server=createClient(config.url,config.serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
export async function login(i){const f=fixtures[i],c=createClient(config.url,config.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});const r=await c.auth.signInWithPassword({email:f.email,password:f.password});if(r.error)throw Error('FIXTURE_LOGIN_'+r.error.status);return{c,id:f.id,b:createBackend(c,{privacyEnabled:true,onboardingEnabled:true,oraEnabled:true,spotV2Enabled:true,profileAuthorizationEnabled:true}),chance:createChanceApi(c)};}
