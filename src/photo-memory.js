/** Session-only decoded pixels. Never persist private photos in browser storage. */
const entries=new Map(),pending=new Set();let bytes=0,epoch=0;
const MAX_BYTES=16*1024*1024,MAX_IMAGES=64;
export function cachedPhoto(path){const entry=entries.get(path);if(!entry)return null;entries.delete(path);entries.set(path,entry);return entry.url;}
export function clearPhotoMemory(){epoch++;for(const entry of entries.values())URL.revokeObjectURL(entry.url);entries.clear();pending.clear();bytes=0;}
export function rememberPhoto(path,image){
 if(!path||entries.has(path)||pending.has(path)||!image.naturalWidth||!image.naturalHeight)return;
 const generation=epoch;pending.add(path);
 try{
  const canvas=image.ownerDocument.createElement('canvas'),scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context){pending.delete(path);return;}context.drawImage(image,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{
   if(generation!==epoch)return;pending.delete(path);if(!blob||blob.size>MAX_BYTES||entries.has(path))return;
   while(entries.size>=MAX_IMAGES||bytes+blob.size>MAX_BYTES){const key=entries.keys().next().value,entry=entries.get(key);URL.revokeObjectURL(entry.url);bytes-=entry.size;entries.delete(key);}
   entries.set(path,{url:URL.createObjectURL(blob),size:blob.size});bytes+=blob.size;
  },'image/webp',.82);
 }catch{pending.delete(path);/* Unsupported canvas/CORS retains the normal authorized image. */}
}

/** Warm only a few authorized thumbnails; a reset invalidates late image callbacks. */
export function preloadPhoto(path,url){
 if(!path||!url||cachedPhoto(path)||typeof Image==='undefined')return;
 const generation=epoch,image=new Image();image.crossOrigin='anonymous';image.decoding='async';
 image.onload=()=>{if(generation===epoch)rememberPhoto(path,image);image.onload=null;image.onerror=null;};
 image.onerror=()=>{image.onload=null;image.onerror=null;};image.src=url;
}
