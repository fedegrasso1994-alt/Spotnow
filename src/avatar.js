/** A failed image must leave a recognizable placeholder and never block a card. */
export function renderAvatar(element,profile){
 const photo=profile?.photo||'';
 if(element.dataset.photoSource===photo&&element.dataset.avatarReady)return;
 element.dataset.photoSource=photo;element.dataset.avatarReady='true';
 element.replaceChildren();element.style.backgroundImage='';element.style.position='relative';element.textContent='📷';
 if(!photo)return;
 const image=(element.ownerDocument||document).createElement('img');image.alt='';image.src=photo;image.loading='lazy';image.decoding='async';
 Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit',background:'var(--surface2)'});
 image.onerror=()=>{if(image.parentElement===element)image.remove();};
 element.append(image);
}
