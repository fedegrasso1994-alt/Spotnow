/** PHOTO-02 orchestration. No decoder, raw originals, or client authorization changes. */
const unwrap=result=>{if(result.error)throw new Error('PHOTO02_RPC');return result.data;};
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function writePhotoSet(admin,id,job,images){
 const manifest=[];for(const [path,bytes] of images)manifest.push({path,bytes:bytes.length,sha:await sha(bytes)});
 unwrap(await admin.rpc('photo_write_intent',{target_user:id,path:job.photo_path,lease:job.lease_token,write_manifest:manifest}));
 const results=await Promise.allSettled(images.map(([path,data])=>admin.storage.from('profile-photos').upload(path,data,{contentType:'image/jpeg',upsert:false,cacheControl:'60'})));
 const terminal=results.every(r=>r.status==='fulfilled'&&(!r.value.error||[400,401,403,409,413,415,422].includes(Number(r.value.error.statusCode))));
 unwrap(await admin.rpc('photo_write_receipt',{target_user:id,path:job.photo_path,lease:job.lease_token,terminal}));
 if(results.some(r=>r.status==='rejected'||r.value.error))throw new Error('PHOTO02_WRITE');
}
async function absent(storage,path){const result=await storage.download(path);if(!result.error)return false;return [404,400].includes(Number(result.error.statusCode))&&/not found|does not exist/i.test(String(result.error.message));}
/** Exact known manifest only; SQL rechecks lease, writer and references after removal. */
export async function purgePhotoSet(admin,path){
 const task=unwrap(await admin.rpc('claim_photo_cleanup',{path}));if(!task)return false;
 try{
  const paths=[path,path+'.detail.jpg',path+'.thumb.jpg'],storage=admin.storage.from('profile-photos');
  unwrap(await storage.remove(paths));for(const object of paths)if(!await absent(storage,object))throw new Error('PHOTO02_REMAINS');
  unwrap(await admin.rpc('finish_photo_cleanup',{path,token:task.token}));return true;
 }catch{await admin.rpc('photo_cleanup_failure',{path,token:task.token,code:'STORAGE'});throw new Error('PHOTO02_RETRY');}
}
/** An uncertain write can reconcile automatically only after ALL immutable byte effects match. */
export async function reconcilePhotoSet(admin,set){
 if(set.writer!=='unknown')return false;
 if(!set.manifest&&set.evidence==='INTENT_PROTOCOL_V1'){const r=await admin.rpc('reconcile_photo_writer',{path:set.photo_path,lease:set.lease_token,evidence_code:'NO_WRITE_INTENT_FENCED'});return !r.error;}
 if(!Array.isArray(set.manifest)||set.manifest.length!==3)return false;
 const storage=admin.storage.from('profile-photos');
 for(const item of set.manifest){const r=await storage.download(item.path);if(r.error||!r.data||r.data.size!==item.bytes||r.data.size>4194304)return false;const bytes=new Uint8Array(await r.data.arrayBuffer());if(await sha(bytes)!==item.sha)return false;}
 unwrap(await admin.rpc('reconcile_photo_writer',{path:set.photo_path,lease:set.lease_token,evidence_code:'ALL_IMMUTABLE_OBJECTS_CONFIRMED'}));return true;
}
/** No owner ids from an end-user request: caller passes only JWT-verified owner or service queue. */
export async function cleanupPhotoAccount(admin,id){
 const token=unwrap(await admin.rpc('claim_photo_account_cleanup',{target_user:id}));if(!token)return false;
 try{
  const storage=admin.storage.from('profile-photos');let removed=0;
  const collect=async(folder,depth=0)=>{if(depth>10)throw new Error('PHOTO02_DEPTH');const list=unwrap(await storage.list(folder,{limit:100,sortBy:{column:'name',order:'asc'}}));const paths=[];for(const item of list){if(!item.name||item.name.includes('/')||item.name==='..'||item.name==='.')throw new Error('PHOTO02_PATH');if(item.id)paths.push(folder+'/'+item.name);else paths.push(...await collect(folder+'/'+item.name,depth+1));if(paths.length>=100)break;}return paths.slice(0,100);};
  for(let page=0;page<100;page++){const paths=await collect(id);if(!paths.length)break;unwrap(await storage.remove(paths));removed+=paths.length;if(page===99)throw new Error('PHOTO02_BATCH');}
  if((await collect(id)).length)throw new Error('PHOTO02_REMAINS');
  unwrap(await admin.rpc('prepare_account_deletion',{target_user:id}));
  const auth=await admin.auth.admin.getUserById(id);if(auth.data?.user)unwrap(await admin.auth.admin.deleteUser(id));else if(auth.error&&![404,'user_not_found'].includes(auth.error.status)&&auth.error.code!=='user_not_found')throw new Error('PHOTO02_AUTH');
  unwrap(await admin.rpc('finish_photo_account_cleanup',{target_user:id,token}));return true;
 }catch{await admin.rpc('fail_photo_account_cleanup',{target_user:id,token,code:'STORAGE'});throw new Error('PHOTO02_RETRY');}
}
export function photoLifecycleHandler({admin,serviceKey,log=(_summary)=>{}}){return async request=>{
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({code:'METHOD'},405);
 if(request.headers.get('Authorization')!=='Bearer '+serviceKey)return reply({code:'AUTH'},403);
 let body;try{body=await request.json();}catch{return reply({code:'INVALID'},400);}
 try{const inventory=unwrap(await admin.rpc('photo_lifecycle_inventory'));
 if(body.dry_run!==false)return reply({dry_run:true,sets:inventory.sets,accounts:inventory.accounts});
 const summary={completed:0,reconciled:0,pending:0,failed:0,metadata_removed:0,anomalies:unwrap(await admin.rpc('scan_photo_lifecycle'))};
 for(const set of inventory.sets.filter(s=>s.writer==='unknown')){try{if(await reconcilePhotoSet(admin,set))summary.reconciled++;else summary.pending++;}catch{summary.failed++;}}
 const candidates=unwrap(await admin.rpc('photo_cleanup_candidates'));for(const set of candidates){try{if(await purgePhotoSet(admin,set.photo_path))summary.completed++;}catch{summary.failed++;}}
 for(const account of inventory.accounts){try{if(await cleanupPhotoAccount(admin,account.user_id))summary.completed++;else summary.pending++;}catch{summary.failed++;}}
 summary.metadata_removed=unwrap(await admin.rpc('photo_metadata_purge'));log({tag:'PHOTO02',...summary});return reply(summary);
}catch{log({tag:'PHOTO02',code:'DATABASE',failed:1});return reply({code:'RETRY'},503);}
};}
