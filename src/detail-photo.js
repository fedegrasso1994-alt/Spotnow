/** Detail photos upgrade independently of match polling and never mutate grid records. */
export function createDetailPhoto({backend,avatar,clearAvatar,element,status}){
 let version=0,person=null,retryTimer;
 const current=()=>person;
 function stop(){version++;clearTimeout(retryTimer);person=null;status.hidden=true;clearAvatar(element);}
 function open(record){
  stop();person=record;const request=version;
  const valid=()=>request===version&&current()===record;
  status.hidden=false;status.disabled=true;status.textContent='Caricamento foto HD…';
  avatar(element,record,{eager:true,thumbnail:Boolean(record.thumbnail_path),progressive:true,timeoutMs:20000});
  const loaded=()=>{if(valid()){status.hidden=true;clearTimeout(retryTimer);}};
  async function load(attempt=0){
   if(!valid())return;status.hidden=false;status.disabled=true;status.textContent='Caricamento foto HD…';
   const failed=()=>{if(!valid())return;if(attempt<2){retryTimer=setTimeout(()=>void load(attempt+1),500*(attempt+1));}else{status.disabled=false;status.textContent='Riprova foto HD';}};
   try{
    const photo=await backend.photoUrl(record.photo_path,{refresh:attempt>0});if(!valid())return;if(!photo)return failed();
    avatar(element,{...record,photo},{eager:true,progressive:true,timeoutMs:20000,onLoad:loaded,onError:failed});
   }catch{failed();}
  }
  status.onclick=()=>{if(valid())void load(1);};
  if(record.photo_path)void load();else{status.hidden=true;}
  // If the grid was clicked before its thumbnail arrived, keep upgrading the fallback too.
  if(record.thumbnail_path&&!record.photo)void backend.photoUrl(record.thumbnail_path).then(photo=>{if(valid()&&photo)avatar(element,{...record,photo},{eager:true,thumbnail:true,progressive:true});}).catch(()=>{});
 }
 return {open,stop};
}
