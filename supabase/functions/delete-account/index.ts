import {cleanupPhotoAccount} from '../_shared/photo-lifecycle.js';
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
 try{if(!await cleanupPhotoAccount(admin,id))return reply({error:'Cancellazione in preparazione. Riprova tra poco.'},409);}catch{return reply({error:'Cancellazione in corso. Riprova tra poco.'},503);}
 return reply({deleted:true});
});
