# Soma — Notifications MVP: collaudo staging

Data: 2026-10-22. Branch: `codex/soma-schema-v2-staging`.
Runtime versionato: `3f17ff1523cf98eb1b9c388cc6bac48518f3ae93`.

**NOTIFICATIONS MVP: BLOCKED**

Implementazione e verifiche server completate; gate browser non chiuso. Non è un GO alla delivery operativa. Nessuna push OS è stata osservata. Nessuna modifica a main o Production.

## A–D. Architettura, schema, Edge e segreti

Contratto: [Notifications MVP](soma-notifications-mvp-contract-2026-10-22.md). Le quattro decisioni founder sono state implementate: opt-in da PROFILO, Web Push/VAPID via Edge, binding account/device revocabili, singola richiesta ricevuta dentro SPOTTED senza inbox MATCH.

Migration 049 applicata e verificata sul solo `zjinjtkekmaqtxsuyvho`: quattro tabelle private, RLS, RPC distinte browser/service role, trigger downstream. Writer canonici, PHOTO, finestre e quote DD, Spot/Match non modificati. Edge `notifications` deployata dal codice versionato; `verify_jwt=false` per questa sola nuova funzione, come autorizzato. La verifica è nella funzione: prova device revocabile per check, Bearer dedicato per dispatch/prune, owner JWT per registrazione/resolver RPC.

Dopo il login CLI dell'owner, il primo controllo non mostrava i cinque nomi Notifications. Il caricamento autorizzato dal file ignorato ha poi completato il setup; verificati tutti e cinque i nomi senza leggere/stampare valori remoti. Le chiavi esposte nelle precedenti sessioni sono state sostituite dal materiale già rigenerato localmente, senza ulteriori rotazioni nel collaudo. Nessun altro nome secret è stato passato ai comandi di aggiornamento. Subject conservato. Origin Notifications allineata alla Preview aggiornata, come necessario dopo il rebuild con la nuova chiave pubblica.

File locale privato: `.local/notifications-mvp/staging-secrets.env`, ignorato da Git, permessi 0600. Nessun valore in report, evidenze o codice. Il build legge solo la chiave pubblica; una prova automatica verifica l'esclusione di variabili private dal processo Vite. Nessun service-role secret letto dal runner: solo credenziali sintetiche appena generate, normale Auth pubblico e CLI autenticata per SQL staging.

## E–G. Permission UX, lifecycle ed eventi

- Browser reale: CTA «Attiva notifiche» presente in PROFILO. Nessuna richiesta su caricamento/onboarding. App navigabile durante l'opt-in.
- Premuta la CTA sulla sola fixture. Nessun popup osservato dall'owner; nessuna subscription browser osservata. La richiesta è rimasta in attesa fino alla navigazione/reload. Non è prova di permission granted, subscription creata o push ricevuta.
- I test hosted delle subscription usano endpoint e chiavi **sintetici** validi come contratto, non vere registrazioni di un push service. Non sono stati inviati a servizi push esterni.
- Login password reale delle fixture, AGE, consenso, upload/canonicalizzazione, profilo e Membership Engine: PASS. Confirm email non modificato; identità di test preparate confermate singolarmente.
- Tre binding sintetici: due di A e uno di B. RLS nega lettura diretta; registrazione owner-bound e più device verificati via normali RPC/JWT.
- Durante il test DD soltanto A/B nella controlled allowlist; nessuna modifica a eligibility/preferenze degli account esistenti. Zero nuove exposure per utenti esterni alla coppia.

| Evento canonico | Evidenza hosted | Eventi logici |
| --- | --- | --- |
| DD effettivamente disponibile | Una coppia reciproca, fetch ripetuti, controllo admission prima del pairing | 2, uno per destinatario/finestra |
| Richiesta SPOTTED deliverable | Submit e retry; recipient resolver owner-only | 1 al destinatario |
| Nuovo Match unificato | Accept e retry della stessa richiesta | 2, uno per destinatario |
| Messaggio committato | Send con stesso nonce ripetuto | 1, soltanto al ricevente |
| Nuova richiesta soppressa per Match esistente | Risposta neutra, nessun evento aggiunto | 0 |

Nessun allocatore o writer alternativo. La generazione DD è stata sospesa al termine della fase isolata; nessuno scheduler è stato attivato.

## H–J. Dedupe, privacy, revoca e account switch

**PASS hosted:**

- Tentativo B di riassociare endpoint A senza il suo binding proof: rifiutato.
- Revoca da B della prova A: nessuna cancellazione del binding A.
- Resolver notifica di A richiesto con JWT B: `available:false`, anche se la coppia può avere un Match.
- Claim su database reale con lease, mantenendo delivery OFF al commit; nessuna chiamata trasporto verso endpoint fittizi.
- Edge check con prova valida di A: sola copy «Hai un nuovo match ❤️».
- Stesso evento con prova di B: `available:false`.
- Revoca owner della prova prima valida: binding eliminato; successivo check HTTP con la vecchia prova: `available:false`.
- Dispatch/prune senza secret e dispatch con secret errato: HTTP 401.
- Prova device invalida: risposta neutra senza contenuti.
- Dispatcher autenticato con delivery OFF: HTTP 200, tutti i contatori a zero; import e configurazione VAPID runtime eseguiti.

Rollback evento, retry, mittente escluso, endpoint scaduti, claim ripetuti, lease sbagliata, esito incerto e account-switch SW sono coperti anche dai test PostgreSQL/PGlite e VM del worker. Non confondere questi test con delivery OS o cambio account con una subscription browser realmente attiva: questi ultimi restano non verificati.

Outbox senza testo prodotto. Payload trasporto con soli riferimenti opachi. Tap sempre owner-authenticated e autorizzato nuovamente. Dati della fixture non inclusi nei payload push. Nessuna nuova inbox o modifica MATCH.

## K–M. Service worker, browser E2E e blocker

Il codice fetch/offline preesistente di `public/sw.js` non è stato riscritto; push handlers isolati in `notification-runtime.js`, senza caching di contenuti protetti. Test PWA caricati insieme agli handler reali: PASS.

**Defetto di configurazione Preview corretto:** il primo build non esportava al processo Vite le variabili lette dalla shell; la CTA risultava assente. Aggiunto `scripts/notifications-staging-build.mjs`: flag e chiave pubblica passati esplicitamente, variabili Notifications private escluse. CTA poi osservata nel browser. Nessuna modifica di semantica prodotto.

**Blocker browser riprodotto:**

1. Fixture A autenticata apre `/?n=<riferimento opaco Match>` nella Preview finale.
2. Compare la pagina statica «Sei offline».
3. Premendo il normale «Riprova» la stessa URL apre la chat unificata autorizzata, con l'unico messaggio sintetico previsto.
4. Da PROFILO, logout reale: il contenuto protetto scompare, ma il reload riproduce «Sei offline».
5. La stessa URL, interrogata tramite `vercel curl` autenticato, restituisce HTTP 200 e HTML Soma, non la pagina offline.

Quindi target e resolver non sono inesistenti, e non si tratta di una prova riuscita del percorso browser. Il fallback è raggiungibile dal catch della navigazione network-first; la ragione esatta del rifiuto rete nel contesto browser/worker non è stata catturata. Il contesto Vercel protetto può essere rilevante, ma **non è una root cause dimostrata**. Console senza errori utili. Non sono stati modificati worker navigation, protezioni Vercel, cache protette, main o Production per aggirarlo.

Un primo comando diagnostico CLI inoltrava erroneamente `--cwd` al curl nativo; la successiva esecuzione nella directory corretta ha prodotto il controllo HTTP 200 sopra. Questo errore di comando non spiega il fallback browser.

Evidenze locali ignorate, senza segreti: `.local/notifications-mvp/profile-cta.png`, `offline-tap.png`, `match-tap-retry.png`. La screenshot di chat contiene esclusivamente fixture sintetiche. Nessun link/codice Auth nei report.

**REAL DEVICE PUSH DEFERRED / NON VERIFICATO:** nessuna ricezione reale per DD, Match, richiesta o messaggio; nessun tap dalla notifica OS. Non emulare successo. La vista recipient SPOTTED è verificata da API owner-only e test DOM, non da un push ricevuto. La cadenza operativa dispatch/prune non è stata attivata: endpoint autenticato pronto, delivery operativa ancora OFF.

## Cleanup e incidente operativo del test

La query aggregata di ripristino DD è fallita nel runner. Il dettaglio originale non è stato conservato dal primo harness che sopprimeva output sensibili; non viene attribuita una causa SQL specifica senza prova. La revisione automatica ha bloccato la riesecuzione non ispezionata del file. Dopo lettura completa, i soli aggiornamenti di pausa sono stati eseguiti e verificati separatamente. Durante la finestra rimasta aperta la controlled allowlist conteneva soltanto le due fixture. Nessun pairing estraneo rilevato. Il harness registra ora solo codice/stato processo in caso di errore SQL, senza output privato.

Le due fixture sono state eliminate tramite il normale delete-account/PHOTO lifecycle. Rimossa la loro venue/catalog entry. Verifica finale:

| Stato | Risultato |
| --- | --- |
| Account / profili preesistenti | 4 / 4, invariati |
| Oggetti Storage | 42, invariati |
| Post preesistenti | 1, invariato |
| Hash profili e Storage completi | Uguali alla baseline |
| Fixture Auth, profili, membership, venue, oggetti | 0 |
| Subscription, eventi, delivery | 0 |
| Riferimenti foto correnti mancanti | 0 |
| Notifications enabled / delivery_enabled | OFF / OFF |
| Discovery / controlled admission | OFF / OFF |
| Jobs paused / retention paused | true / true |
| PHOTO cleanup / scheduler | OFF / OFF |
| PHOTO receipts tecniche fixture | 2, purged + settled, quota zero |

Nota diagnostica: è stato emesso per errore un frammento dello stato locale delle fixture contenente prove device sintetiche temporanee. Non conteneva VAPID private key o dispatch secret. Le subscription sono state revocate/rimosse, entrambi gli account eliminati e i file locali con credenziali/callback/prove delle fixture cancellati dopo il post-check. Nessuna prova sopravvissuta nel database o nei file di consegna.

Le due receipts tecniche minime seguono la retention PHOTO già approvata; nessuna foto o contenuto prodotto residuo. Non sono state purgate ad hoc per dichiarare zero metadata, né sono stati attivati job per farle sparire. Gli eventuali window record DD condivisi non sono stati eliminati per euristica; i dati personali delle fixture sono stati rimossi tramite cascade e restano le policy di retention DD esistenti. Nessuna nuova copia di foto originale.

## N–R. Test, build, Git e decisione

- **696/696 test PASS**, zero fail/skipped (672 baseline + 24 nuovi test).
- Build staging con Notifications esportate: PASS; typecheck: PASS.
- Test build esegue un processo Vite simulato per verificare flag pubblici/esclusione privati e rifiuto del ref Production; gli assert applicativi esistenti non sono stati rimossi.
- Report numerico sanitizzato: [staging-results.json](evidence/notifications-mvp/staging-results.json).
- Implementazione runtime pushata prima dei deploy: `3f17ff1523cf98eb1b9c388cc6bac48518f3ae93`. Il successivo commit di collaudo contiene harness/build tooling, evidenze e questo report, senza modifiche runtime aggiuntive.
- Preview finale: https://spot-pbhht3a4y-fedegrasso1994-1482.vercel.app/ — sola configurazione Supabase staging, con flag Notifications ON nel bundle e controllo server finale OFF. Deployment Protection invariata.
- Main baseline: `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`, nessun merge o deploy Production.
- Commit finale, push e working tree sono verificati nella consegna Git del task.

Passo successivo limitato: diagnosticare la navigazione/reload della stessa Preview protetta senza rewrite ciechi del worker; poi ripetere browser E2E e push su ambiente/dispositivo capace di completare il permesso. Non avviare analytics, nuove feature o rollout Production.

**NOTIFICATIONS MVP: BLOCKED**
