# PHOTO-02 — barriera di cutover e scheduler, staging 2026-10-09

**GO a un nuovo preflight produzione read-only.** Questo risultato non autorizza il rollout. Produzione non modificata; nessun merge su main. Branch `photo02-staging`. Main rimane `d80b113aabd6d304d92e5ff27b3f04147136ec2e`.

Implementazione al commit `c59c49a2b7032e23f6877d49f203c1eceee4d715`. Runtime Edge del canary proveniente dal commit `a16e0e4d1d7165668d1c833bf354e8b67e7ee3cb`: upload/delete/collector identici anche nel successivo commit, che modifica diagnostica temporanea, retention dei registri e test. Hash degli artefatti nel report JSON. I decoder e migration 016 non sono cambiati. Il nuovo testo PAUSED è l'unica modifica frontend; nessun CSS, layout o flusso social modificato.

## A–B. Design e implementazione della barriera

`supabase/cutover/prepare.sql` è un bootstrap separato da applicare **prima della 017**, mentre lo schema è ancora 016. Installazione atomica: lock exclusive delle tabelle di admission/publication/delete prima della cattura di job e writer; lock timeout 5s. Se c'è contesa o deadlock, fallisce/si ripete l'intera transazione; nessuno snapshot parziale.

Controllo privato con RLS, RPC operative service-only, stati LEGACY_OPEN, DRAINING, SCHEMA_LOCKED, CANARY, OPEN e PAUSED. Fence SQL condiviso/esclusivo serializza nuove admission e checkpoint del cutover. Tracciati tentativi immutabili, manifest, lease, ricevute e cancellazioni account; indipendenti dalla cascade Auth. Pausa di nuovi upload, replace/publication e inizio delete; foto corrente leggibile, normali aggiornamenti con lo stesso photo_path consentiti.

Un writer PHOTO-01 già ammesso può terminare durante il drain pre-017. Failed/lease scaduta/assenza di file non sono prova terminale. `photo_cutover_assert_drained()` vieta 017 con legacy incerti, job processing, job non attribuiti, cancellazioni incomplete, copie validate mancanti o oggetti non attribuiti. Budget operativo drain 10 minuti: scaduto il budget si interrompe la transizione e si preservano gli stati, senza purge.

Bridge compatibile 016 (`photo-assets-bridge`, da distribuire COME photo-assets durante la fase bridge) registra intent/receipt senza cambiare decoder o limiti. Dopo 017 non è riapribile; le RPC legacy non hanno il marker server PHOTO02 e restano bloccate anche dopo admission OPEN.

Migration 017 aggiunge assert_drained e trasferisce soltanto prove terminali corrispondenti alla stessa lease. 018 resta invariata. **Nuova 019**: protocolli service-only, gate delle claim, canary, collector execute permit, isolamento background del canary, retention dei registri conclusi e revoca della vecchia RPC scheduler staging. Controllo dello scope prima del LIMIT e su ogni claim; OPEN riapre gli upload ma non espande implicitamente il cleanup a tutti. `execute_all` richiede smoke approvato e revisione operativa del dry-run globale. Delete account ammesso in OPEN non dipende da questo scope background.

Canary max 8 account Auth esplicitamente sintetici, release SHA completo. La riapertura richiede prova DB di upload terminale, replace pubblicato e cancellazione account completata, più attestazione dell'operatore sullo smoke completo. Questa attestazione è un confine di fiducia service-role, non una firma crittografica personale o un controllo automatico di ogni ricevuta esterna.

## C. Cache e client vecchi

Non si assume un aggiornamento immediato del frontend. Il payload upload resta compatibile e il protocollo è scelto dal server, non da un header client. Gli asset Vite sono versionati; i nuovi path foto UUID sono immutabili. Vecchi client possono usare il nuovo endpoint e fare retry; un vecchio runtime che chiama le RPC legacy viene rifiutato dal DB. Nessun fallback a raw Storage.

Risposta upload in pausa: HTTP 503, codice PAUSED, no-store e Retry-After 30. Il frontend nuovo mostra un messaggio comprensibile; quello già in cache usa la gestione errore esistente senza perdere la foto corrente. Pixel già in cache con max-age 3600 non possono essere richiamati: la barriera protegge le scritture, non revoca retroattivamente quei byte. Dopo cutover i nuovi oggetti mantengono cache60 e path immutabili.

## D. Scheduler production-ready

`supabase/cutover/scheduler.sql` usa pg_cron/pg_net, verifica service_role e project ref dei claims autenticati; URL e nomi distinti staging/production, credenziale server esistente in Vault. Setup/configure idempotente; OFF iniziale, nessuna finestra ON visibile tra creazione cron e disattivazione nello stesso commit DB.

ON solo in OPEN con smoke approvato nella stessa epoch ed execute enabled. OFF disattiva cron **e** nuove claim del collector; la pausa completa chiude anche admission e invalida lo smoke. Le claim ricontrollano il fence; chiamate Storage/HTTP già in corso possono finire e non sono richiamabili. Stato/epoch/contatori di drain via RPC privata, cron.job_run_details, risposta pg_net e log worker aggregati senza contenuti foto/chat.

La prova reale ha registrato cron succeeded, HTTP 200, completed=2, failed=0, missing=0, untracked=0, review_total=3. Il test attende la risposta asincrona nella finestra di attivazione: i conteggi di pg_net temporanei non sono monotoni e non sono prova durevole. Screenshot/estratti privati locali documentano il run; report pubblico solo aggregati.

## E. Test e risultati

**235/235 test PASS**, di cui **12** dedicati al cutover. Build e typecheck PASS. Testano: richiesta pre-barriera; nuovo upload/replace bloccato e corrente preservata; vecchio writer incerto blocca 017 anche con lease scaduta; receipt senza job concluso non basta; errore bridge terminale senza write; interruzione pre/post017; client/RPC legacy dopo OPEN; retry nuovo protocollo; canary/permessi/smoke obbligatorio; collector OFF; scheduler auth/ref/OFF/ON/pausa; isolamento canary dopo OPEN; retention7d dei registri conclusi con preservazione corrente/incerta.

PostgreSQL Supabase reale, schemi di laboratorio isolati: 001–016 → bootstrap → vecchio writer ammesso → close/drain bloccato → finish durante drain → 017/018/019 → vecchio writer e rollback legacy negati → canary PHOTO02 ammesso. Il catalogo Storage del laboratorio è sintetico: non si presenta questa prova come un vecchio Edge worker fisico in produzione. Anche la retention7d dei registri conclusi è stata verificata sul PostgreSQL reale del laboratorio, mantenendo il writer incerto; schemi temporanei rimossi.

Edge/Auth/Storage reali dello staging con soli due canary sintetici: upload JPEG valido, replace, corrupt/retry, pausa e preservazione vecchia/current, QR, Ora senza timestamp altrui, Tribe dopo expiry, Spot reciproco, match, chat e delete completo. Cron autentico elimina il set precedente dopo grace sintetica scaduta, mantiene corrente; OFF restituisce 503 al collector, mentre upload/replace e delete account normali continuano. Due account, una venue e 12 oggetti foto creati dal test eliminati. Controlli SQL temporanei rimossi. I registri tecnici conclusi seguono retention7d, non cancellazione anticipata della prova.

Baseline prima/dopo: **3 Auth, 3 profili, 39 Storage objects**, fingerprint Auth/profili/Storage identici. **3 review writer preesistenti** preservati; classificati EXISTING, mai dichiarati terminali o purgati. Stato finale OPEN, smoke approvato, execute OFF, scheduler OFF, cleanup_all false; zero legacy unknown/inflight e zero delete pending. I canary eliminati rimangono nello scope inerte finché un futuro operatore esegue l'espansione esplicita; nessuna mutazione della baseline.

Anomalie di collaudo corrette: prima attesa cron confrontava un conteggio pg_net non monotono; corretta alla finestra temporale con attesa risposta. L'inventario scoped iniziale aveva riammesso review: rilevato dai test prima di attivare il collector, esclusione ripristinata. Prima pulizia venue usava una colonna id inesistente in checkins: query fallita senza cancellazioni, corretta a user_id. Nessun errore/OOM del decoder o perdita foto osservati nel canary finale.

## F. Sequenza esatta del futuro rollout (non eseguito)

1. Nuovo preflight read-only: snapshot inventory/references/job/active deletes, schema/source fingerprint, ACL, dipendenze pg_cron/pg_net/Vault, eventuali collisioni bootstrap/019. Release versionata e artefatti verificati.
2. Frontend compatibile con errore PAUSED (nessun cambio payload). Installare bootstrap prepare.sql su016: **safe default admission OFF**, prima di qualsiasi attivazione del bridge. Se conteso, abort/retry tutto il bootstrap.
3. Distribuire bridge compatibile016 COME photo-assets; vecchio delete resta legacy durante questa fase. Eventuale LEGACY_OPEN solo prima017, se operativamente necessario e tutti i nuovi tentativi sono tracciati. L'inizio in OFF è intenzionale e più conservativo; mai distribuire PHOTO02 contro016 aperta.
4. close → DRAINING; aspettare e verificare ricevute/effects/deletions. `assert_drained` deve riuscire, nessun writer non classificato. Superamento budget10min significa STOP, non purge.
5. Migration017 col suo assert/fence nel medesimo commit; 018; 019. Admission OFF, scheduler OFF. Verificare schema/RLS/RPC; non far partire collector.
6. Edge/backend PHOTO02: photo-assets, delete-account, photo-lifecycle. Decoder PHOTO01 invariati. Vecchi runtime/RPC restano fail-closed. Configurare scheduler false: nessuna attivazione implicita.
7. Canary sintetico su release SHA; upload/replace/error-retry/read/delete e QR/Ora/Tribe/Spot/match/chat. Eventuale collector solo sui canary, gate per claim. Approve smoke dopo prove reali, poi OPEN (PHOTO02 soltanto).
8. Dry-run globale e verifica delle eventuali review; espansione esplicita execute_all soltanto se approvata; execute_on. Scheduler ON **per ultimo**, con una risposta HTTP riuscita e controllo post-run delle invarianti. Eliminare fixture temporanee; conservare report aggregato.

## G. Rollback per fase

| Fase | Azione sicura |
|---|---|
| Bootstrap fallito/conteso | rollback transazione completo; non applicare017; baseline016 preservata. |
| Bootstrap/bridge, prima017 | admission OFF e drain; per ripristinare servizio, legacy_open solo contro016 compatibile, dopo valutazione writer. Stati incerti preservati. |
| 017 committata, 018/019 o deploy falliti | admission OFF e scheduler OFF; applicare fix/continuare verso codice PHOTO02 compatibile. **Nessun ritorno al writer PHOTO01, nessun downmigration distruttivo.** |
| Canary fallito | pause, registrare prove e riconciliare; corrente preservata; nuovo smoke obbligatorio prima riapertura. |
| OPEN, problema collector | execute_off/configure(false): nessuna nuova claim; admission resta disponibile; riesame e riattivazione con la stessa epoch approvata se non si è fatta pause completa. |
| OPEN, problema upload/publication | pause completa: chiude nuove mutazioni, scheduler OFF, invalida smoke; codice PHOTO02 compatibile + nuova verifica canary prima OPEN. |

## H. Rischi e decisione

GO al **nuovo preflight read-only**. Il GO rollout non è ancora emesso: va verificato il nuovo bootstrap/019 contro lo stato produzione corrente, in particolare writer storici e source marker usati dall'iniezione dei gate. Qualunque conflitto o writer non dimostrato terminale mantiene NO-GO al cutover.

Restano confini operativi espliciti: pausa temporanea upload/replace e inizio delete durante cutover; cache già consegnata non revocabile; timeout non risolve writer incerti; operatori service-role attestano le prove; OFF non richiama chiamate già avviate. Le tre review appartengono soltanto alla baseline staging e non sono un'autorizzazione a ignorare eventuali review produzione.

Nessun nuovo provider, decoder, modifica PHOTO01, rollout produzione o merge main. Tutte le modifiche e questi report sono versionati su photo02-staging; i file privati con credenziali/UUID delle fixture e i dump diagnostici restano ignorati.

## File del task

- `docs/soma-photo02-cutover-staging-2026-10-09.json`
- `docs/soma-photo02-cutover-staging-2026-10-09.md`
- `scripts/bundle-photo-edge.mjs`
- `scripts/photo-cutover-lab.mjs`
- `scripts/photo-cutover-staging-smoke.mjs`
- `src/photo-contract.js`
- `supabase/cutover/README.md`
- `supabase/cutover/prepare.sql`
- `supabase/cutover/scheduler.sql`
- `supabase/functions/_shared/photo-cutover.js`
- `supabase/functions/_shared/photo-lifecycle.js`
- `supabase/functions/_shared/photo-upload.js`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/photo-assets-bridge/index.ts`
- `supabase/migrations/017_photo_lifecycle.sql`
- `supabase/migrations/019_photo_cutover.sql`
- `tests/account-deletion.test.js`
- `tests/adversarial-database.test.js`
- `tests/helpers/database.js`
- `tests/load-scaling.test.js`
- `tests/photo-authority.test.js`
- `tests/photo-cutover.test.js`
- `tests/photo-lifecycle.test.js`
- `tests/photo-review.test.js`
- `tests/staging/photo-cutover-fixtures-teardown.sql`
- `tests/staging/photo-cutover-fixtures.sql`
- `tests/tribe-database.test.js`
