import{spottedError}from'./spotted-social.js';
import{qodError}from'./spotted-qod.js';
/** Small highlighted module. Reuses the social composer/cards and shared mutation lock. */
export function mountSpottedQod({doc,api,composer,card,mutate,blocked,current}){
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
 const root=el('section','','spotted-qod'),heading=el('h2','Domanda del giorno','spotted-qod-title'),label=el('p','Soma · Per la tua community','sub spotted-qod-official'),prompt=el('p','','board-text'),status=el('p','','sub'),rows=el('div','','spotted-qod-answers'),note=el('p','','sub spotted-qod-note'),more=el('button','Altre risposte','backlink'),retry=el('button','Riprova domanda del giorno','backlink');
 root.setAttribute('aria-label','Domanda del giorno');status.setAttribute('role','status');root.hidden=true;retry.type=more.type='button';
 let question=null,items=[],hasMore=false,context=null,token=0;
 const answerComposer=composer('Rispondi','La tua risposta anonima…',value=>{const q=question?.id;if(!q||question.answered)return false;return mutate('answer:'+q+':'+value,op=>api.answer(q,value,op),'La tua risposta è nella community.');});
 root.append(label,heading,prompt,note,answerComposer.form,status,retry,rows,more);
 function paint(){rows.replaceChildren();for(const item of items)rows.append(card(item,'post'));answerComposer.form.hidden=!question||question.answered;note.textContent=question?.answered?'Hai già risposto. Una voce, una risposta.':'Una risposta anonima, fino a 280 caratteri.';more.hidden=!hasMore;}
 async function load(place,append=false){
  if(!api)return;const n=++token,valid=()=>n===token&&current(place);context=place;status.textContent='Caricamento domanda…';retry.hidden=true;more.disabled=true;
  try{const next=await api.current(place);if(!valid())return;const q=next?.question;if(!q){question=null;items=[];rows.replaceChildren();answerComposer.clear();root.hidden=true;return;}
   root.hidden=false;prompt.textContent=q.text;if(question?.id!==q.id){items=[];answerComposer.clear();append=false;}question=q;
   const page=await api.answers(q.id,append?items.at(-1)?.id:null);if(!valid())return;if(!Array.isArray(page?.items))throw Error('INVALID_RESPONSE');items=append?[...items,...page.items.filter(i=>!items.some(p=>p.id===i.id))]:page.items;hasMore=page.more;paint();status.textContent=items.length?'':'La prima voce potrebbe essere la tua.';
  }catch(error){if(valid()){question=null;items=[];rows.replaceChildren();answerComposer.form.hidden=true;more.hidden=true;note.textContent='';prompt.textContent='';root.hidden=false;status.textContent=qodError(error)||spottedError(error);retry.hidden=false;}}
  finally{if(valid())more.disabled=false;}
 }
 more.onclick=()=>{if(!blocked())return load(context,true);};retry.onclick=()=>{if(!blocked())return load(context);};
 return{root,load,show(){root.hidden=!question;},update(){answerComposer.update();more.disabled=blocked();retry.disabled=blocked();},find:id=>items.find(i=>i.id===id),pause(){token++;question=null;items=[];context=null;root.hidden=true;rows.replaceChildren();answerComposer.clear();}};
}
