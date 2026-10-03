import {setupDiagnostics} from './diagnostics.js';
setupDiagnostics();
const demo = new URLSearchParams(location.search).get('demo') === '1';
if(import.meta.env.PROD&&'serviceWorker' in navigator){const register=()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{});};if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});}
if(demo){document.title='Spot Now — demo';const label=document.querySelector('#intro .eyebrow');if(label)label.textContent='Spot Now · demo con dati fittizi';}
if (new URLSearchParams(location.search).get('admin') === '1') {
  await import('./admin.js');
} else if (demo) {
  await import('./app.js');
} else {
  await import('./live.js');
}
if(new URLSearchParams(location.search).get('admin')!=='1'){
  const {setupInstallApp}=await import('./install-app.js');setupInstallApp();
}
