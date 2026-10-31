// Operator-only disposable local QA. Never imports staging credentials or recovery tooling.
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,createHmac} from 'node:crypto';
export const docker='/Applications/Docker.app/Contents/Resources/bin/docker';
export const root='.local/chance-local-qa-20261030';
export const container='soma-chance-qa-db-20261030',network='soma-chance-qa-20261030';
export const evidence=process.env.SOMA_CHANCE_VISUAL_QA==='experience'?'docs/evidence/chance-experience':process.env.SOMA_CHANCE_VISUAL_QA==='1'?'docs/evidence/chance-visual-sanity':'docs/evidence/chance-local-qa';
export const run=promisify(execFile);
export async function privateConfig(){return JSON.parse(await readFile(root+'/private.json','utf8'));}
export async function prepareConfig(){
 await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true});
 const config={password:randomBytes(24).toString('hex'),jwt:randomBytes(48).toString('hex')};
 await writeFile(root+'/private.json',JSON.stringify(config),{mode:0o600});
 await writeFile(root+'/postgres.env','POSTGRES_PASSWORD='+config.password+'\n',{mode:0o600});return config;
}
export function jwt(secret,role,sub){const e=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const data=e({alg:'HS256',typ:'JWT'})+'.'+e({role,...(sub?{sub}:{}),iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+7200});return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
export function sql(text){return new Promise((resolve,reject)=>{
 const p=spawn(docker,['exec','-i',container,'psql','-U','supabase_admin','-d','chance_qa','-XAtq','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));p.stdin.end(text);
});}
export const quote=x=>x===null?'null':typeof x==='number'?String(x):typeof x==='boolean'?String(x):"'"+String(x).replaceAll("'","''")+"'";
export async function receipt(name,data){await writeFile(evidence+'/'+name+'.json',JSON.stringify(data,null,2)+'\n');}
