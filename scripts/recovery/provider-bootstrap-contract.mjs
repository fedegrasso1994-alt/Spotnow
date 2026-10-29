/** Compare all schema objects, allowing only the explicitly approved provider 0074 delta. */
export const FUNCTION_KEY='FUNCTION storage.enforce_versioning_status_transition()';
export const TRIGGER_KEY='TRIGGER storage.buckets enforce_versioning_status_transition';
export function providerFunctionBody(sql){const m=/\bAS \$([A-Za-z_0-9]*)\$([\s\S]*?)\$\1\$/.exec(sql);if(!m||!m[2].trim())throw Error('RECOVERY_PROVIDER_BODY');return m[2].trim();}
const dark="    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),\n";
function normalize(sql){
 // PG deparses a restored three-term AND without its redundant nested AND group.
 // Only this exact, audited CHECK expression is normalized; the dump is never edited.
 return sql.replace("CHECK ((((char_length(body) >= 1) AND (char_length(body) <= 280)) AND (body = btrim(body))))","CHECK (((char_length(body) >= 1) AND (char_length(body) <= 280) AND (body = btrim(body))))");
}
export function schemaObjects(sql){
 const map=new Map();for(const b of sql.split(/(?=^-- Name: .*; Type: .*; Schema: .*; Owner: .*$)/m)){
  const h=/^-- Name: (.*); Type: (.*); Schema: (.*); Owner: (.*)$/m.exec(b);if(!h)continue;
  const key=h[2]+' '+h[3]+'.'+h[1]+(h[2]==='DEFAULT ACL'?' OWNER '+h[4]:'');if(map.has(key))throw Error('RECOVERY_DUPLICATE_OBJECT');
  map.set(key,{owner:h[4],sql:normalize(b.replace(/^--.*$/gm,'').replace(/^\\(?:un)?restrict.*$/gm,'').trim())});
 }return map;
}
export function verifyProviderDelta(before,after,meta){
 const expected=new Map(before);const bucket=expected.get('TABLE storage.buckets');
 if(!bucket?.sql.includes(dark)||before.has(FUNCTION_KEY)||before.has(TRIGGER_KEY))throw Error('RECOVERY_PROVIDER_BEFORE');
 expected.set('TABLE storage.buckets',{...bucket,sql:bucket.sql.replace(dark,'')});
 const added=[...after.keys()].filter(k=>!expected.has(k)).sort();
 if(JSON.stringify(added)!==JSON.stringify([FUNCTION_KEY,TRIGGER_KEY].sort()))throw Error('RECOVERY_UNEXPECTED_BOOTSTRAP_OBJECT');
 for(const[k,v]of expected)if(JSON.stringify(v)!==JSON.stringify(after.get(k)))throw Error('RECOVERY_UNEXPECTED_BOOTSTRAP_DEFINITION');
 if(after.get(FUNCTION_KEY)?.owner!=='supabase_storage_admin'||after.get(TRIGGER_KEY)?.owner!=='supabase_storage_admin')throw Error('RECOVERY_PROVIDER_OWNER');
 if(meta.migration_count!==1||meta.last_migration!==74||meta.migration_name!=='unlock-object-versioning'||meta.function_owner!=='supabase_storage_admin'||meta.definer!==false||meta.function_acl!==null||meta.dark_constraint!==false||meta.trigger!==true||meta.versioning_enabled!==false||meta.photo_unchanged!==true)throw Error('RECOVERY_PROVIDER_METADATA');
 if(meta.function_definition!==meta.provider_definition||meta.trigger_definition!=='CREATE TRIGGER enforce_versioning_status_transition BEFORE UPDATE OF versioning_status ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_versioning_status_transition()')throw Error('RECOVERY_PROVIDER_DEFINITION');
 return{pass:true,classification:'RECREATE BY PROVIDER BOOTSTRAP',migration_before:73,migration_after:74,migration_applied_once:true,all_original_objects_checked:expected.size,added:added,removed_constraint:'buckets_versioning_dark_check',owners_acl_rls_preserved:true};
}
