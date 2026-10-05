import {cachedPhoto,rememberPhotoForSession,retainPhotoSource} from './photo-memory.js';
const cleanups=new WeakMap(),listeners=new WeakMap();
function removeImage(image){cleanups.get(image)?.();cleanups.delete(image);image.remove();}
export function clearAvatar(element){for(const image of Array.from(element.querySelectorAll('img')))removeImage(image);element.replaceChildren();for(const key of ['photoIdentity','photoSource','avatarReady','photoOwner'])delete element.dataset[key];}
/** Keep the previous decoded pixels visible until a larger version is ready.
 * @param {any} element
 * @param {any} profile
 * @param {{eager?:boolean,thumbnail?:boolean,progressive?:boolean,onError?:()=>void,onLoad?:()=>void,timeoutMs?:number}} options
 */
export function renderAvatar(element,profile,{eager=false,thumbnail=false,progressive=false,onError,onLoad,timeoutMs=0}={}){
 const original=profile?.photo_path||profile?.photoPath||'';
 const full=progressive&&thumbnail?cachedPhoto(original):null;
 const path=full?original:thumbnail?(profile?.thumbnail_path||original):original;
 const photo=(/^data:/.test(profile?.photo||'')?profile.photo:null)||full||cachedPhoto(path)||profile?.photo||'',identity=/^data:/.test(photo)?photo:path||photo;
 const quality=thumbnail&&!full&&path!==original?1:2,owner=original||identity;
 const preview=profile?.photo_preview,validPreview=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(preview||'');
 const images=()=>Array.from(element.querySelectorAll('img'));
 const sameOwner=Boolean(owner)&&element.dataset.photoOwner===owner;
 const same=Boolean(identity)&&element.dataset.photoIdentity===identity;
 const requested=images().find(image=>!image.dataset.preview&&image.dataset.identity===identity);
 if(progressive&&sameOwner){
  const sharper=images().find(image=>image.dataset.decoded&&Number(image.dataset.quality)>quality);
  if(sharper){onLoad?.();return;}
 }
 if(requested){if(onLoad||onError)listeners.set(requested,{onLoad,onError});if(requested.dataset.decoded)onLoad?.();return;}
 // A missing renewed URL must not clear pixels already displayed for this file.
 const preserve=progressive&&sameOwner;
 if(!same&&!preserve){clearAvatar(element);element.style.backgroundImage='';element.style.position='relative';element.style.color='var(--muted)';element.textContent=profile?.name?.trim()?.charAt(0)?.toUpperCase()||'📷';}
 element.dataset.photoOwner=owner;element.dataset.photoIdentity=identity;element.dataset.photoSource=photo;element.dataset.avatarReady=photo?'true':'';
 if(validPreview&&!images().length){const tiny=(element.ownerDocument||document).createElement('img');tiny.alt='';tiny.dataset.preview='true';tiny.dataset.quality='0';tiny.loading='eager';Object.assign(tiny.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'});element.append(tiny);tiny.src=preview;}
 if(!photo)return;
 for(const old of images())if(!old.dataset.preview&&!old.dataset.decoded&&(!preserve||Number(old.dataset.quality)<=quality))removeImage(old);
 const remember=rememberPhotoForSession(path),image=(element.ownerDocument||document).createElement('img');image.alt='';image.crossOrigin='anonymous';image.loading=eager?'eager':'lazy';image.decoding='async';image.dataset.identity=identity;image.dataset.quality=String(quality);
 if(eager)image.fetchPriority='high';
 Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit',background:'var(--surface2)',opacity:'0'});
 listeners.set(image,{onLoad,onError});
 const release=retainPhotoSource(photo);let timer;const cleanup=()=>{clearTimeout(timer);release();};cleanups.set(image,cleanup);
 const reveal=()=>{if(image.parentElement!==element)return;cleanup();image.dataset.decoded='true';image.style.opacity='1';for(const old of images())if(old!==image&&(!progressive||Number(old.dataset.quality)<=quality))removeImage(old);if(path&&!/^data:/.test(photo))remember(image);listeners.get(image)?.onLoad?.();};
 image.onload=()=>{if(image.parentElement!==element)return;if(typeof image.decode==='function')image.decode().then(reveal,()=>image.onerror());else reveal();};
 image.onerror=()=>{if(image.parentElement!==element)return;removeImage(image);element.dataset.avatarReady='';listeners.get(image)?.onError?.();};
 element.append(image);image.src=photo;if(timeoutMs)timer=setTimeout(()=>{if(!image.dataset.decoded)image.onerror();},timeoutMs);
}
