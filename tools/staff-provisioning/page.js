import{createClient}from'@supabase/supabase-js';
import{validateConfig,createStaffSetup,safeError}from'../staff-mfa/auth.js';
import{staffCanaryFetch,probe,phases}from'./canary.js';
const config=validateConfig(await(await fetch('/config.json',{cache:'no-store'})).json());
const $=id=>document.getElementById(id),contexts=new Map();let busy=false;
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:staffCanaryFetch(window.fetch.bind(window))}};
for(const a of config.accounts){const o=document.createElement('option');o.value=a.label;o.textContent=a.label+' — '+a.id;$('account').append(o);}
for(const phase of phases){const o=document.createElement('option');o.value=phase;o.textContent=phase;$('phase').append(o);}
const account=()=>config.accounts.find(a=>a.label===$('account').value);
const context=()=>{const c=contexts.get(account().label);if(!c)throw Error('LOGIN_REQUIRED');return c;};
async function action(fn){if(busy)return;busy=true;for(const e of document.querySelectorAll('button,select'))e.disabled=true;try{await fn();}catch(e){$('status').textContent=safeError(e)+' — STOP, comunica solo questo codice.';}finally{busy=false;for(const e of document.querySelectorAll('button,select'))e.disabled=false;}}
async function check(c,phase){
 const mode=['allowed','restored'].includes(phase)?'allowed':'denied';
 const result=await probe(c.client,c.role,mode);
 const evidence={role:c.role,phase,...result};
 const r=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evidence)});
 if(r.status!==201)throw Error('EVIDENCE_SAVE_FAILED');
 $('summary').textContent=JSON.stringify(evidence,null,2);
 if(!result.passed)throw Error('CANARY_CHECK_FAILED');
 $('status').textContent=c.role+' '+phase+': PASS';
}
$('login').onsubmit=e=>{e.preventDefault();void action(async()=>{
 const a=account();if(contexts.has(a.label))throw Error('LOGOUT_FIRST');
 const client=createClient(config.url,config.publicKey,options),setup=createStaffSetup(client,a.id);
 let state;try{state=await setup.login($('email').value,$('password').value);}finally{$('password').value='';}
 $('email').value='';if(state.aal!=='aal1'||!state.verified)throw Error('FRESH_AAL1_VERIFIED_FACTOR_REQUIRED');
 const c={client,setup,role:a.label};contexts.set(a.label,c);await check(c,'aal1');
 $('status').textContent='Login sul corretto UID; AAL1 negato. Inserisci il codice e premi Verifica MFA, poi Verifica accessi nella fase indicata.';
});};
$('verify').onsubmit=e=>{e.preventDefault();void action(async()=>{
 try{await context().setup.verify($('code').value.trim());}finally{$('code').value='';}
 $('status').textContent=account().label+': MFA AAL2 verificato. Esegui Verifica accessi nella fase indicata.';
});};
$('probe').onclick=()=>void action(()=>check(context(),$('phase').value));
const roleChange=(newRole,operation)=>void action(async()=>{
 const c=context();if(c.role!=='ADMIN')throw Error('ADMIN_REQUIRED');
 const target=config.accounts.find(a=>a.label==='MODERATOR');
 const r=await c.client.rpc('moderation_role_set',{target_user:target.id,new_role:newRole,operation_id:config.operations[operation]});
 if(r.error)throw Error('ROLE_GRANT_FAILED');
 $('status').textContent='MODERATOR: '+newRole+' RPC completata. Segui la fase canary indicata da Codex.';
});
$('grant').onclick=()=>roleChange('MODERATOR','moderatorGrant');
$('revoke').onclick=()=>roleChange('REVOKED','moderatorRevoke');
$('restore').onclick=()=>roleChange('MODERATOR','moderatorRestore');
$('logout').onclick=()=>void action(async()=>{
 const c=context();
 // Token remains exclusively in this browser closure for ONE stale-JWT read probe.
 // It is never sent to loopback, rendered, logged or persisted.
 const {data,error}=await c.client.auth.getSession();if(error||!data.session)throw Error('SESSION_REQUIRED');
 let token=data.session.access_token;
 const snapshot=createClient(config.url,config.publicKey,{...options,accessToken:async()=>token});
 await c.setup.logout();contexts.delete(c.role);
 try{await check({client:snapshot,role:c.role},'logout_stale');}finally{token=null;}
});
$('status').textContent='Solo staging. Nessun enrollment/reset. Le sessioni restano solo in memoria del browser. Segui la fase indicata da Codex.';
