# RIGHTS-01 — implementation candidate and staging checks

**PARTIAL / NO-GO alla chiusura finale e a produzione.** Requisiti ricevuti troncati, chiarimento founder PHOTO metadata ancora pendente; niente finale “pilot-ready”. Non riaperti PHOTO-01/02. Nessun deploy frontend/Edge produzione, nessun merge main, nessun provider nuovo o dati reali.

## Implementato

024 `my_rights_page` owner-only, staging-only,15sezioni allowlist, keyset1–100, niente target owner/SQL arbitrario o raw private row. Restricted/suspended/revoked access consent-independent. JSON e presentazione titoli italiani in modulo `src/user-rights.js`, API facade senza service role, UI solo flag staging nel pannello Età/consenso. Export RAM/Blob senza copie server, limiti10k record/8MiB, loop/account switch/cancel guards; URL rilasciato a chiusura/cambio sessione. Foto: metadati, non bytes nel JSON.

Cancellazione endpoint, Edge, PHOTO ledger/queue/quota/grace/decoder/limiti/scheduler **invariati**: riuso del percorso già collaudato, non doppio sistema di delete. Safety023 invariata: soli held report reason/status categorici separati, nessun dettaglio/private chat/foto/preference copiato. Retention/legal durata da validare; nessuna durata approvata tacitamente.

## Test automatici

Baseline privacy257; **264/264 PASS**, build/typecheck/release check PASS.7nuovi test RIGHTS:5 suite iniziali authorization/minimization/keyset101rows/restricted-delete/guards e2 export size/account switch/Blob release. Le suite PHOTO-01/02/privacy/social/moderation/onboarding/delete sono incluse, senza modificarle. PGlite prova SQL/grants/FK, non concorrenza multi-connessione o Auth JWT provider. Non si sostiene nuovo upload/replace/delete con bytes reali sul cloud.

Prima esecuzione ha trovato un riferimento inesistente profile.created_at; corretto a updated_at. Typecheck ha trovato default destructuring signal/callback incompatibili; corretti. Nessun errore irrisolto nei controlli finali.

## Postgres staging reale

Console **Soma Staging zjinjtkekmaqtxsuyvho**, prod non aperta. Pre-check: privacy_environment staging,3Auth/3profili/39oggetti foto, zero unknown inattesi;024 assente. Applicata024, successo. Nessuna nuova tabella/storage/Edge o modifica dati prodotto.

`tests/staging/rights-fixtures.sql`: due fixture `example.invalid` create dentro transazione, role authenticated/anon e auth.uid server controllati, owner A vs B boundary, restricted, revoked, sezione forbidden, page_size101, anon denied. Secondo collaudo aggiunge delete restricted/revoked attraverso **canary transazionale fixture-scoped** → photo02 begin → claim → prepare → Auth SQLdelete → finish; proof cascade e access dopo delete denied. Nessun commit di fixture o gate: **ROLLBACK**, zero fixture residue. Non è collaudo HTTP/JWT Auth API né rimozione bytes tramite Storage API: fixture non ha foto/profilo pubblicato, pertanto nessun nuovo oggetto permanente.

Baseline finale:3Auth/3profili/39oggetti, missing_current0, unknown inattesi0, review preesistenti3, phase PHOTO PAUSED e retention paused=true. Nessuna nuova fixture residua. Baseline account/foto/job non modificata. Nessun purge review, nessun cleanup/scheduler attivato persistentemente.024 resta installata in staging; function contract verificato, candidate versionata. Supabase migration history gestita via SQL editor in questo task: registrazione automatica CLI history non rivendicata.

## Browser locale sintetico

UI componente RIGHTS, backend stub dichiarato, nessun account/email reale: pannello, visualizzazione proprie sezioni, prepare JSON e link esplicito “Salva il file JSON” visibili. Collettore e Blob contenuto/revoca testati automaticamente.

**Limite browser:** l'automazione in-app non ha restituito l'evento/file del download Blob (timeout); anche verifica alternativa del link non ha consentito ispezione file. Non segnato PASS download reale. Usato link esplicito invece di avvio automatico dopo rete; rimane necessario test download Chrome/Android/Safari/iPhone con sessione sintetica staging. Nessuna prova di malfunzionamento globale dedotta dal limite dell'automazione. Fixture HTML ignorata e rimossa; screenshot sintetico locale disponibile, non dati personali.

## Probe HTTP e impedimento al collaudo autenticato

`2026-10-11`: il resolver OS del runner (`dns.lookup`) restituisce ENOTFOUND per il solo host staging; `dns.resolve4` risolve lo stesso hostname. Supabase.com/GitHub risolvono normalmente. Il probe HTTPS con lookup DNS diretto, **senza cambiare hostname, TLS o provider**, verifica Auth health HTTP200 e RPC senza sessione HTTP401/code42501. Non è un workaround applicativo né una modifica infrastrutturale.

Tentativo di creazione sessione anonima sintetica: Auth restituisce `anonymous_provider_disabled`. **Zero account creati**, zero upload, zero cambi gate. Le impostazioni Auth non sono state cambiate. La revisione automatica ha rifiutato l'apertura della pagina API keys staging per rischio di esposizione dei segreti amministrativi; nessun segreto amministrativo letto o percorso alternativo privilegiato usato. Serve predisposizione manuale di due sessioni sintetiche oppure autorizzazione esplicita all'accesso amministrativo del solo staging prima di quel collaudo. Non inviare credenziali in chat.

`scripts/rights-staging-smoke.mjs probe`: riproducibile e read-only, allowlist esatta staging, public key dal file locale già esistente, nessuna chiave amministrativa. Modalità `smoke`/`cleanup` preparate, **NON ESEGUITE**: richiedono un manifest locale privato con due sessioni sintetiche (`rights_fixture:true`) predisposte e, per delete, canary PHOTO02 limitato a quei due owner. Il runner non crea account, non apre admission, non configura Auth, non deploya. Non usarlo su utenti reali. `smoke` attende fixture restricted/revoked e testa 15 sezioni, owner boundary e guards; `cleanup` usa solo il normale endpoint, richiede marker e identity corrispondenti e prova accesso negato dopo delete. Non dimostra ancora rimozione bytes Storage o flussi core cloud.

Il risultato HTTP positivo senza JWT **non sostituisce** la prova con JWT né il download su dispositivo. Restano NO-GO produzione/chiusura completa.

## Aperture prima di GO finale

1. Ricevere seguito del task dopo “internal security”. Implementazione limitata ai requisiti disponibili, non assume fasi/test assenti.
2. Decisione founder su7d receipt metadata PHOTO dopo delete vs solo safety hold; nessuna modifica di lifecycle senza conferma e compatibilità provata.
3. Validazione professionale di contenuto access/export, esclusioni motivate, context received messages, report details, safety/manual evidence, provider copie, backup delete, durata/hold/review e procedure di risposta. [EDPB access guidelines](https://www.edpb.europa.eu/documents/guideline/guidelines-012022-on-data-subject-rights-right-of-access_en). Tabelle private ≠ esclusioni legali automatiche.
4. Export photo bytes sicuro e controllo di tutte le copie provider non implementati da questo JSON; procedura manuale completa non ancora collaudata.
5. Collaudo HTTP con sessioni sintetiche PostgREST/Edge, Auth delete/session revoke/retry e Storage bytes/varianti/quote/residui; export su device/download reale; export concurrent change e snapshot semantics da accettare/provare su connessioni reali.
6. Rollout staging frontend flag ancora non pubblicato: UI locale testata separatamente da Postgres reale. In app reale usare VITE_PRIVACY_PHASE1 + VITE_RIGHTS_PHASE1 e solo URL staging; default false. Nessuna autorizzazione a prod.

Rollback candidato: flag OFF e revoca/drop solaRPC024, senza perdita dati; non toccare001–023 o PHOTO. Cleanup degli artefatti test temporanei completato; evidenza sintetica minimale/versionata. No nuova feature Bacheca/Cupido.

## File di questo task

- `supabase/migrations/024_user_rights.sql`
- `src/user-rights.js`
- `src/backend.js` (facade rights opzionale)
- `src/supabase-client.js` (flag staging)
- `src/privacy-phase1.js` (hook controlli)
- `.env.example` (flag default false)
- `tests/user-rights.test.js`
- `tests/staging/rights-fixtures.sql`
- `scripts/rights-staging-smoke.mjs` (probe read-only passato; smoke autenticato pendente)
- `docs/soma-rights01-inventory-design-2026-10-11.md`
- questo report e JSON evidence omonimo.

Working branch `codex/rights-01-staging`, base `ef964a5`; privacy dependencies già versionate. PROVIDER e INCIDENT non mergiati nel branch, né in main. Documento e codice sono candidate, non dichiarazione di conformità o chiusura RIGHTS-01.

GitHub: commit feature `6c33c58` e report iniziale `355e659` sul branch dedicato; contenuti locali/remoti allineati. `main` e `origin/main` restano `d0f515e`. Nessun merge o deploy produzione.

## Tentativo autenticato autorizzato — 2026-10-11

La nuova autorizzazione consente **solo due fixture temporanee tramite flussi Auth normali**, con credenziali esclusivamente nel contesto del test. Esclude lettura di API keys amministrative, service-role secret, credenziali reali e accesso amministrativo generalizzato. La precedente alternativa di accesso alle API keys **non è autorizzata e non viene riproposta**.

Preflight read-only del normale endpoint `/auth/v1/settings`, usando la configurazione pubblica già impiegata dal client staging, HTTP200:

- signup abilitato;
- unico provider abilitato: email;
- conferma email obbligatoria (`mailer_autoconfirm=false`);
- anonymous/Google non abilitati.

Con indirizzi sintetici non confermabili non si ottiene una sessione: non viene avviato signup, per evitare Auth record incompleti che non potrebbero effettuare login/delete tramite il flusso richiesto. **Zero account creati; zero credenziali generate/salvate; zero foto caricate; nessun cambio Auth, DB, gate, deployment, main o produzione.** Non utilizzati account, caselle o dati personali reali. Non letto alcun segreto amministrativo. Il resolver/TLS resta come documentato nel probe precedente.

`scripts/rights-staging-smoke.mjs auth-preflight` rende riproducibile il controllo non mutante. Il collaudo JWT non viene dichiarato PASS sulla base di unit test o SQL con auth.uid simulato.

| Verifica richiesta | Esito di questo tentativo |
| --- | --- |
| 1 Login A | NON ESEGUITO: manca un flusso fixture confermabile |
| 2 Accesso dati A | NON ESEGUITO con JWT reale |
| 3 A tenta dati B | NON ESEGUITO con JWT reale; test automatici separati già passati |
| 4–6 Export JSON, categorie, esclusione segreti/dati B | NON ESEGUITO con dati fixture cloud |
| 7 Export con foto propria | NON ESEGUITO; candidate attuale include metadata, non bytes foto |
| 8 Download reale | PENDENTE; precedente test componente non equivale a download autenticato |
| 9 Retry/idempotenza | NON ESEGUITO con sessioni fixture cloud |
| 10 Restricted | NON ESEGUITO con JWT reale |
| 11 Revoca consenso | NON ESEGUITO con JWT reale |
| 12 Delete A | NON ESEGUITO; non esiste una nuova fixture da cancellare |
| 13 Auth/profile/consent/age/foto/social/retention/quota/cache/derived | NON ESEGUITO post-delete cloud; nessuna nuova scrittura da questo tentativo |

Prerequisito minimo richiesto al founder: predisporre conferma email per le fixture, ad esempio modificando **personalmente** e temporaneamente l'impostazione di conferma del solo staging (con successivo ripristino), oppure usando due caselle dedicate esclusivamente ai test. Nessun nuovo provider viene scelto/integrato, nessuna credenziale va inviata in chat/repository/report. Una volta sbloccato Auth, il test foto/delete richiede anche la normale finestra canary staging limitata ai soli owner sintetici, senza apertura globale né scheduler/cleanup globale. Non usare eccezioni Auth/RLS, JWT forgiati, SQL per creare identities o accessi service-role per sostituire il normale login.

**BLOCKED / NO-GO alla chiusura del collaudo autenticato.** Non è un finding di vulnerabilità RIGHTS: è un prerequisito Auth del test ancora non disponibile. Non equivale a GO al pilot o alla produzione. Il messaggio ricevuto termina inoltre al punto14 (“verifica che”); le verifiche1–13 sono mappate, nessun seguito viene inventato.
