import {setupViewport} from './viewport.js';
setupViewport();
import {setupDiagnostics} from './diagnostics.js';
setupDiagnostics();
const demo = new URLSearchParams(location.search).get('demo') === '1';
if(import.meta.env.PROD&&'serviceWorker' in navigator){const register=()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{});};if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});}
if(demo){document.title='Soma — demo';const label=document.querySelector('#intro .eyebrow');if(label)label.textContent='Soma · demo con dati fittizi';}
const dashboard=new URLSearchParams(location.search).get('analytics')==='1';
if(dashboard){
 const {dashboardEnabled}=await import('./analytics-dashboard-api.js');
 if(dashboardEnabled(import.meta.env))await import('./analytics-dashboard.js');
 else document.getElementById('phone').textContent='Dashboard non disponibile.';
} else if (new URLSearchParams(location.search).get('admin') === '1') {
  const {moderationEnabled}=await import('./moderation-api.js');
  if(moderationEnabled(import.meta.env))await import('./moderation-panel.js');else await import('./admin.js');
} else if (demo) {
  await import('./app.js');
} else {
  await import('./live.js');
}
if(!dashboard&&new URLSearchParams(location.search).get('admin')!=='1'){
  const {setupInstallApp}=await import('./install-app.js');setupInstallApp();
}
