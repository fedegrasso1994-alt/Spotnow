/** PHOTO-01 server contract. Pure parsing: never allocates a decoded source frame. */
export const PHOTO_LIMITS=Object.freeze({bytes:8388608,side:8192,jpegPixels:12000000,pngPixels:12000000,webpPixels:6000000,outputSide:1600});
export const PHOTO_MESSAGES=Object.freeze({PAUSED:'Aggiornamento foto in corso. Riprova tra poco: la foto attuale resta disponibile.',SIZE:'Usa una foto fino a 8 MiB.',FORMAT:'Usa una foto JPG RGB, PNG 8-bit non interlacciata o WebP statico.',PIXELS:'La foto è troppo grande: JPG/PNG fino a 12 MP, WebP fino a 6 MP e lato massimo 8192 px.',INVALID:'Questa foto è danneggiata o non supportata. Scegli un’altra immagine.',ANIMATED:'Le immagini animate non sono supportate. Scegli una foto statica.',DEPTH:'Usa una PNG a 8-bit, non a 16-bit.',BUSY:'Preparazione foto occupata. Attendi qualche secondo e riprova.',RATE:'Hai effettuato troppi caricamenti. Attendi un’ora e riprova.',TIME:'Questa foto richiede troppo tempo per essere preparata. Scegli una versione più piccola.',MEMORY:'Questa foto è troppo complessa da preparare. Scegli una versione più piccola.',UPLOAD:'La foto non è stata salvata. Riprova: la foto precedente è ancora disponibile.'});
export class PhotoError extends Error {constructor(code,status=422){super(PHOTO_MESSAGES[code]||PHOTO_MESSAGES.INVALID);this.name='PhotoError';this.code=code;this.status=status;}}
export function rejectPhoto(code='INVALID',status=422){throw new PhotoError(code,status);}
export function checkPhotoDimensions(format,width,height){const pixels=format==='JPEG'?PHOTO_LIMITS.jpegPixels:format==='PNG'?PHOTO_LIMITS.pngPixels:PHOTO_LIMITS.webpPixels;if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>PHOTO_LIMITS.side||height>PHOTO_LIMITS.side||width*height>pixels)rejectPhoto('PIXELS');}
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
function crc(b){let c=0xffffffff;for(const n of b)c=(c>>>8)^crcTable[(c^n)&255];return(c^0xffffffff)>>>0;}
export function photoFormat(b){if(b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return 'PNG';if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'JPEG';if(b.length>=12&&String.fromCharCode(...b.subarray(0,4))==='RIFF'&&String.fromCharCode(...b.subarray(8,12))==='WEBP')return 'WebP';rejectPhoto('FORMAT');}
function orientation(b){
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);if(b.length<14||String.fromCharCode(...b.subarray(0,6))!=='Exif\0\0')rejectPhoto();const le=v.getUint16(6)===0x4949;if(!le&&v.getUint16(6)!==0x4d4d||v.getUint16(8,le)!==42)rejectPhoto();const off=6+v.getUint32(10,le);if(off<14||off+2>b.length)rejectPhoto();const count=v.getUint16(off,le);if(count>128||off+2+count*12+4>b.length)rejectPhoto();let result=1;
 for(let i=0;i<count;i++){const p=off+2+i*12;if(v.getUint16(p,le)===0x112){if(v.getUint16(p+2,le)!==3||v.getUint32(p+4,le)!==1)rejectPhoto();result=v.getUint16(p+8,le);if(result<1||result>8)rejectPhoto();}}return result;
}
export function inspectPhoto(b){
 if(!(b instanceof Uint8Array)||!b.length||b.length>PHOTO_LIMITS.bytes)rejectPhoto('SIZE');const format=photoFormat(b),n=b.length,v=new DataView(b.buffer,b.byteOffset,n),text=(p,l)=>String.fromCharCode(...b.subarray(p,p+l));
 if(format==='PNG'){
  if(n<33||v.getUint32(8)!==13||text(12,4)!=='IHDR')rejectPhoto();const width=v.getUint32(16),height=v.getUint32(20),depth=b[24],colorType=b[25],channels=({0:1,2:3,3:1,4:2,6:4})[colorType];checkPhotoDimensions(format,width,height);if(depth===16)rejectPhoto('DEPTH');if(depth!==8||!channels||b[26]||b[27]||b[28])rejectPhoto('FORMAT');
  const idat=[];let p=8,closed=false,seen=false,ended=false,count=0,trns=null,metadata=0,palette=null;
  while(p<n){if(++count>4096||p+12>n)rejectPhoto();const len=v.getUint32(p),type=text(p+4,4),end=p+12+len;if(end>n||!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase()||crc(b.subarray(p+4,p+8+len))!==v.getUint32(p+8+len))rejectPhoto();
   if(type==='IHDR'&&p!==8)rejectPhoto();if(['acTL','fcTL','fdAT'].includes(type))rejectPhoto('ANIMATED');
   if(type==='IDAT'){if(closed)rejectPhoto();seen=true;if(len)idat.push([p+8,len]);}else if(seen)closed=true;
   if(type==='PLTE'){if(palette||seen||colorType===0||colorType===4||len===0||len>768||len%3)rejectPhoto();palette=b.subarray(p+8,p+8+len);}
   if(type==='tRNS'){if(trns||seen)rejectPhoto();if(colorType===3){if(!palette||!len||len>palette.length/3)rejectPhoto();trns=b.subarray(p+8,p+8+len);}else{if(!([0,2].includes(colorType))||len!==channels*2)rejectPhoto();trns=[];for(let i=0;i<channels;i++){const c=v.getUint16(p+8+i*2);if(c>255)rejectPhoto();trns.push(c);}}}
   if(type!=='IDAT'&&type!=='IHDR'){metadata+=len;if(metadata>PHOTO_LIMITS.bytes)rejectPhoto();}
   if(type==='IEND'){if(len||end!==n||!seen||!idat.length)rejectPhoto();ended=true;break;}
   if(!['IHDR','PLTE','IDAT'].includes(type)&&type[0]===type[0].toUpperCase())rejectPhoto();p=end;
  }if(!ended||colorType===3&&!palette)rejectPhoto();return {format,width,height,depth,colorType,channels,idat,trns,palette,orientation:1};
 }
 if(format==='WebP'){
  if(v.getUint32(4,true)+8!==n)rejectPhoto();let p=12,count=0,extended=false,image=false,alpha=false,width=0,height=0,canvas=null,lossless=false;
  const u24=p=>b[p]+b[p+1]*256+b[p+2]*65536;
  while(p<n){if(++count>4096||p+8>n)rejectPhoto();const type=text(p,4),len=v.getUint32(p+4,true),s=p+8,end=s+len;if(end+(len&1)>n||(len&1)&&b[end]!==0)rejectPhoto();
   if(type==='ANIM'||type==='ANMF')rejectPhoto('ANIMATED');
   if(type==='VP8X'){if(p!==12||extended||len!==10||b[s]&0xc1||b[s+1]||b[s+2]||b[s+3])rejectPhoto();if(b[s]&2)rejectPhoto('ANIMATED');extended=true;canvas=[u24(s+4)+1,u24(s+7)+1];checkPhotoDimensions(format,...canvas);}
   else if(type==='ALPH'){if(!extended||image||alpha||!len)rejectPhoto();alpha=true;}
   else if(type==='VP8 '||type==='VP8L'){if(image)rejectPhoto();image=true;if(type==='VP8 '){if(len<10||b[s]&1||text(s+3,3)!=='\x9d\x01\x2a')rejectPhoto();width=v.getUint16(s+6,true)&16383;height=v.getUint16(s+8,true)&16383;}else{if(len<5||b[s]!==47)rejectPhoto();const bits=v.getUint32(s+1,true);if(bits>>>29||alpha)rejectPhoto();width=(bits&16383)+1;height=((bits>>>14)&16383)+1;lossless=true;}checkPhotoDimensions(format,width,height);if(canvas&&(canvas[0]!==width||canvas[1]!==height))rejectPhoto();}
   else if(!['ICCP','EXIF','XMP '].includes(type)||!extended)rejectPhoto();p=end+(len&1);
  }if(!image||p!==n)rejectPhoto();return {format,width,height,depth:8,channels:4,lossless,orientation:1};
 }
 let p=2,count=0,sof=null,scans=0,ended=false,orient=1,seenExif=false;
 while(p<n){if(++count>4096||b[p++]!==255)rejectPhoto();while(p<n&&b[p]===255)p++;if(p>=n)rejectPhoto();const marker=b[p++];if(marker===217){if(p!==n||!scans)rejectPhoto();ended=true;break;}if(marker===216||marker===0||marker===1||marker>=208&&marker<=215)rejectPhoto();if(p+2>n)rejectPhoto();const len=v.getUint16(p);if(len<2||p+len>n)rejectPhoto();const s=p+2,end=p+len;
  if(marker===192||marker===194){if(sof||len!==17||b[s]!==8||b[s+5]!==3)rejectPhoto('FORMAT');const width=v.getUint16(s+3),height=v.getUint16(s+1);checkPhotoDimensions(format,width,height);const ids=[],sampling=[];for(let i=0;i<3;i++){const o=s+6+3*i,id=b[o],h=b[o+1]>>>4,vv=b[o+1]&15;if(ids.includes(id)||!h||!vv||h>4||vv>4||b[o+2]>3)rejectPhoto();ids.push(id);sampling.push(h*vv);}if(sampling.reduce((a,b)=>a+b)>10)rejectPhoto();sof={format,width,height,depth:8,channels:3,progressive:marker===194,ids};}
  else if(marker>=193&&marker<=207&&![196,204].includes(marker))rejectPhoto('FORMAT');
  else if(marker===225&&text(s,Math.min(6,end-s))==='Exif\0\0'){if(seenExif)rejectPhoto();seenExif=true;orient=orientation(b.subarray(s,end));}
  else if(marker===226&&text(s,Math.min(4,end-s))==='MPF\0')rejectPhoto('ANIMATED');
  else if(marker===238&&text(s,Math.min(5,end-s))==='Adobe'&&end-s>=12&&b[s+11]>1)rejectPhoto('FORMAT');
  if(marker===218){if(!sof||++scans>16||len<6)rejectPhoto();const comps=b[s];if(!comps||comps>3||len!==6+2*comps)rejectPhoto();const ids=[];for(let i=0;i<comps;i++){const id=b[s+1+2*i],tables=b[s+2+2*i];if(!sof.ids.includes(id)||ids.includes(id)||(tables>>>4)>3||(tables&15)>3)rejectPhoto();ids.push(id);}const q=s+1+2*comps,ss=b[q],se=b[q+1],aa=b[q+2];if(ss>se||se>63||(aa>>>4)>13||(aa&15)>13||!sof.progressive&&(scans!==1||ss||se!==63||aa))rejectPhoto();p=end;
   while(p<n){if(b[p++]!==255)continue;const markerStart=p-1;while(p<n&&b[p]===255)p++;if(p>=n)rejectPhoto();if(b[p]===0||b[p]>=208&&b[p]<=215){p++;continue;}p=markerStart;break;}
  }else p=end;
 }if(!ended||!sof)rejectPhoto();return {...sof,orientation:orient};
}
