/** Single authorized recipient decision. Never a request inbox or a MATCH section. */
export function mountNotificationRequest({root,api,photoUrls,onMatch,document:doc=globalThis.document}){
 const section=doc.createElement('section');section.className='board-card';section.hidden=true;root.prepend(section);let epoch=0;
 const reset=()=>{epoch++;section.replaceChildren();section.hidden=true;};
 return{reset,async open(item){reset();const g=epoch;section.hidden=false;
  const title=doc.createElement('h2');title.textContent='Qualcuno vorrebbe conoscerti 👀';const name=doc.createElement('p');name.textContent=`${item.sender.name}, ${item.sender.age}`;const context=doc.createElement('p');context.className='board-text';context.textContent=item.context;const status=doc.createElement('p');status.className='sub';status.setAttribute('role','status');section.append(title,name,context,status);
  const path=item.sender.detail_path||item.sender.photo_path;if(path){const image=doc.createElement('img');image.className='romantic-profile-photo';image.alt='Foto profilo';section.insertBefore(image,name);try{const urls=await photoUrls([path]);if(g===epoch&&urls.get(path))image.src=urls.get(path);}catch{image.remove();}}
  if(g!==epoch)return;const actions=doc.createElement('div');actions.className='spotted-actions';
  for(const [text,value]of [['Accetta',true],['Rifiuta',false],['Chiudi',null]]){const b=doc.createElement('button');b.type='button';b.className='btn btn-ghost';b.textContent=String(text);b.onclick=async()=>{if(value===null){reset();return;}for(const button of actions.querySelectorAll('button'))button.disabled=true;try{const result=await api.decide(item.id,value);if(g!==epoch)return;reset();if(result.match_id)await onMatch(result.match_id);}catch{if(g===epoch){status.textContent='Richiesta non disponibile. Riprova.';for(const button of actions.querySelectorAll('button'))button.disabled=false;}}};actions.append(b);}section.append(actions);
 }};
}
