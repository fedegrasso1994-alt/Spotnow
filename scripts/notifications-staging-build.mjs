// Explicit staging build. Exports only the public VAPID key; never the private env map.
import{readFile}from'node:fs/promises';import{spawnSync}from'node:child_process';
if(process.env.VITE_SUPABASE_URL!=='https://zjinjtkekmaqtxsuyvho.supabase.co'||!process.env.VITE_SUPABASE_PUBLIC_KEY)throw Error('EXPLICIT_STAGING_ENV_REQUIRED');
const lines=(await readFile('.local/notifications-mvp/staging-secrets.env','utf8')).split('\n');const line=lines.find(x=>x.startsWith('NOTIFICATIONS_VAPID_PUBLIC='));const publicKey=line?.slice('NOTIFICATIONS_VAPID_PUBLIC='.length);if(!/^[A-Za-z0-9_-]{87}$/.test(publicKey||''))throw Error('PUBLIC_VAPID_KEY_REQUIRED');
const env={...process.env,VITE_NOTIFICATIONS_MVP:'true',VITE_NOTIFICATIONS_VAPID_PUBLIC:publicKey};for(const key of Object.keys(env))if(key.startsWith('NOTIFICATIONS_')||key==='VITE_NOTIFICATIONS_VAPID_PRIVATE')delete env[key];
const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{env,stdio:'inherit'});process.exitCode=r.status??1;
