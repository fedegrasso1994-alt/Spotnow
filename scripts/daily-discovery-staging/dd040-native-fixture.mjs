// Manual, isolated local PostgreSQL rehearsal. Records the existing synthetic
// test fixture setup; never reads a hosted endpoint or credentials.
import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import {wrapperDatabase} from '../../tests/helpers/dd-wrapper-database.js';
const output=process.argv[2];if(!output?.startsWith('/tmp/')&&!output?.startsWith('/private/tmp/'))throw Error('temporary output required');
const steps=[],cleanup=[],original={};let depth=0;
for(const method of ['exec','query']){original[method]=PGlite.prototype[method];PGlite.prototype[method]=async function(sql,...args){const outer=depth++===0;try{const result=await original[method].call(this,sql,...args);if(outer)steps.push({method,sql,params:args[0]||[]});return result;}finally{depth--;}};}
try{const db=await wrapperDatabase({after:f=>cleanup.push(f)},6);
if(process.argv.includes('--controlled-admission')){
 await db.exec('reset role;update spot_private.soma_v2_control set discovery_enabled=false;update spot_private.discovery_policy set enabled=false,paused=true where version=2');
 await db.exec(await readFile('supabase/migrations/041_dd_controlled_admission.sql','utf8'));
 await db.exec("update spot_private.soma_v2_control set discovery_enabled=true,dd_controlled_admission=true;update spot_private.discovery_policy set enabled=true,paused=false where version=2;insert into spot_private.dd_admission_accounts(user_id,reason)values('10000000-0000-0000-0000-000000000001','native local fixture'),('10000000-0000-0000-0000-000000000002','native local fixture');set role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false)");
}
await writeFile(output,JSON.stringify(steps),{mode:0o600});console.log(JSON.stringify({synthetic_setup_statements:steps.length}));}finally{for(const m of ['exec','query'])PGlite.prototype[m]=original[m];for(const f of cleanup.reverse())await f();}
