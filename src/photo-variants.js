/** Small pixels travel with profile metadata; private JPEG thumbnails serve the grid. */
export async function photoVariants(file){
 let image;try{
  image=await createImageBitmap(file);
  const encode=(size,quality)=>new Promise(resolve=>{
   const scale=Math.min(1,size/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   const context=canvas.getContext('2d');if(!context)return resolve(null);context.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(resolve,'image/jpeg',quality);
  });
  const [tiny,thumbnail]=await Promise.all([encode(120,.65),encode(480,.78)]);if(!tiny||!thumbnail||tiny.type!=='image/jpeg'||thumbnail.type!=='image/jpeg')return null;
  const bytes=new Uint8Array(await tiny.arrayBuffer());if(bytes.length>11000)return null;let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return {preview:'data:image/jpeg;base64,'+btoa(binary),thumbnail:new File([thumbnail],'thumbnail.jpg',{type:'image/jpeg'})};
 }catch{return null;}finally{image?.close();}
}
