// Local DEV UI rehearsal only. No real Auth, Storage or security evidence.
import {createOraApi}from '../../src/ora.js';
import {createOnboardingApi}from '../../src/onboarding.js';
import {setupViewport}from '../../src/viewport.js';
setupViewport();document.title='Soma · Ora sintetico locale';
const places=[{place_id:'fe324000-0000-4000-8000-000000000001',name:'Campus Uno',address:'Luogo sintetico'},{place_id:'fe324000-0000-4000-8000-000000000002',name:'Campus Due',address:'Luogo sintetico'}];
let presence=null,complete=!new URLSearchParams(location.search).has('incomplete'),members=[];const counts={manual:0,qr:0,legacy:0};const callbacks=[];
const photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#698ca5"/></svg>');
function start(place,source){if(presence?.place_id===place.place_id)return {...presence,server_now:new Date().toISOString()};return presence={...place,venue_id:place.place_id,presence_id:crypto.randomUUID(),started_at:new Date().toISOString(),server_now:new Date().toISOString(),expires_at:new Date(Date.now()+14400000).toISOString(),source};}
const client={rpc:async(name,args={})=>{let data;switch(name){
 case 'my_onboarding_state':data={complete,tribes:members};break;case 'complete_onboarding':complete=true;data={complete};break;case 'search_joinable_tribes':data=[];break;
 case 'my_presence':data=presence?{...presence,server_now:new Date().toISOString()}:null;break;
 case 'search_places':data=places.filter(p=>p.name.toLowerCase().includes(args.search_text.toLowerCase()));break;
 case 'start_ora_manual':counts.manual++;data=start(places.find(p=>p.place_id===args.place_id),'manual');break;
 case 'start_ora_qr':counts.qr++;if(args.qr_token!=='fe325000-0000-4000-8000-000000000001')return {error:Error('ORA_QR_INVALID')};data=start(places[0],'qr');break;
 case 'end_ora':if(presence?.presence_id===args.presence_id)presence=null;data=true;break;case 'ora_people_page':data=[];break;
 default:throw Error('Unexpected fixture RPC '+name);
 }return {data};}};
const session={user:{id:'synthetic-only',is_anonymous:false}};
globalThis.__SPOT_LOAD_TEST_BACKEND__={ora:createOraApi(client),onboarding:createOnboardingApi(client),session:async()=>session,onSessionChange:cb=>callbacks.push(cb),accountState:async()=> 'active',
 privacyState:async()=>({age_status:'eligible',consent_status:'active',declared_age:25}),getProfile:async()=>({name:'Utente sintetico',age:25,gender:'M',preference:'ALL',photo_path:'synthetic-only/photo.jpg'}),photoUrl:async()=>photo,photoUrls:async paths=>new Map(paths.map(p=>[p,photo])),
 getVenue:async id=>({id,...places.find(p=>p.place_id===id)}),tribes:async()=>[],matchesPage:async()=>({items:[],hasMore:false,total:0}),scanVenue:async()=>{counts.legacy++;throw Error('Legacy writer forbidden');},moderationNotice:async()=>null};
const panel=document.createElement('details');panel.style.cssText='position:fixed;top:0;left:0;z-index:100;background:#222;color:white;font:12px sans-serif;padding:5px;max-width:230px';const label=document.createElement('summary');label.textContent='TEST LOCALE · backend simulato';const metrics=document.createElement('pre');panel.append(label,metrics);document.body.append(panel);setInterval(()=>metrics.textContent=JSON.stringify({counts,presence,complete,members:members.length},null,2),300);
await import('/src/live.js');
