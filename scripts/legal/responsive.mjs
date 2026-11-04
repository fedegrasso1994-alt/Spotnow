// Local synthetic component QA only. No app login, service keys, remote mutations or provider calls.
import assert from 'node:assert/strict';
import {mkdir}from'node:fs/promises';
const {chromium}=await import(process.env.SOMA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});const output='/tmp/soma-m1-responsive';await mkdir(output,{recursive:true});
const results=[];
try{
 for(const width of[320,390]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/scripts/legal/responsive-fixture.html');await page.waitForFunction(()=>window.m1Ready);
  assert.equal(await page.locator('#legalContinue').isDisabled(),true);assert.equal(await page.locator('#privacy input').count(),2);assert.equal(await page.locator('#privacy #datingDeclaration').count(),0);
  await page.screenshot({path:output+'/'+width+'-legal.png',fullPage:true});
  const legalGeometry=await geometry(page,'#privacy');assert.ok(legalGeometry.scrollWidth<=legalGeometry.clientWidth+1);
  await page.evaluate(()=>window.m1QA.show('login'));const loginGeometry=await geometry(page,'#login');assert.ok(loginGeometry.scrollWidth<=loginGeometry.clientWidth+1);await page.locator('#login a[href="/legal/privacy-v1.1-staging.html"]').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/'+width+'-login.png',fullPage:true});await page.evaluate(()=>window.m1QA.show('privacy'));
  await page.locator('#adultDeclaration').check();assert.equal(await page.locator('#legalContinue').isDisabled(),true);await page.locator('#termsDeclaration').check();await page.locator('#legalContinue').click();
  await page.waitForSelector('#onboarding.active');assert.equal(await page.locator('#datingDeclaration').isChecked(),false);
  assert.equal(await page.locator('#prefOptions .selected').count(),0);assert.equal(await page.locator('.profile-consent label').evaluate(e=>getComputedStyle(e).display),'flex');
  await page.locator('#datingDeclaration').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/'+width+'-profile.png',fullPage:true});
  const profileGeometry=await geometry(page,'#onboarding');assert.ok(profileGeometry.scrollWidth<=profileGeometry.clientWidth+1);
  await page.locator('#datingDeclaration').check();await page.locator('#profileBtn').click();await page.waitForFunction(()=>document.getElementById('profileBtn').dataset.saved==='true');
  const calls=await page.evaluate(()=>window.m1QA.calls);assert.deepEqual(calls,['age','terms','consent']);assert.deepEqual(errors,[]);
  const button=await page.locator('#profileBtn').boundingBox();assert.ok(button.x>=0&&button.x+button.width<=width+1);assert.ok(button.y>=0&&button.y+button.height<=844+1);
  results.push({width,login:loginGeometry,legal:legalGeometry,profile:profileGeometry,ctaReachable:true,independentCalls:calls,pageErrors:errors});await page.close();
 }
 console.log(JSON.stringify({pass:true,scope:'local synthetic components, not hosted Auth/DB E2E',results,screenshots:output},null,2));
}finally{await browser.close();}
async function geometry(page,selector){return page.locator(selector).evaluate(e=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}));}
