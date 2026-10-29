/** Internal-only recovered service transport. Capabilities and bodies never enter argv/logs. */
import{spawn}from'node:child_process';
import{DOCKER,TARGET}from'./local-target.mjs';
export const RECOVERED_SERVICES={storage:'supabase_storage_soma-recovery-v3:5000',auth:'supabase_auth_soma-recovery-v3:9999',rest:'supabase_rest_soma-recovery-v3:3000'};
export async function recoveredHttp(service,path,{method='GET',headers={},body}={}){
 if(!RECOVERED_SERVICES[service]||!path.startsWith('/')||path.startsWith('//'))throw Error('RECOVERY_HTTP_SCOPE');
 const program=`(async()=>{let input='';for await(const c of process.stdin)input+=c;const p=JSON.parse(input);const r=await fetch('http://${RECOVERED_SERVICES[service]}'+p.path,{method:p.method,headers:p.headers,body:p.body,redirect:'error',signal:AbortSignal.timeout(20000)});console.log(JSON.stringify({status:r.status,body:Buffer.from(await r.arrayBuffer()).toString('base64'),type:r.headers.get('content-type')}));})().catch(()=>{process.exitCode=1});`;
 return new Promise((ok,bad)=>{const p=spawn(DOCKER,['exec','-i',TARGET.storage,'node','-e',program],{stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',x=>out+=x);p.stderr.resume();p.on('error',()=>bad(Error('RECOVERY_HTTP_PROCESS')));p.on('close',c=>{if(c)return bad(Error('RECOVERY_HTTP_UNAVAILABLE'));try{const r=JSON.parse(out),bytes=Buffer.from(r.body,'base64');let data;try{data=JSON.parse(bytes)}catch{}ok({status:r.status,bytes,data,contentType:r.type})}catch{bad(Error('RECOVERY_HTTP_RESULT'))}});p.stdin.end(JSON.stringify({path,method,headers,body}));});
}
