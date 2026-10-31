import test from'node:test';import assert from'node:assert/strict';import{createOraSpotQuota}from'../src/ora-spot-quota.js';import{userMessage}from'../src/errors.js';
test('ORA061 CTA budget uses current Place server residual only; loading/error fail closed and clear invalidates stale read',async()=>{
 let resolve,events=0;const q=createOraSpotQuota({api:{budget:()=>new Promise(r=>resolve=r)},onChange:()=>events++});const loading=q.load();assert.equal(q.state.disabled,true);resolve({remaining:5,place_remaining:0});await loading;assert.equal(q.state.disabled,true);assert.equal(q.state.remaining,0);assert.match(q.state.label,/già usato/);
 const next=q.load();q.clear();resolve({remaining:0,place_remaining:0});await next;assert.equal(q.state.disabled,false);assert.equal(q.state.remaining,null);assert.equal(events,3);
 const available=createOraSpotQuota({api:{budget:async()=>({remaining:0,place_remaining:1})}});await available.load();assert.equal(available.state.disabled,false);assert.equal(available.state.remaining,1);
 const failure=createOraSpotQuota({api:{budget:async()=>{throw Error('SECRET');}}});await failure.load();assert.equal(failure.state.disabled,true);assert.ok(!failure.state.label.includes('SECRET'));
 assert.match(userMessage(Error('ORA_LOCATION_DAILY_QUOTA')),/3 location/);assert.match(userMessage(Error('SPOT_PLACE_QUOTA')),/lo Spot/);
});
