// DEV-only visual fixture. Not Auth/Storage/security evidence; never bundled in real Preview.
import {PILOT_PLACES}from '../../src/pilot-ui.js';import {setupViewport}from '../../src/viewport.js';setupViewport();
const params=new URLSearchParams(location.search),catalog=PILOT_PLACES.map((name,i)=>({id:`pilot-${i}`,place_id:`pilot-${i}`,name,address:'Catalogo sintetico locale'}));let complete=!params.has('onboarding'),members=[],presence=null;
const photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><rect width="320" height="400" fill="#24262e"/></svg>');
const session={user:{id:'synthetic-pilot',is_anonymous:false}},state=()=>({complete,tribes:members});
const backend={onboarding:{state:async()=>state(),search:async()=>catalog,join:async id=>{if(!members.some(t=>t.id===id))members.push(catalog.find(t=>t.id===id));},complete:async()=>{complete=true;return state();}},
 ora:{current:async()=>presence?{...presence,server_now:new Date().toISOString()}:null,search:async()=>catalog,start:async id=>{if(presence?.place_id===id)return{...presence,server_now:new Date().toISOString()};const p=catalog.find(t=>t.id===id);return presence={...p,venue_id:id,presence_id:crypto.randomUUID(),server_now:new Date().toISOString(),expires_at:new Date(Date.now()+14400000).toISOString()};},end:async()=>{presence=null;},people:async()=>({items:[],total:0,hasMore:false})},
 board:{feed:async()=>({items:[],remaining:3,more:false})},session:async()=>session,onSessionChange:()=>{},accountState:async()=> 'active',privacyState:async()=>({age_status:'eligible',consent_status:'active',declared_age:25}),
 getProfile:async()=>({id:session.user.id,name:'Profilo sintetico',age:25,gender:'M',preference:'ALL',photo_path:'synthetic/photo'}),photoUrl:async()=>photo,photoUrls:async paths=>new Map(paths.map(p=>[p,photo])),tribes:async()=>members,
 getVenue:async id=>catalog.find(t=>t.id===id),matchesPage:async()=>({items:[],total:0,hasMore:false}),moderationNotice:async()=>null,clearPrivacyCaches:()=>{},saveProfile:async()=>{},ensurePhotoAssets:async()=>{}};
globalThis.__SPOT_LOAD_TEST_BACKEND__=backend;
const badge=document.createElement('div');badge.textContent='UI TEST LOCALE · DATI SINTETICI';badge.style.cssText='position:fixed;top:4px;left:4px;font:11px sans-serif;color:#8b8d97;z-index:20';document.body.append(badge);
await import('/src/live.js');
