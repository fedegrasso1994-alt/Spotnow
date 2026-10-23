/** Local-only security diagnostic. Uses disposable PGlite; never connects to staging. */
import{qodDatabase,ids,asUser,admin,call}from'../tests/helpers/qod-database.js';import{post}from'../tests/helpers/romantic-database.js';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
let close;const d=await qodDatabase({after:fn=>{close=fn;}});try{
 await asUser(d,ids.b);const p=await post(d,'Synthetic anonymous post for correlation audit');await admin(d);
 for(const peer of[ids.b,ids.c])await d.query('insert into matches(user_a,user_b,venue_id)values($1,$2,$3)on conflict(user_a,user_b)do nothing',[ids.a,peer,ids.v]);
 await asUser(d,ids.a);const feed=await call(d,'spotted_feed($1)',[ids.v]),row=feed.items.find(x=>x.id===p);assert.ok(row);assert.ok(!JSON.stringify(row).includes(ids.b));
 const before=(await d.query('select *from my_matches_page()')).rows;assert.ok(before.some(x=>x.person_id===ids.b));assert.ok(before.some(x=>x.person_id===ids.c));
 // Existing explicit-profile block is used ONLY to show the effects a global
 // anonymous-author block would inherit. No anonymous RPC or workaround built.
 await call(d,'block_profile($1)',[ids.b]);const after=(await d.query('select *from my_matches_page()')).rows;
 const result={environment:'disposable local PostgreSQL/PGlite',staging_writes:false,proposal_implemented:false,anonymous_payload_has_author_id:false,known_matches_before:before.length,known_matches_after:after.length,exact_author_match_disappears:!after.some(x=>x.person_id===ids.b),other_match_stays:after.some(x=>x.person_id===ids.c),risk:'Applying existing global profile-block effects to an anonymous author deterministically reveals that author via named Match disappearance.'};
 assert.equal(result.exact_author_match_disappears,true);assert.equal(result.other_match_stays,true);await writeFile('docs/evidence/moderation-finalization/correlation-risk.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await close();}
