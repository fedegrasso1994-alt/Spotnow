/* Isolated notification handlers. Navigation/offline cache code lives unchanged in sw.js. */
(()=>{
 const db=()=>new Promise((resolve,reject)=>{const q=indexedDB.open('soma-push-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('state');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
 async function read(){const d=await db();try{return await new Promise((resolve,reject)=>{const q=d.transaction('state').objectStore('state').get('binding');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}finally{d.close();}}
 async function write(value){const d=await db();try{await new Promise((resolve,reject)=>{const t=d.transaction('state','readwrite');if(value)t.objectStore('state').put(value,'binding');else t.objectStore('state').delete('binding');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}finally{d.close();}}
 let serial=Promise.resolve();const run=fn=>{const p=serial.then(fn);serial=p.catch(()=>{});return p;};
 self.addEventListener('message',event=>{if(event.data?.type!=='SOMA_PUSH_BINDING')return;event.waitUntil(run(async()=>{
  const value=event.data.value;
  if(value&&(!/^[a-f0-9]{64}$/.test(value.binding)||value.check!=='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/notifications'))throw Error('BINDING');
  await write(value||null);for(const n of await self.registration.getNotifications())n.close();event.ports[0]?.postMessage({ok:true});
 }));});
 self.addEventListener('push',event=>event.waitUntil(run(async()=>{
  let p;try{p=event.data?.json();}catch{return;}
  if(!p||!/^[a-f0-9]{64}$/.test(p.reference)||!/^[a-f0-9]{64}$/.test(p.binding))return;
  const b=await read();if(!b||b.binding!==p.binding||b.seen?.includes(p.reference))return;
  const r=await fetch(b.check,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',credentials:'omit',body:JSON.stringify({action:'check',binding:b.binding,reference:p.reference})}).catch(()=>null);
  if(!r?.ok)return;const value=await r.json();if(!value.available||typeof value.body!=='string')return;
  const latest=await read();if(latest?.binding!==p.binding)return;
  // Persist before OS display: an ambiguous display failure is not replayed.
  await write({...latest,seen:[...(latest.seen||[]),p.reference].slice(-128)});
  await self.registration.showNotification('Soma',{body:value.body,tag:'soma-'+p.reference,data:{reference:p.reference,binding:p.binding}});
 })));
 self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(run(async()=>{
  const b=await read(),p=event.notification.data;if(!b||p?.binding!==b.binding||!/^[a-f0-9]{64}$/.test(p.reference))return;
  // No private content or internal IDs in the navigation URL; app reauthorizes.
  await self.clients.openWindow(new URL('/?n='+p.reference,self.location.origin).href);
 }));});
 self.addEventListener('pushsubscriptionchange',event=>event.waitUntil(run(async()=>{await write(null);for(const n of await self.registration.getNotifications())n.close();}))); // Explicit opt-in again, never silent rebind.
})();
