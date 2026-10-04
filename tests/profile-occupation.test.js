import test from 'node:test';import assert from 'node:assert/strict';
import {database,seed,ids,asUser,admin} from './helpers/database.js';
import {validProfile} from '../src/domain.js';
test('profession is optional and limited to 80 characters in profile validation',()=>{const p={name:'Alex',age:28,gender:'M',preference:'ALL',photo:'a/photo'};assert.equal(validProfile(p),true);assert.equal(validProfile({...p,occupation:'Architetto'}),true);assert.equal(validProfile({...p,occupation:'x'.repeat(81)}),false);});
test('profession round-trips only through authorized discovery and retains database length limit',async t=>{
 const db=await database();t.after(()=>db.close());await seed(db);
 await asUser(db,ids.a);await db.query(`update public.profiles set occupation='Medicina' where id='${ids.a}'`);await assert.rejects(db.query(`update public.profiles set occupation=repeat('x',81) where id='${ids.a}'`));await db.query(`select public.check_in('${ids.q}')`);
 await asUser(db,ids.b);await db.query(`select public.check_in('${ids.q}')`);
 const rows=(await db.query(`select * from public.location_people('${ids.v}',true)`)).rows;assert.equal(rows[0].occupation,'Medicina');
 await asUser(db,ids.c);await assert.rejects(db.query(`select * from public.location_people('${ids.v}',true)`));
 await admin(db);await db.query(`update public.checkins set checked_in_at=now()-interval '91 minutes',expires_at=now()-interval '1 minute' where user_id='${ids.a}'`);
 await asUser(db,ids.b);assert.equal((await db.query(`select * from public.location_people('${ids.v}',false)`)).rows[0].occupation,'Medicina');
});
