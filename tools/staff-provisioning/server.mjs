// Loopback receives only enum/boolean canary outcomes, never Auth material.
import{createServer}from'node:http';
import{readFile,appendFile}from'node:fs/promises';
import{localServer}from'../staff-mfa/server.mjs';
import{validateEvidence}from'./canary.js';
const config=JSON.parse(await readFile('.local/staff-final/config.json','utf8'));
const base=localServer({config,assets:'.local/staff-final/public'}).listeners('request')[0];
createServer(async(req,res)=>{
 if(req.url!=='/evidence')return base(req,res);
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const end=(status)=>{res.statusCode=status;res.end();};
 if(req.method!=='POST'||req.headers.host!=='127.0.0.1:4197'||req.headers.origin!=='http://127.0.0.1:4197')return end(403);
 let body='';try{
  for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return end(413);}
  const evidence=validateEvidence(JSON.parse(body));
  await appendFile('.local/staff-final/evidence.jsonl',JSON.stringify({at:new Date().toISOString(),...evidence})+'\n',{mode:0o600});return end(201);
 }catch{return end(400);}
}).listen(4197,'127.0.0.1',()=>console.log('Canary ruoli staging: http://127.0.0.1:4197 — credenziali solo browser/Auth.'));
