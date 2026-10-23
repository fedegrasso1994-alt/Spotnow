/** Predetermined verification plan. Stop on the FIRST failure; never retry/reset. */
import {spawn}from'node:child_process';import fs from'node:fs/promises';import{createWriteStream}from'node:fs';
const folder='.local/dd-notifications-flake';await fs.mkdir(folder,{recursive:true});await fs.mkdir('docs/evidence/dd-notifications-flake',{recursive:true});
const report={plan:{targeted_runs:20,relevant_runs:1,consecutive_full_runs:3,test_concurrency:2,stop_on_first_failure:true},results:[],completed:false};
const save=()=>fs.writeFile('docs/evidence/dd-notifications-flake/verification.json',JSON.stringify(report,null,2)+'\n');
async function run(name,args){const file=folder+'/'+name+'.log',log=createWriteStream(file),started=new Date().toISOString();
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});p.stdout.pipe(log,{end:false});p.stderr.pipe(log,{end:false});p.on('error',reject);p.on('close',code=>{log.end(()=>resolve(code));});});
 const text=await fs.readFile(file,'utf8'),counts=Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,Number(text.match(new RegExp('ℹ '+k+' (\\d+)'))?.[1]??NaN)]));
 report.results.push({name,started,finished:new Date().toISOString(),exit_code:code,...counts});await save();console.log(name+': '+(code===0?'PASS':'FAIL')+' '+JSON.stringify(counts));
 if(code!==0||counts.fail!==0||counts.skipped!==0||counts.cancelled!==0||counts.tests!==counts.pass)throw Error('FIRST_FAILURE_STOP_NO_RETRY '+name);
}
try{
 await save();for(let i=1;i<=20;i++)await run('targeted-'+String(i).padStart(2,'0'),['--test','--test-name-pattern=DD committed reciprocal|DD allocation remains valid','tests/notifications.test.js']);
 const all=(await fs.readdir('tests')).filter(f=>f.endsWith('.test.js')).sort();
 const relevant=all.filter(f=>/^(daily-discovery|discovery|dd-|notifications)/.test(f));report.relevant_files=relevant;await save();
 await run('dd-notifications',['--test','--test-concurrency=2',...relevant.map(f=>'tests/'+f)]);
 for(let i=1;i<=3;i++)await run('full-'+i,['--test','--test-concurrency=2',...all.map(f=>'tests/'+f)]);
 report.completed=true;await save();console.log('FIXED_PLAN_COMPLETE_NO_RETRIES');
}catch(e){report.stopped=true;await save();console.error(e.message);process.exitCode=1;}
