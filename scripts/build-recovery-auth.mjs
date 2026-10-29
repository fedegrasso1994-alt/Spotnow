import{build}from'vite';import{mkdir,copyFile}from'node:fs/promises';
await build({configFile:false,publicDir:false,logLevel:'error',build:{outDir:'.local/recovery-v3/review',emptyOutDir:true,sourcemap:false,lib:{entry:'tools/recovery-auth/page.js',formats:['es'],fileName:()=> 'review.js'}}});
await mkdir('.local/recovery-v3/review',{recursive:true,mode:0o700});for(const f of['index.html','style.css'])await copyFile('tools/recovery-auth/'+f,'.local/recovery-v3/review/'+f);console.log('Recovery review built; no secrets/config bundled.');
