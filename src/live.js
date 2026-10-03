import { renderAvatar } from './avatar.js';
import { validatePhoto } from './photo.js';
import { userMessage } from './errors.js';
import { createNavigation } from './navigation.js';
import { singleFlight, stableList } from './ui-refresh.js';
import {setupInstallApp} from './install-app.js';
import { connectBackend } from './supabase-client.js';
import { validProfile } from './domain.js';
import { createVenueScanner } from './scanner.js';
import { createLiveSocial } from './live-social.js';
import { createSuspensionScreen } from './suspension-screen.js';

const $=id=>document.getElementById(id);
const backend=connectBackend({url:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_PUBLIC_KEY});
const state={profile:{name:'',age:0,gender:null,preference:'ALL',photo:null},photoFile:null,checkin:null,venue:null,session:null,saving:false};
const qrFromUrl=new URLSearchParams(location.search).get('venue');
let pendingQr=qrFromUrl||sessionStorage.getItem('spot-pending-qr');
let selectedTribe=null,expiryTimer;
let entering=false,suspended=false,deleting=false,statusChecking=false,photoSelection=0;
let toastTimer;
let listGeneration=0,accountGeneration=0,booting=true;
const activeScreen=()=>document.querySelector('.screen.active')?.id;
const photoFor=path=>backend.photoUrl(path).catch(()=>null);
const message=userMessage;
function showToast(text) {$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
async function refreshOwnPhoto(){const generation=accountGeneration,path=state.profile.photoPath,selection=photoSelection;if(!path||state.photoFile)return;const photo=await photoFor(path);if(generation!==accountGeneration||state.profile.photoPath!==path||selection!==photoSelection||state.photoFile)return;state.profile.photo=photo;for(const id of ['mpAvatar','photoCircle'])avatar($(id),state.profile);}
const avatar=renderAvatar;
const memberLabel=count=>`${count} ${Number(count)===1?'membro':'membri'}`;
function emptyList(id,text) {const p=document.createElement('p');p.className='empty-hint';p.textContent=text;$(id).replaceChildren(p);}
function go(screen,{replace=false,fromHistory=false}={}) {
  if(deleting)screen='deleting';
  else if(suspended)screen='suspended';
  listGeneration++;
  social.closeDetail?.();$('detailOverlay').classList.remove('active');
  if(screen!=='camera')venueScanner.stop();
  if(screen==='scan'&&!state.venue)screen='intro';
  if(screen==='scan') { $('scanVenueName').textContent=state.venue.name; $('scanVenueAddress').textContent=state.venue.address||''; }
  if(['onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match'].includes(screen)&&(!state.session||state.session.user.is_anonymous))screen='login';
  if(screen==='login'){const legacy=Boolean(state.session?.user.is_anonymous);$('emailForm').hidden=legacy;$('existingAccountBtn').hidden=!legacy;$('existingAccountNote').hidden=!legacy;$('login').querySelector('.sub').textContent='Accedi e ritrova il tuo profilo e le tue Tribe quando torni.';}
  document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===screen));
  const dialogOpen=Boolean(document.querySelector('.overlay.active'));$('tabbar').inert=dialogOpen;
  const tabs=['venue','tribes','tribe','matches','chats','myprofile'];$('tabbar').classList.toggle('show',tabs.includes(screen));
  document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===(screen==='tribe'?'tribes':screen)));
  if(!fromHistory)navigation.record(screen,{...(screen==='tribe'?{tribeId:selectedTribe?.id}:{}),...(['chat','match'].includes(screen)?social.route():{})},replace);
  document.querySelectorAll('.screen').forEach(el=>{el.inert=dialogOpen||!el.classList.contains('active');});
  if(screen==='camera')venueScanner.open();
  if(screen==='venue')void renderPeople();
  if(screen==='tribes')void renderTribes();
  if(screen==='tribe')void renderTribe();
  social.onScreen(screen);
  if(screen==='onboarding'){const editing=Boolean(state.profile.photoPath);$('onboarding').querySelector('.disp').textContent=editing?'Modifica il tuo profilo':'Crea il tuo profilo';$('profileBtn').textContent=editing?'Salva modifiche':'Vai dentro';$('onboarding').querySelector('.backlink').onclick=()=>go(editing?'myprofile':pendingQr?'scan':'intro');void refreshOwnPhoto();}
  if(screen==='myprofile') {void refreshOwnPhoto();avatar($('mpAvatar'),state.profile);$('mpName').textContent=state.profile.name;$('mpMeta').textContent=`${state.profile.age} anni${state.venue?' · '+state.venue.name:''}`;}
}
function syncForm() {
  $('inName').value=state.profile.name;$('inAge').value=state.profile.age||'';avatar($('photoCircle'),state.profile);
  document.querySelectorAll('#onboarding .pref-btn').forEach(button=>{
    const action=button.getAttribute('onclick');
    const key=action.includes('setGender')?'gender':'preference';
    button.classList.toggle('selected',action.includes(`'${state.profile[key]}'`));
  });
}
const loadAccount=singleFlight(async(generation)=>{
  const account=state.session?.user.id;
  if(!state.session||state.session.user.is_anonymous){if(pendingQr)await previewVenue();else go('intro');return;}
  if(await checkAccountStatus())return;
  const profile=await backend.getProfile();
  if(generation!==accountGeneration)return;
  if(!profile){syncForm();go('onboarding',{replace:true});return;}
  const photo=await photoFor(profile.photo_path);
  if(generation!==accountGeneration||state.session?.user.id!==account)return;
  state.profile={name:profile.name,age:profile.age,gender:profile.gender,preference:profile.preference,photo,photoPath:profile.photo_path};
  syncForm();
  if(pendingQr){await performCheckin(generation);return;}
  const checkin=await backend.ownCheckIn();
  if(generation!==accountGeneration)return;state.checkin=checkin;
  if(state.checkin){
    const venue=await backend.getVenue(state.checkin.venue_id);if(generation!==accountGeneration)return;state.venue=venue;go(new Date(state.checkin.expires_at)>new Date()?'venue':'tribes');
  } else {state.checkin=null;go('myprofile');showToast('Inquadra il QR del locale per vedere chi c’è ora.');}
});
const hydrate=()=>loadAccount(accountGeneration);
async function checkAccountStatus(){
  if(!state.session)return false;
  const generation=accountGeneration;
  const status=await backend.accountState();const next=status==='suspended';
  if(generation!==accountGeneration)return false;deleting=status==='deleting';
  if(deleting){social.reset();installPrompt.close();go('deleting',{replace:true});return true;}
  if(next){suspended=true;social.reset();installPrompt.close();document.querySelectorAll('.overlay.active').forEach(el=>el.classList.remove('active'));go('suspended');}
  else suspended=false;
  return next;
}
createSuspensionScreen({onCheck:async()=>{const blocked=await checkAccountStatus();if(!blocked)await hydrate();return blocked;},onDelete:()=>deletion.onclick(),onSignOut:()=>signout.onclick()});
async function performCheckin(generation=accountGeneration) {
  if(!pendingQr)return go('myprofile');
  const token=pendingQr;const checkin=await backend.scanVenue(token);
  if(generation!==accountGeneration)return;state.checkin=checkin;
  if(pendingQr===token){pendingQr=null;sessionStorage.removeItem('spot-pending-qr');
    const clean=new URL(location.href);clean.searchParams.delete('venue');history.replaceState(null,'',clean);
  }
  // Remove the token after use; opening the app again must not renew a check-in.
  const venue=await backend.getVenue(checkin.venue_id);if(generation!==accountGeneration)return;state.venue=venue;
  $('list').replaceChildren();go('venue',{replace:true});
}
const loadPeople=singleFlight(async(generation)=>{
  if(generation!==listGeneration)return;
  const valid=state.checkin&&new Date(state.checkin.expires_at)>new Date();
  if(!$('list').children.length)$('countPill').textContent='…';$('venue').querySelector('.addr').textContent=state.venue?.name||'Nessun check-in attivo';
  if(!valid){$('countPill').textContent='0 ora';emptyList('list',state.checkin?'Il check-in è scaduto. Inquadra di nuovo il QR del locale per entrare.':'Inquadra il QR del locale per vedere chi è qui ora.');const btn=document.createElement('button');btn.className='btn btn-primary';btn.textContent='Inquadra il QR';btn.onclick=()=>go('camera');$('list').append(btn);return;}
  if(!$('list').children.length)emptyList('list','Caricamento…');
  try {
    const people=await backend.locationPeople(state.venue.id,true);
    const visible=await Promise.all(people.map(async p=>({...p,photo:await photoFor(p.photo_path)})));
    if(generation!==listGeneration)return;
    clearTimeout(expiryTimer);
    const nextExpiry=Math.min(Date.parse(state.checkin.expires_at),...visible.map(p=>Date.parse(p.expires_at)));
    expiryTimer=setTimeout(()=>{if($('venue').classList.contains('active'))void renderPeople();},Math.max(1,nextExpiry-Date.now()));
    $('countPill').textContent=`${visible.length} ora`;
    if(!visible.length)return emptyList('list','Sei tra i primi qui. I profili compariranno quando altre persone entreranno.');
    stableList($('list'),visible,{key:p=>p.id,signature:p=>JSON.stringify([p.name,p.age,Math.floor((Date.now()-Date.parse(p.checked_in_at))/60000)]),create:person=>{
      const row=document.createElement('button');row.className='person';row.style.color='var(--text)';row.style.textAlign='left';
      const face=document.createElement('div');face.className='avatar';avatar(face,person);
      const meta=document.createElement('div');meta.className='meta';
      const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;
      const subtitle=document.createElement('div');subtitle.className='tm';subtitle.textContent=`Check-in ${Math.max(0,Math.floor((Date.now()-Date.parse(person.checked_in_at))/60000))} min fa`;meta.append(name,subtitle);row.append(face,meta);
      return row;
    },update:(row,person)=>{avatar(row.querySelector('.avatar'),person);row.onclick=()=>social.openDetail({...person,venue_id:state.venue.id,venue_name:state.venue.name,source:'live'});}});
  }catch(error){if(generation===listGeneration){$('countPill').textContent='—';if(!$('list').querySelector('.person'))emptyList('list',message(error));}}
});
const renderPeople=()=>loadPeople(listGeneration);
function checkProfileValid() {
  state.profile.name=$('inName').value.trim();state.profile.age=Number($('inAge').value);
  $('ageError').classList.toggle('show',Boolean($('inAge').value)&&(!Number.isInteger(state.profile.age)||state.profile.age<18||state.profile.age>120));
}
function select(value,element,key) {state.profile[key]=value;Array.from(element.parentElement.children).forEach(el=>el.classList.toggle('selected',el===element));}
async function handlePhoto(event) {
  if(state.saving)return showToast('Attendi il salvataggio prima di cambiare foto.');
  const file=event.target.files[0];if(!file)return;
  const selection=++photoSelection,generation=accountGeneration;
  try{await validatePhoto(file);}catch(error){if(selection===photoSelection)showToast(message(error));return;}
  if(selection!==photoSelection||generation!==accountGeneration)return;const reader=new FileReader();reader.onerror=()=>{if(selection===photoSelection)showToast('Non riesco a leggere questa foto. Prova un’altra immagine.');};reader.onload=()=>{if(selection!==photoSelection||generation!==accountGeneration)return;state.photoFile=file;state.profile.photo=reader.result;avatar($('photoCircle'),state.profile);};reader.readAsDataURL(file);
}
async function trySaveProfile() {
  if(state.saving)return;checkProfileValid();
  if(!state.profile.photo&&!state.profile.photoPath)return showToast('Carica una foto per continuare.');
  if(!validProfile(state.profile))return showToast('Inserisci nome (1–60 caratteri), età intera da 18 a 120 anni e genere.');
  const generation=accountGeneration,selection=photoSelection;
  state.saving=true;$('profileBtn').disabled=true;
  try {
    // Preserve the uploaded path on retries, so a transient DB error does not upload twice.
    const draft={...state.profile},file=state.photoFile;
    if(file){const path=await backend.uploadPhoto(file);if(generation!==accountGeneration)return;if(selection!==photoSelection)return showToast('La foto è cambiata. Salva di nuovo il profilo.');draft.photoPath=path;state.profile.photoPath=path;state.photoFile=null;}
    await backend.saveProfile({...draft,photo:draft.photoPath});
    if(generation!==accountGeneration)return;
    await hydrate();
  }catch(error){if(generation===accountGeneration)showToast(message(error));}
  finally{if(generation===accountGeneration){state.saving=false;$('profileBtn').disabled=false;}}
}
function changeEmail(){$('codeForm').hidden=true;$('emailForm').hidden=false;$('loginStatus').textContent='';}
$('emailForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('requestCodeBtn');button.disabled=true;$('loginStatus').textContent='Invio in corso…';
  try {await backend.requestCode({email:$('loginEmail').value.trim(),redirectTo:location.origin+location.pathname+(pendingQr?'?venue='+encodeURIComponent(pendingQr):'')});$('loginStatus').textContent='Controlla la tua email, anche nello spam, e tocca il link per accedere. Puoi poi tornare qui.';}
  catch(error){$('loginStatus').textContent=message(error);}
  finally{button.disabled=false;}
});
$('codeForm').addEventListener('submit',async event=>{
  event.preventDefault();$('verifyCodeBtn').disabled=true;$('loginStatus').textContent='Verifica in corso…';
  try{const result=await backend.verifyCode({email:$('loginEmail').value.trim(),token:$('loginCode').value.trim()});state.session=result.session;await hydrate();$('loginStatus').textContent='';}
  catch(error){$('loginStatus').textContent=message(error);}
  finally{$('verifyCodeBtn').disabled=false;}
});
// Existing profile controls retain the same styling as the prototype.
const signout=document.createElement('button');signout.className='backlink';signout.style.marginTop='18px';signout.textContent='Esci dall’account';
signout.onclick=async()=>{try{await backend.signOut();location.reload();}catch(error){showToast(message(error));}};$('myprofile').append(signout);
async function enterApp(){
  if(entering)return;entering=true;introButton.disabled=true;
  try{if(state.session&&!state.session.user.is_anonymous)await hydrate();else go('login');}
  catch(error){showToast(message(error));}
  finally{entering=false;introButton.disabled=false;}
}
const introButton=$('intro').querySelector('.btn-primary');introButton.textContent='Inquadra il QR Code';introButton.onclick=()=>go('camera');
const venueScanner=createVenueScanner({screen:$('camera'),onScan:async token=>{pendingQr=token;sessionStorage.setItem('spot-pending-qr',token);if(state.session&&!state.session.user.is_anonymous)await hydrate();else await previewVenue();},onBack:()=>go('intro')});
const installPrompt=setupInstallApp();
export function onFirstMatch(){installPrompt.showAfterMatch();}
const social=createLiveSocial({backend,go,showToast,avatar,profile:()=>state.profile,session:()=>suspended?null:state.session,onFirstMatch,venueName:()=>state.venue?.name||''});

Object.assign(window,{go,changeEmail,checkProfileValid,trySaveProfile,handlePhoto,
  setPref:(value,el)=>select(value,el,'preference'),setGender:(value,el)=>select(value,el,'gender'),
  editProfile:()=>{syncForm();go('onboarding');}});

const navigation=createNavigation({onNavigate:async route=>{
 const generation=accountGeneration,view=listGeneration;const current=()=>generation===accountGeneration&&view===listGeneration;
 if(route.screen==='chat'){await social.restoreChat(route.matchId,current);return;}
 if(route.screen==='tribe'){const tribes=await backend.tribes();if(!current())return;selectedTribe=tribes.find(t=>t.id===route.tribeId);if(!selectedTribe)return go('tribes',{replace:true});}
 go(route.screen,{fromHistory:true});
}});
window.addEventListener('popstate',event=>{Promise.resolve(navigation.back(event)).catch(error=>{go('tribes',{replace:true});showToast(message(error));});});
const deletingScreen=document.createElement('section');deletingScreen.id='deleting';deletingScreen.className='screen';
const deletingTitle=document.createElement('h2');deletingTitle.className='disp';deletingTitle.textContent='Completa la cancellazione';
const deletingNote=document.createElement('p');deletingNote.className='sub';deletingNote.textContent='La cancellazione è iniziata ma non è ancora completa. Il tuo profilo è escluso da discovery e chat. Riprova per completarla.';
const retryDelete=document.createElement('button');retryDelete.className='btn btn-primary';retryDelete.textContent='Riprova cancellazione';retryDelete.style.marginTop='24px';retryDelete.onclick=()=>deletion.onclick();
const deletingExit=document.createElement('button');deletingExit.className='backlink';deletingExit.textContent='Esci dall’account';deletingExit.onclick=()=>signout.onclick();
deletingScreen.append(deletingTitle,deletingNote,retryDelete,deletingExit);$('phone').append(deletingScreen);

async function previewVenue(){
 sessionStorage.setItem('spot-pending-qr',pendingQr);
 const token=pendingQr,generation=accountGeneration;
 const preview=await backend.venuePreview(token);if(generation!==accountGeneration||pendingQr!==token)return;state.venue=preview;
 $('countNow').textContent=preview.live_count;$('scanTribeCount').textContent=`${memberLabel(preview.member_count)} nella Tribe`;
 go('scan');
}
$('enterVenueBtn').onclick=()=>void enterApp();
$('existingAccountBtn').onclick=async()=>{
 const btn=$('existingAccountBtn');btn.disabled=true;
 try{
  const redirect=location.origin+location.pathname+(pendingQr?'?venue='+encodeURIComponent(pendingQr):'');
  // Optional migration of a legacy temporary profile; normal Google access uses sign-in.
  const result=await backend.linkGoogle(redirect);const url=new URL(result.url);if(url.protocol!=='https:')throw new Error('Collegamento non valido');location.assign(url.href);
 }catch(error){go('login');$('loginStatus').textContent=message(error);}finally{btn.disabled=false;}
};
$('googleLoginBtn').onclick=async()=>{
 const btn=$('googleLoginBtn');btn.disabled=true;$('loginStatus').textContent='Apertura di Google…';
 try{
  if(pendingQr)sessionStorage.setItem('spot-pending-qr',pendingQr);
  const redirect=location.origin+location.pathname+(pendingQr?'?venue='+encodeURIComponent(pendingQr):'');
  if(state.session?.user.is_anonymous)await backend.signOut();
  const result=await backend.googleLogin(redirect);
  if(!result?.url)throw new Error('Google non ha restituito il collegamento di accesso. Riprova.');
  const url=new URL(result.url);if(url.protocol!=='https:')throw new Error('Collegamento non valido');location.assign(url.href);
 }catch(error){go('login');$('loginStatus').textContent=message(error);}finally{btn.disabled=false;}
};
const loadTribes=singleFlight(async(generation)=>{
 if(generation!==listGeneration)return;if(!$('tribesList').children.length)emptyList('tribesList','Caricamento…');
 try{
  const tribes=await backend.tribes();if(generation!==listGeneration)return;
  tribes.sort((a,b)=>Number(b.id===state.venue?.id)-Number(a.id===state.venue?.id)||a.name.localeCompare(b.name));
  $('tribesList').replaceChildren();if(!tribes.length)return emptyList('tribesList','Inquadra il QR di un luogo per entrare nella sua Tribe.');
  for(const tribe of tribes){const card=document.createElement('button');card.className='person';card.style.color='var(--text)';card.style.textAlign='left';const meta=document.createElement('div');meta.className='meta';const name=document.createElement('div');name.className='nm';name.textContent=tribe.name;const count=document.createElement('div');count.className='tm';count.textContent=`${memberLabel(tribe.member_count)} · ${tribe.live_count} qui ora`;meta.append(name,count);card.append(meta);card.onclick=()=>{if(selectedTribe?.id!==tribe.id)$('tribeGrid').replaceChildren();selectedTribe=tribe;go('tribe');};$('tribesList').append(card);}
 }catch(error){if(generation===listGeneration)emptyList('tribesList',message(error));}
});
const renderTribes=()=>loadTribes(listGeneration);
const loadTribe=singleFlight(async(generation)=>{
 if(generation!==listGeneration)return;if(!selectedTribe)return go('tribes');const place=selectedTribe;
 $('tribeTitle').textContent=place.name;$('tribeCount').textContent=`${memberLabel(place.member_count)} · i presenti ora sono nella sezione Ora`;
 try{
  const people=await backend.locationPeople(place.id,false);const visible=await Promise.all(people.map(async p=>({...p,photo:await photoFor(p.photo_path)})));
  if(generation!==listGeneration)return;
  if(!visible.length)return emptyList('tribeGrid','Ancora nessun profilo disponibile nella Tribe.');
  stableList($('tribeGrid'),visible,{key:p=>p.id,signature:p=>JSON.stringify([p.name,p.age]),create:person=>{const card=document.createElement('button');card.className='tribe-card';const face=document.createElement('div');face.className='avatar';avatar(face,person);const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;card.append(face,name);return card;},update:(card,person)=>{avatar(card.querySelector('.avatar'),person);card.onclick=()=>social.openDetail({...person,source:'tribe',venue_id:place.id,venue_name:place.name});}});
 }catch(error){if(generation===listGeneration)emptyList('tribeGrid',message(error));}
});
const renderTribe=()=>loadTribe(listGeneration);
const deletion=document.createElement('button');deletion.className='backlink';deletion.style.marginTop='18px';deletion.textContent='Elimina account';
deleteAccountButtonSetup();
function deleteAccountButtonSetup(){deletion.onclick=async()=>{if(deletion.disabled)return;if(!confirm('Eliminare definitivamente account, foto, Tribe, Spot e conversazioni? Questa operazione non può essere annullata.'))return;deletion.disabled=true;retryDelete.disabled=true;try{await backend.deleteAccount();await backend.signOut().catch(()=>{});sessionStorage.removeItem('spot-pending-qr');location.assign(location.origin+location.pathname);}catch(error){showToast(message(error));await checkAccountStatus().catch(()=>{});}finally{deletion.disabled=false;retryDelete.disabled=false;}};$('myprofile').append(deletion);}

function syncAccountControls(){const anonymous=Boolean(state.session?.user?.is_anonymous);signout.hidden=!state.session||anonymous;}
backend.onSessionChange((event,session)=>{const previous=state.session?.user.id;state.session=session;if(previous!==session?.user.id)accountGeneration++;syncAccountControls();if(previous&&session?.user.id&&previous!==session.user.id){navigation.reset();photoSelection++;state.saving=false;$('profileBtn').disabled=false;suspended=false;deleting=false;installPrompt.close();social.reset();state.profile={name:'',age:0,gender:null,preference:'ALL',photo:null};state.photoFile=null;state.venue=null;state.checkin=null;selectedTribe=null;syncForm();for(const id of ['list','tribeGrid','tribesList','matchesList','chatsList'])$(id).replaceChildren();}if(event==='SIGNED_OUT'){navigation.reset();photoSelection++;state.saving=false;$('profileBtn').disabled=false;suspended=false;deleting=false;state.profile={name:'',age:0,gender:null,preference:'ALL',photo:null};state.photoFile=null;syncForm();installPrompt.close();social.reset();state.venue=null;state.checkin=null;selectedTribe=null;for(const id of ['list','tribeGrid','tribesList','matchesList','chatsList'])$(id).replaceChildren();go('intro');}else if(!booting&&event==='SIGNED_IN'&&previous!==session?.user.id){setTimeout(()=>void hydrate().catch(error=>showToast(message(error))),0);}});
setInterval(()=>{if(document.hidden)return;if($('venue').classList.contains('active'))void renderPeople();if($('tribe').classList.contains('active'))void renderTribe();},5000);
setInterval(async()=>{if(document.hidden||!state.session||statusChecking)return;statusChecking=true;try{const wasSuspended=suspended;if(!await checkAccountStatus()&&wasSuspended)await hydrate();}catch{/* Retry on the next poll; server authorization remains authoritative. */}finally{statusChecking=false;}},15000);
function resume(){if(document.hidden||!state.session)return;if(['intro','login'].includes(activeScreen())&&!state.session.user.is_anonymous){void hydrate().catch(error=>showToast(message(error)));return;}social.resume();if(activeScreen()==='venue')void renderPeople();if(activeScreen()==='tribe')void renderTribe();if(activeScreen()==='tribes')void renderTribes();void checkAccountStatus().then(blocked=>{if(!blocked&&activeScreen()==='deleting')void hydrate().catch(error=>showToast(message(error)));}).catch(()=>{});}
document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
try{state.session=await backend.session();syncAccountControls();if(state.session)await hydrate();else if(pendingQr)await previewVenue();}
catch(error){go('intro',{replace:true});showToast(message(error));}finally{booting=false;}

const returnedUrl=new URL(location.href);const hashParams=new URLSearchParams(returnedUrl.hash.slice(1));
const oauthError=returnedUrl.searchParams.get('error_description')||hashParams.get('error_description');
if(oauthError){
 for(const key of ['error','error_code','error_description'])returnedUrl.searchParams.delete(key);
 if(hashParams.has('error'))returnedUrl.hash='';history.replaceState(null,'',returnedUrl);
 go('login');$('loginStatus').textContent=/already linked|already exists/i.test(oauthError)?'Questo Google è già collegato a un account Spot Now. Usa “Continua con Google” per accedere a quello esistente.':'Accesso Google non completato. Riprova.';
}
