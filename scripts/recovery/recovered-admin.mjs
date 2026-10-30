/** Local provider client only. Never reads a staging server key or logs capabilities. */
import{createClient}from'@supabase/supabase-js';import{targetEnvironment,TARGET}from'./local-target.mjs';import{recoveredHttp}from'./recovered-http.mjs';
export async function recoveredAdmin(){const env=await targetEnvironment(TARGET.storage);return createClient('http://recovered.invalid',env.SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
 const u=new URL(typeof input==='string'?input:input.url);if(u.hostname!=='recovered.invalid')throw Error('RECOVERY_ADMIN_SCOPE');const route=[['/auth/v1','auth'],['/rest/v1','rest'],['/storage/v1','storage']].find(([p])=>u.pathname.startsWith(p+'/'));if(!route)throw Error('RECOVERY_ADMIN_SCOPE');
 const r=await recoveredHttp(route[1],u.pathname.slice(route[0].length)+u.search,{method:init?.method||'GET',headers:Object.fromEntries(new Headers(init?.headers)),body:init?.body});return new Response(r.status===204?null:r.bytes,{status:r.status,headers:{'content-type':r.contentType||'application/json'}});
 }}});}
