/** Follow the keyboard-adjusted viewport without suppressing pinch zoom. */
export function setupViewport({win=window,doc=document}={}){
 const root=doc.documentElement,viewport=win.visualViewport;
 const update=()=>{
  if(viewport&&Math.abs((viewport.scale||1)-1)>0.05)return;
  const height=Math.min(win.innerHeight,viewport?.height||win.innerHeight);
  if(!Number.isFinite(height)||height<=0)return;
  const editing=doc.activeElement?.matches?.('input,textarea,[contenteditable="true"]');
  root.style.setProperty('--app-height',`${Math.round(height)}px`);
  root.style.setProperty('--app-top',`${editing?Math.max(0,Math.round(viewport?.offsetTop||0)):0}px`);
 };
 for(const event of ['resize','orientationchange','pageshow'])win.addEventListener(event,update);
 for(const event of ['resize','scroll'])viewport?.addEventListener(event,update);
 for(const event of ['focusin','focusout'])doc.addEventListener(event,update);
 update();return {update};
}
