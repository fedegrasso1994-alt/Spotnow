import{mkdir,writeFile}from'node:fs/promises';
await mkdir('tests/fixtures',{recursive:true});
await writeFile('tests/fixtures/spotted-auth.html',`<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Soma · login fixture staging</title><form><h1>Collaudo staging reale</h1><p>Solo account sintetici SPOTTED. Nessun mock.</p><label>Email fixture<input name="email" type="email" required autocomplete="off"></label><label>Password fixture<input name="password" type="password" required autocomplete="off"></label><button>Accedi alla vera app</button><p role="status"></p></form><script type="module">
import{createClient}from'@supabase/supabase-js';
if(!import.meta.env.DEV||new URL(import.meta.env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('STAGING_DEV_ONLY');
const client=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLIC_KEY),form=document.querySelector('form');
form.onsubmit=async e=>{e.preventDefault();const r=await client.auth.signInWithPassword({email:form.elements.email.value,password:form.elements.password.value});form.reset();if(r.error||r.data.user.user_metadata.synthetic_test!=='spotted-social-042'){await client.auth.signOut();document.querySelector('[role=status]').textContent='Fixture non valida';return;}location.assign('/');};
</script></html>`);
console.log('Prepared local DEV-only real staging login entry. No credentials included.');
