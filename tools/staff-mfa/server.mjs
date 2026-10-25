// Loopback static server: it never receives Auth passwords, TOTP or sessions.
import {createServer} from 'node:http';
import {readFile,open,access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateConfig,STAGING} from './auth.js';

export function localServer({config,assets,port=4197,claimPath=null}){
 validateConfig(config);const origin='http://127.0.0.1:'+port;
 if(config.repair&&!claimPath)throw Error('DURABLE_ATTEMPT_REQUIRED');
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'self' ${STAGING}; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
  const end=(code,body='')=>{res.statusCode=code;res.end(body);};
  if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin))return end(403);
  if(config.repair&&req.url==='/repair/claim'&&req.method==='POST'){
   if(req.headers.origin!==origin||Number(req.headers['content-length']||0)!==0||req.headers['transfer-encoding'])return end(403);
   let file;try{file=await open(claimPath,'wx',0o600);await file.writeFile(JSON.stringify({claimed_at:new Date().toISOString(),state:'attempt_reserved_no_retry'}));return end(201);}catch{return end(409);}finally{await file?.close();}
  }
  if(req.method!=='GET')return end(405);
  if(config.repair&&req.url==='/repair/status'){
   let used;try{await access(claimPath);used=true;}catch(e){if(e.code!=='ENOENT')return end(503);used=false;}
   res.setHeader('Content-Type','application/json');return end(200,JSON.stringify({used}));
  }
  const files={'/':['index.html','text/html; charset=utf-8'],'/setup.js':['setup.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
  if(req.url==='/config.json'){res.setHeader('Content-Type','application/json');return end(200,JSON.stringify(config));}
  const file=files[req.url];if(!file)return end(404);
  try{res.setHeader('Content-Type',file[1]);end(200,await readFile(assets+'/'+file[0]));}catch{end(404);}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config=JSON.parse(await readFile('.local/staff-mfa/config.json','utf8'));
 const claimPath=config.repair?'.local/staff-mfa/attempt-'+config.repair.attemptKey+'.json':null;
 const server=localServer({config,assets:'.local/staff-mfa/public',claimPath});
 server.on('error',()=>{console.error('Setup locale non avviato: controllare porta/configurazione.');process.exitCode=1;});
 server.listen(4197,'127.0.0.1',()=>console.log('Setup MFA locale: http://127.0.0.1:4197 — nessun ruolo assegnato.'));
}
