import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUR, LIVE_WINDOW, livePresence, liveMatch, validProfile, visiblePeople } from '../src/domain.js';
test('matches remain available without messages until blocked',()=>{
 const match={createdAt:0,messages:[]};assert.equal(liveMatch(match,HOUR*1000),true);
 match.blocked=true;assert.equal(liveMatch(match),false);
});
test('live presence ends at exactly 90 minutes',()=>{
 assert.equal(livePresence(0,LIVE_WINDOW-1),true);assert.equal(livePresence(0,LIVE_WINDOW),false);assert.equal(livePresence(0,-1),false);
});
test('reject missing, fractional or underage age',()=>{
  for(const age of [0,17,18.5,NaN])assert.equal(validProfile({name:'Anna',photo:'data:image/png;base64,demo',age,gender:'F'}),false);
  assert.equal(validProfile({name:'Anna',photo:'data:image/png;base64,demo',age:18,gender:'F',preference:'ALL'}),true);
});
test('blocked profiles are excluded for every preference',()=>{
  const people=[{gender:'F',blocked:true},{gender:'M'},{gender:'F'}];
  assert.equal(visiblePeople(people,'ALL').length,2);assert.equal(visiblePeople(people,'F').length,1);
});

test('a photo is required to save a profile',()=>{assert.equal(validProfile({name:'Anna',age:24,gender:'F',photo:null}),false);});
