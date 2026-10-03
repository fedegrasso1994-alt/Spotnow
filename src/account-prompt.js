/** Optional account recovery prompt. Must never block conversation. */
export function createAccountPrompt({onGoogle,isAnonymous=()=>true,googleEnabled=false,onDismiss=()=>{}}) {
  const overlay=document.createElement('div');overlay.className='overlay';overlay.id='saveAccountOverlay';
  const sheet=document.createElement('div');sheet.className='sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','saveAccountTitle');
  const title=document.createElement('h2');title.className='disp';title.id='saveAccountTitle';title.textContent='Salva i tuoi match';
  const text=document.createElement('p');text.className='sub';text.textContent='Collega Google per ritrovarli anche se cambi telefono o cancelli i dati del browser.';
  const google=document.createElement('button');google.className='btn btn-primary';google.style.marginTop='24px';google.textContent='Continua con Google';
  const later=document.createElement('button');later.className='btn btn-ghost';later.style.marginTop='10px';later.textContent='Più tardi';
  const status=document.createElement('p');status.className='sub';status.style.fontSize='13px';status.setAttribute('role','status');
  let shown=false,previousFocus;
  function close(){overlay.classList.remove('active');previousFocus?.focus();}
  function open(){if(!isAnonymous())return;previousFocus=document.activeElement;status.textContent='';overlay.classList.add('active');google.focus();}
  google.onclick=async()=>{
    if(!googleEnabled){status.textContent='Il collegamento Google sarà disponibile a breve. Puoi continuare a usare Spot Now.';return;}
    google.disabled=true;status.textContent='Apertura di Google…';
    try{await onGoogle();}catch(error){status.textContent=error?.code==='identity_already_exists'?'Questo account Google è già collegato a un altro profilo. Il profilo attuale resta disponibile qui.':'Non riesco ad aprire Google. Riprova tra poco: il tuo profilo è ancora disponibile qui.';}finally{google.disabled=false;}
  };
  later.onclick=()=>{close();onDismiss();};
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();onDismiss();}
    if(event.key==='Tab'){event.preventDefault();(document.activeElement===google?later:google).focus();}
  });
  sheet.append(title,text,google,later,status);overlay.append(sheet);document.getElementById('phone').append(overlay);
  return {showAfterMatch(){if(shown)return overlay.classList.contains('active');if(!isAnonymous())return false;shown=true;open();return true;},open,close};
}
