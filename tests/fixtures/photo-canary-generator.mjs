import {Image} from 'imagescript';
import {inspectPhoto} from '../../src/photo-contract.js';
import {validateJpegPayload} from '../../supabase/functions/_shared/photo-jpeg-validation.js';
import {createPhotoProcessor} from '../../supabase/functions/_shared/photo-processing.js';
import {createBoundedJpegEncoder} from '../../supabase/functions/_shared/photo-jpeg-encoder.js';
export const CANARY_SEEDS=Object.freeze([10,20,30,40,41]);
/** Deterministic RGB photo-like gradient; existing ImageScript encoder, no user metadata. */
export async function canaryJpeg(seed){
 if(!Number.isInteger(seed)||!CANARY_SEEDS.includes(seed))throw Error('Unknown canary fixture');
 const image=new Image(320,240);
 for(let y=0;y<240;y++)for(let x=0;x<320;x++){
  const r=(x+seed*3)%256,g=(y+seed*5)%256,b=(Math.floor(x/4)+Math.floor(y/3)+seed)%256;
  image.setPixelAt(x+1,y+1,((r<<24)|(g<<16)|(b<<8)|255)>>>0);
 }
 const bytes=await image.encodeJPEG(85);validateJpegPayload(bytes,inspectPhoto(bytes));return bytes;
}
/** Same unchanged server parser, entropy validator, decoder and bounded canonical encoder. */
export async function preflightCanaryFixtures(){
 const processor=createPhotoProcessor('JPEG',{encoderFactory:createBoundedJpegEncoder}),fixtures=new Map();
 for(const seed of CANARY_SEEDS){const bytes=await canaryJpeg(seed),header=inspectPhoto(bytes);validateJpegPayload(bytes,header);const output=await processor.process(bytes);
  for(const image of [output.detail,output.thumbnail,Buffer.from(output.preview.split(',')[1],'base64')]){const h=inspectPhoto(image);if(h.format!=='JPEG'||h.orientation!==1)throw Error('Invalid canonical output');}
  fixtures.set(seed,bytes);
 }
 return fixtures;
}
