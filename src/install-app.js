import { modalController } from './modal.js';
let instance;
export function setupInstallApp(){
 if(instance)return instance;
 const profile=document.getElementById('myprofile');if(!profile)return;
 let installEvent,shown=false,pendingInvite=false,installedHere=false;
 const key='spot-now-install-invitation-v2';
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const button=document.querySelector('#installAppButton')||document.createElement('button');button.id='installAppButton';button.className='btn btn-ghost';button.style.marginTop='10px';if(!button.parentElement)profile.append(button);
 function syncButton(){const installed=standalone()||installedHere;button.hidden=false;button.disabled=installed;button.textContent=installed?'App già salvata sul telefono':'Salva l’app sul telefono';}
 syncButton();
 const overlay=document.createElement('div');overlay.className='overlay';overlay.id='installAppOverlay';overlay.style.zIndex='10';
 const sheet=document.createElement('div');sheet.className='sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','installTitle');
 const title=document.createElement('h2');title.id='installTitle';title.className='disp';title.textContent='Soma sempre a portata di mano';
 const text=document.createElement('p');text.className='sub';
 const primary=document.createElement('button');primary.className='btn btn-primary';primary.style.marginTop='24px';
 const later=document.createElement('button');later.className='btn btn-ghost';later.textContent='Più tardi';later.style.marginTop='10px';
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');
 function update(){
  text.textContent=installEvent?'Aggiungi Soma alla Home e riaprila con un tocco.':ios?'In Safari: Condividi → Aggiungi alla schermata Home → Aggiungi. Se compare, lascia attivo “Apri come app web”.':'Nel menu del browser scegli “Installa app” o “Aggiungi alla schermata Home”.';
  primary.textContent=installEvent?'Installa Soma':'Ho capito';
 }
 const modal=modalController(overlay,{firstFocus:primary,onEscape:()=>dismiss()});
 function dismiss(){modal.close();}
 function open(){if(standalone()||installedHere)return;status.textContent='';update();return modal.open();}
 primary.onclick=async()=>{
  if(!installEvent){dismiss();return;}
  const prompt=installEvent;installEvent=null;
  try{await prompt.prompt();await prompt.userChoice;dismiss();}
  catch{update();status.textContent='Usa il menu del browser per aggiungere Soma alla Home.';}
 };
 later.onclick=dismiss;button.onclick=open;
 sheet.append(title,text,primary,later,status);overlay.append(sheet);document.getElementById('phone').append(overlay);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;update();});
 window.addEventListener('appinstalled',()=>{installEvent=null;installedHere=true;syncButton();dismiss();});
 instance={showAfterMatch(){
  if(shown||standalone()||installedHere)return;
  try{if(localStorage.getItem(key))return;}catch{}
  if(!open()){pendingInvite=true;return;}pendingInvite=false;shown=true;try{localStorage.setItem(key,'shown');}catch{}
 },close(){pendingInvite=false;dismiss();}};window.addEventListener('spot-modal-closed',()=>{if(pendingInvite)instance.showAfterMatch();});return instance;
}
