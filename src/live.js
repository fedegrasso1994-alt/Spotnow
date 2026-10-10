import {createPrivacyControls} from './privacy-phase1.js';
import { renderAvatar } from './avatar.js';
import { validatePhoto } from './photo.js';
import { userMessage } from './errors.js';
import { createNavigation } from './navigation.js';
import { createPager } from './pagination.js';
import { singleFlight, stableList } from './ui-refresh.js';
import {setupInstallApp} from './install-app.js';
import { connectBackend } from './supabase-client.js';
import { validProfile } from './domain.js';
import { createVenueScanner } from './scanner.js';
import { createLiveSocial } from './live-social.js';
import { createSuspensionScreen } from './suspension-screen.js';

const $=id=>document.getElementById(id);
const backend=connectBackend({url:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_PUBLIC_KEY});
const privacyEnabled=typeof backend.privacyState==='function';
let privacy=null,existingProfile=false;
const state={profile:{name:'',age:0,gender:null,preference:privacyEnabled?null:'ALL',photo:null},photoFile:null,checkin:null,venue:null,session:null,saving:false};
const qrFromUrl=new URLSearchParams(location.search).get('venue');
// OAuth/email redirects carry the current QR in their URL; a stored old token is never an ingress.
let pendingQr=qrFromUrl;
let restoredDraft=false;
const draftKey='spot-onboarding-venue-v1';
function clearDraft(){try{localStorage.removeItem(draftKey);}catch{/* Storage can be unavailable in private browsing. */}}
function rememberDraft(){try{localStorage.setItem(draftKey,JSON.stringify({token:pendingQr,owner:state.session?.user.is_anonymous?null:state.session?.user.id||null}));}catch{/* The current flow and OAuth URL still work without storage. */}}
function restoreDraft(){try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(!draft||typeof draft.token!=='string'||!draft.token)return;if(draft.owner&&draft.owner!==state.session?.user.id)return;pendingQr=draft.token;restoredDraft=true;}catch{clearDraft();}}
const liveCheckin=()=>Boolean(state.checkin&&Date.parse(state.checkin.expires_at)>Date.now());
let selectedTribe=null,expiryTimer,liveOffset=0,tribeOffset=0;
const livePager=createPager($('venue'),offset=>{liveOffset=offset;$('list').replaceChildren();go('venue');});
const tribePager=createPager($('tribe'),offset=>{tribeOffset=offset;$('tribeGrid').replaceChildren();go('tribe');});
const detailWarmer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&activeScreen()==='tribe'){detailWarmer.unobserve(entry.target);const path=entry.target.dataset.detailPath;if(path&&backend.prefetchDetailPhotos)void backend.prefetchDetailPhotos([{detail_path:path}]).catch(()=>{});}},{root:$('tribe'),rootMargin:'180px'});
async function peoplePage(place,live,offset){if(backend.locationPeoplePage)return backend.locationPeoplePage(place,live,offset);const rows=await backend.locationPeople(place,live);return {items:rows.slice(offset,offset+48),hasMore:rows.length>offset+48,total:rows.length};}
async function withPhotos(people,onReady=()=>{}){
 const loaded=new Map();const groups=[people.slice(0,4),people.slice(4)].filter(group=>group.length);
 await Promise.all(groups.map(async group=>{
  const urls=backend.photoUrls?await backend.photoUrls(group.map(p=>p.thumbnail_path||p.photo_path)).catch(()=>new Map()):null;
  const records=await Promise.all(group.map(async p=>({...p,photo:urls?urls.get(p.thumbnail_path||p.photo_path)||null:await photoFor(p.thumbnail_path||p.photo_path)})));
  for(const p of records)loaded.set(p.id,p);onReady(people.map(p=>loaded.get(p.id)||p));
 }));return people.map(p=>loaded.get(p.id)||p);
}
let awaitingQr=false,entryGeneration=0;
let entering=false,suspended=false,deleting=false,statusChecking=false,photoSelection=0;
let toastTimer;
let listGeneration=0,accountGeneration=0,booting=true;
const activeScreen=()=>document.querySelector('.screen.active')?.id;
const photoFor=path=>backend.photoUrl(path).catch(()=>null);
const message=userMessage;
function showToast(text) {$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
async function refreshOwnPhoto(){const generation=accountGeneration,path=state.profile.photoPath,selection=photoSelection;if(!path||state.photoFile)return;const photo=await photoFor(path);if(generation!==accountGeneration||state.profile.photoPath!==path||selection!==photoSelection||state.photoFile)return;state.profile.photo=photo;for(const id of ['mpAvatar','photoCircle'])avatar($(id),state.profile,{eager:privacyEnabled});}
const avatar=renderAvatar;
const memberLabel=count=>`${count} ${Number(count)===1?'membro':'membri'}`;
function emptyList(id,text) {const p=document.createElement('p');p.className='empty-hint';p.textContent=text;$(id).replaceChildren(p);}
function go(screen,{replace=false,fromHistory=false}={}) {
  if(deleting)screen='deleting';
  else if(suspended)screen='suspended';
  else if(privacyEnabled&&state.session&&!state.session.user.is_anonymous&&privacy?.state?.age_status!=='eligible'&&['onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match'].includes(screen))screen='privacy';
  listGeneration++;backend.cancelDiscoveryReads?.(screen==='tribe'?selectedTribe?.id:null);
  if(screen==='camera'){awaitingQr=true;entryGeneration++;pendingQr=null;restoredDraft=false;clearDraft();sessionStorage.removeItem('spot-pending-qr');const clean=new URL(location.href);clean.searchParams.delete('venue');history.replaceState(null,'',clean);}
  if(screen!=='tribe')detailWarmer?.disconnect();
  social.closeDetail?.();$('detailOverlay').classList.remove('active');
  if(screen!=='camera')venueScanner.stop();
  if(screen==='scan'&&!state.venue)screen='intro';
  if(screen==='scan') { $('scanVenueName').textContent=state.venue.name; $('scanVenueAddress').textContent=state.venue.address||''; }
  if(['onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match'].includes(screen)&&(!state.session||state.session.user.is_anonymous))screen='login';
  if(screen==='onboarding'&&!state.profile.photoPath&&!pendingQr)screen='intro';
  if(screen==='login'){const legacy=Boolean(state.session?.user.is_anonymous);$('emailForm').hidden=legacy;$('existingAccountBtn').hidden=!legacy;$('existingAccountNote').hidden=!legacy;$('login').querySelector('.sub').textContent='Accedi e ritrova il tuo profilo e le tue Tribe quando torni.';}
  document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===screen));
  const dialogOpen=Boolean(document.querySelector('.overlay.active'));$('tabbar').inert=dialogOpen;
  const tabs=['venue','tribes','tribe','matches','chats','myprofile'];$('tabbar').classList.toggle('show',tabs.includes(screen));
  document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===(screen==='tribe'?'tribes':screen)));
  if(!fromHistory)navigation.record(screen,{...(screen==='tribe'?{tribeId:selectedTribe?.id}:{}),...(['chat','match'].includes(screen)?social.route():{})},replace);
  document.querySelectorAll('.screen').forEach(el=>{el.inert=dialogOpen||!el.classList.contains('active');});
  if(screen==='camera')venueScanner.open();
  if(screen==='venue'){void renderPeople();if(state.venue?.id&&backend.prefetchTribe)void backend.prefetchTribe(state.venue.id).catch(()=>{});}
  if(screen==='tribes')void renderTribes();
  if(screen==='tribe')void renderTribe();
  social.onScreen(screen);
  if(screen==='onboarding'){const editing=Boolean(state.profile.photoPath);$('onboarding').querySelector('.disp').textContent=editing?'Modifica il tuo profilo':'Crea il tuo profilo';$('profileBtn').textContent=editing?'Salva modifiche':'Entra';$('onboarding').querySelector('.backlink').onclick=()=>go(editing?'myprofile':pendingQr?'scan':'intro');void refreshOwnPhoto();}
  if(screen==='myprofile') {void refreshOwnPhoto();avatar($('mpAvatar'),state.profile,{eager:privacyEnabled});$('mpName').textContent=state.profile.name;$('mpMeta').textContent=`${state.profile.age} anni${state.profile.occupation?' · '+state.profile.occupation:''}${state.venue?' · '+state.venue.name:''}`;}
}
function syncForm() {
  $('inOccupation').value=state.profile.occupation||'';$('inName').value=state.profile.name;$('inAge').value=state.profile.age||'';avatar($('photoCircle'),state.profile);
  document.querySelectorAll('#onboarding .pref-btn').forEach(button=>{
    const action=button.getAttribute('onclick');
    const key=action.includes('setGender')?'gender':'preference';
    button.classList.toggle('selected',action.includes(`'${state.profile[key]}'`));
  });
}
const loadAccount=singleFlight(async(key)=>{
  const generation=accountGeneration,entry=entryGeneration;
  const current=()=>generation===accountGeneration&&entry===entryGeneration&&!awaitingQr;
  const account=state.session?.user.id;
  if(!state.session||state.session.user.is_anonymous){if(!current())return;if(pendingQr)await previewVenue();else go('intro');return;}
  if(await checkAccountStatus())return;
  if(privacyEnabled){const ps=await privacy.refresh();if(!current())return;if(ps.age_status!=='eligible'){social.reset();go('privacy',{replace:true});return;}}
  const profile=await backend.getProfile();existingProfile=Boolean(profile);
  if(privacyEnabled&&!profile){state.profile.age=privacy.state.declared_age||0;if(privacy.state.consent_status!=='active'){go('privacy',{replace:true});return;}}
  if(!current())return;
  if(!profile){if(pendingQr){await previewVenue();if(!current())return;restoredDraft=false;rememberDraft();syncForm();go('onboarding',{replace:true});}else{syncForm();go('intro',{replace:true});}return;}
  const photo=state.profile.photoPath===profile.photo_path?state.profile.photo:null;
  if(!current()||state.session?.user.id!==account)return;
  state.profile={name:profile.name,age:profile.age,gender:profile.gender,preference:profile.preference,photo,photoPath:profile.photo_path,occupation:profile.occupation||''};
  syncForm();void refreshOwnPhoto();
  if(restoredDraft){pendingQr=null;restoredDraft=false;clearDraft();}
  if(pendingQr){await performCheckin(generation,entry);return;}
  clearDraft();
  const checkin=await backend.ownCheckIn();
  if(!current())return;state.checkin=checkin;
  if(liveCheckin()){
    const venue=await backend.getVenue(state.checkin.venue_id);if(!current())return;state.venue=venue;go('venue',{replace:true});
  }else{state.venue=null;go('tribes',{replace:true});}
});
const hydrate=()=>loadAccount(`${accountGeneration}:${entryGeneration}`);
async function checkAccountStatus(){
  if(!state.session)return false;
  const generation=accountGeneration;
  const status=await backend.accountState();const next=status==='suspended';
  if(generation!==accountGeneration)return false;deleting=status==='deleting';
  if(deleting){social.reset();installPrompt.close();go('deleting',{replace:true});return true;}
  if(next){suspended=true;social.reset();installPrompt.close();document.querySelectorAll('.overlay.active').forEach(el=>el.classList.remove('active'));go('suspended');}
  else suspended=false;
  if(!next&&privacyEnabled){const ps=await privacy.refresh();if(generation!==accountGeneration)return false;if(ps.age_status!=='eligible'){social.reset();go('privacy',{replace:true});return true;}}
  return next;
}
createSuspensionScreen({onCheck:async()=>{const blocked=await checkAccountStatus();if(!blocked)await hydrate();return blocked;},onDelete:()=>deletion.onclick(),onSignOut:()=>signout.onclick()});
async function performCheckin(generation=accountGeneration,entry=entryGeneration) {
  if(!pendingQr)return go('tribes');
  const token=pendingQr;const checkin=await backend.scanVenue(token);
  if(generation!==accountGeneration||entry!==entryGeneration||awaitingQr)return;state.checkin=checkin;
  if(pendingQr===token){pendingQr=null;restoredDraft=false;clearDraft();sessionStorage.removeItem('spot-pending-qr');
    const clean=new URL(location.href);clean.searchParams.delete('venue');history.replaceState(null,'',clean);
  }
  // Remove the token after use; opening the app again must not renew a check-in.
  const venue=await backend.getVenue(checkin.venue_id);if(generation!==accountGeneration||entry!==entryGeneration||awaitingQr)return;state.venue=venue;
  liveOffset=0;livePager.reset();$('list').replaceChildren();go('venue',{replace:true});
}
const loadPeople=singleFlight(async(generation)=>{
  if(generation!==listGeneration)return;
  const valid=liveCheckin();$('discoverTribeBtn').hidden=!valid;
  if(!$('list').children.length)$('countPill').textContent='…';$('venue').querySelector('.addr').textContent=valid?state.venue?.name||'Locale':'Nessun check-in attivo';
  if(!valid){livePager.reset();$('countPill').textContent='0 ora';emptyList('list',state.checkin?'Il check-in è scaduto. Inquadra di nuovo il QR del locale per entrare.':'Inquadra il QR del locale per vedere chi è qui ora.');const btn=document.createElement('button');btn.className='btn btn-primary';btn.textContent='Scansiona il QR per vedere chi c’è qui ora';btn.onclick=()=>go('camera');$('list').append(btn);return;}
  if(!$('list').children.length)emptyList('list','Caricamento…');livePager.busy(true);
  try {
    const page=await peoplePage(state.venue.id,true,liveOffset);if(generation!==listGeneration)return;
    const people=page.items;
    if(!people.length&&liveOffset){liveOffset=0;go('venue',{replace:true});return;}
    livePager.update({offset:liveOffset,count:people.length,total:page.total,hasMore:page.hasMore});$('countPill').textContent=`${page.total} ora`;
    clearTimeout(expiryTimer);const nextExpiry=Date.parse(state.checkin.expires_at);
    expiryTimer=setTimeout(()=>{if($('venue').classList.contains('active'))void renderPeople();},Math.max(1,nextExpiry-Date.now()));
    if(!people.length)return emptyList('list','Sei tra i primi qui. I profili compariranno quando altre persone entreranno.');
    const paint=visible=>stableList($('list'),visible,{key:p=>p.id,signature:p=>JSON.stringify([p.name,p.age]),create:person=>{
      const row=document.createElement('button');row.className='person';row.style.color='var(--text)';row.style.textAlign='left';
      const face=document.createElement('div');face.className='avatar';const meta=document.createElement('div');meta.className='meta';
      const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;
      const subtitle=document.createElement('div');subtitle.className='tm';subtitle.textContent='Qui ora';meta.append(name,subtitle);row.append(face,meta);return row;
    },update:(row,person)=>{avatar(row.querySelector('.avatar'),person,{eager:people.slice(0,4).some(p=>p.id===person.id),thumbnail:true});row.onclick=()=>social.openDetail({...person,venue_id:state.venue.id,venue_name:state.venue.name,source:'live'});}});
    paint(people);const visible=await withPhotos(people,partial=>{if(generation===listGeneration)paint(partial);});if(generation!==listGeneration)return;paint(visible);if(backend.prefetchDetailPhotos)void backend.prefetchDetailPhotos(visible).catch(()=>{});
  }catch(error){if(generation===listGeneration){livePager.update({offset:liveOffset,count:0,total:liveOffset,hasMore:false});$('countPill').textContent='—';if(!$('list').querySelector('.person'))emptyList('list',message(error));}}
});
const renderPeople=()=>loadPeople(listGeneration);
function checkProfileValid() {
  state.profile.occupation=$('inOccupation').value.trim();state.profile.name=$('inName').value.trim();state.profile.age=Number($('inAge').value);
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
  if(!validProfile(state.profile,{allowMissingPreference:privacyEnabled&&existingProfile}))return showToast('Inserisci nome (1–60 caratteri), età intera da 18 a 120 anni e genere.');
  const generation=accountGeneration,selection=photoSelection;
  state.saving=true;$('profileBtn').disabled=true;
  try {
    // Preserve the uploaded path on retries, so a transient DB error does not upload twice.
    const draft={...state.profile},file=state.photoFile;
    if(file){const path=await backend.uploadPhoto(file);if(generation!==accountGeneration)return;if(selection!==photoSelection)return showToast('La foto è cambiata. Salva di nuovo il profilo.');draft.photoPath=path;state.profile.photoPath=path;state.photoFile=null;}
    await backend.saveProfile({...draft,photo:draft.photoPath});
    if(generation===accountGeneration&&!file&&backend.ensurePhotoAssets)await backend.ensurePhotoAssets(draft.photoPath).catch(()=>{});
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
signout.onclick=async()=>{try{await backend.signOut();location.reload();}catch(error){showToast(message(error));}};$('profileActions').append(signout);
async function enterApp(){
  if(entering)return;entering=true;introButton.disabled=true;
  try{if(state.session&&!state.session.user.is_anonymous)await hydrate();else go('login');}
  catch(error){showToast(message(error));}
  finally{entering=false;introButton.disabled=false;}
}
const introButton=$('intro').querySelector('.btn-primary');introButton.textContent='Inquadra il QR Code';introButton.onclick=()=>go('camera');
const venueScanner=createVenueScanner({screen:$('camera'),onScan:async token=>{awaitingQr=false;entryGeneration++;pendingQr=token;restoredDraft=false;sessionStorage.setItem('spot-pending-qr',token);if(state.session&&!state.session.user.is_anonymous)await hydrate();else await previewVenue();},onBack:()=>{awaitingQr=false;entryGeneration++;go('intro');}});
const installPrompt=setupInstallApp();
export function onFirstMatch(){installPrompt.showAfterMatch();}
const social=createLiveSocial({backend,go,showToast,avatar,profile:()=>state.profile,session:()=>suspended?null:state.session,onFirstMatch,venueName:()=>state.venue?.name||''});

Object.assign(window,{go,changeEmail,checkProfileValid,trySaveProfile,handlePhoto,
  setPref:(value,el)=>select(value,el,'preference'),setGender:(value,el)=>select(value,el,'gender'),
  editProfile:()=>{syncForm();go('onboarding');}});

const navigation=createNavigation({onNavigate:async route=>{
 const generation=accountGeneration,view=listGeneration;const current=()=>generation===accountGeneration&&view===listGeneration;
 if(route.screen==='chat'){await social.restoreChat(route.matchId,current);return;}
 if(route.screen==='tribe'){const tribes=await backend.tribes();if(!current()||awaitingQr)return;selectedTribe=tribes.find(t=>t.id===route.tribeId);if(!selectedTribe)return go('tribes',{replace:true});}
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
 let preview;try{preview=await backend.venuePreview(token);}catch(error){if(generation===accountGeneration&&pendingQr===token){pendingQr=null;restoredDraft=false;clearDraft();sessionStorage.removeItem('spot-pending-qr');}throw error;}if(generation!==accountGeneration||pendingQr!==token||awaitingQr)return;state.venue=preview;rememberDraft();
 $('countNow').textContent=preview.live_count;$('scanTribeCount').textContent=`${memberLabel(preview.member_count)} nella Tribe`;
 go('scan');
}
$('returningAccountBtn').onclick=()=>{pendingQr=null;restoredDraft=false;clearDraft();sessionStorage.removeItem('spot-pending-qr');const clean=new URL(location.href);clean.searchParams.delete('venue');history.replaceState(null,'',clean);go('login');};
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
  if(tribes[0]&&backend.prefetchTribe)void backend.prefetchTribe(tribes[0].id).catch(()=>{});
  $('tribesList').replaceChildren();if(!tribes.length)return emptyList('tribesList','Inquadra il QR di un luogo per entrare nella sua Tribe.');
  for(const tribe of tribes){const card=document.createElement('button');card.className='person tribe-place';card.style.color='var(--text)';card.style.textAlign='left';const meta=document.createElement('div');meta.className='meta';const name=document.createElement('div');name.className='nm';name.textContent=tribe.name;const count=document.createElement('div');count.className='tm';count.textContent=`${memberLabel(tribe.member_count)} · ${tribe.live_count} qui ora`;meta.append(name,count);card.append(meta);card.onclick=()=>{if(selectedTribe?.id!==tribe.id){tribeOffset=0;tribePager.reset();$('tribeGrid').replaceChildren();}selectedTribe=tribe;go('tribe');};$('tribesList').append(card);}
 }catch(error){if(generation===listGeneration)emptyList('tribesList',message(error));}
});
const renderTribes=()=>loadTribes(listGeneration);
$('discoverTribeBtn').onclick=async()=>{
 const place=state.venue;if(!place)return go('tribes');const generation=listGeneration;
 try{const tribes=await backend.tribes();if(generation!==listGeneration)return;const tribe=tribes.find(t=>t.id===place.id);if(!tribe)return showToast('Inquadra il QR di questo luogo per entrare nella sua Tribe.');if(selectedTribe?.id!==tribe.id){tribeOffset=0;tribePager.reset();$('tribeGrid').replaceChildren();}selectedTribe=tribe;go('tribe');}catch(error){showToast(message(error));}
};
const loadTribe=singleFlight(async(generation)=>{
 if(generation!==listGeneration)return;if(!selectedTribe)return go('tribes');const place=selectedTribe;
 $('tribeTitle').textContent=place.name;$('tribeCount').textContent=`${memberLabel(place.member_count)} · i presenti ora sono nella sezione Ora`;
 try{
  tribePager.busy(true);const page=await peoplePage(place.id,false,tribeOffset);if(generation!==listGeneration)return;const people=page.items;
  if(!people.length&&tribeOffset){tribeOffset=0;go('tribe',{replace:true});return;}
  tribePager.update({offset:tribeOffset,count:people.length,total:page.total,hasMore:page.hasMore});
  if(!people.length)return emptyList('tribeGrid','Ancora nessun profilo disponibile nella Tribe.');
  const eagerIds=new Set(people.slice(0,4).map(p=>p.id));
  const paint=visible=>stableList($('tribeGrid'),visible,{key:p=>p.id,signature:p=>JSON.stringify([p.name,p.age]),create:person=>{const card=document.createElement('button');card.className='tribe-card';const face=document.createElement('div');face.className='avatar';const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;card.append(face,name);return card;},update:(card,person)=>{avatar(card.querySelector('.avatar'),person,{eager:eagerIds.has(person.id),thumbnail:true});card.dataset.detailPath=person.detail_path||'';card.onpointerenter=card.onfocus=()=>{if(backend.prefetchDetailPhotos)void backend.prefetchDetailPhotos([person]).catch(()=>{});};detailWarmer?.observe(card);card.onclick=()=>social.openDetail({...person,source:'tribe',venue_id:place.id,venue_name:place.name});}});
  paint(people);const visible=await withPhotos(people,partial=>{if(generation===listGeneration)paint(partial);});if(generation!==listGeneration)return;paint(visible);
 }catch(error){if(generation===listGeneration){tribePager.update({offset:tribeOffset,count:0,total:tribeOffset,hasMore:false});emptyList('tribeGrid',message(error));}}
});
const renderTribe=()=>loadTribe(listGeneration);
const deletion=document.createElement('button');deletion.className='backlink';deletion.style.marginTop='18px';deletion.textContent='Elimina account';
deleteAccountButtonSetup();
if(privacyEnabled)privacy=createPrivacyControls({backend,onBack:()=>go('myprofile'),onContinue:()=>hydrate(),onRestricted:()=>go('privacy'),onDelete:()=>deletion.onclick(),onSignOut:()=>signout.onclick(),onRevoke:async()=>{state.profile.preference=null;backend.clearPrivacyCaches?.();social.reset();syncForm();await hydrate();showToast('Consenso revocato. Preferenza cancellata; match e chat esistenti conservati.');}});
function deleteAccountButtonSetup(){deletion.onclick=async()=>{if(deletion.disabled)return;if(!confirm('Eliminare definitivamente account, foto, Tribe, Spot e conversazioni? Questa operazione non può essere annullata.'))return;deletion.disabled=true;retryDelete.disabled=true;try{await backend.deleteAccount();await backend.signOut().catch(()=>{});clearDraft();sessionStorage.removeItem('spot-pending-qr');location.assign(location.origin+location.pathname);}catch(error){showToast(message(error));await checkAccountStatus().catch(()=>{});}finally{deletion.disabled=false;retryDelete.disabled=false;}};$('profileActions').append(deletion);}

function syncAccountControls(){const anonymous=Boolean(state.session?.user?.is_anonymous);signout.hidden=!state.session||anonymous;}
backend.onSessionChange((event,session)=>{const previous=state.session?.user.id;state.session=session;if(previous!==session?.user.id)accountGeneration++;syncAccountControls();if(previous&&session?.user.id&&previous!==session.user.id){navigation.reset();photoSelection++;state.saving=false;$('profileBtn').disabled=false;suspended=false;deleting=false;installPrompt.close();social.reset();state.profile={name:'',age:0,gender:null,preference:privacyEnabled?null:'ALL',photo:null};state.photoFile=null;state.venue=null;state.checkin=null;selectedTribe=null;liveOffset=0;tribeOffset=0;livePager.reset();tribePager.reset();syncForm();for(const id of ['list','tribeGrid','tribesList','matchesList','chatsList'])$(id).replaceChildren();}if(event==='SIGNED_OUT'){navigation.reset();photoSelection++;state.saving=false;$('profileBtn').disabled=false;suspended=false;deleting=false;state.profile={name:'',age:0,gender:null,preference:privacyEnabled?null:'ALL',photo:null};state.photoFile=null;syncForm();installPrompt.close();social.reset();state.venue=null;state.checkin=null;selectedTribe=null;liveOffset=0;tribeOffset=0;livePager.reset();tribePager.reset();for(const id of ['list','tribeGrid','tribesList','matchesList','chatsList'])$(id).replaceChildren();go('intro');}else if(!booting&&event==='SIGNED_IN'&&previous!==session?.user.id){setTimeout(()=>void hydrate().catch(error=>showToast(message(error))),0);}});
setInterval(()=>{if(document.hidden)return;if($('venue').classList.contains('active'))void renderPeople();if($('tribe').classList.contains('active'))void renderTribe();},5000);
setInterval(async()=>{if(document.hidden||!state.session||statusChecking)return;statusChecking=true;try{const wasSuspended=suspended;if(!await checkAccountStatus()&&wasSuspended)await hydrate();}catch{/* Retry on the next poll; server authorization remains authoritative. */}finally{statusChecking=false;}},15000);
function resume(){if(document.hidden||!state.session)return;if(['intro','login'].includes(activeScreen())&&!state.session.user.is_anonymous){void hydrate().catch(error=>showToast(message(error)));return;}social.resume();if(activeScreen()==='venue'){if(state.checkin&&!liveCheckin())go('tribes',{replace:true});else void renderPeople();}if(activeScreen()==='tribe')void renderTribe();if(activeScreen()==='tribes')void renderTribes();void checkAccountStatus().then(blocked=>{if(!blocked&&activeScreen()==='deleting')void hydrate().catch(error=>showToast(message(error)));}).catch(()=>{});}
document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
$('retryBootBtn').onclick=()=>location.reload();
try{state.session=await backend.session();syncAccountControls();if(!pendingQr&&!awaitingQr)restoreDraft();if(state.session)await hydrate();else if(pendingQr&&!awaitingQr)await previewVenue();else if(!awaitingQr)go('intro',{replace:true});}
catch(error){if(!awaitingQr){go('boot',{replace:true});$('bootStatus').textContent=message(error);$('retryBootBtn').hidden=false;}}finally{booting=false;}

const returnedUrl=new URL(location.href);const hashParams=new URLSearchParams(returnedUrl.hash.slice(1));
const oauthError=returnedUrl.searchParams.get('error_description')||hashParams.get('error_description');
if(oauthError){
 for(const key of ['error','error_code','error_description'])returnedUrl.searchParams.delete(key);
 if(hashParams.has('error'))returnedUrl.hash='';history.replaceState(null,'',returnedUrl);
 go('login');$('loginStatus').textContent=/already linked|already exists/i.test(oauthError)?'Questo Google è già collegato a un account Soma. Usa “Continua con Google” per accedere a quello esistente.':'Accesso Google non completato. Riprova.';
}
