/** Repeats the entire DD040 test file in fresh Node processes; stops on failure. */
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const count=Number(process.argv[2]||20);
if(!Number.isInteger(count)||count<20||count>100)throw Error('EXPECTED_20_TO_100_RUNS');
const results=[];
await mkdir('docs/evidence/dd040-investigation',{recursive:true});
for(let run=1;run<=count;run++){
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/dd-idempotent-read.test.js'],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 const row={run,exit_code:result.status,signal:result.signal,error:result.error?.message||null,stdout:result.stdout,stderr:result.stderr};
 results.push(row);
 const passed=result.status===0&&/# tests 11\b/.test(result.stdout)&&/# pass 11\b/.test(result.stdout)&&/# fail 0\b/.test(result.stdout);
 console.log(JSON.stringify({run,passed}));
 await writeFile('docs/evidence/dd040-investigation/corrected-repeated.json',JSON.stringify({fresh_process_per_run:true,expected_tests_per_run:11,results,summary:{requested_runs:count,completed_runs:results.length,all_passed:results.every(r=>r.exit_code===0&&/# pass 11\b/.test(r.stdout))}},null,2)+'\n');
 if(!passed)throw Error(`DD040_REPEAT_FAILED_${run}`);
}
