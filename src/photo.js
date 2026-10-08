import {inspectPhoto,PHOTO_LIMITS} from './photo-contract.js';
/** Early UX validation; server still validates payload and produces every published asset. */
export async function validatePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>PHOTO_LIMITS.bytes)throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
 inspectPhoto(new Uint8Array(await file.arrayBuffer()));return file;
}
