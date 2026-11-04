import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {completeLegalGate,legalGateRequired,operationIds} from '../src/legal-onboarding.js';
import {LEGAL_DOCUMENTS} from '../src/legal-document-data.js';
import {createPrivacyControls,createPrivacyApi} from '../src/privacy-phase1.js';
import {createProfileConsent} from '../src/profile-consent.js';
import {dom,deferred} from './helpers/dom.js';
import {legalDocuments} from '../scripts/legal/documents.mjs';
import {authRedirect} from '../src/auth-preview.js';
const state=()=>({age_status:'eligible',terms_status:'accepted',required_terms_version:LEGAL_DOCUMENTS.terms.version,required_terms_hash:LEGAL_DOCUMENTS.terms.sha256,terms_url:LEGAL_DOCUMENTS.terms.url,consent_status:'missing',required_version:'dating-profile-1.1-staging',consent_revision:0,consent_text:'Exact specific consent'});
function profileDom(){const ui=dom(),field=ui.document.createElement('div');field.append(ui.get('prefOptions'));return ui;}
test('M1 document projection preserves complete user body/hash, excludes internal annexes, and SQL pins the served Terms',async()=>{
 const docs=await legalDocuments(),sql=await readFile('supabase/migrations/063_legal_onboarding_m1.sql','utf8');
 for(const [kind,{text,...descriptor}]of Object.entries(docs)){
  assert.deepEqual(LEGAL_DOCUMENTS[kind],descriptor);const html=await readFile('public'+descriptor.url,'utf8');
  const extracted=html.split('<pre id="legal-text">')[1].split('</pre>')[0].replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
  assert.equal(extracted,text);assert.doesNotMatch(extracted,/SOMA-SOURCE-SEGMENT|Nota redazionale|Checklist pre-pilot|Privacy Policy v1.1: checklist/);assert.match(html,/pilot non autorizzato/);
 }
 assert.ok(sql.includes(docs.terms.sha256));assert.ok(sql.includes(docs.terms.version));
 const copy=await readFile('docs/legal/03_ONBOARDING_LEGAL_COPY.md','utf8');const consent=copy.slice(copy.indexOf('Acconsento esplicitamente al trattamento')).split('\n\n')[0].split(/\s+/).join(' ').trim();assert.ok(sql.includes(consent.replaceAll("'","''")));
});
test('M1 partial commit/lost response retry keeps separate stable operations and never repeats a valid age/Terms proof',async()=>{
 let s={...state(),age_status:'confirmation_required',terms_status:'required'},age=0,terms=0,lost=true;const operations=operationIds(),seen=[];
 const backend={privacyState:async()=>s,attestAdultCheckbox:async(_,op)=>{seen.push(op);age++;s={...s,age_status:'eligible'};},acceptTerms:async(_,yes,op)=>{assert.equal(yes,true);seen.push(op);terms++;if(lost){lost=false;throw Error('network');}s={...s,terms_status:'accepted'};}};
 const displayed={...s};await assert.rejects(completeLegalGate(backend,displayed,{adult:true,terms:true,operations}),/network/);
 await completeLegalGate(backend,s,{adult:false,terms:true,operations});assert.equal(age,1);assert.equal(terms,2);assert.equal(seen[1],seen[2]);
 await completeLegalGate(backend,s,{adult:false,terms:false,operations});assert.equal(terms,2);
});
test('M1 unknown/changed Terms and account switch fail closed before further proof writes',async()=>{
 assert.equal(legalGateRequired(null),true);assert.equal(legalGateRequired(state()),false);
 let writes=0;const backend={privacyState:async()=>({...state(),required_terms_hash:'changed'}),acceptTerms:async()=>writes++};
 await assert.rejects(completeLegalGate(backend,state(),{operations:operationIds()}),/VERSION_CHANGED/);assert.equal(writes,0);
 const q=deferred();let current=true;const p=completeLegalGate({privacyState:()=>q.promise},state(),{operations:operationIds(),current:()=>current});current=false;q.resolve(state());await assert.rejects(p,/ACCOUNT_CHANGED/);
});
test('M1 profile consent is unchecked, near preferences, explicit, version-aware and absent from legal gate',async()=>{
 const ui=profileDom();let s=state(),accepted=0;const backend={privacyState:async()=>s,consentChallenge:async()=>({token:'synthetic',version:s.required_version,text:s.consent_text}),acceptConsent:async()=>{accepted++;s={...s,consent_status:'active',consent_revision:1};return s;}};
 const control=createProfileConsent({backend,document:ui.document});control.update(s);const input=control.section.querySelector('input');assert.equal(input.checked,false);
 await assert.rejects(control.prepareSave('M'),/scelta esplicita/);assert.equal(accepted,0);
 input.checked=true;await control.prepareSave('M');assert.equal(accepted,1);await control.prepareSave('M');assert.equal(accepted,1);
 s={...state(),consent_status:'revoked'};control.update(s);assert.equal(input.checked,false);await assert.rejects(control.prepareSave('M'),/scelta esplicita/);
 await control.prepareSave(null,{existingProfile:true});assert.equal(accepted,1);await assert.rejects(control.prepareSave(null),/scelta esplicita/);
 input.checked=true;s={...s,consent_text:'Changed text'};await assert.rejects(control.prepareSave('M'),/testo del consenso è cambiato/);assert.equal(input.checked,false);
});
test('M1 profile stale account continuation cannot accept consent; missing Terms cannot advance',async()=>{
 const ui=profileDom(),q=deferred();let calls=0;const c=createProfileConsent({document:ui.document,backend:{privacyState:()=>q.promise,acceptConsent:async()=>calls++}});c.update(state());c.section.querySelector('input').checked=true;
 const p=c.prepareSave('F');c.reset();q.resolve(state());await assert.rejects(p,/ACCOUNT_CHANGED/);assert.equal(calls,0);
 const blocked=createProfileConsent({document:ui.document,backend:{privacyState:async()=>({...state(),terms_status:'required'})}});blocked.update(state());await assert.rejects(blocked.prepareSave('F'),/18\+ e Termini/);
});
test('M1 consent retry uses same operation after uncertain result; changed challenge never submits',async()=>{
 const ui=profileDom(),seen=[];let lost=true;const s=state();const c=createProfileConsent({document:ui.document,backend:{privacyState:async()=>s,consentChallenge:async()=>({token:'c',version:s.required_version,text:s.consent_text}),acceptConsent:async(_,op)=>{seen.push(op);if(lost){lost=false;throw Error('network');}return {...s,consent_status:'active'};}}});
 c.update(s);c.section.querySelector('input').checked=true;await assert.rejects(c.prepareSave('M'),/network/);await c.prepareSave('M');assert.equal(seen.length,2);assert.equal(seen[0],seen[1]);
 const other=createProfileConsent({document:ui.document,backend:{privacyState:async()=>s,consentChallenge:async()=>({token:'c',version:'other',text:s.consent_text}),acceptConsent:async()=>assert.fail('must not accept')}});other.update(s);other.section.querySelector('input').checked=true;await assert.rejects(other.prepareSave('M'),/cambiato/);
});
test('M1 gate reset rejects stale response and API never accepts actor/timestamp injection',async()=>{
 const ui=dom(),q=deferred(),control=createPrivacyControls({document:ui.document,backend:{privacyState:()=>q.promise},onContinue:async()=>{}});
 const p=control.refresh();control.reset();q.resolve(state());assert.equal(await p,null);assert.equal(control.state,null);
 const calls=[],api=createPrivacyApi({rpc:async(n,a)=>{calls.push({n,a});return{data:{}};}});await api.acceptTerms(state(),true,'operation');assert.deepEqual(Object.keys(calls[0].a).sort(),['accepted','expected_hash','expected_version','operation_id']);
});
test('M1 preserves QR/Share callback context and does not introduce pre-auth consent storage',async()=>{
 const location={origin:'https://preview.example',pathname:'/',search:'?s='+'a'.repeat(64)};const url=new URL(authRedirect(location,'synthetic-qr'));assert.equal(url.searchParams.get('venue'),'synthetic-qr');assert.equal(url.searchParams.get('s'),'a'.repeat(64));
 const source=await readFile('src/live.js','utf8');assert.ok(source.includes('if(legalGateRequired(ps))'));assert.ok(source.includes('profileConsent.prepareSave'));assert.ok(source.includes('privacy?.reset();profileConsent?.reset()'));assert.doesNotMatch(source,/!profile\)\{[^\n]*consent_status!==/);
});
