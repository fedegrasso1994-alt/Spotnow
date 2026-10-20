import {spottedIcon,spottedEmpty}from'./spotted-presentation.js';
import {romanticError}from'./spotted-romantic.js';
import {spottedLength,spottedError} from './spotted-social.js';
/** One community feed and one-level threads; all authority remains in RPCs.
 * @param {any} options
 */
export function mountSpotted({root,api,document:doc=globalThis.document,schedule=setTimeout,cancel=clearTimeout,operationId=()=>crypto.randomUUID()}){
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
 const button=(text,run,cls='btn btn-ghost')=>{const n=el('button',text,cls);n.type='button';n.onclick=run;return n;};
 const panel=el('section','','spotted-social'),disclosure=el('p','Anonimo per gli altri membri. Soma può identificare l’autore per moderazione. Non pubblicare dati personali.','privacy-note'),status=el('p','','sub spotted-status'),list=el('div','','spotted-feed'),thread=el('section','','spotted-thread');
 const empty=spottedEmpty(doc);empty.hidden=true;
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');thread.hidden=true;
 const retry=button('Riprova',()=>load()),more=button('Altri post',()=>load(true)),refresh=button('Aggiorna',()=>load(),'backlink spotted-refresh');refresh.prepend(spottedIcon(doc,'refresh'));retry.hidden=more.hidden=true;
 let place=null,active=false,generation=0,busy=false,posts=[],postMore=false,selected=null,commentRows=[],commentMore=false,timer=null,romanticState=null;
 const operations=new Map();
 const composer=(label,placeholder,submit)=>{
  const form=el('form','','spotted-composer'),input=el('textarea'),count=el('span','0 / 280','sub'),send=el('button',label,'btn btn-primary'),meta=el('div','','spotted-composer-meta');input.setAttribute('aria-label',placeholder);input.placeholder=placeholder;input.rows=3;send.type='submit';send.disabled=true;
  const valid=()=>spottedLength(input.value)>0&&spottedLength(input.value)<=280;
  input.oninput=()=>{count.textContent=`${spottedLength(input.value)} / 280`;send.disabled=busy||!valid();};
  form.onsubmit=async event=>{event.preventDefault();if(!valid()||busy||!active||!place)return;const value=input.value.trim(),g=generation;const ok=await submit(value);if(ok&&g===generation){input.value='';input.oninput();}};
  meta.append(count,send);form.append(input,meta);return {form,input,send,clear(){input.value='';input.oninput();},update(){send.disabled=busy||!valid();input.disabled=busy;}};
 };
 async function mutate(key,work,success=''){
  if(busy||!active||!place)return false;const g=generation;busy=true;update();status.dataset.tone='';status.textContent='Salvataggio…';
  let op=operations.get(key);if(!op){op=key.startsWith('create:')||key.startsWith('comment:')?await api.operation(place).catch(()=>null):operationId();if(g!==generation)return false;if(!op){busy=false;update();status.textContent='Connessione non disponibile. Riprova.';return false;}operations.set(key,op);}
  try{await work(op);if(g!==generation)return false;operations.delete(key);busy=false;await load();if(success&&g===generation)status.textContent=success;return true;}
  catch(error){if(g===generation){status.textContent=spottedError(error);if(String(error?.message).includes('BOARD_ACCESS')){posts=[];commentRows=[];selected=null;paint();empty.hidden=true;}if(String(error?.message).includes('OPERATION_EXPIRED'))operations.delete(key);}return false;}
  finally{if(g===generation){busy=false;update();}}
 }
 const postComposer=composer('Pubblica','Scrivi alla tua community…',value=>mutate('create:'+place+':'+value,op=>api.create(place,value,op)));
 const commentComposer=composer('Commenta','Scrivi un commento…',value=>{const target=selected;return mutate('comment:'+target+':'+value,op=>api.comment(target,value,op));});
 const back=button('Tutti i post',()=>{if(busy)return;selected=null;commentRows=[];thread.hidden=true;list.hidden=false;empty.hidden=posts.length>0;postComposer.form.hidden=false;more.hidden=!postMore;commentComposer.clear();},'backlink');
 back.classList.add('spotted-back');back.prepend(spottedIcon(doc,'back'));
 const threadBody=el('div','','spotted-thread-body'),commentsList=el('div','','spotted-comments'),commentNext=button('Altri commenti',()=>loadComments(true));thread.append(back,threadBody,commentsList,commentNext,commentComposer.form);
 panel.append(disclosure,postComposer.form,refresh,status,retry,list,empty,more,thread);root.append(panel);
 function update(){back.disabled=busy;postComposer.update();commentComposer.update();for(const b of panel.querySelectorAll('.spotted-action'))b.disabled=busy||(b.dataset.romantic==='true'&&romanticState?.remaining===0);refresh.disabled=busy;more.disabled=busy;commentNext.disabled=busy;}
 function reportBox(card,item,kind){const box=el('div','','spotted-report'),reason=el('select');reason.setAttribute('aria-label','Motivo segnalazione');for(const [value,label]of [['harassment','Molestie'],['inappropriate','Contenuto inappropriato'],['underage','Minore'],['other','Altro']]){const o=el('option',label);o.value=value;reason.append(o);}const send=button('Invia segnalazione',()=>mutate('report:'+item.id+':'+reason.value,op=>api.report(item.id,kind,reason.value,op),'Segnalazione inviata.'),'btn btn-ghost spotted-action');box.append(reason,send);card.append(box);}
 function card(item,kind){const article=el('article','',kind==='post'?'board-card spotted-post':'spotted-comment'),body=el('p',item.text,'board-text'),identity=el('p',item.can_delete?'Il tuo '+(kind==='post'?'post':'commento'):'Una voce della community','sub spotted-identity'),actions=el('div','','spotted-actions'),secondary=el('div','','spotted-secondary-actions');article.dataset.contentId=item.id;article.append(identity,body);
  const liked=button(String(item.likes),()=>mutate('like:'+kind+':'+item.id+':'+!item.liked,op=>api.like(item.id,kind,!item.liked,op)),'btn btn-ghost spotted-action spotted-like');liked.prepend(spottedIcon(doc,'heart'));liked.setAttribute('aria-label',item.liked?'Rimuovi mi piace':'Mi piace');liked.setAttribute('aria-pressed',String(item.liked));actions.append(liked);
  if(kind==='post'){const open=button(`Commenti · ${item.comments}`,async()=>{selected=item.id;commentRows=[];commentComposer.clear();await loadComments();},'btn btn-ghost spotted-action spotted-comment-open');open.prepend(spottedIcon(doc,'comment'));actions.append(open);}
  if(api.romantic&&romanticState?.enabled&&item.romantic_content===true&&!item.can_delete){
   const request=button('Mi piacerebbe conoscerti',async()=>{
    if(busy)return;const g=generation,key='romantic:'+kind+':'+item.id;let op=operations.get(key);if(!op){op=operationId();operations.set(key,op);}busy=true;status.dataset.tone='';update();
    try{await api.romantic.submit(item.id,kind,op);if(g!==generation)return;operations.delete(key);status.textContent='Richiesta registrata. Non mostriamo informazioni su consegna o risposta.';status.dataset.tone='success';const next=await api.romantic.settings().catch(()=>null);if(g===generation&&next){romanticState=next;paint();}}
    catch(error){if(g===generation)status.textContent=romanticError(error);}finally{if(g===generation){busy=false;update();arm();}}
   },'btn btn-ghost spotted-action spotted-romantic-cta');request.prepend(spottedIcon(doc,'spark'));request.disabled=busy||romanticState.remaining===0;request.dataset.romantic='true';request.title=romanticState.remaining===0?'Hai usato le 6 richieste disponibili oggi.':'';actions.append(request);
  }
  const report=button('Segnala',()=>{report.disabled=true;reportBox(article,item,kind);},'backlink spotted-action');secondary.append(report);
  if(item.can_delete)secondary.append(button('Elimina',()=>{const box=el('div','','spotted-confirm');box.append(el('p','Vuoi eliminare questo contenuto?'),button('Conferma eliminazione',()=>mutate('delete:'+kind+':'+item.id,op=>api.remove(item.id,kind,op)),'btn btn-ghost spotted-action'));article.append(box);},'backlink spotted-action'));
  article.append(actions,secondary);return article;
 }
 function paint(){list.replaceChildren();for(const p of posts)list.append(card(p,'post'));more.hidden=!postMore||Boolean(selected);list.hidden=Boolean(selected);postComposer.form.hidden=Boolean(selected);thread.hidden=!selected;empty.hidden=Boolean(selected)||posts.length>0;update();}
 function arm(){if(timer!==null)cancel(timer);timer=active?schedule(()=>{timer=null;void load();},30000):null;}
 async function load(append=false){
  if(!active||!place||busy)return;const g=generation;busy=true;update();status.textContent='Caricamento…';status.dataset.tone='';empty.hidden=true;retry.hidden=true;
  try{romanticState=api.romantic?await api.romantic.settings().catch(()=>null):null;if(g!==generation)return;const page=await api.feed(place,append?posts.at(-1)?.id:null);if(g!==generation||!active)return;if(!Array.isArray(page?.items))throw Error('INVALID_RESPONSE');posts=append?[...posts,...page.items.filter(p=>!posts.some(x=>x.id===p.id))]:page.items;postMore=page.more;paint();status.textContent=posts.length?`${page.remaining} post disponibili oggi · visibili per 24 ore`:'';busy=false;if(selected)await loadComments();}
  catch(error){if(g===generation){posts=[];selected=null;commentRows=[];paint();empty.hidden=true;more.hidden=true;status.textContent=spottedError(error);retry.hidden=false;}}
  finally{if(g===generation){busy=false;update();arm();}}
 }
 async function loadComments(append=false){
  if(!active||!place||!selected||busy)return;const g=generation,id=selected;busy=true;update();status.dataset.tone='';status.textContent='Caricamento commenti…';
  try{const page=await api.comments(id,append?commentRows.at(-1)?.id:null);if(g!==generation||selected!==id||!active)return;if(!Array.isArray(page?.items))throw Error('INVALID_RESPONSE');commentRows=append?[...commentRows,...page.items.filter(c=>!commentRows.some(x=>x.id===c.id))]:page.items;commentMore=page.more;const parent=posts.find(p=>p.id===id);threadBody.replaceChildren();if(parent)threadBody.append(card(parent,'post'));commentsList.replaceChildren();for(const c of commentRows)commentsList.append(card(c,'comment'));if(!commentRows.length)commentsList.append(spottedEmpty(doc,true));commentNext.hidden=!commentMore;thread.hidden=false;list.hidden=true;empty.hidden=true;postComposer.form.hidden=more.hidden=true;status.textContent='I commenti scadono insieme al post.';}
  catch(error){if(g===generation){commentsList.replaceChildren();thread.hidden=true;selected=null;status.textContent=spottedError(error);retry.hidden=false;}}
  finally{if(g===generation){busy=false;update();}}
 }
 function pause(){romanticState=null;active=false;generation++;busy=false;if(timer!==null)cancel(timer);timer=null;posts=[];commentRows=[];list.replaceChildren();threadBody.replaceChildren();commentsList.replaceChildren();thread.hidden=true;empty.hidden=true;selected=null;}
 return {context(id){if(id!==place){pause();place=id;for(const key of operations.keys())if(!key.startsWith('romantic:'))operations.delete(key);postComposer.clear();commentComposer.clear();}active=true;void load();},refresh:()=>load(),pause,reset(){pause();place=null;operations.clear();postComposer.clear();commentComposer.clear();},isActive:()=>active};
}
