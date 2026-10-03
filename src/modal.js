/** Modal focus and inert background, including keyboard users on hidden screens. */
export function modalController(overlay,{firstFocus,onEscape}={}) {
  let previous;
  const siblings=()=>Array.from(overlay.parentElement?.children||[]).filter(el=>el!==overlay);
  function open(){
    if(document.querySelector('.overlay.active')&& !overlay.classList.contains('active'))return false;
    previous=document.activeElement;overlay.classList.add('active');
    for(const el of siblings())el.inert=true;firstFocus?.focus();return true;
  }
  function close(){
    if(!overlay.classList.contains('active'))return;
    overlay.classList.remove('active');
    for(const el of siblings())el.inert=el.classList.contains('screen')&&!el.classList.contains('active');
    if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('spot-modal-closed'));
    if(previous?.isConnected&&!previous.closest?.('[inert]'))previous.focus();
  }
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();(onEscape||close)();}
    if(event.key!=='Tab')return;
    const items=Array.from(overlay.querySelectorAll('button,input,select,textarea,[tabindex]')).filter(el=>!el.disabled&&!el.hidden);
    if(!items.length)return;const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  return {open,close};
}
