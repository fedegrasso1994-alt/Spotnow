import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';
import {dispatchNotifications,NOTIFICATION_COPY,notificationInput} from '../_shared/notification-delivery.js';
const ref='zjinjtkekmaqtxsuyvho';
Deno.serve(async req=>{
 const origin=Deno.env.get('NOTIFICATIONS_PREVIEW_ORIGIN')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'METHOD'});
 const url=Deno.env.get('SUPABASE_URL')||'https://invalid.local';
 if(new URL(url).hostname!==`${ref}.supabase.co`)return reply(503,{error:'STAGING_ONLY'});
 if(Number(req.headers.get('content-length'))>2048)return reply(413,{error:'SIZE'});
 let input;try{input=await notificationInput(req);}catch(error){return reply(error.message==='SIZE'?413:400,{error:'INPUT'});}
 const client=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(name:string,args:Record<string,unknown>)=>{const r=await client.rpc(name,args);if(r.error)throw Error('NOTIFICATION_RPC');return r.data;};
 try{
  if(input.action==='check'){
   if(req.headers.get('origin')!==origin||!/^https:\/\//.test(origin))return reply(403,{available:false});
   if(!/^[a-f0-9]{64}$/.test(input.binding)||!/^[a-f0-9]{64}$/.test(input.reference))return reply(200,{available:false});
   const r=await rpc('notification_check',{device_key:input.binding,reference:input.reference});
   return reply(200,r.available?{available:true,body:NOTIFICATION_COPY[r.kind]}:{available:false});
  }
  const secret=Deno.env.get('NOTIFICATIONS_DISPATCH_SECRET');
  if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return reply(401,{error:'AUTH'});
  if(input.action==='prune')return reply(200,await rpc('notification_prune',{}));
  if(input.action!=='dispatch')return reply(400,{error:'ACTION'});
  const publicKey=Deno.env.get('NOTIFICATIONS_VAPID_PUBLIC'),privateKey=Deno.env.get('NOTIFICATIONS_VAPID_PRIVATE'),subject=Deno.env.get('NOTIFICATIONS_VAPID_SUBJECT');
  if(!publicKey||!privateKey||!subject)return reply(503,{error:'NOT_CONFIGURED'});
  webpush.setVapidDetails(subject,publicKey,privateKey);
  return reply(200,await dispatchNotifications({rpc,send:(subscription:unknown,payload:string,options:unknown)=>webpush.sendNotification(subscription,payload,options)}));
 }catch{return reply(503,{error:'NOTIFICATION_UNAVAILABLE'});}
});
