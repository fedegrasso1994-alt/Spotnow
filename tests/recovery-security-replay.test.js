import test from 'node:test';
import assert from 'node:assert/strict';
import {replayPlan} from '../scripts/recovery/security-replay.mjs';
const id='10000000-0000-4000-8000-000000000001';
const base=()=>({users:[{id,credential_digest:'stable',banned_until:null,deleted_at:null}],identities:[{user_id:id,digest:'identity'}],roles:[{user_id:id,role:'ADMIN',active:true}],consents:[{user_id:id,status:'active',revision:1}],holds:'h',suspensions:'s',moderation:'m'});
test('recovery reconciliation plans deletion and revocations, never promotes roles',()=>{
 const before=base(),after=base();after.users=[];after.identities=[];after.roles=[];after.consents=[];
 assert.deepEqual(replayPlan(before,after).actions,[{action:'account.delete',id}]);
 const revoked=base();revoked.roles[0].active=false;revoked.consents[0]={user_id:id,status:'revoked',revision:2};
 assert.deepEqual(replayPlan(before,revoked).actions.map(x=>x.action),['role.revoke','consent.revoke']);
 assert.deepEqual(replayPlan(before,before).actions,[]);
});
test('unreconciled credentials, identity, safety and role changes fail closed',()=>{
 for(const mutate of [x=>x.users[0].credential_digest='changed',x=>x.identities[0].digest='changed',x=>x.holds='changed',x=>x.suspensions='changed',x=>x.moderation='changed',x=>x.roles[0].role='MODERATOR']){
  const next=base();mutate(next);assert.throws(()=>replayPlan(base(),next),/REQUIRES_REVIEW/);
 }
});
