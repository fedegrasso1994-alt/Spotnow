import {cachedPhoto,clearPhotoMemory,preloadPhoto} from './photo-memory.js';
import { validProfile } from './domain.js';
import { createRequestQueue } from './request-queue.js';

/** Uses the official Supabase client, injected to keep it independent of the UI. */
export function createBackend(client,{readTimeoutMs=15000}={}) {
  const prefetched=new Map();
  const photoQueue=createRequestQueue(4),readQueue=createRequestQueue(6),pendingReads=new Map();
  const cancelable=(request,signal)=>typeof request?.abortSignal==='function'?request.abortSignal(signal):request;
  function sharedRead(name,args,work){
    const key=JSON.stringify([name,args]);if(pendingReads.has(key))return pendingReads.get(key).promise;
    const controller=new AbortController();
    const promise=readQueue.run(()=>{if(controller.signal.aborted)throw new Error('Richiesta annullata');return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{controller.abort();reject(new Error('Connessione non disponibile o troppo lenta. Riprova.'));},readTimeoutMs);Promise.resolve().then(()=>work(controller.signal)).then(resolve,reject).finally(()=>clearTimeout(timer));});}).finally(()=>{if(pendingReads.get(key)?.promise===promise)pendingReads.delete(key);});
    pendingReads.set(key,{promise,controller,name,args});return promise;
  }
  const rpcRead=(name,args={})=>sharedRead(name,args,async signal=>unwrap(await cancelable(client.rpc(name,args),signal)));
  const photos=new Map(),pendingPhotos=new Map();let photoEpoch=0;const clearPhotos=()=>{clearPhotoMemory();prefetched.clear();photoEpoch++;photos.clear();pendingPhotos.clear();for(const read of pendingReads.values())read.controller.abort();pendingReads.clear();};
  function prunePhotos(){const now=Date.now();for(const [path,cached]of photos)if(cached.until<=now)photos.delete(path);}
  function unwrap(result) {if(result.error) throw result.error;return result.data;}
  async function userId() {
    const data=unwrap(await client.auth.getUser());
    if(!data.user)throw new Error('Accedi per continuare.');
    return data.user.id;
  }
  return {
    async session(){return unwrap(await client.auth.getSession()).session;},
    async accountState(){return rpcRead('my_account_state');},
    async isSuspended(){return unwrap(await client.rpc('my_account_status'));},
    async isModerator(){return unwrap(await client.rpc('is_moderator'));},
    async moderationReports(){return unwrap(await client.rpc('moderation_reports'));},
    async moderateReport(id,action,note){return unwrap(await client.rpc('moderate_report',{target_report:id,moderation_action:action,moderation_note:note}));},
    async adminGoogleLogin(redirectTo){return unwrap(await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}}));},
    async enterAnonymously(){
      const existing=unwrap(await client.auth.getSession()).session;
      if(existing)return existing;
      return unwrap(await client.auth.signInAnonymously()).session;
    },
    async linkGoogle(redirectTo){
      await userId();
      const result=unwrap(await client.auth.linkIdentity({provider:'google',options:{redirectTo,skipBrowserRedirect:true}}));
      if(!result?.url)throw new Error('Google non ha restituito il collegamento di accesso. Riprova.');
      return result;
    },
    onSessionChange(callback){return client.auth.onAuthStateChange((event,session)=>{clearPhotos();callback(event,session);}).data.subscription;},
    async requestCode({email,phone,redirectTo}) {
      if(Boolean(email)===Boolean(phone))throw new Error('Indica email oppure telefono.');
      unwrap(await client.auth.signInWithOtp(email?{email,...(redirectTo?{options:{emailRedirectTo:redirectTo}}:{})}:{phone}));
    },
    async verifyCode({email,phone,token}) {
      if(Boolean(email)===Boolean(phone)||!token.trim())throw new Error('Inserisci il codice ricevuto.');
      return unwrap(await client.auth.verifyOtp(email?{email,token,type:'email'}:{phone,token,type:'sms'}));
    },
    async signOut(){clearPhotos();unwrap(await client.auth.signOut());},
    async getProfile() {
      const id=await userId();
      return unwrap(await client.from('profiles').select('*').eq('id',id).maybeSingle());
    },
    async uploadPhoto(file,variants=null) {
      const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
      if(!extensions[file.type]||file.size>8*1024*1024||!file.size)throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
      const id=await userId(),path=`${id}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const uploads=[client.storage.from('profile-photos').upload(path,file,{contentType:file.type,upsert:false})];if(variants?.thumbnail)uploads.push(client.storage.from('profile-photos').upload(path+'.thumb.jpg',variants.thumbnail,{contentType:'image/jpeg',upsert:false}));for(const result of await Promise.all(uploads))unwrap(result);
      return path;
    },
    async saveProfile(profile) {
      if(!validProfile(profile)||profile.age>120||profile.name.trim().length>60)throw new Error('Completa il profilo con una foto e dati validi.');
      const id=await userId();
      if(!profile.photo.startsWith(`${id}/`))throw new Error('Carica la foto prima di salvare.');
      const saved=unwrap(await client.from('profiles').upsert({id,name:profile.name.trim(),age:profile.age,
        gender:profile.gender,preference:profile.preference,occupation:(profile.occupation||'').trim(),photo_path:profile.photo,updated_at:new Date().toISOString()}).select().single());
      if(profile.photoPreview)unwrap(await client.rpc('save_my_photo_preview',{path:profile.photo,preview_text:profile.photoPreview}));return saved;
    },
    async ownCheckIn(){return unwrap(await client.from('checkins').select('*').eq('user_id',await userId()).maybeSingle());},
    async getVenue(id){return unwrap(await client.from('venues').select('id,name,address').eq('id',id).single());},
    async scanVenue(token){return unwrap(await client.rpc('check_in',{qr_token:token}));},
    async venuePreview(token){const rows=unwrap(await client.rpc('venue_preview',{qr_token:token}));if(!rows?.length)throw new Error('QR non valido');return rows[0];},
    async tribes(){return rpcRead('my_tribes');},
    async locationPeople(place,live){return unwrap(await client.rpc('location_people',{place,live}));},
    async locationPeoplePage(place,live,offset=0){const warm=prefetched.get(place);if(!live&&!offset&&warm?.until>Date.now()){prefetched.delete(place);return warm.page;}const rows=await rpcRead('location_people_photos_page',{place,live,page_size:49,page_offset:offset});return {items:rows.slice(0,48),hasMore:rows.length>48,total:Number(rows[0]?.total_count||0)};},
    async googleLogin(redirectTo){const result=unwrap(await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true}}));if(!result?.url)throw new Error('Google non ha restituito il collegamento di accesso. Riprova.');return result;},
    async deleteAccount(){const data=unwrap(await client.functions.invoke('delete-account',{body:{confirm:true}}));if(data?.deleted!==true)throw new Error('Cancellazione non completata. Riprova.');},
    async checkDeletion(){return unwrap(await client.functions.invoke('delete-account',{body:{dry_run:true}}));},
    async peopleHere() {
      const id=await userId();
      return unwrap(await client.from('profiles').select('id,name,age,gender,photo_path').neq('id',id));
    },
    async expressInterest(personId,place){return unwrap(await client.rpc('send_spot',{target_user:personId,place}));},
    async matches(){return unwrap(await client.rpc('my_matches'));},
    async matchesPage(offset=0){const rows=await rpcRead('my_matches_photos_page',{page_size:49,page_offset:offset});return {items:rows.slice(0,48),hasMore:rows.length>48,total:Number(rows[0]?.total_count||0)};},
    async matchById(id){return (await rpcRead('my_matches_photos_page',{page_size:1,requested_match:id}))[0]||null;},
    async matchWith(person){return (await rpcRead('my_matches_photos_page',{page_size:1,requested_person:person}))[0]||null;},
    async messages(matchId,before){return sharedRead('messages',{matchId,before},async signal=>{
      let query=client.from('messages').select('id,match_id,sender_id,body,created_at').eq('match_id',matchId);
      if(before)query=query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
      const rows=unwrap(await cancelable(query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),signal));return rows.reverse();
    });},
    cancelDiscoveryReads(keepPlace=null){for(const [key,read]of pendingReads)if(['location_people_page','location_people_photos_page'].includes(read.name)&&read.args.place!==keepPlace){read.controller.abort();pendingReads.delete(key);}},
    async prefetchTribe(place){if(prefetched.get(place)?.until>Date.now())return;const generation=photoEpoch,page=await this.locationPeoplePage(place,false,0);if(generation!==photoEpoch)return;prefetched.set(place,{page,until:Date.now()+4000});const paths=page.items.slice(0,4).map(p=>p.thumbnail_path||p.photo_path),urls=await this.photoUrls(paths);if(generation===photoEpoch)for(const path of paths)preloadPhoto(path,urls.get(path));},
    async ensurePhotoAssets(path){return unwrap(await client.functions.invoke('photo-assets',{body:{photo_path:path}}));},
    async sendMessage(matchId,text,nonce){return unwrap(await client.rpc('send_message',{target_match:matchId,message_text:text,client_nonce:nonce}));},
    async block(personId){clearPhotos();return unwrap(await client.rpc('block_profile',{target_user:personId}));},
    async report(personId,reason,details,alsoBlock,nonce){if(alsoBlock)clearPhotos();return unwrap(await client.rpc('report_profile',{target_user:personId,report_reason:reason,report_details:details,also_block:alsoBlock,client_nonce:nonce}));},
    async photoUrls(paths) {
      prunePhotos();
      const unique=[...new Set(paths.filter(Boolean))],missing=unique.filter(path=>!cachedPhoto(path)&&(!photos.has(path)||photos.get(path).until<=Date.now()));
      const generation=photoEpoch,storage=client.storage.from('profile-photos');
      // One authorized request per group rather than one round trip for every card.
      for(let start=0;start<missing.length;start+=100){
        const group=missing.slice(start,start+100).filter(path=>!pendingPhotos.has(path));if(!group.length)continue;
        const request=photoQueue.run(async()=>{
          if(generation!==photoEpoch)return new Map();
          const rows=unwrap(await storage.createSignedUrls(group,30));
          const result=new Map(rows.map(row=>[row.path,row.error?null:row.signedUrl||null]));
          if(generation===photoEpoch)for(const [path,url]of result){if(url)photos.set(path,{url,until:Date.now()+20000});}
          return result;
        });
        for(const path of group){const pending=request.then(result=>result.get(path)||null).finally(()=>{if(pendingPhotos.get(path)===pending)pendingPhotos.delete(path);});pendingPhotos.set(path,pending);}
      }
      const result=new Map();await Promise.all(unique.map(async path=>{result.set(path,cachedPhoto(path)||(photos.get(path)?.until>Date.now()?photos.get(path).url:await pendingPhotos.get(path)?.catch(()=>null)));}));return result;
    },
    async photoUrl(path) {
      prunePhotos();
      if(!path)return null;
      const decoded=cachedPhoto(path);if(decoded)return decoded;
      const cached=photos.get(path);if(cached&&cached.until>Date.now())return cached.url;
      if(pendingPhotos.has(path))return pendingPhotos.get(path);
      const generation=photoEpoch;
      const request=photoQueue.run(async()=>{
        if(generation!==photoEpoch)return null;
        const url=unwrap(await client.storage.from('profile-photos').createSignedUrl(path,30)).signedUrl;
        if(generation===photoEpoch){photos.set(path,{url,until:Date.now()+20000});}return url;
      }).finally(()=>{if(pendingPhotos.get(path)===request)pendingPhotos.delete(path);});
      pendingPhotos.set(path,request);return request;
    },
  };
}
