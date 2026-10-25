import{build}from'vite';
import{copyFile,mkdir}from'node:fs/promises';
await build({configFile:false,publicDir:false,logLevel:'error',build:{outDir:'.local/staff-final/public',emptyOutDir:true,sourcemap:false,lib:{entry:'tools/staff-provisioning/page.js',formats:['es'],fileName:()=> 'setup.js'}}});
await mkdir('.local/staff-final/public',{recursive:true});
await copyFile('tools/staff-provisioning/index.html','.local/staff-final/public/index.html');
await copyFile('tools/staff-mfa/style.css','.local/staff-final/public/style.css');
