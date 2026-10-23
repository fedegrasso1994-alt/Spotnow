// Offline only: reconstruct application schema in disposable PostgreSQL/PGlite.
// Auth/Storage are platform stubs; no users, network, credentials, cron or egress.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {database} from '../tests/helpers/database.js';
import {pathToFileURL} from 'node:url';

export const digest=(value,algorithm='sha256')=>createHash(algorithm).update(value).digest('hex');
export const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export async function migrations(){
 const names=(await readdir('supabase/migrations')).filter(x=>/^\d+_.+\.sql$/.test(x)).sort();
 const seen=new Set();const items=[];
 for(const file of names){
  const version=file.split('_')[0];if(seen.has(version))throw Error('DUPLICATE_MIGRATION:'+version);seen.add(version);
  const sql=await readFile('supabase/migrations/'+file,'utf8');
  items.push({version,file,purpose:file.replace(/^\d+_|\.sql$/g,'').replaceAll('_',' '),sha256:digest(sql),file_md5:digest(sql,'md5'),trimmed_md5:digest(sql.trim(),'md5'),sql});
 }
 return items;
}
export function differences(local,live){
 const result={};
 for(const category of Object.keys(local)){
  const a=new Map(local[category].map(x=>[x.key,x])),b=new Map((live[category]||[]).map(x=>[x.key,x]));
  result[category]={local_only:[...a.keys()].filter(k=>!b.has(k)),live_only:[...b.keys()].filter(k=>!a.has(k)),different:[...a.keys()].filter(k=>b.has(k)&&canonical(a.get(k))!==canonical(b.get(k))).map(key=>({key,local:a.get(key),live:b.get(key)})),equal:[...a.keys()].filter(k=>b.has(k)&&canonical(a.get(k))===canonical(b.get(k))).length};
 }
 return result;
}
const flat=c=>new Map(Object.entries(c).flatMap(([kind,rows])=>rows.map(r=>[kind+':'+r.key,canonical(r)])));
export async function reconstruct(){
 const db=await database({limit:0});
 try{
  // Additional Supabase-managed columns referenced by current app SQL. No Auth server emulation.
  await db.exec('alter table auth.users add email text,add raw_user_meta_data jsonb,add banned_until timestamptz,add created_at timestamptz default now()');
  // Supabase public-schema defaults verified read-only in postflight.platform.
  // Explicit platform prerequisite, not a change to any historical migration.
  await db.exec('alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role');
  const query=await readFile('supabase/tests/ops_phase_a_catalog.sql','utf8');
  const catalog=async()=>(await db.query(query)).rows[0].catalog;
  let previous=flat(await catalog());const steps=[];
  for(const item of await migrations()){
   const {sql,...identity}=item;
   if(item.version==='017'){
    await db.exec(await readFile('supabase/cutover/prepare.sql','utf8'));
    await db.query("select photo_cutover_set('close','local-schema-reconstruction','no-users-no-writers')");
    previous=flat(await catalog());
   }
   if(item.version==='025'){
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role',ref:'zjinjtkekmaqtxsuyvho'})]);
    await db.query("select privacy_staging_enable('zjinjtkekmaqtxsuyvho')");
    await db.query("select set_config('request.jwt.claims','',false)");
   }
   if(item.version==='029'){
    // Historical data-only snapshot is not a generic fresh-install migration.
    let error;try{await db.exec(sql);}catch(e){error=e.message;await db.exec('rollback');}
    if(error!=='BACKFILL_SNAPSHOT_DRIFT')throw Error('UNEXPECTED_029_RESULT:'+error);
    steps.push({...identity,status:'expected_snapshot_guard_skip',reason:error});continue;
   }
   try{await db.exec(sql);}catch(e){throw Error(item.file+': '+e.message);}
   const next=flat(await catalog());
   steps.push({...identity,status:'applied_exact_file',changed:[...next].filter(([key,value])=>previous.get(key)!==value).map(([key])=>key),removed:[...previous.keys()].filter(k=>!next.has(k))});
   previous=next;
  }
  return {steps,catalog:await catalog(),platform:(await db.query("select current_setting('server_version')version")).rows[0],exceptions:['Supabase Auth/Storage platform stubs and verified public-schema default ACL prerequisites; no hosted Auth or Storage bytes','cutover/prepare.sql plus empty-writer close before017','privacy_staging_enable with local owner/session claims before025','029 snapshot-specific data-only migration rejected and skipped; no real snapshot copied','045 superseded draft absent; never synthesized or applied','cron/pg_net/Vault/Edge/Auth provider configuration not reconstructed']};
 }finally{await db.close();}
}
async function main(){
 const dir='.local/ops-phase-a';await mkdir(dir,{recursive:true});
 if(process.argv.includes('--compare')){await evidence(dir);return;}
 const local=await reconstruct();await writeFile(dir+'/local-schema.json',JSON.stringify(local,null,2)+'\n');
 console.log(JSON.stringify({steps:local.steps.length,applied:local.steps.filter(s=>s.status==='applied_exact_file').length,exceptions:local.exceptions,objects:Object.fromEntries(Object.entries(local.catalog).map(([k,v])=>[k,v.length]))}));
}
async function evidence(dir){
 const local=JSON.parse(await readFile(dir+'/local-schema.json','utf8'));
 const live=JSON.parse(await readFile(dir+'/live-catalog.json','utf8')).rows[0].catalog;
 const state=JSON.parse(await readFile(dir+'/preflight.json','utf8')).rows[0].state;
 const diff=differences(local.catalog,live),owner=new Map();
 for(const step of local.steps)for(const key of step.changed||[])owner.set(key,step.version);
 const liveFlat=flat(live),localFlat=flat(local.catalog);
 const mapping=local.steps.map(step=>{
  const h=state.history.find(x=>x.version===step.version);
  const current=[...owner].filter(([key,version])=>version===step.version&&localFlat.has(key)).map(([key])=>key);
  return {...step,changed:undefined,removed:undefined,history:h||null,
   status:h?(h.statement_count===1&&h.statements_md5===step.file_md5?'REGISTERED_EXACT_FILE':'REGISTERED_NOT_BYTE_PROVEN'):'UNREGISTERED_UNRESOLVED',
   replay:step.status,current_objects_attributed:current.length,
   current_objects_fully_equal:current.filter(key=>localFlat.get(key)===liveFlat.get(key)).length,
   historical_file_identity:h?.statement_count===1&&h.statements_md5===step.file_md5?'exact stored bytes match':'not proven; present objects are not execution provenance'};
 });
 const supplementary=[];
 for(const file of ['supabase/cutover/prepare.sql','supabase/cutover/scheduler.sql','supabase/staging/017_photo_lifecycle_scheduler.sql','supabase/privacy-staging-scheduler.sql','supabase/staging/bacheca-nonce-alignment.sql']){
  const sql=await readFile(file,'utf8'),functions=[];
  for(const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)[\s\S]*?\bas\s*(\$\w*\$)([\s\S]*?)\2\s*;/gi)){
   const found=live.functions.filter(f=>f.key.startsWith(m[1]+'('));
   functions.push({name:m[1],file_source_md5:digest(m[3],'md5'),live:found.map(f=>({key:f.key,source_md5:f.source_md5,match:f.source_md5===digest(m[3],'md5')}))});
  }
  supplementary.push({file,sha256:digest(sql),functions,note:file.includes('nonce-alignment')?'Historical candidate alignment;026 final includes it. Never blindly replay.':'Explicit unnumbered dependency, not a new migration to execute here.'});
 }
 const summary={at:state.at,project_ref:'zjinjtkekmaqtxsuyvho',local_platform:local.platform,history_registered:state.history.length,active_files:mapping.length,unregistered:mapping.filter(x=>!x.history).map(x=>x.version),registered_exact_file:mapping.filter(x=>x.status==='REGISTERED_EXACT_FILE').map(x=>x.version),registered_not_byte_proven:mapping.filter(x=>x.status==='REGISTERED_NOT_BYTE_PROVEN').map(x=>x.version),duplicate_active_ids:0,history_without_active_file:state.history.filter(h=>!mapping.some(m=>m.version===h.version)).map(h=>h.version),repairs_executed:0,local_replay:local.exceptions,
  comparison:Object.fromEntries(Object.entries(diff).map(([k,v])=>[k,{equal:v.equal,local_only:v.local_only.length,live_only:v.live_only.length,different:v.different.length}])),
  function_bodies:{local:local.catalog.functions.length,live:live.functions.length,matching:local.catalog.functions.filter(a=>live.functions.some(b=>a.key===b.key&&a.source_md5===b.source_md5)).length},
  details:diff,supplementary};
 // No function bodies or product data in evidence. Keep definitions/privilege deltas explicit.
 const out='docs/evidence/ops-phase-a';await mkdir(out,{recursive:true});
 await writeFile(out+'/migration-map.json',JSON.stringify(mapping,null,2)+'\n');
 await writeFile(out+'/schema-comparison.json',JSON.stringify(summary,null,2)+'\n');
 await writeFile(out+'/preflight.json',JSON.stringify(state,null,2)+'\n');
 const table=['# OPS Phase A — canonical migration map','',
  'Generated from exact repository bytes and read-only staging history. Checksums are file identities, not assertions of historical execution. Full hashes/status in `evidence/ops-phase-a/migration-map.json`. No repair or replay on staging.','',
  '| Version / file | Purpose | History / identity | SHA-256 |','|---|---|---|---|',
  ...mapping.map(m=>`| ${m.file} | ${m.purpose} | ${m.status}${m.version==='029'?' — snapshot backfill, data provenance unresolved':''} | ${m.sha256} |`),'',
  '045: intentionally absent/unapplied superseded draft;047 replaces it. Do not fill the numbering gap. 016 is registered with zero statements;054 stores24 parsed statements, whose joined bytes are not the original file.001–015 match the one stored statement byte-for-byte.017–044 and046–053 have no ledger row; final component equality cannot retroactively authenticate the full historical scripts or backfills.','',
  'Supplementary dependencies: cutover/prepare.sql BEFORE017 after016 with drain; staging environment declaration before024/025; historical029 snapshot exception; unnumbered scheduler definitions (not activated by replay); managed Supabase Auth/Storage/cron/net/Vault and roles. Historical nonce patch is already incorporated in026; no new application permitted.',''];
 await writeFile('docs/soma-ops-phase-a-migration-map-2026-10-24.md',table.join('\n'));
 console.log(JSON.stringify({registered:summary.history_registered,active_files:summary.active_files,unregistered:summary.unregistered.length,function_bodies:summary.function_bodies,comparison:summary.comparison,supplementary:supplementary.map(x=>({file:x.file,functions:x.functions.length,matching:x.functions.filter(f=>f.live.some(x=>x.match)).length}))}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
