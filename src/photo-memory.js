/** Session-only decoded pixels. Never persist private photos in browser storage. */
const entries=new Map(),pending=new Set(),leases=new Map(),retired=new Set(),warming=new Map();let bytes=0,epoch=0;
const MAX_BYTES=16*1024*1024,MAX_IMAGES=64;
export function cachedPhoto(path){const entry=entries.get(path);if(!entry)return null;entries.delete(path);entries.set(path,entry);return entry.url;}
function retire(url){if(leases.has(url))retired.add(url);else URL.revokeObjectURL(url);}
/** Do not revoke a cached Blob while a newly opened detail is decoding it. */
export function retainPhotoSource(url){
 if(!Array.from(entries.values()).some(entry=>entry.url===url)&&!retired.has(url))return ()=>{};
 const generation=epoch;leases.set(url,(leases.get(url)||0)+1);let released=false;
 return ()=>{if(released||generation!==epoch)return;released=true;const count=(leases.get(url)||1)-1;if(count)leases.set(url,count);else{leases.delete(url);if(retired.delete(url))URL.revokeObjectURL(url);}};
}
export function clearPhotoMemory(){epoch++;for(const job of warming.values())job.cancel();warming.clear();for(const entry of entries.values())URL.revokeObjectURL(entry.url);for(const url of retired)URL.revokeObjectURL(url);entries.clear();pending.clear();leases.clear();retired.clear();bytes=0;}
/** A request belongs to the session in which it started, including detached avatars. */
export function rememberPhotoForSession(path){const generation=epoch;return image=>{if(generation===epoch)rememberPhoto(path,image);};}
export function rememberPhoto(path,image){
 if(!path||entries.has(path)||pending.has(path)||!image.naturalWidth||!image.naturalHeight)return;
 const generation=epoch;pending.add(path);
 try{
  const canvas=image.ownerDocument.createElement('canvas'),scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context){pending.delete(path);return;}context.drawImage(image,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{
   if(generation!==epoch)return;pending.delete(path);if(!blob||blob.size>MAX_BYTES||entries.has(path))return;
   while(entries.size>=MAX_IMAGES||bytes+blob.size>MAX_BYTES){const key=entries.keys().next().value,entry=entries.get(key);retire(entry.url);bytes-=entry.size;entries.delete(key);}
   entries.set(path,{url:URL.createObjectURL(blob),size:blob.size});bytes+=blob.size;
  },'image/webp',.92);
 }catch{pending.delete(path);/* Unsupported canvas/CORS retains the normal authorized image. */}
}

/** Warm only a few authorized thumbnails; a reset invalidates late image callbacks. */
export function preloadPhoto(path,url){
 if(!path||!url||cachedPhoto(path)||typeof Image==='undefined')return Promise.resolve();
 if(warming.has(path))return warming.get(path).promise;
 const generation=epoch,image=new Image();image.crossOrigin='anonymous';image.decoding='async';let resolve,finished=false;
 const promise=new Promise(done=>resolve=done);
 const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);if(warming.get(path)?.promise===promise)warming.delete(path);resolve();};
 const timer=setTimeout(finish,20000);warming.set(path,{promise,cancel:finish});
 const ready=()=>{if(!finished&&generation===epoch)rememberPhoto(path,image);finish();};
 image.onload=()=>{if(typeof image.decode==='function')image.decode().then(ready,finish);else ready();};image.onerror=finish;image.src=url;return promise;
}
