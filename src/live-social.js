import {createDetailPhoto} from './detail-photo.js';
import {clearAvatar} from './avatar.js';
import { modalController } from './modal.js';
import { userMessage } from './errors.js';
import { singleFlight, stableList } from './ui-refresh.js';
import { createReportPrompt } from './report-prompt.js';
import { createPager } from './pagination.js';
/** Live match/chat UI. All authorization and expiry are enforced by the server. */
export function createLiveSocial({backend,go,showToast,avatar,profile,session,onFirstMatch,venueName}) {
  const $=id=>document.getElementById(id);
  let matches=[],current=null,detail=null,known=null,busy=false,sending=false,epoch=0,chatVersion=0,chatSignature='';
  const sent=new Set();let matchOffset=0,loadedOffset=-1,matchPage={hasMore:false,total:0},detailFound=null,detailChecking=false;
  const pagers={matches:createPager($('matches'),offset=>changeMatchPage('matches',offset),{nextLabel:'Altri match'}),chats:createPager($('chats'),offset=>changeMatchPage('chats',offset),{nextLabel:'Altre chat'})};
  function changeMatchPage(screen,offset){matchOffset=offset;$(screen==='matches'?'matchesList':'chatsList').replaceChildren();go(screen);}
  async function matchPageRead(offset){if(backend.matchesPage)return backend.matchesPage(offset);const records=await backend.matches();return {items:records.slice(offset,offset+48),hasMore:records.length>offset+48,total:records.length};}
  async function photosFor(records,onReady=()=>{}){
    const loaded=new Map();await Promise.all([records.slice(0,4),records.slice(4)].filter(group=>group.length).map(async group=>{
      const urls=backend.photoUrls?await backend.photoUrls(group.map(m=>m.thumbnail_path||m.photo_path)).catch(()=>new Map()):null;
      const items=await Promise.all(group.map(async m=>({...m,photo:urls?urls.get(m.thumbnail_path||m.photo_path)||null:await backend.photoUrl(m.thumbnail_path||m.photo_path).catch(()=>null)})));
      for(const m of items)loaded.set(m.id,m);onReady(records.map(m=>loaded.get(m.id)||m));
    }));return records.map(m=>loaded.get(m.id)||m);
  }
  let chatBefore=null,chatMessages=[],historyExhausted=false;
  const historyControls=document.createElement('div');historyControls.className='chat-history-controls';historyControls.hidden=true;
  const older=document.createElement('button'),latest=document.createElement('button');for(const button of [older,latest]){button.className='btn btn-ghost';button.type='button';}
  older.textContent='Messaggi precedenti';latest.textContent='Ultimi messaggi';historyControls.append(older,latest);$('chat').insertBefore(historyControls,$('bubbles'));
  function syncHistory(){historyControls.hidden=!chatBefore&&chatMessages.length<100;older.hidden=historyExhausted||chatMessages.length<100;latest.hidden=!chatBefore;}
  function changeHistory(before){chatBefore=before;chatVersion++;chatSignature='';historyExhausted=false;void renderChat().catch(()=>showToast('Non riesco a caricare i messaggi. Puoi riprovare.'));}
  older.onclick=()=>{if(!older.disabled&&chatMessages[0]?.created_at)changeHistory({created_at:chatMessages[0].created_at,id:chatMessages[0].id});};latest.onclick=()=>changeHistory(null);
  const detailPhoto=createDetailPhoto({backend,avatar,clearAvatar,element:$('dAvatar'),status:$('detailPhotoStatus')});
  const detailModal=modalController($('detailOverlay'),{firstFocus:$('interestBtn'),onEscape:()=>closeDetail()});
  const active=()=>document.querySelector('.screen.active')?.id;
  function hint(id,text){const p=document.createElement('p');p.className='empty-hint';p.textContent=text;$(id).replaceChildren(p);}
  function row(person,subtitle,action){
    const r=document.createElement('button');r.className='person';r.style.color='var(--text)';r.style.textAlign='left';
    const face=document.createElement('div');face.className='avatar';avatar(face,person);
    const meta=document.createElement('div');meta.className='meta';
    const name=document.createElement('div');name.className='nm';name.textContent=`${person.name}, ${person.age}`;
    const sub=document.createElement('div');sub.className='tm';sub.textContent=subtitle;meta.append(name,sub);r.append(face,meta);
    r.onclick=()=>action(person);return r;
  }
  const loadMatches=singleFlight(async(generation,offset)=>{
    if(!session()||session().user.is_anonymous)return;
    const accountId=session()?.user.id;
    const valid=()=>generation===epoch&&session()?.user.id===accountId&&offset===(['matches','chats'].includes(active())?matchOffset:0);
    try{
      const page=await matchPageRead(offset);if(!valid())return;
      if(!page.items.length&&offset){matchOffset=0;void refresh();return;}
      const previous=new Map(matches.map(m=>[m.id,m]));matches=page.items.map(m=>({...m,photo:previous.get(m.id)?.photo_path===m.photo_path?previous.get(m.id)?.photo:null}));loadedOffset=offset;matchPage=page;syncDetailAction();
      if(offset===0){
        if(known===null&&matches.length)onFirstMatch();
        const next=new Set(matches.map(m=>m.id)),fresh=known?matches.find(m=>!known.has(m.id)):null;known=next;
        if(fresh){if(active()==='venue'&&!document.querySelector('.overlay.active'))showMatch(fresh);else showToast(`Nuovo match con ${fresh.name}!`);onFirstMatch();}
      }
      if(['matches','chats'].includes(active()))await renderList(active());
      if(current&&!matches.some(m=>m.id===current.id)){
        const selected=current.id,version=chatVersion;
        const available=backend.matchById?await backend.matchById(selected):page.total>48?current:null;
        if(!valid())return;
        if(current?.id===selected&&chatVersion===version&&!available){current=null;if(['chat','match'].includes(active())){go('matches');showToast('Il match non è più disponibile.');}}
      }
      if(active()==='chat'&&current)await renderChat();
      const loaded=await photosFor(matches,partial=>{if(valid()){matches=partial;if(['matches','chats'].includes(active()))void renderList(active());}});if(!valid())return;matches=loaded;syncDetailAction();
      if(current){const updated=matches.find(m=>m.id===current.id);if(updated){current={...current,...updated};if(active()==='chat')avatar($('cAvatar'),current,{thumbnail:true});if(active()==='match')avatar($('mAvatarThem'),current,{thumbnail:true});}}
      if(['matches','chats'].includes(active()))await renderList(active());
    }catch(error){if(valid()&&['matches','chats'].includes(active())){pagers[active()].update({offset:matchOffset,count:0,total:matchOffset,hasMore:false});if(!matches.length||loadedOffset!==matchOffset)hint(active()==='matches'?'matchesList':'chatsList','Connessione non disponibile. Tocca di nuovo la scheda per riprovare.');}}
  });
  const refresh=()=>loadMatches(epoch,['matches','chats'].includes(active())?matchOffset:0);
  async function renderList(screen){
    const id=screen==='matches'?'matchesList':'chatsList';
    if(loadedOffset!==matchOffset){hint(id,'Caricamento…');pagers[screen].busy(true);return;}
    const entries=matches;pagers[screen].update({offset:matchOffset,count:entries.length,total:matchPage.total,hasMore:matchPage.hasMore});
    if(!entries.length)return hint(id,screen==='chats'?'Nessuna conversazione ancora.':"Ancora nessun match. Continua a guardare chi c'è ora.");
    stableList($(id),entries,{key:m=>m.id,signature:m=>JSON.stringify([m.name,m.age,m.venue_name]),create:m=>row(m,`Match a ${m.venue_name}`,openChat),update:(el,m)=>{avatar(el.querySelector('.avatar'),m,{eager:entries.slice(0,4).some(item=>item.id===m.id),thumbnail:true});el.onclick=()=>openChat(m);}});
  }
  function showMatch(m){if(current)drafts.set(current.id,$('chatIn').value);current=m;avatar($('mAvatarMe'),profile());avatar($('mAvatarThem'),m,{thumbnail:true});$('mText').textContent=`Tu e ${m.name} vi siete notati a vicenda.`;go('match');}
  function detailMatch(){return detail?(matches.find(m=>m.person_id===detail.id)||detailFound):null;}
  function syncDetailAction(){
    if(!detail)return;
    const match=detailMatch(),done=detail.interest_sent||sent.has(`${detail.id}:${detail.venue_id}`);
    $('interestBtn').disabled=!match&&(busy||detailChecking||Boolean(done));
    $('interestBtn').textContent=match?'Apri la Chat':detailChecking?'Verifica match…':done?'Interesse già inviato':'Mi Interessa';
  }
  function openDetail(person){
    detail=person;detailFound=null;detailChecking=Boolean(backend.matchWith&&!matches.some(m=>m.person_id===person.id));const generation=epoch,account=session()?.user.id;
    $('dOccupation').textContent=person.occupation||'';detailPhoto.open(person);$('dName').textContent=`${person.name}, ${person.age}`;$('dTime').textContent=`${person.source==='tribe'?'Tribe':'Qui ora'} · ${person.venue_name||venueName()}`;syncDetailAction();detailModal.open();void refresh();
    if(detailChecking)void backend.matchWith(person.id).then(match=>{if(detail!==person||generation!==epoch)return;detailFound=match;}).catch(()=>{}).finally(()=>{if(detail===person&&generation===epoch){detailChecking=false;syncDetailAction();}});

  }
  function closeDetail(){detailPhoto.stop();detail=null;detailFound=null;detailChecking=false;detailModal.close();}
  async function expressInterest(){
    if(!detail)return;const match=detailMatch();if(match){closeDetail();await openChat(match);return;}
    if(busy||detail.interest_sent||sent.has(`${detail.id}:${detail.venue_id}`))return;const generation=epoch,person=detail;busy=true;syncDetailAction();
    try{const id=await backend.expressInterest(person.id,person.venue_id);if(generation!==epoch)return;sent.add(`${person.id}:${person.venue_id}`);if(detail===person)closeDetail();await refresh();await refresh();if(generation!==epoch)return;if(id){const m=matches.find(m=>m.id===id)||(backend.matchById?await backend.matchById(id):null);if(generation!==epoch)return;if(m){if(['venue','tribe'].includes(active()))showMatch(m);else showToast(`Nuovo match con ${m.name}!`);onFirstMatch();}}else showToast('Interesse inviato. Ti avviseremo se è reciproco.');}
    catch(error){if(generation===epoch)showToast(userMessage(error));}
    finally{if(generation===epoch){busy=false;syncDetailAction();}}
  }
  const drafts=new Map();
  async function openChat(m,options={}){if(current)drafts.set(current.id,$('chatIn').value);current=m;chatVersion++;chatSignature='';chatBefore=null;chatMessages=[];historyExhausted=false;syncHistory();$('chatSendStatus').textContent='';$('bubbles').replaceChildren();hint('bubbles','Caricamento…');$('chatIn').value=drafts.get(m.id)||'';avatar($('cAvatar'),m,{thumbnail:true});$('cName').textContent=m.name;$('chat').querySelector('.status').textContent='Match';go('chat',options);const generation=epoch,version=chatVersion;void photosFor([m]).then(([loaded])=>{if(generation===epoch&&version===chatVersion&&current?.id===m.id&&active()==='chat')avatar($('cAvatar'),loaded,{thumbnail:true});}).catch(()=>{});await renderChat().catch(()=>{if(generation!==epoch||current?.id!==m.id||active()!=='chat')return;hint('bubbles','Connessione non disponibile. La chat si aggiornerà appena torni online.');showToast('Non riesco a caricare la chat. Riprova.');});}
  const loadChat=singleFlight(async(matchId,version,generation,before)=>{
    const valid=()=>generation===epoch&&version===chatVersion&&current?.id===matchId&&active()==='chat';older.disabled=true;
    try{
      const messages=(await backend.messages(matchId,before)).slice(-100);if(!valid())return;
      if(before&&!messages.length){historyExhausted=true;syncHistory();return;}
      chatMessages=messages;syncHistory();
      const signature=JSON.stringify(messages.map(msg=>[msg.id,msg.sender_id,msg.body]));if(signature===chatSignature)return;const first=chatSignature==='';chatSignature=signature;
      const bubbles=$('bubbles'),nearBottom=bubbles.scrollHeight-bubbles.scrollTop-bubbles.clientHeight<80;
      const rows=[{id:'context',className:'sysline',body:`Match avvenuto a ${current.venue_name}`}];
      if(!messages.length)rows.push({id:'empty',className:'chat-empty',body:'Inizia la conversazione quando vuoi. Il match resta disponibile.'});
      for(const msg of messages)rows.push({id:`message:${msg.id}`,className:`bub ${msg.sender_id===session()?.user.id?'me':'them'}`,body:msg.body});
      stableList(bubbles,rows,{key:row=>row.id,signature:row=>JSON.stringify([row.className,row.body]),create:row=>{const bubble=document.createElement('div');bubble.className=row.className;bubble.textContent=row.body;return bubble;}});
      if(first||nearBottom)bubbles.scrollTop=bubbles.scrollHeight;
    }finally{if(valid())older.disabled=false;}
  });
  const renderChat=()=>current?loadChat(current.id,chatVersion,epoch,chatBefore):Promise.resolve();
  const pendingSends=new Map();
  async function sendMsg(){
    const m=current,text=$('chatIn').value.trim();if(!m||!text||sending)return;
    if(text.length>2000)return showToast('Il messaggio può contenere fino a 2000 caratteri.');
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return showToast('Sei offline. Il messaggio è ancora nella bozza.');
    const generation=epoch,key=`${m.id}:${text}`;
    let nonce=pendingSends.get(key);if(!nonce){nonce=crypto.randomUUID();pendingSends.set(key,nonce);}
    sending=true;$('sendMessageBtn').disabled=true;$('chatSendStatus').textContent='Invio…';
    try{
      await backend.sendMessage(m.id,text,nonce);
      if(generation!==epoch)return;
      pendingSends.delete(key);
      if(current?.id===m.id&&$('chatIn').value.trim()===text){$('chatIn').value='';drafts.delete(m.id);}
      else if(drafts.get(m.id)?.trim()===text)drafts.delete(m.id);
      if(current?.id===m.id){$('chatSendStatus').textContent='Messaggio inviato';if(chatBefore){chatBefore=null;chatVersion++;chatSignature='';historyExhausted=false;syncHistory();}}
    }catch(error){if(generation===epoch){if(current?.id===m.id)$('chatSendStatus').textContent='Invio non confermato. La bozza è conservata: puoi riprovare.';showToast(userMessage(error));}return;}
    finally{if(generation===epoch){sending=false;$('sendMessageBtn').disabled=false;}}
    // Read errors must never describe an already confirmed write as a failed send.
    try{await renderChat();await refresh();}catch{if(generation===epoch)showToast('Messaggio inviato. Aggiornamento della chat in corso.');}
  }
  const reportPrompt=createReportPrompt({onBlock:async id=>{const generation=epoch;await backend.block(id);if(generation!==epoch)return;closeDetail();current=null;await refresh();if(generation!==epoch)return;go('venue');showToast('Profilo bloccato.');},onReport:async(id,reason,details,alsoBlock,nonce)=>{
    const generation=epoch;await backend.report(id,reason,details,alsoBlock,nonce);if(generation!==epoch)return;closeDetail();if(alsoBlock){current=null;await refresh();if(generation!==epoch)return;go('venue');}showToast('Segnalazione inviata. Grazie.');
  }});
  $('detailOverlay').querySelector('.report-link').textContent='Segnala o blocca questo profilo';
  Object.assign(window,{closeDetail,expressInterest,sendMsg,matchStartChat:()=>{if(current)void openChat(current);},
    reportPerson:()=>{if(detail){const person=detail;closeDetail();reportPrompt.open(person.id);}},blockFromChat:()=>{if(current)reportPrompt.open(current.person_id);}});
  setInterval(()=>{if(!document.hidden&&session())void refresh();},5000);
  return {openDetail,closeDetail,refresh,route(){return current?{matchId:current.id}:{};},async restoreChat(id,isCurrent=()=>true){await refresh();if(!isCurrent())return;const m=matches.find(item=>item.id===id)||(backend.matchById?await backend.matchById(id):null);if(!isCurrent())return;if(m)await openChat(m,{fromHistory:true});else go('chats');},onScreen(screen){if(['matches','chats'].includes(screen)){void renderList(screen);void refresh();}},resume(){if(active()==='chat')void renderChat().catch(()=>showToast('Connessione non disponibile. Riprova.'));else void refresh();},reset(){epoch++;chatVersion++;busy=false;sending=false;pendingSends.clear();$('chatIn').value='';$('bubbles').replaceChildren();$('chatSendStatus').textContent='';$('sendMessageBtn').disabled=false;chatSignature='';drafts.clear();matches=[];current=null;detail=null;detailFound=null;detailChecking=false;loadedOffset=-1;matchOffset=0;pagers.matches.reset();pagers.chats.reset();chatBefore=null;chatMessages=[];historyExhausted=false;syncHistory();known=null;sent.clear();closeDetail();reportPrompt.reset();}};
}
