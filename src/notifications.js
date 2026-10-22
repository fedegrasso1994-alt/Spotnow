/** Optional staging-only delivery client. Product events are never generated here. */
export const notificationReference=location=>{const v=new URLSearchParams(location.search||'').get('n');return /^[a-f0-9]{64}$/.test(v||'')?v:null;};
export const notificationEnabled=env=>env.VITE_NOTIFICATIONS_MVP==='true'&&new URL(env.VITE_SUPABASE_URL).hostname==='zjinjtkekmaqtxsuyvho.supabase.co';
export function createNotificationApi(client){const call=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};return{register:args=>call('notification_register',args),revoke:device_key=>call('notification_revoke',{device_key}),resolve:reference=>call('notification_resolve',{reference})};}
export function createNotifications({api,publicKey,root,session,onTarget,location=globalThis.location,navigator:nav=globalThis.navigator,Notification:NotificationApi=globalThis.Notification,storage=globalThis.localStorage,document:doc=globalThis.document}){
 const storageKey='soma-push-binding';let owner=undefined,generation=0,worker=null;
 const read=()=>{try{return JSON.parse(storage.getItem(storageKey)||'null');}catch{return null;}};
 const save=value=>{if(value)storage.setItem(storageKey,JSON.stringify(value));else storage.removeItem(storageKey);};
 async function message(value){const registration=worker||await nav.serviceWorker.ready;worker=registration;await new Promise((resolve,reject)=>{const c=new MessageChannel(),timer=setTimeout(()=>reject(Error('PUSH_WORKER_TIMEOUT')),5000);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();e.data?.ok?resolve(null):reject(Error('PUSH_WORKER'));};registration.active.postMessage({type:'SOMA_PUSH_BINDING',value},[c.port2]);});}
 const button=doc.createElement('button'),status=doc.createElement('p');button.type='button';button.className='btn btn-ghost';button.textContent='Attiva notifiche';status.className='sub';status.setAttribute('role','status');root.append(button,status);
 const supported=()=>Boolean(nav?.serviceWorker&&globalThis.PushManager&&NotificationApi&&publicKey);
 button.disabled=!supported();if(!supported())status.textContent='Notifiche non disponibili in questo browser.';
 async function revoke(){generation++;const previous=read();save(null);button.textContent='Attiva notifiche';
  if(nav?.serviceWorker){await message(null);const sub=await worker.pushManager.getSubscription();await sub?.unsubscribe();}
  if(previous&&session()?.user?.id===previous.owner)await api.revoke(previous.binding);
 }
 button.onclick=async()=>{
  const account=session()?.user?.id;if(!account||!supported())return;const g=++generation;button.disabled=true;
  try{
   if(read()?.owner===account){await revoke();status.textContent='Notifiche disattivate su questo dispositivo.';return;}
   // Must remain synchronous before the first await: direct user activation only.
   const permission=await NotificationApi.requestPermission();if(permission!=='granted'){status.textContent='Puoi continuare a usare Soma senza notifiche.';return;}
   if(g!==generation||session()?.user?.id!==account)return;
   const registration=await nav.serviceWorker.ready;worker=registration;
   const old=read();if(old&&old.owner!==account)throw Error('PUSH_ACCOUNT_CHANGED');
   const sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))});
   if(g!==generation||session()?.user?.id!==account){await sub.unsubscribe();return;}
   const binding=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),json=sub.toJSON();
   await api.register({endpoint_url:json.endpoint,public_key:json.keys.p256dh,auth_secret:json.keys.auth,device_key:binding});
   if(g!==generation||session()?.user?.id!==account){await api.revoke(binding);await sub.unsubscribe();return;}
   const value={owner:account,binding,check:'https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/notifications'};await message(value);save(value);button.textContent='Disattiva notifiche';status.textContent='Notifiche attive su questo dispositivo.';
  }catch{status.textContent='Non riesco ad attivare le notifiche. Puoi riprovare.';}finally{button.disabled=!supported();}
 };
 globalThis.addEventListener?.('storage',event=>{if(event.key===storageKey&&!event.newValue){generation++;if(nav?.serviceWorker)void message(null).catch(()=>{});}});
 let pending=notificationReference(location);
 return{async account(next){if(owner===next)return;owner=next;generation++;const old=read();if(!old||old.owner!==next){save(null);if(nav?.serviceWorker){await message(null);await(await worker.pushManager.getSubscription())?.unsubscribe();}}button.textContent=read()?.owner===next&&next?'Disattiva notifiche':'Attiva notifiche';},revoke,
 async openPending(){if(!pending)return false;const ref=pending,account=session()?.user?.id,g=generation;pending=null;let r;try{r=await api.resolve(ref);}catch{r={available:false};}if(g!==generation||session()?.user?.id!==account)return true;await onTarget(r);return true;},resetIntent(){pending=null;}};
}
