# PHOTO-02 — preflight produzione esclusivamente read-only

9 ottobre 2026. Progetto `qlucwdjcjomwyziegxrn`. Snapshot principale alle 08:48:37 UTC (10:48:37 Europe/Rome); verifiche successive nella stessa sessione.

**NO-GO al rollout produzione con gli artefatti attuali.** Il GO tecnico del lifecycle in staging resta valido. I dati e le dipendenze schema sono compatibili; mancano una barriera di cutover che escluda i vecchi writer e un setup scheduler production dedicato, versionato e collaudato. Applicare semplicemente 017/018 e poi aggiornare le Edge Functions introdurrebbe una finestra incompatibile.

Nessuna migration applicata, nessun dato/account/foto modificato, nessun deploy, nessuna RPC mutante chiamata. Query dati/schema eseguite in transazioni READ ONLY; inventario principale REPEATABLE READ. Non chiamati `scan_photo_lifecycle`, claim, reconciliation, setup cron o dry-run di delete account. Sorgenti Edge copiati in sola lettura dal dashboard; artefatti web letti con GET. Nessuna foto reale scaricata o copiata: la verifica dei riferimenti riguarda il catalogo Storage; il controllo fisico end-to-end delle foto è nella checklist post-rollout.

## A. Stato della produzione

| Misura | Risultato |
|---|---:|
| Account Auth / profili / foto correnti | 1 / 1 / 1 |
| Oggetti `profile-photos` / bytes catalogo | 3 / 368.181 |
| validated / assets | 1 / 1 |
| Legacy da normalizzare | 0 |
| Upload job | 1, stato ready |
| Processing attivi / candidati writer PRE017 incerti | 0 / 0 |
| Account in cancellazione | 0 |
| Oggetti non referenziati | 0 |
| Canonicali correnti / varianti registrate / assets mancanti | 0 / 0 / 0 |
| Profili/validated/job senza account | 0 / 0 / 0 |
| Ready job senza validation / assets senza validated | 0 / 0 |
| Validated non pubblicati | 0 |
| Path job non coerenti con owner | 0 |
| Canonical bytes diversi dal catalogo Storage | 0 |

Bootstrap previsto 017: un set current/settled con request/lease del job ready; nessun set incerto PRE017, nessun draft non pubblicato. La prenotazione iniziale conservativa 9 MiB non deve essere confusa con i 368.181 byte fisici del catalogo e resta ampiamente sotto quota 128 MiB. I dati correnti non richiedono cleanup o esenzione sintetica. Ricontrollare tutto subito prima di un futuro cutover: questo inventario è uno snapshot, non blocca gli utenti.

Cache metadata degli oggetti attuali: `max-age=3600`. Nuovi upload PHOTO-02 usano 60s; deploy/scheduler non cambiano retroattivamente header o cache dei tre oggetti attuali. Nessuna promessa di revoca entro 60s delle copie già ricevute.

## B. Compatibilità schema e runtime

### Schema

Functions/ACL, policies, columns, RLS e bucket sono identici alla baseline PHOTO-01 production verificata e versionata. RLS Storage ON e bucket privato. Tabelle 017/018 assenti. Nessuna collisione non prevista rilevata nei nomi nuovi di tabelle, indici, trigger e RPC. I tre nomi già esistenti `public.begin_photo_upload`, `public.finish_photo_upload`, `spot_private.can_view_photo` sono rinominati deliberatamente dalla 017; i target `photo01_*` risultano liberi. Liberi anche i target helper rename della 018.

017 conserva le dipendenze 016: registro validated, publication/attach triggers, assets, Auth e Storage. I helper PHOTO-01 rinominati sono revocati ai client/service e invocati solo dai wrapper definer. La policy Storage viene esplicitamente riassociata al nuovo can_view_photo. Il trigger di publication e i lock proteggono anche gli upsert dei client vecchi. 018 aggiunge review/audit e wrapper service-only; nessun dato peer, nuova policy permissiva o schema pubblico di profilo/social.

La verifica è catalogo/fingerprint + applicazione locale su fixture sintetiche e precedente collaudo reale staging; **non** una prova DDL nella produzione, neppure con rollback. Nuovi lock/contesa vanno rivalutati al cutover. Ogni file migration ha la propria transazione: se 018 fallisce, 017 può già essere committed e va lasciata in stato sicuro con scritture sospese.

`supabase_vault` installato. `pg_cron` e `pg_net` disponibili ma non installati; `cron.job` assente. Nessuno scheduler PHOTO-02 è attivo o configurato. Non abilitate estensioni o create risorse in questo task.

### Runtime — incompatibilità dimostrata

I sorgenti **attualmente deployati**, ricopiati dal dashboard, coincidono byte per byte con la baseline PHOTO-01:

- photo-assets SHA-256 `82bd8bdcf6eef9b34880b2514c091007f23b940698cbb802f22726eac9df3376`;
- delete-account SHA-256 `aa8dc6800f14e480b19c6e5a35cf3241af934b283a0ba1ef74d2f40dc4a79f71`.

Anche 20/20 artefatti pubblici della produzione coincidono con la precedente build verificata di main. Il branch PHOTO-02 non cambia decoder/limiti 016; il nuovo frontend ha solamente il rinnovo nonce una tantum per PHOTO_EXPIRED.

**R-01: vecchio upload + nuovo schema.** Il vecchio Edge chiama `begin_photo_upload`, scrive direttamente i tre oggetti e chiama `finish_photo_upload`. Non chiama `photo02_begin_photo_upload`, non registra intent/manifest né ricevuta terminale. Dopo 017, finish richiede writer settled: riproduzione locale con soli dati sintetici restituisce PHOTO_LEASE e lascia writing/unknown, manifest/evidence null. Spegnere il collector non risolve questa incompatibilità e l'expiry del lease non è prova terminale.

**R-02: nuovo upload/delete + vecchio schema.** Nuovi Edge dipendono dalle RPC 017/018. Deployarli prima dello schema senza una pausa controllata produce RPC mancanti e fallimenti; non è una modalità backward-safe automatica.

**R-03: vecchio delete + nuove queue.** Il vecchio delete non usa claim/finish della cleanup queue, non verifica la conclusione del ledger e non coordina la cancellazione con il nuovo worker. Può lasciare una queue pending dopo aver cancellato Auth. Non mantenerlo operativo insieme al collector: suspendere nuove deletion e drenare quelle in corso prima delle migration. A scheduler OFF manca anche il recupero automatico di quella queue: non equivale a conclusione verificata.

**R-04: frontend/PWA vecchi.** Payload e risposte di successo restano compatibili. Il vecchio client non gestisce restart=true dopo draft/replay scaduti: può richiedere ricaricamento/nuova selezione. Distribuire l'adapter nuovo prima del cutover è compatibile con 016; non assumere che tutte le tab/PWA aperte siano aggiornate. Un upgrade frontend non elimina i vecchi worker server.

**R-05: scheduler production mancante.** `supabase/staging/017_photo_lifecycle_scheduler.sql` contiene guard, URL, nome job e secret staging; rifiuta production. Non rinominarlo/adattarlo manualmente durante il rollout e non mergiarlo come migration eseguibile production. Manca un artefatto production separato con autenticazione Vault, partenza OFF, dry-run e procedura pausa/ripresa provati.

Non esiste nell'attuale codice un flag di rollout che chiuda in modo server-authoritative i nuovi begin/upload/delete e impedisca alle versioni legacy di riprendere dopo la riapertura. Nessun ordine delle sole 017/018/tre Edge rende atomiche le installazioni tra DB e runtime. Prima implementare e collaudare una piccola barriera PHOTO-02 di cutover/versione; non serve cambiare decoder, limiti o grafica PHOTO-01. La sua eventuale modifica SQL/API va proposta e versionata separatamente, non inventata al deploy.

## C. Ordine esatto consigliato — dopo la chiusura dei blocker

1. **Preparazione versionata/staging:** barriera server per admission upload + begin delete, esclusione dei writer legacy dopo cutover, pausa compatibile con 016 e con 017/018, setup scheduler production a partenza OFF. Rehearsal incluse tab/worker vecchi, write tardive, interruzione fra migration e rollback. Bloccare il rollout se questi artefatti/test mancano.
2. **Release provenance:** revisioni definitive su photo02-staging, test/build/typecheck, backup definizioni/config esistenti (senza foto reali nel repository), merge dei soli task PHOTO-02 e documentazione su main. Auto-deploy Vercel del frontend da main deve essere pianificato: non confonderlo con l'aggiornamento delle Edge Functions. Decoder rimangono deployati invariati.
3. **Frontend compatibile, se auto-deploy main:** distribuire il solo adapter di rinnovo nonce con env production, prima del nuovo schema. Verificare 016 ancora funzionante. Nuove sessioni aggiornate; tab vecchie considerate nel collaudo. Il frontend non è un gate di sicurezza.
4. **Chiudere admission lato server:** attivare barriera verificata per nuovi upload/delete e lasciare concludere gli attempt PHOTO-01 già ammessi. I read Profilo/Ora/Tribe e social possono continuare. Non basarsi sul fatto che il solo frontend sia chiuso o che nessuno stia apparentemente usando l'app.
5. **Drenare e ricontrollare:** zero nuove admission, zero deletion in-flight, nessun job processing/failed incerto, tutte le scritture ammesse con ricevute terminali verificate, nessun oggetto/riferimento nuovo non attribuito. Logs/request/job e fence server coerenti. Timeout/lease scaduto/assenza oggetti non bastano. Se emerge un writer incerto: fermare e review, non forzare settled. Lo snapshot oggi pulito non sostituisce questo checkpoint.
6. **017**, nella sua transazione, sotto barriera: ricontrollare bootstrap current/settled, ownership, RLS/ACL, publication guard e oggetti. Scheduler ancora assente/OFF. Non ammettere writer legacy dopo il commit.
7. **018**, nella sua transazione: controllare review/audit/privilegi, blocco della RPC legacy per review e quote. In produzione nessuna eccezione ai normali writer reali basata sulle fixture staging. Scheduler ancora OFF.
8. **Edge/backend**, sempre a admission chiusa: deployare esclusivamente photo-assets PHOTO-02, delete-account PHOTO-02 e photo-lifecycle finale, dai bundle generati con la revisione fissata. Non deployare normalize-jpeg/png/webp né modificare secret/auth PHOTO-01. Verificare digest/config e tutte le dipendenze RPC prima di aprire mutation.
9. **Scheduler preparation OFF:** configurare pg_cron/pg_net, invocazione authenticated con credenziale server esistente in Vault senza plaintext in SQL/log/Git, URL production, job disabled. Test negative auth e dry-run read-only del collector. Il suo alternate-token check resta una verifica service-only, mai un semplice decode del ruolo JWT.
10. **Riapertura canary protetta:** admission solo al protocollo nuovo e agli account sintetici del smoke; tutto il resto ancora chiuso. Eseguire checklist seguente e controllare catalogo/ledger/Storage. Se la futura barriera non supporta canary verificato, mantenerla chiusa finché il piano equivalente viene provato in staging.
11. **Cleanup controllato** su fixture: una/due esecuzioni esplicite, risultati e idempotenza; zero rimozioni fuori manifest sintetico. Dry-run di tutti i candidati reali, review di qualsiasi residuo; nessun purge massivo automatico al primo avvio.
12. **Aprire admission PHOTO-02** agli utenti, mantenendo esclusione legacy. **Scheduler execute ON soltanto dopo** smoke, dry-run, collector manuale riuscito, rollback pause provato e owner operativo presente. Verificare esecuzione reale/risposta HTTP/claim ed evitare retry sovrapposti. Controllare log, pending/review/anomalie/quota. Il cron SUCCESS di invio HTTP non equivale al cleanup riuscito.

La barriera non è implementata in questo task. È una dipendenza esplicita dei passi 4–12. Non raccomando un rollout senza pausa delle mutation con gli attuali artefatti.

## D. Rollback reale per fase

| Fase | Arresto/rollback sicuro |
|---|---|
| Prima delle migration | Fermare scheduler (comunque non presente), bloccare nuove admission, drenare richieste. Con schema 016 ancora integro e nessun worker PHOTO-02 attivo, si può ripristinare il gate/Edge baseline verificati e riaprire PHOTO-01. |
| Frontend adapter | Può essere ripristinato sullo schema 016; dopo 017 meglio conservare il nuovo adapter. Un rollback Vercel non modifica DB, Edge o cache/tab già aperte. |
| 017 fallisce | La transazione 017 rollbacka; confrontare definizioni con backup e verificare 016 prima di riaprire. Non assumere successo dal solo pannello che ha inviato SQL. |
| 017 committed, 018 fallisce | 018 rollbacka; conservare 017 e admission chiusa. Correggere/reapplicare 018 verificata. **Non** ripristinare photo-assets PHOTO-01 contro 017, né aprire le scritture. Letture correnti preservate. |
| Edge deploy parziale/fallito | Admission chiusa, cron OFF. Conservare schema/ledger. Ridistribuire bundle PHOTO-02 compatibili o tenere i soli endpoint mutanti in pausa. Il vecchio delete/upload non è il rollback dopo 017. |
| Smoke/canary fallisce | Stop admission + execute, conservare manifest/lease/audit/queue. Chiudere fixture con prove terminali e retry ordinari; review di stati incerti, nessun timeout-purge. |
| Scheduler/cleanup anomalo | Disabilitare cron e invocazioni execute, osservare/lasciare terminare claim già avviati; OFF non annulla una HTTP o Storage richiesta in corso. Reconcile e fence, nessun purge di review. Upload normali possono proseguire solo se ledger/quota/publication risultano coerenti; altrimenti admission chiusa. |
| Oggetto già purgato | Pausa non ripristina il file. Nessun rollback del codice può ricrearlo; non purgare foto correnti. Ogni eventuale recovery provider è separato e non assunto disponibile in questo preflight. |

Non DROP delle tabelle/colonne, non cancellare audit/tombstone/unknown, non resettare quote per riaprire artificiosamente upload. Le nuove funzionalità di pausa/versione devono essere provate prima del GO, altrimenti questi rollback non sono concretamente eseguibili.

## E. Checklist minima post-rollout — preparata, NON eseguita ora

Usare solo account/foto sintetici distinti, con manifest dei loro ID/path privato. Nessun seed o cleanup di utenti reali.

- [ ] JPEG RGB8, PNG8 statico non interlacciato, WebP statico validi: ready, tre file presenti e manifest/hash/coerenza SQL; originale mai persistito; limiti PHOTO-01 invariati.
- [ ] Input oltre 8 MiB, limiti pixel, file corrotto/patologico: rifiuto safe, nessuna pubblicazione, retry valido riuscito; no unknown artificiosamente settled.
- [ ] Replace: precedente disponibile fino al commit della nuova; nuova current, vecchia retired con grace 5 min; query concorrenti non pubblicano purging/retired.
- [ ] Profilo/Ora/Tribe leggono foto corrente e HD/thumbnail; refresh/navigation e signed URL non recuperano set ritirato come nuovo URL. Cache già ricevute considerate separatamente.
- [ ] Spot, reciproco match, apertura chat e messaggio bidirezionale su due fixture; eventuali check-in sintetici usano QR e preservano 90 minuti.
- [ ] Delete account con set current/draft/retired, retry parziale e risposta persa: Auth/profilo/social e tutte le copie Storage rimossi, queue completed, ledger purged, success solo dopo verifica; secondo cleanup no-op.
- [ ] Due upload concorrenti: BUSY bounded senza doppie scritture; publication/replace/delete races e writer incerto rispettano fence, quota e review.
- [ ] Quota: 128 MiB incluse prenotazioni, massimo due draft ready; verifica concorrente su fixture, nessuna esenzione a nuovi writer unknown. Non fabbricare quota o cambiare account reali.
- [ ] Grace 5 min e draft 24h: inizialmente clock reale o fixture-only controllo staging; in produzione non introdurre helper ad ampio accesso per abbreviare i timer. Smoke rapido può verificare not_before; conclusione del timer va verificata prima di dichiarare il rispettivo purge reale riuscito.
- [ ] Cleanup: dry-run prima di execute; una esecuzione autorizzata solo sui candidati fixture verificati, doppia esecuzione idempotente; current mai eliminata, unknown/review mai purgati per età.
- [ ] Metadata tecnici conclusi 7 giorni: threshold/not_before e test staging già verificati; in produzione osservare il timer effettivo, senza backdate di record reali per un smoke rapido.
- [ ] Scheduler authenticated: anon/user/forged claims negati, alternate service credential verificata, cron disabled-start/pause/resume, almeno un giro reale con esito HTTP + ledger/Storage, overlap protetto.
- [ ] Diagnostica: reason/age/last_attempt/quota/retries di review visibili solo al service, log senza foto/email/JWT/signed URL, owner verifica pending/review e escalation.
- [ ] Cleanup finale delle sole fixture, confronto pre/post dei riferimenti degli utenti veri e Storage, nessun residuo permanente non governato.

Il collector attuale non ha un filtro per fixture. Durante il canary, eseguire execute globale solo se il dry-run mostra che **tutti** i candidati eleggibili sono le fixture autorizzate; se compaiono candidati reali, fermare quel test e rivalutare il piano. Non passare un parametro owner/filtro non supportato per fingere uno scope più ristretto.

## F. GitHub e rischi residui

Branch `photo02-staging` locale/remoto verificati uguali a `19eeb8722ba32b084e28b1edbd3d28ba68be7d55`; main `d80b113aabd6d304d92e5ff27b3f04147136ec2e`. Working tree iniziale pulito. 13 commit PHOTO-02 dopo main; migrazioni 017/018, moduli lifecycle/review, upload/delete hooks, frontend adapter, bundler, test e report già versionati.

Da promuovere su main, dopo chiusura dei blocker: le due migration, moduli `_shared/photo-lifecycle.js`, `_shared/photo-review.js`, `_shared/photo-upload.js`, `delete-account/index.ts`, `photo-lifecycle/index.ts`, `src/photo-upload.js`, bundler, test/dichiarazioni e documentazione PHOTO-02. I file staging/test possono restare versionati ma **non** sono script da eseguire in production. Nessun decoder, migration016, CSS o altra feature da modificare. Manca invece il gate di cutover e lo scheduler production: prima implementarli/collaudarli in staging e pushare; poi una revisione finale unica da mergiare e deployare, senza correzioni ad hoc non versionate.

I tre writer review di staging non esistono nella produzione oggi: non trasferirli o replicare l'esenzione sintetica. Nuovi writer incerti reali restano conteggiati e possono bloccare la conclusione delete finché non risolti con prove. Follow-up operativo necessario; log non equivalgono a staffing o alert automatico. Cache attuali 3600s e copie client non revocabili; nessun dispositivo reale/benchmark di carico o purge di timer reali svolto in questo preflight. Lo stato può cambiare prima del rollout; ripetere il controllo a gate chiuso.

Suite rieseguita localmente **223/223 PASS**, build PASS, typecheck PASS. Riproduzione negativa di compatibilità vecchio writer eseguita **solo localmente**, non una failure introdotta in produzione. 20/20 artefatti web e i due sorgenti Edge mutanti production corrispondono alla baseline main già verificata.

## G. Decisione finale

**NO-GO al rollout produzione con la revisione corrente.** Non per dati incompatibili né collisioni DDL: il blocker è la transizione runtime e il setup scheduler non production-ready. Il GO tecnico staging non viene revocato; non prova automaticamente la sicurezza della finestra di deployment.

Per arrivare al GO: versione/cutover/pause server provati in staging (incluse chiamate del vecchio runtime e arresto a metà deploy), scheduler production dedicato a partenza OFF versionato, rollback pause concretamente verificato, checkpoint zero writer incerti prima delle migration. Nessuna nuova decisione su grace/quota/retention richiesta. Non eseguito alcun rollout o modifica produzione.

Fonti provider per pianificazione, non prove di deployment: [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Edge runtime limits](https://supabase.com/docs/guides/functions/limits). I limiti del worker non dimostrano che una scrittura Storage remota sia terminata.
