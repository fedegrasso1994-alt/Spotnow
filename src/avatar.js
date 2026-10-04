/** Keep decoded photos stable while short-lived signed URLs are renewed. */
export function renderAvatar(element,profile,{eager=false}={}){
 const photo=profile?.photo||'',identity=/^(data:|blob:)/.test(photo)?photo:profile?.photo_path||profile?.photoPath||photo;
 const same=Boolean(identity)&&element.dataset.photoIdentity===identity;
 const imagePresent=Boolean(element.querySelector('img'));
 // Expiry changes access to the URL, not pixels that have already been decoded.
 if(same&&imagePresent)return;
 if(same&&element.dataset.photoSource===photo&&element.dataset.avatarReady)return;
 if(!same){element.replaceChildren();element.style.backgroundImage='';element.style.position='relative';element.style.color='var(--muted)';element.textContent=profile?.name?.trim()?.charAt(0)?.toUpperCase()||'📷';}
 element.dataset.photoIdentity=identity;element.dataset.photoSource=photo;element.dataset.avatarReady=photo?'true':'';
 if(!photo)return;
 // Replace an unfinished request; late events from it must not affect the new image.
 for(const old of Array.from(element.querySelectorAll('img')))old.remove();
 const image=(element.ownerDocument||document).createElement('img');image.alt='';image.loading=eager?'eager':'lazy';image.decoding='async';
 if(eager)image.fetchPriority='high';
 Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit',background:'var(--surface2)',opacity:'0'});
 image.onload=()=>{if(image.parentElement===element)image.style.opacity='1';};
 image.onerror=()=>{if(image.parentElement===element){image.remove();element.dataset.avatarReady='';}};
 element.append(image);image.src=photo;
}
