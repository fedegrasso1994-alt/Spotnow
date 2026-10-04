import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const files=[];
async function walk(dir){for(const file of await readdir(dir,{withFileTypes:true})){const name=path.join(dir,file.name);if(file.isDirectory()){if(file.name!=='.vercel')await walk(name);}else files.push(name);}}
await walk('dist');
const expected=['dist/index.html','dist/sw.js','dist/offline.html','dist/manifest.webmanifest','dist/icons/icon-192.png','dist/icons/icon-512.png'];
for(const file of expected)if(!files.includes(file))throw new Error(`Missing release asset: ${file}`);
for(const file of files){if(/\.env|test-qr|fixtures|service.?key/i.test(file))throw new Error(`Private/test artifact in release: ${file}`);if(!/\.(js|html|json)$/.test(file))continue;const content=await readFile(file,'utf8');if(/__SPOT_LOAD_TEST_BACKEND__/.test(content))throw new Error(`Load fixture hook in release: ${file}`);if(/sb_secret_[A-Za-z0-9_-]+/.test(content)||[...content.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].some(m=>{try{return JSON.parse(Buffer.from(m[1],'base64url').toString()).role==='service_role';}catch{return false;}}))throw new Error(`Server secret in release: ${file}`);}
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));if(manifest.start_url!=='/'||manifest.display!=='standalone')throw new Error('Unsafe PWA launch configuration');
console.log(`Release assets verified (${files.length} files); no test QR, environment file or secret key in bundle.`);
