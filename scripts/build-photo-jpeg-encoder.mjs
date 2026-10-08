import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const source=await readFile('node_modules/jpeg-js/lib/encoder.js','utf8');const sha=createHash('sha256').update(source).digest('hex');
if(sha!=='00bde8df2517eca556669ab6fc27b414e9ba3fc52a0a71e1e37ec7c5f19c3d34')throw Error('jpeg-js encoder checksum mismatch');
let s=source.slice(0,source.indexOf("if (typeof module !== 'undefined') {"));
s=s.replace('function JPEGEncoder(quality)', 'function JPEGEncoder(quality, check)').replace('while(y < height){','while(y < height){\n                check();');
s=s.replace('function writeByte(value)', 'function writeByte(value)').replace('byteout.push(value);',"if(byteout.length>=4194304)throw new RangeError('JPEG output budget');\n            byteout.push(value);");
s=s.replace(/var btoa = btoa \|\| function\(buf\) \{[\s\S]*?\n\};/, '').replace("if (typeof module === 'undefined') return new Uint8Array(byteout);\n      return Buffer.from(byteout);", 'return new Uint8Array(byteout);');
s+='\n/** Metadata cannot enter this interface; tables are reused across one job’s variants. */\nexport function createBoundedJpegEncoder(check=()=>{}){const encoder=new JPEGEncoder(85,check);return(pixels,quality)=>{check();const data=encoder.encode({width:pixels.width,height:pixels.height,data:pixels.data},quality);check();return{data,width:pixels.width,height:pixels.height};};}\n';
await writeFile('supabase/functions/_shared/photo-jpeg-encoder.js','// Generated from jpeg-js 0.4.4 encoder, SHA-256 '+sha+'. BSD notice retained. Changes: row deadline, output byte cap, per-job table reuse, metadata-free interface.\n'+s);
