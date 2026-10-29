/** Authenticated archive inspection in RAM; no projected identities or secrets are printed. */
import{readFile}from'node:fs/promises';import{createDecipheriv,createHash}from'node:crypto';import{validateManifest}from'./checkpoint-artifact.mjs';
export async function archiveMetadata(){
 const root='.local/recovery-v3/capture-20261028-b',summary=JSON.parse(await readFile(root+'/sealed-summary.json')),b=await readFile(root+'/'+summary.checkpoint_id+'.soma.enc');
 if(createHash('sha256').update(b).digest('hex')!==summary.sha256)throw Error('RECOVERY_ARCHIVE_HASH');
 const key=await readFile('.local/recovery-keys/'+summary.checkpoint_id+'.key'),magic=Buffer.from('SOMA-RECOVERY-1\n');let plain;
 try{if(!b.subarray(0,magic.length).equals(magic))throw Error('RECOVERY_ARCHIVE_FORMAT');const d=createDecipheriv('aes-256-gcm',key,b.subarray(magic.length,magic.length+12));d.setAAD(magic);d.setAuthTag(b.subarray(-16));plain=Buffer.concat([d.update(b.subarray(magic.length+12,-16)),d.final()]);
  const n=plain.readUInt32BE(0),manifest=validateManifest(JSON.parse(plain.subarray(4,4+n)));let offset=4+n,database,inventory;
  for(const f of manifest.files){const data=plain.subarray(offset,offset+f.size);if(data.length!==f.size||createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('RECOVERY_ARCHIVE_FILE_HASH');if(f.kind==='database')database=Buffer.from(data);if(f.kind==='metadata')inventory=JSON.parse(data);offset+=f.size;}
  if(offset!==plain.length||!database||!inventory)throw Error('RECOVERY_ARCHIVE_METADATA');return{manifest,database,inventory,archive_sha256:summary.sha256};
 }finally{key.fill(0);plain?.fill(0);}
}
