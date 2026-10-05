/** Reduce new uploads before transfer; existing private originals are untouched. */
export async function optimizePhoto(file){
 if(typeof createImageBitmap!=='function')return file;
 let image;
 try{
  image=await createImageBitmap(file);
  const scale=Math.min(1,1600/Math.max(image.width,image.height));
  if(scale===1&&file.size<=320*1024)return file;
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d');if(!context)return file;
  context.drawImage(image,0,0,canvas.width,canvas.height);
  let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
  if(blob?.type==='image/webp'&&blob.size>320*1024){const smaller=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.78));if(smaller?.type==='image/webp'&&smaller.size<blob.size)blob=smaller;}
  if(!blob||blob.type!=='image/webp'||blob.size>=file.size)return file;
  return new File([blob],'profile.webp',{type:'image/webp',lastModified:file.lastModified});
 }catch{return file;}finally{image?.close();}
}
