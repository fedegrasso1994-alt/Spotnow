// Manual, isolated local PostgreSQL rehearsal. Records the existing synthetic
// test fixture setup; never reads a hosted endpoint or credentials.
import {PGlite} from '@electric-sql/pglite';
import {writeFile} from 'node:fs/promises';
import {wrapperDatabase} from '../../tests/helpers/dd-wrapper-database.js';
const output=process.argv[2];if(!output?.startsWith('/tmp/')&&!output?.startsWith('/private/tmp/'))throw Error('temporary output required');
const steps=[],cleanup=[],original={};let depth=0;
for(const method of ['exec','query']){original[method]=PGlite.prototype[method];PGlite.prototype[method]=async function(sql,...args){const outer=depth++===0;try{const result=await original[method].call(this,sql,...args);if(outer)steps.push({method,sql,params:args[0]||[]});return result;}finally{depth--;}};}
try{await wrapperDatabase({after:f=>cleanup.push(f)},6);await writeFile(output,JSON.stringify(steps),{mode:0o600});console.log(JSON.stringify({synthetic_setup_statements:steps.length}));}finally{for(const m of ['exec','query'])PGlite.prototype[m]=original[m];for(const f of cleanup.reverse())await f();}
