/** Operator-only real HTTP transport inside the existing isolated Docker network. */
import {execFile,spawn}from'node:child_process';
import {promisify}from'node:util';
export const DOCKER='/Applications/Docker.app/Contents/Resources/bin/docker';
export const TARGET={auth:'supabase_auth_soma-recovery-20261026',rest:'supabase_rest_soma-recovery-20261026',storage:'supabase_storage_soma-recovery-20261026',db:'supabase_db_soma-recovery-20261026',network:'soma-recovery-isolated-20261026'};
const exec=promisify(execFile);
export async function targetEnvironment(name){
 if(!Object.values(TARGET).includes(name))throw Error('RECOVERY_TARGET_SCOPE');
 const{stdout}=await exec(DOCKER,['inspect',name],{maxBuffer:2e6});const d=JSON.parse(stdout)[0];
 if(!d.NetworkSettings.Networks[TARGET.network])throw Error('RECOVERY_TARGET_NETWORK');
 return Object.fromEntries(d.Config.Env.filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)]}));
}
const HTTP=`let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s);const hosts={auth:'${TARGET.auth}:9999',rest:'${TARGET.rest}:3000',storage:'${TARGET.storage}:5000'};if(!hosts[p.service]||!p.path.startsWith('/')||p.path.startsWith('//'))throw Error('SCOPE');const r=await fetch('http://'+hosts[p.service]+p.path,{method:p.method||'GET',headers:p.headers||{},body:p.body,redirect:'error',signal:AbortSignal.timeout(20000)});const b=Buffer.from(await r.arrayBuffer());console.log(JSON.stringify({status:r.status,body:b.toString('base64'),content_type:r.headers.get('content-type')}));`;
export async function targetHttp(service,path,{method='GET',headers={},body}={}){
 const input=JSON.stringify({service,path,method,headers,body});
 return new Promise((resolve,reject)=>{const p=spawn(DOCKER,['exec','-i',TARGET.storage,'node','--input-type=module','-e',HTTP],{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>{if(err.length<1000)err+=x});p.on('error',()=>reject(Error('RECOVERY_TARGET_HTTP')));p.on('close',code=>{if(code!==0)return reject(Error('RECOVERY_TARGET_HTTP'));try{const r=JSON.parse(out),bytes=Buffer.from(r.body,'base64');let data;try{data=JSON.parse(bytes.toString())}catch{}resolve({status:r.status,bytes,data,contentType:r.content_type})}catch{reject(Error('RECOVERY_TARGET_RESPONSE'))}});p.stdin.end(input);});
}
export async function targetSql(sql,{database='postgres'}={}){
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(database))throw Error('RECOVERY_DB_NAME');
 return new Promise((resolve,reject)=>{const p=spawn(DOCKER,['exec','-i',TARGET.db,'psql','-U','postgres','-d',database,'-XAtq','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',x=>out+=x);p.stderr.resume();p.on('error',()=>reject(Error('RECOVERY_TARGET_SQL')));p.on('close',code=>code===0?resolve(out):reject(Error('RECOVERY_TARGET_SQL')));p.stdin.end(sql)});
}
