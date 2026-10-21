import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{shareToken,shareUrl,pendingShare,createShareIntent,shareContent,shareUnavailable}from'../src/spotted-share.js';import{authRedirect,authReturnError}from'../src/auth-preview.js';import{createSpottedApi}from'../src/spotted-social.js';import{mountSpotted}from'../src/spotted-social-ui.js';import{dom,flush}from'./helpers/dom.js';
const token='a'.repeat(64),origin='https://preview.example';
test('Share URL contains only opaque reference; auth redirect and auth error preserve it without copying credentials',()=>{
 const url=shareUrl(origin,token);assert.equal(url,origin+'/?s='+token);assert.equal(shareToken('../x'),null);assert.equal(pendingShare({search:'?s=invalid'}),null);assert.throws(()=>shareUrl(origin,'id'));assert.throws(()=>shareUrl('http://unsafe.example',token));
 assert.equal(authRedirect({origin,pathname:'/',search:'?s='+token+'&access_token=secret&user=hidden'}),url);assert.equal(authReturnError(url+'#error=expired').url,url);
 const intent=createShareIntent({search:'?s='+token});assert.equal(intent.ready(),true);intent.consume();assert.equal(intent.ready(),false);intent.reset();assert.equal(intent.token(),token);intent.clear();assert.equal(intent.ready(),false);
});
test('Share native sheet receives generic title and URL only; cancellation does not copy',async()=>{
 let sent;assert.equal(await shareContent(shareUrl(origin,token),{navigator:{share:async d=>sent=d}}),'shared');assert.deepEqual(sent,{title:'Soma — SPOTTED',url:origin+'/?s='+token});
 assert.equal(await shareContent(origin,{navigator:{share:async()=>{throw{name:'AbortError'};},clipboard:{writeText:()=>assert.fail('cancel must not copy')}}}),'cancelled');
});
test('Share desktop copies opaque link, unsupported native falls back, denied share never silently leaks',async()=>{
 let value;assert.equal(await shareContent(origin,{navigator:{clipboard:{writeText:async v=>value=v}}}),'copied');assert.equal(value,origin);assert.equal(await shareContent(origin,{navigator:{share:async()=>{throw{name:'NotSupportedError'};},clipboard:{writeText:async()=>{}}}}),'copied');await assert.rejects(shareContent(origin,{navigator:{share:async()=>{throw Error('denied');}}}));await assert.rejects(shareContent(origin,{navigator:{}}),/SHARE_COPY_UNAVAILABLE/);
});
test('Share SDK sends intent only to exact server endpoints',async()=>{
 const calls=[],api=createSpottedApi({rpc:async(n,args)=>{calls.push([n,args]);return{data:{}};}});await api.share.create('post','post');await api.share.resolve(token);assert.deepEqual(calls,[['spotted_share',{content_id:'post',content_kind:'post'}],['spotted_resolve_share',{reference:token}]]);
});
const row={id:'p',text:'Private post',likes:0,liked:false,comments:1,can_delete:false,romantic_content:false};
function fixture(){const ui=dom(),calls=[];let allowed=true;const target={available:true,place:'v',post:row,comment:{...row,id:'far-comment',text:'Target comment'}};const api={feed:async()=>({items:[row],more:false}),comments:async()=>({items:[],more:false}),share:{create:async(...args)=>{calls.push(args);return token;},resolve:async()=>allowed?target:{available:false}}};const c=mountSpotted({root:ui.get('root'),api,document:ui.document,origin,sharePlatform:{navigator:{clipboard:{writeText:async v=>calls.push(v)}}},schedule:()=>1,cancel:()=>{}});return{ui,c,api,calls,target,revoke:()=>allowed=false};}
test('Share secondary post/comment controls copy link and retain target through refresh, then clear on pause',async()=>{
 const f=fixture();await f.c.context('v');let button=f.ui.get('root').querySelector('.spotted-share');await button.onclick();assert.deepEqual(f.calls[0],['p','post']);assert.equal(f.calls[1],origin+'/?s='+token);
 await f.c.openShared(f.target,token);const target=f.ui.get('root').querySelector('.spotted-share-target');assert.equal(target.dataset.contentId,'far-comment');await target.querySelector('.spotted-share').onclick();assert.deepEqual(f.calls[2],['far-comment','comment']);await f.c.refresh();assert.equal(f.ui.get('root').querySelector('.spotted-share-target').dataset.contentId,'far-comment');f.c.pause();assert.equal(f.ui.get('root').querySelector('.spotted-share-target'),null);
});
test('Share authorization is rechecked before rendering target; revocation leaves neutral state with no stale body',async()=>{
 const f=fixture();await f.c.context('v');f.revoke();await f.c.openShared(f.target,token);assert.equal(f.ui.get('root').querySelector('.spotted-thread-body').children.length,0);assert.equal(f.ui.get('root').querySelector('.spotted-share-target'),null);assert.equal(f.ui.get('root').querySelector('.spotted-status').textContent,shareUnavailable);
});
test('Share public metadata stays generic and links use root query compatible with current service worker',async()=>{
 const html=await readFile('index.html','utf8');const meta=html.match(/<meta[^>]+>/g).join('');assert.doesNotMatch(meta,/author_id|user_id|parent_qod|spotted_share|Private post|Target comment/);const sw=await readFile('public/sw.js','utf8');assert.match(sw,/mode!=='navigate'/);assert.doesNotMatch(sw,/cache\.put|cache\.add\(event|caches\.put/);
});
test('Share slow preparation can retry native user activation without generating a second reference',async()=>{
 const ui=dom();let creates=0,taps=0;const c=mountSpotted({root:ui.get('host'),api:{feed:async()=>({items:[row],more:false}),share:{create:async()=>{creates++;return token;}}},document:ui.document,origin,sharePlatform:{navigator:{share:async()=>{if(++taps===1)throw{name:'NotAllowedError'};}}},schedule:()=>1,cancel:()=>{}});
 await c.context('v');const button=ui.get('host').querySelector('.spotted-share');await button.onclick();assert.match(ui.get('host').querySelector('.spotted-status').textContent,/Tocca di nuovo/);await button.onclick();assert.equal(taps,2);assert.equal(creates,1);assert.match(ui.get('host').querySelector('.spotted-status').textContent,/condiviso/);c.pause();
});
