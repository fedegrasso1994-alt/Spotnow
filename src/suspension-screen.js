export function createSuspensionScreen({onCheck,onDelete,onSignOut}) {
 const screen=document.createElement('section');screen.className='screen';screen.id='suspended';
 const title=document.createElement('h2');title.className='disp';title.textContent='Account sospeso';
 const description=document.createElement('p');description.className='sub';description.textContent='Il tuo account è stato sospeso dopo una verifica. Durante la sospensione non puoi vedere altri profili, fare check-in o usare le chat.';
 const note=document.createElement('p');note.className='sub';note.textContent='I tuoi dati sono conservati. Se la sospensione viene revocata, potrai tornare a usare Soma.';
 const button=document.createElement('button');button.className='btn btn-primary';button.textContent='Verifica lo stato';button.style.marginTop='24px';
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');
 button.onclick=async()=>{button.disabled=true;status.textContent='Verifica in corso…';try{status.textContent=await onCheck()?'La sospensione è ancora attiva.':'';}catch{status.textContent='Non riesco a verificare lo stato. Riprova tra poco.';}finally{button.disabled=false;}};
 const remove=document.createElement('button');remove.className='btn btn-ghost';remove.textContent='Elimina account';remove.style.marginTop='12px';remove.onclick=()=>onDelete?.();
 const exit=document.createElement('button');exit.className='backlink';exit.textContent='Esci dall’account';exit.onclick=()=>onSignOut?.();
 screen.append(title,description,note,button,status,remove,exit);document.getElementById('phone').append(screen);
 return screen;
}
