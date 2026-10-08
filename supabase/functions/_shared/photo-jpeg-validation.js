import {rejectPhoto} from '../../../src/photo-contract.js';
/** Strict entropy validation, no IDCT/raster. Progressive state: two bitmaps per 8×8 block.
 * JPEG scan rules adapted from jpeg-js 0.4.4 (BSD-3-Clause; accompanying license).
 * Unlike permissive decoders, never skip surplus entropy or fill missing MCUs.
 */
export function validateJpegPayload(bytes,h,{now=()=>performance.now(),deadline=now()+600}={}){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),dc=[],ac=[],quant=new Set();let p=2,frame=null,restart=0,scans=0;
 function table(lengths,values){const min=[],max=[],ptr=[];let code=0,k=0;for(let len=1;len<=16;len++){const n=lengths[len-1];if(code+n>1<<len||n&&code+n-1===(1<<len)-1)rejectPhoto();min[len]=code;max[len]=n?code+n-1:-1;ptr[len]=k;k+=n;code=(code+n)*2;}if(!k||k>256)rejectPhoto();return {min,max,ptr,values};}
 function scan(components,ss,se,ah,al){
  let bitData=0,bits=0,eob=0,state=0,run=0,mcu=0,rst=0;
  const readBit=()=>{if(!bits){if(p>=bytes.length)rejectPhoto();bitData=bytes[p++];if(bitData===255&&(p>=bytes.length||bytes[p++]!==0))rejectPhoto();bits=8;}return(bitData>>--bits)&1;};
  const receive=n=>{let val=0;while(n--)val=(val<<1)|readBit();return val;};
  const symbol=t=>{if(!t)rejectPhoto();let code=0;for(let len=1;len<=16;len++){code=(code<<1)|readBit();if(code<=t.max[len]&&code>=t.min[len])return t.values[t.ptr[len]+code-t.min[len]];}rejectPhoto();};
  const has=(c,b,k)=>!!(c.bitmap[b*2+(k>>>5)]&(1<<(k&31))),set=(c,b,k)=>{c.bitmap[b*2+(k>>>5)]|=1<<(k&31);};
  function block(c,b){
   if(!h.progressive){const t=symbol(c.dc);if(t>11)rejectPhoto();receive(t);let k=1;while(k<64){const rs=symbol(c.ac),s=rs&15,r=rs>>>4;if(s===0){if(r===0)break;if(r!==15)rejectPhoto();k+=16;if(k>64)rejectPhoto();continue;}if(s>10||(k+=r)>63)rejectPhoto();receive(s);k++;}return;}
   if(ss===0){if(ah)readBit();else{const t=symbol(c.dc);if(t>11)rejectPhoto();receive(t);}return;}
   if(!ah){if(eob){eob--;return;}let k=ss;while(k<=se){const rs=symbol(c.ac),s=rs&15,r=rs>>>4;if(s===0){if(r<15){eob=receive(r)+(1<<r)-1;break;}k+=16;if(k>se+1)rejectPhoto();continue;}if(s>10||(k+=r)>se)rejectPhoto();receive(s);set(c,b,k++);}return;}
   let k=ss;while(k<=se){switch(state){case 0:{const rs=symbol(c.ac),s=rs&15;run=rs>>>4;if(!s){if(run<15){eob=receive(run)+(1<<run);state=4;}else{run=16;state=1;}}else{if(s!==1)rejectPhoto();receive(1);state=run?2:3;}continue;}case 1:case 2:if(has(c,b,k))readBit();else if(--run===0)state=state===2?3:0;break;case 3:if(has(c,b,k))readBit();else{set(c,b,k);state=0;}break;case 4:if(has(c,b,k))readBit();break;}k++;}if(state===4&&--eob===0)state=0;
  }
  const count=components.length===1?components[0].cols*components[0].rows:frame.mcuCols*frame.mcuRows;
  while(mcu<count){eob=0;state=0;const end=Math.min(count,mcu+(restart||count));while(mcu<end){if(components.length===1){const c=components[0],row=Math.floor(mcu/c.cols),col=mcu%c.cols;block(c,row*c.stride+col);}else for(const c of components){const row=Math.floor(mcu/frame.mcuCols)*c.v,col=(mcu%frame.mcuCols)*c.h;for(let yy=0;yy<c.v;yy++)for(let xx=0;xx<c.h;xx++)block(c,(row+yy)*c.stride+col+xx);}mcu++;if((mcu&31)===0&&now()>deadline)rejectPhoto('TIME');}
   if(eob||state)rejectPhoto();if(bits&&(bitData&((1<<bits)-1))!==((1<<bits)-1))rejectPhoto();bits=0;
   if(mcu<count){if(bytes[p++]!==255||bytes[p++]!==208+(rst++&7))rejectPhoto();}
  }
  // No extra entropy bytes, stuffed data, or misplaced restart marker after the expected MCUs.
  if(bytes[p]!==255||bytes[p+1]===0||bytes[p+1]>=208&&bytes[p+1]<=215)rejectPhoto();
 }
 while(p<bytes.length){if(bytes[p++]!==255)rejectPhoto();while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===217)break;const len=v.getUint16(p),s=p+2,end=p+len;
  if(marker===219){let q=s;while(q<end){const spec=bytes[q++],precision=spec>>>4,id=spec&15;if(precision>1||id>3)rejectPhoto();const size=64*(precision+1);if(q+size>end)rejectPhoto();for(let i=0;i<64;i++)if((precision?v.getUint16(q+i*2):bytes[q+i])===0)rejectPhoto();quant.add(id);q+=size;}if(q!==end)rejectPhoto();}
  if(marker===196){let q=s;while(q<end){const spec=bytes[q++];if((spec>>>4)>1||(spec&15)>3||q+16>end)rejectPhoto();const lengths=bytes.subarray(q,q+16),sum=lengths.reduce((a,b)=>a+b,0);q+=16;if(q+sum>end)rejectPhoto();(spec>>>4?ac:dc)[spec&15]=table(lengths,bytes.subarray(q,q+sum));q+=sum;}if(q!==end)rejectPhoto();}
  if(marker===221){if(len!==4)rejectPhoto();restart=v.getUint16(s);}
  if(marker===192||marker===194){const components=[];for(let i=0;i<3;i++){const q=s+6+i*3;components.push({id:bytes[q],h:bytes[q+1]>>>4,v:bytes[q+1]&15,quant:bytes[q+2],dc:null,ac:null,bitmap:null,approx:new Int8Array(64).fill(-1)});}const maxH=Math.max(...components.map(c=>c.h)),maxV=Math.max(...components.map(c=>c.v)),mcuCols=Math.ceil(h.width/8/maxH),mcuRows=Math.ceil(h.height/8/maxV);let allocated=0;for(const c of components){c.cols=Math.ceil(Math.ceil(h.width/8)*c.h/maxH);c.rows=Math.ceil(Math.ceil(h.height/8)*c.v/maxV);c.stride=mcuCols*c.h;const count=c.stride*mcuRows*c.v*2;if(h.progressive){allocated+=count*4;if(allocated>12*1048576)rejectPhoto('MEMORY');c.bitmap=new Uint32Array(count);}}frame={components,mcuCols,mcuRows};}
  if(marker===218){if(!frame)rejectPhoto();scans++;const n=bytes[s],components=[];for(let i=0;i<n;i++){const c=frame.components.find(c=>c.id===bytes[s+1+i*2]);if(!c||!quant.has(c.quant))rejectPhoto();const spec=bytes[s+2+i*2];c.dc=dc[spec>>>4];c.ac=ac[spec&15];components.push(c);}const q=s+1+2*n,ss=bytes[q],se=bytes[q+1],ah=bytes[q+2]>>>4,al=bytes[q+2]&15;
   if(h.progressive){if(ss===0&&se!==0||ss>0&&n!==1||ah&&al!==ah-1)rejectPhoto();for(const c of components)for(let k=ss;k<=se;k++){if(!ah&&c.approx[k]!==-1||ah&&c.approx[k]!==ah)rejectPhoto();c.approx[k]=al;}}
   p=end;scan(components,ss,se,ah,al);
  }else p=end;
 }
 if(now()>deadline)rejectPhoto('TIME');if(!frame||!scans||h.progressive&&frame.components.some(c=>c.approx[0]===-1))rejectPhoto();
}
