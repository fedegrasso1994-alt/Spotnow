/** Fresh isolated staging artifact. Does not read root .env.local or any server credential. */
import{readFile,mkdir,writeFile,readdir}from'node:fs/promises';import{spawnSync,execFileSync}from'node:child_process';import{resolve}from'node:path';
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();if(branch!=='codex/soma-schema-v2-staging')throw Error('STAGING_BRANCH_REQUIRED');
const config=await readFile('.local/privacy-stage/frontend-env.sh','utf8');const key=config.match(/VITE_SUPABASE_PUBLIC_KEY=['"]?([^'"\s]+)/)?.[1];if(!key?.startsWith('sb_publishable_'))throw Error('STAGING_PUBLISHABLE_REQUIRED');
const root='.local/legacy-key-migration/preview',out=resolve(root+'/.vercel/output/static');await mkdir(root,{recursive:true});
// Reuse the last verified complete staging artifact's flag set, not Production defaults.
const old=await readFile('.local/notifications-mvp/preview/assets/live-C8RqMSz1.js','utf8');
const flags=Object.fromEntries([...old.matchAll(/(VITE_[A-Z0-9_]+):[`"'](true|false)[`"']/g)].map(m=>[m[1],m[2]]));
if(flags.VITE_ONBOARDING_NO_QR!=='true'||flags.VITE_PROFILE_AUTHORIZATION_V2!=='true')throw Error('VERIFIED_STAGING_FLAGS_REQUIRED');
const vapid=(await readFile('.local/notifications-mvp/public-build.env','utf8')).match(/VITE_NOTIFICATIONS_VAPID_PUBLIC=['"]?([^'"\s]+)/)?.[1];
const env={...process.env,...flags,VITE_NOTIFICATIONS_VAPID_PUBLIC:vapid,VITE_SUPABASE_URL:'https://zjinjtkekmaqtxsuyvho.supabase.co',VITE_SUPABASE_PUBLIC_KEY:key};
for(const k of Object.keys(env))if(k.startsWith('SUPABASE_')||k.startsWith('NOTIFICATIONS_'))delete env[k];
const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',out],{env,stdio:'inherit'});if(r.status!==0)throw Error('STAGING_BUILD_FAILED');
await writeFile(root+'/build-metadata.json',JSON.stringify({sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch,supabase_ref:'zjinjtkekmaqtxsuyvho',flags,public_key_source:'.local/privacy-stage/frontend-env.sh'}));
const files=[];async function walk(p){for(const f of await readdir(p,{withFileTypes:true})){const q=p+'/'+f.name;if(f.isDirectory())await walk(q);else files.push(q);}}await walk(out);
for(const p of files){if(!/\.(js|html|json|webmanifest)$/.test(p))continue;const text=await readFile(p,'utf8');if(text.includes('qlucwdjcjomwyziegxrn')||/sb_secret_[A-Za-z0-9_-]+/.test(text))throw Error('UNSAFE_STAGING_ARTIFACT');}
await writeFile(root+'/.vercel/output/config.json',JSON.stringify({version:3,routes:[{src:'/sw.js',headers:{'Cache-Control':'no-cache'},continue:true},{handle:'filesystem'},{src:'/.*',dest:'/index.html'}]}));
await writeFile(root+'/.vercel/project.json',JSON.stringify({projectId:'prj_zJG3gK7HboAKb0H6XMlF6yRZ5sWZ',orgId:'team_wlAVvnWmjj5TSD0TS72gXO92',projectName:'spot-now'}));
console.log('Isolated staging artifact scanned; no deployment executed.');
