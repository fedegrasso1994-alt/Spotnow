// Cache only the static offline explanation. Never cache profiles, chat or auth responses.
const OFFLINE_CACHE='spot-now-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>cache.add('/offline.html')));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('spot-now-offline-')&&key!==OFFLINE_CACHE).map(key=>caches.delete(key)))));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.mode!=='navigate'||event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline.html')||new Response('Connessione non disponibile',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});
