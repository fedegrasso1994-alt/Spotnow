import {createBoundedJpegEncoder} from '../_shared/photo-jpeg-encoder.js';
import {createPhotoProcessor} from '../_shared/photo-processing.js';
import {photoWorker} from '../_shared/photo-worker.js';
const processor=createPhotoProcessor('JPEG',{  encoderFactory:createBoundedJpegEncoder,memory:()=>Deno.memoryUsage()});
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,url=Deno.env.get('SUPABASE_URL')!;
Deno.serve(photoWorker(processor,{serviceKey,authorize:async token=>{const r=await fetch(url+'/rest/v1/rpc/photo_processing_authorized',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});return r.ok&&(await r.json())===true;}}));
