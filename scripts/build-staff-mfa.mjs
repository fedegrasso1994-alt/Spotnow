// Offline bundle only. Config and operator account IDs are NOT bundled or committed.
import {build} from 'vite';
import {copyFile,mkdir} from 'node:fs/promises';
await build({configFile:false,publicDir:false,logLevel:'error',build:{outDir:'.local/staff-mfa/public',emptyOutDir:true,sourcemap:false,lib:{entry:'tools/staff-mfa/page.js',formats:['es'],fileName:()=> 'setup.js'}}});
await mkdir('.local/staff-mfa/public',{recursive:true});
for(const file of ['index.html','style.css'])await copyFile('tools/staff-mfa/'+file,'.local/staff-mfa/public/'+file);
console.log('Setup MFA locale compilato; nessuna credenziale o configurazione provider modificata.');
