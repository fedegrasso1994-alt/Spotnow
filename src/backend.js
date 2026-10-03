import { validProfile } from './domain.js';

/** Uses the official Supabase client, injected to keep it independent of the UI. */
export function createBackend(client) {
  const photos=new Map();let photoEpoch=0;const clearPhotos=()=>{photoEpoch++;photos.clear();};
  function unwrap(result) {if(result.error) throw result.error;return result.data;}
  async function userId() {
    const data=unwrap(await client.auth.getUser());
    if(!data.user)throw new Error('Accedi per continuare.');
    return data.user.id;
  }
  return {
    async session(){return unwrap(await client.auth.getSession()).session;},
    async accountState(){return unwrap(await client.rpc('my_account_state'));},
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
    async uploadPhoto(file) {
      const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
      if(!extensions[file.type]||file.size>8*1024*1024||!file.size)throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
      const id=await userId(),path=`${id}/${crypto.randomUUID()}.${extensions[file.type]}`;
      unwrap(await client.storage.from('profile-photos').upload(path,file,{contentType:file.type,upsert:false}));
      return path;
    },
    async saveProfile(profile) {
      if(!validProfile(profile)||profile.age>120||profile.name.trim().length>60)throw new Error('Completa il profilo con una foto e dati validi.');
      const id=await userId();
      if(!profile.photo.startsWith(`${id}/`))throw new Error('Carica la foto prima di salvare.');
      return unwrap(await client.from('profiles').upsert({id,name:profile.name.trim(),age:profile.age,
        gender:profile.gender,preference:profile.preference,photo_path:profile.photo,updated_at:new Date().toISOString()}).select().single());
    },
    async ownCheckIn(){return unwrap(await client.from('checkins').select('*').eq('user_id',await userId()).maybeSingle());},
    async getVenue(id){return unwrap(await client.from('venues').select('id,name,address').eq('id',id).single());},
    async scanVenue(token){return unwrap(await client.rpc('check_in',{qr_token:token}));},
    async venuePreview(token){const rows=unwrap(await client.rpc('venue_preview',{qr_token:token}));if(!rows?.length)throw new Error('QR non valido');return rows[0];},
    async tribes(){return unwrap(await client.rpc('my_tribes'));},
    async locationPeople(place,live){return unwrap(await client.rpc('location_people',{place,live}));},
    async googleLogin(redirectTo){const result=unwrap(await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true}}));if(!result?.url)throw new Error('Google non ha restituito il collegamento di accesso. Riprova.');return result;},
    async deleteAccount(){const data=unwrap(await client.functions.invoke('delete-account',{body:{confirm:true}}));if(data?.deleted!==true)throw new Error('Cancellazione non completata. Riprova.');},
    async checkDeletion(){return unwrap(await client.functions.invoke('delete-account',{body:{dry_run:true}}));},
    async peopleHere() {
      const id=await userId();
      return unwrap(await client.from('profiles').select('id,name,age,gender,photo_path').neq('id',id));
    },
    async expressInterest(personId,place){return unwrap(await client.rpc('send_spot',{target_user:personId,place}));},
    async matches(){return unwrap(await client.rpc('my_matches'));},
    async messages(matchId){return unwrap(await client.from('messages').select('*').eq('match_id',matchId).order('created_at').order('id'));},
    async sendMessage(matchId,text,nonce){return unwrap(await client.rpc('send_message',{target_match:matchId,message_text:text,client_nonce:nonce}));},
    async block(personId){clearPhotos();return unwrap(await client.rpc('block_profile',{target_user:personId}));},
    async report(personId,reason,details,alsoBlock,nonce){if(alsoBlock)clearPhotos();return unwrap(await client.rpc('report_profile',{target_user:personId,report_reason:reason,report_details:details,also_block:alsoBlock,client_nonce:nonce}));},
    async photoUrl(path) {
      if(!path)return null;
      const cached=photos.get(path);if(cached&&cached.until>Date.now())return cached.url;
      const generation=photoEpoch;const url=unwrap(await client.storage.from('profile-photos').createSignedUrl(path,30)).signedUrl;
      if(generation===photoEpoch){if(photos.size>200)photos.clear();photos.set(path,{url,until:Date.now()+20000});}return url;
    },
  };
}
