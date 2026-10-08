import {rejectPhoto} from '../../../src/photo-contract.js';
/** Inflate into two scanlines; bilinear sample directly into the bounded RGB(A) target. */
export function decodePngBounded(bytes,h,Inflate,{now=()=>performance.now(),deadline=now()+1300}={}){
 if(now()>deadline)rejectPhoto('TIME');
 const stride=h.width*h.channels,expected=(stride+1)*h.height,scale=Math.min(1,1600/Math.max(h.width,h.height)),width=Math.max(1,Math.round(h.width*scale)),height=Math.max(1,Math.round(h.height*scale));
 const data=new Uint8Array(width*height*4),previous=new Uint8Array(stride),row=new Uint8Array(stride+1),xs=Array.from({length:width},(_,x)=>Math.max(0,Math.min(h.width-1,(x+.5)*h.width/width-.5)));
 let fill=0,rows=0,expanded=0,target=0;
 const value=(source,offset,channel)=>{if(h.colorType===3){const index=source[offset];if(index>=h.palette.length/3)rejectPhoto();const alpha=h.trns?.[index]??255;return h.palette[index*3+channel]*alpha/255+255-alpha;}const alpha=h.channels===2||h.channels===4?source[offset+h.channels-1]:h.trns&&h.trns.every((v,c)=>source[offset+c]===v)?0:255,c=source[offset+(h.channels<3?0:channel)];return c*alpha/255+255-alpha;};
 const inflate=new Inflate({chunkSize:65536,windowBits:15});
 inflate.onData=chunk=>{expanded+=chunk.length;if(expanded>expected)rejectPhoto();let off=0;
  while(off<chunk.length){const take=Math.min(row.length-fill,chunk.length-off);row.set(chunk.subarray(off,off+take),fill);fill+=take;off+=take;if(fill!==row.length)continue;const filter=row[0];if(filter>4)rejectPhoto();
   for(let i=0;i<stride;i++){let v=row[i+1];const a=i>=h.channels?row[i+1-h.channels]:0,b=previous[i],c=i>=h.channels?previous[i-h.channels]:0;if(filter===1)v+=a;else if(filter===2)v+=b;else if(filter===3)v+=(a+b)>>>1;else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}row[i+1]=v&255;}
   if(h.colorType===3)for(let i=1;i<row.length;i++)if(row[i]>=h.palette.length/3)rejectPhoto();
   while(target<height){const sy=Math.max(0,Math.min(h.height-1,(target+.5)*h.height/height-.5)),y0=Math.floor(sy),y1=Math.min(h.height-1,y0+1);if(y1!==rows)break;const fy=sy-y0,top=y0===rows?row.subarray(1):previous,bottom=row.subarray(1);
    for(let x=0;x<width;x++){const sx=xs[x],x0=Math.floor(sx),x1=Math.min(h.width-1,x0+1),fx=sx-x0,dst=(target*width+x)*4;for(let c=0;c<3;c++){const t=value(top,x0*h.channels,c)*(1-fx)+value(top,x1*h.channels,c)*fx,b=value(bottom,x0*h.channels,c)*(1-fx)+value(bottom,x1*h.channels,c)*fx;data[dst+c]=Math.round(t*(1-fy)+b*fy);}data[dst+3]=255;}target++;
   }
   previous.set(row.subarray(1));fill=0;rows++;if((rows&63)===0&&now()>deadline)rejectPhoto('TIME');
  }
 };
 inflate.onEnd=status=>{inflate.err=status;};
 for(const [off,len]of h.idat){if(inflate.ended)rejectPhoto();if(!inflate.push(bytes.subarray(off,off+len),false)||inflate.ended&&inflate.strm.avail_in)rejectPhoto();}
 if(now()>deadline)rejectPhoto('TIME');
 if(!inflate.ended||inflate.err||expanded!==expected||rows!==h.height||fill||target!==height)rejectPhoto();return {width,height,data};
}
