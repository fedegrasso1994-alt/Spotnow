import assert from'node:assert/strict';import{writeFile}from'node:fs/promises';import{login,fixtures}from'./client.mjs';
const results=[];for(let i=0;i<fixtures.length;i++){
 const a=await login(i);assert.ok(a.id.startsWith('fea41000-'));const p=await a.b.getProfile();assert.equal(p.id,a.id);assert.match(p.name,/^SYNTHETIC DD E2E [AB]$/);assert.equal((await a.dd.current()).status,'paused');
 try{await a.b.checkDeletion();await a.b.deleteAccount();const auth=await a.c.auth.getUser();assert.equal(auth.data.user,null);results.push({id:a.id,delete:'PASS',auth_unusable:true});console.log(`Fixture ${i+1} deleted normally`);}catch(e){results.push({id:a.id,delete:'BLOCKED',error:e.message});await writeFile('docs/evidence/dd-controlled-e2e/cleanup.json',JSON.stringify(results,null,2)+'\n');throw e;}
}await writeFile('docs/evidence/dd-controlled-e2e/cleanup.json',JSON.stringify(results,null,2)+'\n');
