// Build Output API artifact only. No env/token file is copied or generated.
import{mkdir,cp,writeFile,readFile,readdir}from'node:fs/promises';import{execFileSync}from'node:child_process';
await import('./check-release.mjs');
const root='.local/spotted-share/preview';const dir=root+'/.vercel/output';
const inspect=async(path)=>{for(const f of await readdir(path,{withFileTypes:true})){const p=path+'/'+f.name;if(f.isDirectory())await inspect(p);else if(/\.(js|html|json)$/.test(p)){const text=await readFile(p,'utf8');if(text.includes('qlucwdjcjomwyziegxrn'))throw Error('UNSAFE_PREVIEW_BUNDLE');}}};
await inspect('dist');const html=await readFile('dist/index.html','utf8');if(!html.includes('/assets/'))throw Error('BUILD_REQUIRED');
await mkdir(dir,{recursive:true});await cp('dist',dir+'/static',{recursive:true});
await writeFile(root+'/.vercel/project.json',JSON.stringify({projectId:'prj_zJG3gK7HboAKb0H6XMlF6yRZ5sWZ',orgId:'team_wlAVvnWmjj5TSD0TS72gXO92',projectName:'spot-now'}));
await writeFile(dir+'/config.json',JSON.stringify({version:3,routes:[{src:'/(.*)',headers:{'Content-Security-Policy':"font-src 'self'"},continue:true},{src:'/sw.js',headers:{'Cache-Control':'no-cache'},continue:true},{src:'/manifest.webmanifest',headers:{'Content-Type':'application/manifest+json'},continue:true},{handle:'filesystem'},{src:'/.*',dest:'/index.html'}]}));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await writeFile(root+'/artifact.json',JSON.stringify({commit:sha,project:'spot-now',team:'fedegrasso1994-1482',target:'preview',supabase_ref:'zjinjtkekmaqtxsuyvho'}));console.log('Prepared Preview-only artifact; staging bundle scanned; no production ref or server secret.');
