/** Normal account-deletion path for this drill's synthetic principals only. */
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {loadPrivate,erasePrivate} from './private-state.mjs';
if(process.argv[2]!=='--execute-synthetic-cleanup')throw Error('RECOVERY_EXPLICIT_ACTION');
try{
 const state=await loadPrivate(),c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));
 if(c.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('RECOVERY_SOURCE_SCOPE');
 const result=[];
 for(const actor of state.actors){
  const client=createClient(c.url,c.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await client.auth.signInWithPassword({email:actor.email,password:actor.password});
  if(login.error)throw Error('RECOVERY_CLEANUP_LOGIN');
  const u=login.data.user;
  if(u.id!==actor.id||u.user_metadata?.synthetic!==true||u.user_metadata?.recovery_v3!==true)throw Error('RECOVERY_CLEANUP_OWNERSHIP');
  const r=await fetch(c.url+'/functions/v1/delete-account',{method:'POST',headers:{apikey:c.publicKey,Authorization:'Bearer '+login.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({confirm:true}),signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('RECOVERY_CLEANUP_HTTP_'+r.status);
  // A fresh password login must no longer produce a source session.
  const again=await client.auth.signInWithPassword({email:actor.email,password:actor.password});
  if(!again.error)throw Error('RECOVERY_CLEANUP_IDENTITY_REMAINS');
  result.push({role:actor.role,deleted:true,fresh_login_denied:true});
 }
 await erasePrivate();
 await writeFile('.local/recovery-v3/cleanup.json',JSON.stringify({pass:true,actors:result,capabilities_erased:true},null,2),{mode:0o600});
 console.log(JSON.stringify({pass:true,actors:result,capabilities_erased:true}));
}catch(error){console.error(JSON.stringify({pass:false,code:/^[A-Z_0-9]+$/.test(error.message)?error.message:'RECOVERY_CLEANUP_FAILED'}));process.exitCode=1;}
