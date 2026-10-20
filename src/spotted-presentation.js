/** SPOTTED presentation only. Static outline icons; no identity or delivery state. */
const paths={
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 comment:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
 back:'<path d="m15 18-6-6 6-6"/>'
};
/** @param {any} doc @param {'heart'|'comment'|'spark'|'back'} name */
export function spottedIcon(doc,name){const n=doc.createElement('span');n.className='spotted-icon';n.setAttribute('aria-hidden','true');
 // All markup comes from the fixed local map, never from posts or API payloads.
 n.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths[name]}</svg>`;return n;}
/** @param {any} doc @param {boolean} [comments] */
export function spottedEmpty(doc,comments=false){const box=doc.createElement('div');box.className='spotted-empty';const title=doc.createElement('p'),copy=doc.createElement('p');title.className='spotted-empty-title';copy.className='sub';title.textContent=comments?'Il primo commento può essere il tuo.':'Qui manca solo la tua voce.';copy.textContent=comments?'A volte basta una parola per iniziare.':'Una domanda, un pensiero, qualcosa che ti ha fatto sorridere. Rompi il ghiaccio con la tua community.';box.append(spottedIcon(doc,'comment'),title,copy);return box;}
