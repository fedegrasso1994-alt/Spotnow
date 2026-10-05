import {cachedPhoto,rememberPhotoForSession} from './photo-memory.js';
/** Keep decoded photos stable while short-lived signed URLs are renewed. */
export function renderAvatar(element,profile,{eager=false,thumbnail=false}={}){
 const original=profile?.photo_path||profile?.photoPath||'',path=thumbnail?(profile?.thumbnail_path||original):original,photo=cachedPhoto(path)||profile?.photo||'',identity=/^data:/.test(photo)?photo:path||photo;
 const preview=profile?.photo_preview,validPreview=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(preview||'');
 const same=Boolean(identity)&&element.dataset.photoIdentity===identity;
 const imagePresent=Array.from(element.querySelectorAll('img')).some(image=>!image.dataset.preview);
 if(!photo&&validPreview&&!imagePresent){const tiny=(element.ownerDocument||document).createElement('img');tiny.alt='';tiny.src=preview;tiny.dataset.preview='true';tiny.loading='eager';Object.assign(tiny.style,{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'});element.replaceChildren(tiny);element.dataset.photoIdentity='preview:'+path;return;}
 // Expiry changes access to the URL, not pixels that have already been decoded.
 if(same&&imagePresent)return;
 if(same&&element.dataset.photoSource===photo&&element.dataset.avatarReady)return;
 if(!same){element.replaceChildren();element.style.backgroundImage='';element.style.position='relative';element.style.color='var(--muted)';element.textContent=profile?.name?.trim()?.charAt(0)?.toUpperCase()||'📷';if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(preview||'')){const tiny=(element.ownerDocument||document).createElement('img');tiny.alt='';tiny.src=preview;tiny.dataset.preview='true';Object.assign(tiny.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'});element.append(tiny);}}
 element.dataset.photoIdentity=identity;element.dataset.photoSource=photo;element.dataset.avatarReady=photo?'true':'';
 if(!photo)return;
 // Replace an unfinished request; late events from it must not affect the new image.
 for(const old of Array.from(element.querySelectorAll('img')))if(!old.dataset.preview)old.remove();
 const remember=rememberPhotoForSession(path),image=(element.ownerDocument||document).createElement('img');image.alt='';image.crossOrigin='anonymous';image.loading=eager?'eager':'lazy';image.decoding='async';
 if(eager)image.fetchPriority='high';
 Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit',background:'var(--surface2)',opacity:'0'});
 image.onload=()=>{if(image.parentElement===element){image.style.opacity='1';for(const tiny of Array.from(element.querySelectorAll('img')))if(tiny.dataset.preview)tiny.remove();if(path&&!/^data:/.test(photo))remember(image);}};
 image.onerror=()=>{if(image.parentElement===element){image.remove();element.dataset.avatarReady='';}};
 element.append(image);image.src=photo;
}
