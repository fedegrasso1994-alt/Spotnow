import { modalController } from './modal.js';
import { userMessage } from './errors.js';
import { singleFlight, stableList } from './ui-refresh.js';
import { createReportPrompt } from './report-prompt.js';
/** Live match/chat UI. All authorization and expiry are enforced by the server. */
export function createLiveSocial({backend,go,showToast,avatar,profile,session,onFirstMatch,venueName}) {
  const $=id=>document.getElementById(id);
  let matches=[],current=null,detail=null,known=null,busy=false,sending=false,epoch=0,chatVersion=0,chatSignature='';
  const sent=new Set();
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
  const loadMatches=singleFlight(async(generation)=>{
    if(!session()||session().user.is_anonymous)return;
    try{
      const accountId=session()?.user.id;
      const records=await backend.matches();
      const loaded=await Promise.all(records.map(async m=>({...m,photo:await backend.photoUrl(m.photo_path).catch(()=>null)})));
      if(generation!==epoch||session()?.user.id!==accountId)return;
      matches=loaded;
      if(known===null&&matches.length)onFirstMatch();
      const next=new Set(matches.map(m=>m.id));
      const fresh=known?matches.find(m=>!known.has(m.id)):null;known=next;
      if(current&&!next.has(current.id)){current=null;if(['chat','match'].includes(active())){go('matches');showToast('Il match non è più disponibile.');}}
      if(fresh){if(active()==='venue'&&!document.querySelector('.overlay.active'))showMatch(fresh);else showToast(`Nuovo match con ${fresh.name}!`);onFirstMatch();}
      if(['matches','chats'].includes(active()))await renderList(active());
      if(active()==='chat'&&current)await renderChat();
    }catch(error){if(generation===epoch&&['matches','chats'].includes(active())&&!matches.length)hint(active()==='matches'?'matchesList':'chatsList','Connessione non disponibile. Tocca di nuovo la scheda per riprovare.');}
  });
  const refresh=()=>loadMatches(epoch);
  async function renderList(screen){
    const id=screen==='matches'?'matchesList':'chatsList';
    const entries=matches;
    if(!entries.length)return hint(id,screen==='chats'?'Nessuna conversazione ancora.':"Ancora nessun match. Continua a guardare chi c'è ora.");
    stableList($(id),entries,{key:m=>m.id,signature:m=>JSON.stringify([m.name,m.age,m.venue_name]),create:m=>row(m,`Match a ${m.venue_name}`,openChat),update:(el,m)=>{avatar(el.querySelector('.avatar'),m);el.onclick=()=>openChat(m);}});
  }
  function showMatch(m){if(current)drafts.set(current.id,$('chatIn').value);current=m;avatar($('mAvatarMe'),profile());avatar($('mAvatarThem'),m);$('mText').textContent=`Tu e ${m.name} vi siete notati a vicenda.`;go('match');}
  function openDetail(person){detail=person;avatar($('dAvatar'),person);$('dName').textContent=`${person.name}, ${person.age}`;$('dTime').textContent=`${person.source==='tribe'?'Tribe':'Qui ora'} · ${person.venue_name||venueName()}`;$('interestBtn').disabled=(person.interest_sent||sent.has(`${person.id}:${person.venue_id}`));$('interestBtn').textContent=(person.interest_sent||sent.has(`${person.id}:${person.venue_id}`))?'Interesse già inviato':'Mi interessa';detailModal.open();}
  function closeDetail(){detailModal.close();}
  async function expressInterest(){
    if(busy||!detail)return;const generation=epoch,person=detail;busy=true;$('interestBtn').disabled=true;
    try{const id=await backend.expressInterest(person.id,person.venue_id);if(generation!==epoch)return;sent.add(`${person.id}:${person.venue_id}`);if(detail===person)closeDetail();await refresh();await refresh();if(generation!==epoch)return;if(id){const m=matches.find(m=>m.id===id);if(m){if(['venue','tribe'].includes(active()))showMatch(m);else showToast(`Nuovo match con ${m.name}!`);onFirstMatch();}}else showToast('Interesse inviato. Ti avviseremo se è reciproco.');}
    catch(error){if(generation===epoch)showToast(userMessage(error));}
    finally{if(generation===epoch)busy=false;if(generation===epoch&&detail){const done=detail.interest_sent||sent.has(`${detail.id}:${detail.venue_id}`);$('interestBtn').disabled=done;$('interestBtn').textContent=done?'Interesse già inviato':'Mi interessa';}}
  }
  const drafts=new Map();
  async function openChat(m,options={}){if(current)drafts.set(current.id,$('chatIn').value);current=m;chatVersion++;chatSignature='';$('chatSendStatus').textContent='';$('bubbles').replaceChildren();hint('bubbles','Caricamento…');$('chatIn').value=drafts.get(m.id)||'';avatar($('cAvatar'),m);$('cName').textContent=m.name;$('chat').querySelector('.status').textContent='Match';go('chat',options);const generation=epoch;await renderChat().catch(()=>{if(generation!==epoch||current?.id!==m.id||active()!=='chat')return;hint('bubbles','Connessione non disponibile. La chat si aggiornerà appena torni online.');showToast('Non riesco a caricare la chat. Riprova.');});}
  const loadChat=singleFlight(async(m,version,generation)=>{if(!m)return;const messages=await backend.messages(m.id);if(generation!==epoch||version!==chatVersion||current?.id!==m.id||active()!=='chat')return;
    const signature=JSON.stringify(messages.map(msg=>[msg.id,msg.sender_id,msg.body]));if(signature===chatSignature)return;const first=chatSignature==='';chatSignature=signature;
    const bubbles=$('bubbles');const nearBottom=bubbles.scrollHeight-bubbles.scrollTop-bubbles.clientHeight<80;
    bubbles.replaceChildren();const line=document.createElement('div');line.className='sysline';line.textContent=`Match avvenuto a ${m.venue_name}`;bubbles.append(line);
    if(!messages.length){const empty=document.createElement('p');empty.className='chat-empty';empty.textContent="Inizia la conversazione quando vuoi. Il match resta disponibile.";bubbles.append(empty);}
    for(const msg of messages){const b=document.createElement('div');b.className=`bub ${msg.sender_id===session()?.user.id?'me':'them'}`;b.textContent=msg.body;bubbles.append(b);}
    if(first||nearBottom)bubbles.scrollTop=bubbles.scrollHeight;
  });
  const renderChat=()=>current?loadChat(current,chatVersion,epoch):Promise.resolve();
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
      if(current?.id===m.id)$('chatSendStatus').textContent='Messaggio inviato';
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
  return {openDetail,closeDetail,refresh,route(){return current?{matchId:current.id}:{};},async restoreChat(id,isCurrent=()=>true){await refresh();if(!isCurrent())return;const m=matches.find(item=>item.id===id);if(m)await openChat(m,{fromHistory:true});else go('chats');},onScreen(screen){if(['matches','chats'].includes(screen)){void renderList(screen);void refresh();}},resume(){if(active()==='chat')void renderChat().catch(()=>showToast('Connessione non disponibile. Riprova.'));else void refresh();},reset(){epoch++;chatVersion++;busy=false;sending=false;pendingSends.clear();$('chatIn').value='';$('bubbles').replaceChildren();$('chatSendStatus').textContent='';$('sendMessageBtn').disabled=false;chatSignature='';drafts.clear();matches=[];current=null;detail=null;known=null;sent.clear();closeDetail();reportPrompt.reset();}};
}
