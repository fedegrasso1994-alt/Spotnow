import test from 'node:test';
import assert from 'node:assert/strict';
import {migrations,reconstruct,differences} from '../scripts/ops-phase-a-inventory.mjs';

test('OPS Phase A: canonical active migration IDs are unique,045 absent,029 explicitly snapshot-specific',async()=>{
 const items=await migrations();assert.equal(items.length,59);
 assert.equal(new Set(items.map(x=>x.version)).size,items.length);
 assert.ok(!items.some(x=>x.version==='045'));assert.equal(items.at(-1).version,'060');
 assert.match(items.find(x=>x.version==='029').sql,/BACKFILL_SNAPSHOT_DRIFT/);
 for(const i of items)assert.match(i.sha256,/^[0-9a-f]{64}$/);
});

test('OPS Phase A: exact-file fresh local replay succeeds only with declared platform/cutover/data exceptions',async()=>{
 const result=await reconstruct();
 assert.equal(result.steps.filter(x=>x.status==='applied_exact_file').length,58);
 assert.deepEqual(result.steps.filter(x=>x.status!=='applied_exact_file').map(x=>[x.version,x.reason]),[['029','BACKFILL_SNAPSHOT_DRIFT']]);
 assert.equal(result.catalog.tables.length,104);
 const role=result.catalog.functions.find(x=>x.key==='spot_private.moderation_role()');assert.ok(role.security_definer);
 assert.equal(role.anon_execute,false);assert.equal(role.authenticated_execute,false);
 assert.ok(result.exceptions.some(x=>x.includes('prepare.sql')));
 assert.ok(result.exceptions.some(x=>x.includes('privacy_staging_enable')));
 // JSON driver key ordering is immaterial; privilege/source drift must be detected.
 assert.equal(differences({functions:[{key:'f',source_md5:'a',service_execute:false}]},{functions:[{service_execute:false,source_md5:'a',key:'f'}]}).functions.equal,1);
 assert.equal(differences({functions:[{key:'f',source_md5:'a'}]},{functions:[{key:'f',source_md5:'b'}]}).functions.different.length,1);
 assert.equal(differences({functions:[{key:'f',authenticated_execute:false}]},{functions:[{key:'f',authenticated_execute:true}]}).functions.different.length,1);
});
