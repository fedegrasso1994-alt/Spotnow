import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from '../src/backend.js';

test('anonymous entry reuses a valid session instead of creating a new account',async()=>{
  let signups=0;
  const session={user:{id:'existing'}};
  const api=createBackend({auth:{getSession:async()=>({data:{session}}),signInAnonymously:async()=>{signups++;return {data:{session:{}}};}}});
  assert.equal(await api.enterAnonymously(),session);assert.equal(signups,0);
});
test('first entry creates an anonymous session and surfaces failures',async()=>{
  const session={user:{id:'anonymous',is_anonymous:true}};
  const api=createBackend({auth:{getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>({data:{session}})}});
  assert.equal(await api.enterAnonymously(),session);
  const unavailable=createBackend({auth:{getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>({error:new Error('Disabled')})}});
  await assert.rejects(unavailable.enterAnonymously(),/Disabled/);
});
test('Google attaches to the current account and does not call signInWithOAuth',async()=>{
  let input;
  const api=createBackend({auth:{getUser:async()=>({data:{user:{id:'anonymous'}}}),linkIdentity:async args=>{input=args;return {data:{url:'https://accounts.google.com/oauth'}};}}});
  await api.linkGoogle('https://spot.example/');
  assert.deepEqual(input,{provider:'google',options:{redirectTo:'https://spot.example/',skipBrowserRedirect:true}});
});
test('Google fails visibly if the provider returns no redirect URL',async()=>{
  const api=createBackend({auth:{getUser:async()=>({data:{user:{id:'anonymous'}}}),linkIdentity:async()=>({data:{}})}});
  await assert.rejects(api.linkGoogle('https://spot.example/'),/collegamento di accesso/);
});

test('renewal uses the QR RPC and never accepts client timestamps',async()=>{
  let call;
  const api=createBackend({rpc:async(name,args)=>{call={name,args};return {data:{expires_at:'server timestamp'}};}});
  await api.scanVenue('venue-token');
  assert.deepEqual(call,{name:'check_in',args:{qr_token:'venue-token'}});
});
test('OTP requires exactly one destination and forwards authentication failures',async()=>{
  let calls=0;
  const api=createBackend({auth:{signInWithOtp:async()=>{calls++;return {error:new Error('Invio non disponibile')};}}});
  await assert.rejects(api.requestCode({}),/email oppure telefono/);
  await assert.rejects(api.requestCode({email:'a@example.com',phone:'+390000000'}),/email oppure telefono/);
  assert.equal(calls,0);
  await assert.rejects(api.requestCode({email:'a@example.com'}),/Invio non disponibile/);
});
test('upload rejects unsupported/empty/oversized files before contacting the backend',async()=>{
  const api=createBackend({});
  for(const file of [{type:'image/svg+xml',size:12},{type:'image/png',size:0},{type:'image/jpeg',size:9*1024*1024}]) {
    await assert.rejects(api.uploadPhoto(file),/foto JPG, PNG o WebP/);
  }
});
test('save rejects unuploaded photos and does not write another user’s photo',async()=>{
  const api=createBackend({auth:{getUser:async()=>({data:{user:{id:'user-a'}}})}});
  const profile={name:'Anna',age:24,gender:'F',preference:'ALL'};
  await assert.rejects(api.saveProfile({...profile,photo:'data:image/png;base64,image'}),/Carica la foto/);
  await assert.rejects(api.saveProfile({...profile,photo:'user-b/photo.jpg'}),/Carica la foto/);
});
test('photo authorization failures do not return a URL',async()=>{
  const api=createBackend({storage:{from:()=>({createSignedUrl:async()=>({error:new Error('Accesso negato')})})}});
  await assert.rejects(api.photoUrl('user-b/photo.jpg'),/Accesso negato/);
});

test('standard Google sign-in uses the existing account flow and fails if URL is missing',async()=>{
 let input;
 const api=createBackend({auth:{signInWithOAuth:async args=>{input=args;return {data:{url:'https://accounts.google.com/oauth'}};}}});
 assert.equal((await api.googleLogin('https://spot.example/?venue=qr')).url,'https://accounts.google.com/oauth');
 assert.deepEqual(input,{provider:'google',options:{redirectTo:'https://spot.example/?venue=qr',skipBrowserRedirect:true}});
 const broken=createBackend({auth:{signInWithOAuth:async()=>({data:{}})}});await assert.rejects(broken.googleLogin('https://spot.example/'),/collegamento di accesso/);
});

test('private photo cache reduces polling requests and clears across sessions',async()=>{
 let requests=0,notify;const api=createBackend({auth:{onAuthStateChange:cb=>{notify=cb;return {data:{subscription:{}}};}},storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:`/photo-${++requests}`}})})}});
 api.onSessionChange(()=>{});assert.equal(await api.photoUrl('me/photo'),'/photo-1');assert.equal(await api.photoUrl('me/photo'),'/photo-1');notify('SIGNED_OUT',null);assert.equal(await api.photoUrl('me/photo'),'/photo-2');
});
