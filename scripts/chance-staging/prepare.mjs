import{randomBytes,randomUUID}from'node:crypto';import{mkdir,writeFile,access}from'node:fs/promises';
const root='.local/chance-staging';await mkdir(root,{recursive:true,mode:0o700});try{await access(root+'/fixtures.json');throw Error('FIXTURE_FILE_ALREADY_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile(root+'/fixtures.json',JSON.stringify(Array.from({length:2},(_,i)=>({id:randomUUID(),email:`soma-chance-20261030-${i+1}@example.invalid`,password:randomBytes(24).toString('hex')}))),{mode:0o600});
console.log('Two private synthetic fixture definitions prepared; no accounts created.');
