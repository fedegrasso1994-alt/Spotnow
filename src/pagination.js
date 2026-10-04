/** Keep the number of interactive cards bounded while every page remains reachable. */
export function createPager(screen,onPage,{nextLabel='Altri profili'}={}){
 const document=screen.ownerDocument,bar=document.createElement('div');bar.className='pager';bar.hidden=true;
 const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
 for(const button of [previous,next]){button.className='btn btn-ghost';button.type='button';}
 previous.textContent='Precedenti';next.textContent=nextLabel;label.className='page-label';label.setAttribute('role','status');
 let state={offset:0,count:0,total:0,hasMore:false},busy=false;
 function sync(){bar.hidden=state.offset===0&&!state.hasMore;previous.disabled=busy||state.offset===0;next.disabled=busy||!state.hasMore;label.textContent=state.count?`${state.offset+1}–${state.offset+state.count} di ${state.total}`:'';}
 previous.onclick=()=>{if(!previous.disabled)onPage(Math.max(0,state.offset-48));};next.onclick=()=>{if(!next.disabled)onPage(state.offset+48);};
 bar.append(previous,label,next);screen.append(bar);
 return {update(value){state={...state,...value};busy=false;sync();},busy(value){busy=value;sync();},reset(){state={offset:0,count:0,total:0,hasMore:false};busy=false;sync();}};
}
