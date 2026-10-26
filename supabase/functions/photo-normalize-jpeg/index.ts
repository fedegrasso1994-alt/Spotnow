import {stagingServerKey,stagingAdminClient} from '../_shared/server-key.js';
import {operationalHandler,operationalFetchRecorder} from '../_shared/operational-edge.js';
import {createBoundedJpegEncoder} from '../_shared/photo-jpeg-encoder.js';
import {createPhotoProcessor} from '../_shared/photo-processing.js';
import {photoWorker} from '../_shared/photo-worker.js';
const processor=createPhotoProcessor('JPEG',{  encoderFactory:createBoundedJpegEncoder,memory:()=>Deno.memoryUsage()});
const serviceKey=stagingServerKey(name=>Deno.env.get(name)),url=Deno.env.get('SUPABASE_URL')!;
Deno.serve(operationalHandler('photo.canonical',photoWorker(processor,{serviceKey,authorize:async token=>{const r=await fetch(url+'/rest/v1/rpc/photo_processing_authorized',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});return r.ok&&(await r.json())===true;}}),{record:operationalFetchRecorder({url,serviceKey})}));
