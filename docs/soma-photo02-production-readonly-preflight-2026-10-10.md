# PHOTO-02 — nuovo preflight produzione READ-ONLY, 10 ottobre 2026

**GO tecnico al rollout controllato secondo la sequenza collaudata, con tutti i gate live sotto obbligatori. Rollout NON eseguito.** Nessuna modifica a dati, schema, RLS, funzioni, scheduler o frontend produzione; nessun merge main. Il preflight non congela lo stato: il drain deve essere verificato nuovamente dopo admission OFF e dentro la transazione della 017.

Riferimento codice: `ad27260be84e1f51d1b9f5678a4dd36422be5f29`, branch photo02-staging. Main remoto ancora `d80b113aabd6d304d92e5ff27b3f04147136ec2e`. Query in transazione `REPEATABLE READ READ ONLY`, timeout15s; supplemento `READ ONLY`; solo SELECT catalogo e dati aggregati. Sorgenti Edge letti dall'editor senza editarli o distribuirli. Nessun test upload/delete/cleanup eseguito sulla produzione.

## A–B. Produzione, writer e job

Snapshot del **10/10/2026 alle 09:28:11 Europe/Rome** (07:28:11 UTC):

| Voce | Stato |
|---|---:|
| Account Auth / profili / foto correnti | 1 / 1 / 1 |
| Foto validate / record asset | 1 / 1 |
| Oggetti Storage / byte | 3 / 368181 |
| Job ready | 1 |
| Job processing attivi / processing scaduti | 0 / 0 |
| Job failed / retry (attempts>1) | 0 / 0 |
| Massimo attempts osservato | 1 |
| Delete pendenti / foto validate non pubblicate | 0 / 0 |
| Foto legacy / originali o oggetti extra | 0 / 0 |
| Job che diventerebbero unknown al bootstrap | 0 |

Il job ready ha registry validato e tutte le tre copie previste nel catalogo: può essere acquisito come READY_CONFIRMED. Lo schema attuale è PHOTO-01 e **non ha ancora il ledger PHOTO-02**: pending/unknown/review non sono colonne/stati disponibili da interrogare oggi. Non risultano candidati incerti dai job PHOTO-01. Le richieste HTTP che non hanno ancora raggiunto admission DB non sono enumerabili da questa query; dopo bootstrap non possono superare il gate per iniziare scritture.

Ricontrollo finale alle **09:41:50 Europe/Rome**: conteggi, integrità e schema ancora identici al primo snapshot. Non emerge un ostacolo attuale a un drain pulito. Se tra questo snapshot e il cutover arriva un nuovo writer, il bootstrap lo cattura atomicamente oppure ne blocca l'admission; non lo si ignora sulla base del preflight precedente.

## C. Foto / Storage

Zero orfani, foto correnti mancanti, copie validate/asset mancanti, profili senza account/foto validata, asset senza registry, registry senza account o path job fuori owner. Zero mismatch canonical_bytes rispetto a metadata.size. Tutti i tre oggetti appartengono alle copie canonicali previste, MIME image/jpeg; nessun altro bucket contiene oggetti.

Bucket profile-photos privato, limite8MiB, RLS Storage ON, policy INSERT authenticated con WITH CHECK false: nessun raw upload end-user. Cache delle foto attuali max-age3600, invariata dal precedente preflight.

Verifica di integrità su catalogo Storage e registry: non sono stati scaricati byte delle foto reali. Il successivo smoke deve verificare oggetti/read effettivi usando fixture sintetiche, senza sostituire la foto dell'account corrente reale.

## D. Schema / collisioni / dipendenze

Confrontati bootstrap prepare.sql, 017, 018, 019 e scheduler.sql del commit ad27260: **74 dichiarazioni oggetto analizzate, zero collisioni inattese**. Rename intenzionali begin_photo_upload, finish_photo_upload e can_view_photo gestiti nell'ordine previsto; target photo01_* e wrapper before_review/before_cutover assenti. Nuovo trigger auth.users `photo_cutover_auth_deleted` non esiste; nomi indici cutover/lifecycle/review liberi. Nessun bootstrap, 017, 018 o019 già installato.

Funzioni e relative ACL, colonne, indici, constraint, trigger public/private, policy, RLS e bucket identici al precedente snapshot verificato PHOTO-01. Acquisiti anche220 record grant; ruoli anon/authenticated/service_role presenti. RPC begin_photo_upload service-only; RLS delle tabelle private ON. Il marker sorgente esatto richiesto dal bootstrap è presente, e il suo hash coincide con la baseline già collaudata.

PostgreSQL17.11; CREATE sul database disponibile al ruolo dell'editor. Vault installato; pg_cron e pg_net disponibili ma non installati, nessun cron.job. Questa assenza è prevista: il setup scheduler deve installare le estensioni nel rollout e partire OFF. Compatibilità effettiva del setup production/ref/credenziale va confermata con configure(false) prima di qualsiasi ON; errore => STOP, mai bypass.

## E. Runtime e cache/client vecchi

**5/5 Edge Functions** (photo-assets, delete-account e normalizer JPEG/PNG/WebP) hash identico ai sorgenti di produzione PHOTO-01 verificati. **20/20 artefatti pubblici Vercel** identici alla baseline main; nessun drift runtime pubblico trovato. Suite del riferimento eseguita di nuovo: **235/235 PASS**, build e typecheck PASS.

Il frontend compatibile cambia src/photo-contract.js (messaggio PAUSED) e src/photo-upload.js (restart di nonce scaduta una sola volta). È distribuibile prima del nuovo backend: payload/endpoints ordinari restano compatibili con016. Bootstrap safe-default OFF va installato **prima** di consentire l'uso del bridge; bridge016 registra intent/receipt ma non può aprire admission da solo.

Client vecchio in cache non sceglie il protocollo: lo sceglie l'Edge server. Vecchio runtime PHOTO-01 che tenta begin dopo bootstrap/019 viene bloccato dal DB, compresi retry ready; non crea un nuovo job o scrive Storage. Raw Storage INSERT è già negato e publication è protetta dal trigger. Il gate vale indipendentemente dall'aggiornamento degli asset frontend.

Il vecchio frontend tratta un codice PAUSED sconosciuto come errore UPLOAD comprensibile, preservando la foto precedente; il vecchio Edge converte un gate non riconosciuto in errore controllato. Bridge/runtime nuovo fornisce503 PAUSED, no-store e Retry-After30. Un client main ancora vecchio **non interpreta restart:true per una nonce scaduta**: può richiedere reload/riselezione del File; fallisce senza scrittura incoerente. Non viene promesso un retry automatico perfetto su ogni client in cache.

Asset Vite con hash e nuovi path foto UUID immutabili evitano reuse/collisioni. Cache60 per nuovi oggetti PHOTO-02; byte già consegnati con max-age3600 non sono revocabili. Nessuna normalizzazione legacy necessaria.

## F. Rollout finale — condizioni di ingresso, verifica, GO e STOP

Questa tabella è un piano futuro, non un elenco di operazioni già eseguite.

| Passaggio | Ingresso | Verifica | Procedere solo se | Fermarsi se |
|---|---|---|---|---|
| 1. Versionare/merge della release e frontend compatibile | Autorizzazione separata al rollout; artefatti ad27260, main ancoraPHOTO01 | Commit/versione, build/typecheck/test, diff soloPHOTO02, hash asset e payload su016 | Release identificata, frontend funziona con016 | Drift, test falliti, feature estranee o payload incompatibile |
| 2. Bootstrap prepare.sql | Schema016, nessun oggetto cutover già presente, marker/ACL corrispondenti | Transazione atomica con locktimeout5s, cattura job/delete e trigger, fase PAUSED/OFF | Bootstrap committato, nuove admission/pub/delete bloccate; corrente preservata | Lock timeout/deadlock: rollback intero e riprovare; source mismatch o cattura incompleta |
| 3. Bridge PHOTO01 | Bootstrap installato, schema016, admission OFF | Distribuire bridge COME photo-assets, stesso decoder/limiti; auth, rispostaPAUSED, intent/receipt su canary se riaperto | Vecchie e nuove richieste tracciate/fail-closed; nessuna apertura implicita | Runtime errato/missingRPC, scrittura senza attempt o corrente alterata |
| 4. Admission OFF / close | Bridge compatibile o bootstrap giàOFF | close→DRAINING; fence serializza begin/publication | Nessuna nuova admission legacy possibile | Writer avviato dopo fence o replace che aggira gate |
| 5. Drain/reconciliation | DRAINING, scheduler OFF | Inventario aggiornato; job processing, unknown, delete, missing/untracked; ricevute/effects terminali | Zero legacyunknown/inflight, nessun job non attribuito/delete pendente; assert_drained riesce | Writer incerto, orphan/missing, assenza di prova; oltre10min STOP operativo, non purge |
| 6. Migration017 | Drain verificato, admission OFF | assert_drained esclusivo dentro la stessa transazione; ledger/bootstrap e rename/ACL | Transazione completata, legacy_open impossibile | Assert/DDL fallisce; dopo commit mai ritorno al writerPHOTO01 |
| 7. Migration018 | 017 committata, OFF | Review wrapper, riserve/quota, privateRLS e ACL | Review protetta, nessun purge per età | Wrapper/ACL divergenti o nuova esposizione |
| 8. Migration019 | 017/018 coerenti, OFF | Marker PHOTO02, claim gate/scope, service-only, revoca helperlegacy | Vecchio begin negato, nuovo protocollo e delete wrapper disponibili | Legacy ammesso, gate incompleto, collisioni |
| 9. Edge PHOTO02 + scheduler configuratoOFF | 019 presente, admission OFF | Deploy photo-assets/delete-account/photo-lifecycle; codec invariati; scheduler.sql + configure(false), URL/ref/Vault/auth | Runtime/SQL allineati; cron ed execute entrambiOFF | Deploy/schema/auth incompleti o scheduler attivo prematuramente |
| 10. Canary/smoke | Allowlist sintetica, SHA release completo, nessun account reale usato | Checklist sotto; GC eventualmente scoped ai canary; prove upload/replace/delete, approve_smoke | Tutti gli smoke PASS, prove DB e attestazione operatore nella stessa epoch | Foto reale impattata, test fallito, writer non riconciliato o bug/quota/cache |
| 11. Admission ON | Smoke corrente approvato | open→OPEN; test nuovo upload e vecchioRPC negato; current/read protetti | PHOTO02 attivo, cleanup ancora scoped/OFF | Legacy riammesso o mutazioni incoerenti; pause completa |
| 12. Cleanup globale verificato | OPEN approvato, collector scope ancora canary | Dry-run globale read-only, anomalie/review/quote, prove terminali; execute_all esplicito, execute_on e run controllato | Nessun oggetto corrente/incerto eliminabile, claim/receipt coerenti | Candidato non attribuito, stato incerto, failed/pending inattesi; execute_off e review |
| 13. Scheduler ON per ultimo | Tutti gli step precedenti PASS; OPEN+smoke+execute_enabled | configure(true), cron attivo, risposta HTTP200 correlata al run, summaryfailed0, invarianti dati | Un run autentico completato e safe; monitoraggio previsto | Auth/ref/HTTP/cron errore, purge improprio, retry incontrollati; OFF immediato |

L'installazione del bootstrap in OFF è una pausa iniziale intenzionale: non si crea una finestra aperta tra cattura e bridge. Eventuale legacy_open temporaneo è ammesso soltanto su016 e con tracciamento completo; per il rollout attuale non serve dato lo stato quiescente osservato.

## G. Rollback finale

| Fase | Rollback operativo |
|---|---|
| Prima017, bootstrap non committato | Fallimento/contesa => rollback completo DB; nessuna migrazione successiva. |
| Prima017, bootstrap/bridge committati | OFF e preservazione degli attempt; compatibile016 ripristinabile con legacy_open dopo verifica dei writer. Nessun timeout usato come prova terminale. |
| Dopo017, prima/durante018/019 | OFF e schedulerOFF; preservare ledger/audit; correggere/completare schema e codicePHOTO02. Vietati writerPHOTO01 e downmigration distruttivi. |
| Dopo EdgePHOTO02, durante canary | pause completa, schedulerOFF, corrente preservata; redeploy di codicePHOTO02 compatibile, riconciliazione e nuovo canary/smoke prima OPEN. |
| Dopo admissionON | Problema cleanup: execute_off/configure(false), upload normali continuano. Problema upload/publication: pause completa, nuove mutazioni chiuse, smoke invalidato; fix e nuovo canary. Frontend vecchio compatibile può essere servito, il writer restaPHOTO02. |
| Dopo schedulerON | configure(false)/execute_off per fermare cron e nuove claim; le chiamate già partite possono terminare. Riconciliare e riesaminare dry-run; resume soltanto con epoch approvata oppure nuovo smoke dopo pausa completa. |

Nessun rollback deve cancellare prove o purgare writer incerti. Nessun ritorno al vecchio Edge writer dopo017, anche se il frontend è stato rollbackato o è in cache.

## Checklist smoke produzione futura

Usare account/foto/venue **sintetici marcati**, non l'account reale corrente. Catturare baseline pre/post; rimuovere fixture al termine secondo lifecycle senza alterare dati preesistenti.

- JPEG RGB8, PNG statico8bit non interlacciato e WebP statico validi: ready, tre copie canonicali, registry/asset/ledger coerenti, cache60, preview/detail/thumb leggibili.
- File invalido/corrotto e oltrelimite: errore previsto, nessuna publication o scrittura raw, precedente preservata. Retry valido e retry idempotente; nonce scaduta con frontend nuovo e comportamento controllato clientvecchio.
- Replace: vecchia leggibile prima di pubblicazione nuova; nuova current unica; vecchia retired con grace5min, protetta fino a finegrace; lettura concorrente e cleanup successivo.
- Profilo: immagine corrente/detail corretti; refresh/navigazione senza foto che spariscono.
- QR/check-in; Ora con persone attive e senza timestamp altrui; scadenza90min esclude solo live. Tribe/membership/foto continuano dopoexpiry.
- Spot reciproco, match unico, chat/send/back/reopen/read invariati.
- Delete account sintetico: upload in corso e retry/barrier; tutte copie/varianti/references eliminate, Auth assente e queuecompleted; seconda verifica idempotente.
- Quota128MiB e max2ready: prenotazioni concorrenti, rifiuto safe senza consumo infinito, nuovo upload normale dopo cleanup. Nessuna quota su reviewlegacyesenti attribuiti, nessuna esenzione arbitraria.
- Cleanup scoped poi globale: dry-run, current/unknown/review protetti; purge dopo grace, draft24h, doppio cleanup, retry/interruzione ripresi; metadata conclusi7d senza perdita di prove incerte.
- Scheduler: anon/usernegati, server/ref verificati, OFF non esegueclaim, ON solo dopo smoke; cron+HTTP200 e workerfailed0; OFF ferma nuove claim, restart sicuro e nessuna modifica baseline.
- Check finale: nessun orphan/missing/pending non spiegato, current reale invariata, report aggregato/log minimi, nessuna fixture permanente.

## H–I. Rischi residui e GO

Nessun blocker tecnico osservato nello stato attuale. **GO al rollout controllato** del commit collaudato, non alla riapertura indiscriminata: ogni gate GO/STOP sopra è obbligatorio e prevale sul presente GO se lo stato cambia.

Rischi/limiti: snapshot non blocca richieste future; richieste non ancora ammesse non enumerabili; locktimeout5s e budgetdrain10min sono limiti operativi, non autorizzazioni purge; prove manuali dipendono dagli operatori service-role; cache già consegnata3600s non revocabile; vecchi client possono richiedere reload/riselezione per nonce scaduta; catalogo verificato senza download foto reali; auth/setup scheduler di produzione e smoke mutanti restano da verificare durante il rollout, con schedulerOFF finché PASS. Nessuno di questi controlli futuri è stato falsamente dichiarato eseguito ora.

Solo documentazione prodotta da questo task. Produzione e main invariati; nessuna migration, deploy, dato scritto, merge o normalizzazione.
