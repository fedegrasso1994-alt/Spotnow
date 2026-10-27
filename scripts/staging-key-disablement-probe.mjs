/** Read-only credential-class probe. Never prints or persists credential values. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const ref='zjinjtkekmaqtxsuyvho',url=`https://${ref}.supabase.co`;
const phase=process.argv[2];
assert.ok(['before','after'].includes(phase),'EXPLICIT_PROBE_PHASE_REQUIRED');
const c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));
assert.equal(c.url,url);
const {stdout}=await promisify(execFile)('/opt/homebrew/bin/supabase',['projects','api-keys','--project-ref',ref,'--reveal','--output','json'],{maxBuffer:2e6});
const parsed=JSON.parse(stdout),keys=Array.isArray(parsed)?parsed:parsed.api_keys||parsed.keys||parsed.result;
const value=k=>typeof k.api_key==='string'?k.api_key:k.api_key?.String;
const rows=[];
try {
 for(const name of ['anon','service_role']){
  const key=value(keys.find(k=>k.name===name&&k.type==='legacy'));
  assert.ok(key,'LEGACY_PROBE_KEY_UNAVAILABLE');
  const r=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},signal:AbortSignal.timeout(20000)});
  rows.push({credential_class:'legacy_'+name,operation:'auth_settings',status:r.status});
  assert.ok(phase==='before'?r.status===200:[401,403].includes(r.status),'LEGACY_ENFORCEMENT_MISMATCH');
 }
 const client=await fetch(url+'/auth/v1/settings',{headers:{apikey:c.publicKey},signal:AbortSignal.timeout(20000)});
 rows.push({credential_class:'modern_publishable',operation:'auth_settings',status:client.status});assert.equal(client.status,200);
 const server=await fetch(url+'/rest/v1/rpc/privacy_retention_dispatch',{method:'POST',headers:{apikey:c.serverKey,'Content-Type':'application/json'},body:'{"dry_run":true}',signal:AbortSignal.timeout(20000)});
 rows.push({credential_class:'modern_secret',operation:'privacy_retention_dispatch_dry_run',status:server.status});assert.equal(server.status,200);
 await mkdir('.local/legacy-disablement',{recursive:true,mode:0o700});
 await writeFile(`.local/legacy-disablement/${phase}.json`,JSON.stringify({phase,at:new Date().toISOString(),rows,pass:true},null,2));
 console.log(JSON.stringify({phase,rows,pass:true}));
}catch {
 await mkdir('.local/legacy-disablement',{recursive:true,mode:0o700});
 await writeFile(`.local/legacy-disablement/${phase}.json`,JSON.stringify({phase,rows,pass:false},null,2));
 console.error(JSON.stringify({phase,rows,pass:false,code:'KEY_DISABLEMENT_PROBE_FAILED_STOP'}));process.exitCode=1;
}
