import {setupInstallApp} from './install-app.js';
import { people } from './demo.js';
import { HOUR, validProfile, liveMatch, visiblePeople } from './domain.js';

const $ = id => document.getElementById(id);
const state = { profile:{name:'',age:0,gender:null,preference:'ALL',photo:null}, matches:[], detail:null, chat:null, editing:false };
const tabScreens = ['venue','tribes','tribe','matches','chats','myprofile'];
const installPrompt=setupInstallApp();
function promptAfterMatch(){installPrompt.showAfterMatch();}
let selectedDemoTribe='Locale demo',demoAccount=false;
let toastTimer;
function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
function avatar(element, person) {
  element.style.background = person.color || '#ff4f64';
  element.style.backgroundImage = person.photo ? `url("${person.photo}")` : '';
  element.style.backgroundSize = 'cover';
  element.style.backgroundPosition = 'center';
  element.textContent = person.photo ? '' : person.face || person.name.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
}
function personRow(person, subtitle, action) {
  const row = document.createElement('button');
  row.className = 'person';
  row.style.color = 'var(--text)';
  row.style.textAlign = 'left';
  const face = document.createElement('div'); face.className = 'avatar'; avatar(face,person);
  const meta = document.createElement('div'); meta.className = 'meta';
  const name = document.createElement('div'); name.className = 'nm'; name.textContent = `${person.name}, ${person.age}`;
  const text = document.createElement('div'); text.className = 'tm'; text.textContent = subtitle;
  meta.append(name,text); row.append(face,meta);
  if (person.sent && action === openDetail) { const badge=document.createElement('div');badge.className='sent-badge';badge.textContent='INVIATO';row.append(badge); }
  row.onclick = () => action(person); return row;
}
function fillList(id, entries, empty, subtitle, action) {
  const list=$(id); list.replaceChildren();
  if (!entries.length) {const hint=document.createElement('p');hint.className='empty-hint';hint.textContent=empty;list.append(hint);}
  entries.forEach(person=>list.append(personRow(person,subtitle(person),action)));
}
function renderList() {
  const entries=visiblePeople(people.filter(p=>p.checkedIn<90),state.profile.preference);
  $('countPill').textContent=`${entries.length} ora`;
  fillList('list',entries,'Nessuno corrisponde alle tue preferenze qui ora.',p=>`Check-in ${p.checkedIn} min fa`,openDetail);
}
function go(screen) {
  if(screen==='onboarding'&&!demoAccount)screen='login';
  if(screen==='tribes')renderDemoTribes();
  if(screen==='tribe')renderDemoTribe();
  const dialogOpen=Boolean(document.querySelector('.overlay.active'));
  document.querySelectorAll('.screen').forEach(el=>{el.classList.toggle('active',el.id===screen);el.inert=dialogOpen||el.id!==screen;});$('tabbar').inert=dialogOpen;
  $('tabbar').classList.toggle('show',tabScreens.includes(screen));
  document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===(screen==='tribe'?'tribes':screen)));
  state.matches=state.matches.filter(match=>liveMatch(match));
  if(screen==='venue') renderList();
  if(screen==='matches') fillList('matchesList',state.matches,"Ancora nessun match. Continua a guardare chi c'è ora.",()=> 'Match a Locale demo',openChat);
  if(screen==='chats') fillList('chatsList',state.matches.filter(p=>p.messages.length),'Nessuna conversazione ancora.',p=>p.messages.at(-1).text,openChat);
  if(screen==='onboarding'){$('onboarding').querySelector('.disp').textContent=state.editing?'Modifica il tuo profilo':'Crea il tuo profilo';$('profileBtn').textContent=state.editing?'Salva modifiche':'Entra';}
  if(screen==='myprofile') {avatar($('mpAvatar'),state.profile);$('mpName').textContent=state.profile.name;$('mpMeta').textContent=`${state.profile.age} anni${state.profile.occupation?' · '+state.profile.occupation:''} · Locale demo`;}
  if(screen==='camera') showToast('Anteprima: tocca il riquadro per simulare una scansione QR.');
}
function finishScan() {go('scan');}
function checkProfileValid() {
  state.profile.occupation=$('inOccupation').value.trim();state.profile.name=$('inName').value.trim(); state.profile.age=Number($('inAge').value);
  $('ageError').classList.toggle('show',Boolean($('inAge').value) && (!Number.isInteger(state.profile.age)||state.profile.age<18));
}
function trySaveProfile() {
  checkProfileValid();
  if(!state.profile.photo) return showToast('Carica una foto per continuare.');
  if(!validProfile(state.profile)) return showToast('Inserisci nome, età valida (18+) e genere.');
  go(state.editing?'myprofile':'venue');state.editing=false;
}
function select(value,element,key) {state.profile[key]=value;Array.from(element.parentElement.children).forEach(el=>el.classList.toggle('selected',el===element));}
function setPref(value,element){select(value,element,'preference');}
function setGender(value,element){select(value,element,'gender');}
function handlePhoto(event) {
  const file=event.target.files[0]; if(!file)return;
  if(!file.type.startsWith('image/')||file.size>8*1024*1024)return showToast('Scegli una foto fino a 8 MB.');
  const reader=new FileReader(); reader.onload=()=>{state.profile.photo=reader.result;avatar($('photoCircle'),state.profile);};reader.readAsDataURL(file);
}
function editProfile() {state.editing=true;$('inName').value=state.profile.name;$('inAge').value=state.profile.age||'';$('inOccupation').value=state.profile.occupation||'';avatar($('photoCircle'),state.profile);go('onboarding');}
function openDetail(person) {
  state.detail=person;$('dOccupation').textContent=person.occupation||'';avatar($('dAvatar'),person);$('dName').textContent=`${person.name}, ${person.age}`;
  $('dTime').textContent=`Check-in ${person.checkedIn} minuti fa · Locale demo`;
  const match=state.matches.find(m=>m.id===person.id);$('interestBtn').disabled=!match&&Boolean(person.sent);$('interestBtn').textContent=match?'Apri la Chat':person.sent?'Interesse già inviato':'Mi Interessa';
  $('detailOverlay').classList.add('active');
}
function closeDetail() {$('detailOverlay').classList.remove('active');}
function expressInterest() {
  const person=state.detail;if(!person)return;const existing=state.matches.find(m=>m.id===person.id);if(existing){closeDetail();openChat(existing);return;}if(person.sent)return;
  person.sent=true;closeDetail();
  if(!person.mutual){renderList();return showToast('Interesse inviato. Ti avviseremo se è reciproco.');}
  const match={...person,createdAt:Date.now(),messages:[]};state.matches.push(match);state.chat=match;
  avatar($('mAvatarMe'),state.profile);avatar($('mAvatarThem'),person);$('mText').textContent=`Tu e ${person.name} vi siete notati a vicenda.`;go('match');
  promptAfterMatch();
}
function renderChat() {
  const container=$('bubbles');container.replaceChildren();
  const system=document.createElement('div');system.className='sysline';system.textContent='Match avvenuto a Locale demo';container.append(system);
  if(!state.chat.messages.length){
    const empty=document.createElement('div');empty.className='chat-empty';
    const text=document.createElement('p');text.textContent="Inizia la conversazione quando vuoi. Il match resta disponibile.";
    const button=document.createElement('button');button.className='btn btn-primary btn-sm';button.textContent='Inizia la conversazione';button.onclick=prefillDraft;empty.append(text,button);container.append(empty);
  }
  state.chat.messages.forEach(message=>{const bubble=document.createElement('div');bubble.className=`bub ${message.from}`;bubble.textContent=message.text;container.append(bubble);});
  container.scrollTop=container.scrollHeight;
}
function openChat(person) {if(!liveMatch(person))return go('matches');state.chat=person;$('chatIn').value='';avatar($('cAvatar'),person);$('cName').textContent=person.name;renderChat();go('chat');}
function prefillDraft() {$('chatIn').value='Piacere di conoscerti';$('chatIn').focus();}
function matchStartChat(){openChat(state.chat);prefillDraft();}
function sendMsg() {
  const match=state.chat,text=$('chatIn').value.trim();if(!match||!liveMatch(match))return go('matches');if(!text)return;
  match.messages.push({from:'me',text});$('chatIn').value='';renderChat();
  setTimeout(()=>{if(match.blocked)return;match.messages.push({from:'them',text:'Ciao! 😄 Anche tu ti alleni la mattina?'});if(state.chat===match)renderChat();},900);
}
function block(person) {person.blocked=true;const original=people.find(p=>p.id===person.id);if(original)original.blocked=true;state.matches=state.matches.filter(p=>p.id!==person.id);}
function reportPerson(){if(!state.detail)return;block(state.detail);closeDetail();renderList();showToast('Profilo rimosso. Segnalazione simulata in questa anteprima.');}
function blockFromChat(){if(!state.chat)return;block(state.chat);state.chat=null;go('matches');showToast('Profilo bloccato nella demo.');}
function renderDemoTribes(){
 $('tribesList').replaceChildren();
 for(const name of ['Locale demo','Campus demo']){const card=document.createElement('button');card.className='person tribe-place';card.style.color='var(--text)';card.style.textAlign='left';const meta=document.createElement('div');meta.className='meta';const title=document.createElement('div');title.className='nm';title.textContent=name;const count=document.createElement('div');count.className='tm';count.textContent=`${people.length} membri`;meta.append(title,count);card.append(meta);card.onclick=()=>{selectedDemoTribe=name;go('tribe');};$('tribesList').append(card);}
}
function renderDemoTribe(){
 $('tribeTitle').textContent=selectedDemoTribe;$('tribeCount').textContent=`${people.length} membri · i presenti ora sono nella sezione Ora`;$('tribeGrid').replaceChildren();
 const entries=visiblePeople(people.filter(p=>selectedDemoTribe!=='Locale demo'||p.checkedIn>=90),state.profile.preference);
 for(const person of entries){const card=document.createElement('button');card.className='tribe-card';const face=document.createElement('div');face.className='avatar';avatar(face,person);const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;card.append(face,name);card.onclick=()=>{openDetail(person);$('dTime').textContent=`Tribe · ${selectedDemoTribe}`;};$('tribeGrid').append(card);}
}
$('googleLoginBtn').textContent='Continua con Google (demo)';$('googleLoginBtn').onclick=()=>{demoAccount=true;go('onboarding');};
$('login').querySelector('.sub').textContent='Anteprima: accesso simulato, nessun account viene creato.';$('emailForm').hidden=true;
$('countNow').textContent=people.filter(p=>p.checkedIn<90).length;$('scanTribeCount').textContent=`${people.length} membri nella Tribe`;
Object.assign(window,{go,finishScan,checkProfileValid,trySaveProfile,setPref,setGender,handlePhoto,editProfile,closeDetail,expressInterest,reportPerson,blockFromChat,prefillDraft,matchStartChat,sendMsg});
// Explicit preview only: no backend requests or real account is created.
if(new URLSearchParams(location.search).get('preview')==='tribes'){
 demoAccount=true;Object.assign(state.profile,{name:'Alex',age:28,gender:'M',preference:'ALL',photo:null});go('tribes');
}

$('discoverTribeBtn').onclick=()=>{selectedDemoTribe='Locale demo';go('tribe');};
