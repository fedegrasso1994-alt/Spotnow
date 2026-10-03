/** Reject renamed non-images before upload; accepted formats match the private bucket. */
export async function validatePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>8*1024*1024)throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const ascii=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
 const webp=ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(!(file.type==='image/jpeg'&&jpeg||file.type==='image/png'&&png||file.type==='image/webp'&&webp))throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
 if(typeof createImageBitmap==='function'){let image;try{image=await createImageBitmap(file);if(image.width*image.height>40000000)throw new Error('Too large');}catch{throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');}finally{image?.close();}}
 return file;
}
