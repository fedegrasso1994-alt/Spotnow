import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'Accedi per continuare'},401);
 const {data,error}=await admin.auth.getUser(token);
 if(error||!data.user)return reply({error:'Sessione non valida'},401);
 const id=data.user.id;
 let body: {dry_run?: boolean;confirm?: boolean};
 try{body=await request.json();}catch{return reply({error:'Conferma richiesta'},400);}
 if(body?.dry_run===true)return reply({authenticated:true,deletionStarted:false});
 if(body?.confirm!==true)return reply({error:'Conferma richiesta'},400);
 const started=await admin.rpc('begin_account_deletion',{target_user:id});
 if(started.error)return reply({error:'Cancellazione non avviata. Riprova.'},500);
 // Quiesce photo jobs before purging UID objects; a lease outlives bounded uploads.
 const barrier=await admin.rpc('photo_deletion_barrier',{target_user:id});
 if(barrier.error)return reply({error:'Cancellazione non avviata. Riprova.'},503);
 if(barrier.data===true)return reply({error:'Preparazione foto ancora in corso. Attendi un minuto e riprova.'},409);
 // Never accept a user id from the request. Remove only the authenticated user's files.
 let previousPage='';
 while(true){
  const listing=await admin.storage.from('profile-photos').list(id,{limit:100});
  if(listing.error)return reply({error:'Cancellazione foto non riuscita. Riprova.'},500);
  if(!listing.data.length)break;
  const page=listing.data.map(file=>file.name).join('\n');
  if(page===previousPage)return reply({error:'Cancellazione foto incompleta. Riprova.'},500);previousPage=page;
  const removal=await admin.storage.from('profile-photos').remove(listing.data.map(file=>`${id}/${file.name}`));
  if(removal.error)return reply({error:'Cancellazione foto non riuscita. Riprova.'},500);
 }
 const cleanup=await admin.rpc('prepare_account_deletion',{target_user:id});
 if(cleanup.error)return reply({error:'Cancellazione non riuscita. Riprova.'},500);
 const deletion=await admin.auth.admin.deleteUser(id);
 if(deletion.error)return reply({error:'Cancellazione account non riuscita. Riprova.'},500);
 return reply({deleted:true});
});
