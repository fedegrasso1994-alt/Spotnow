# Soma — PHOTO-02: audit e design, prima fase

8 ottobre 2026. Baseline GitHub/produzione `f477c393479511a9870d88ad96b4d4769de94212`, branch main inizialmente pulito e senza divergenze. Letti AGENTS.md, audit privacy/security, contratto PHOTO-01 e migrations 001–016. Questo task produce analisi e progetto; nessuna implementazione, migration, modifica cloud o rollout. Non dichiara PHOTO-02 completata.

## A. Audit attuale

Audit live con SELECT di soli metadata, senza leggere foto o dati personali dei profili. Evidence aggregata: [inventario](soma-photo02-audit-evidence-2026-10-08.json).

| Indicatore | Produzione | Staging |
|---|---:|---:|
| Profili | 1 | 3 |
| Oggetti profile-photos | 3 | 40 |
| Foto legacy | 0 | 2 |
| Foto validate | 1 | 11 |
| Record photo_assets | 1 | 13 |
| Job upload | 1 | 14 |
| Job in stato processing | 0 | 2 |
| Lease processing ancora attive | 0 | 0 |
| Asset non correnti | 0 | 10 |
| Oggetti senza riferimento nei profili/job correnti/registro validato | 0 | 7 |
| Profili con canonicale mancante nel catalogo Storage | 0 | 0 |
| Oggetti registrati mancanti nel catalogo Storage | 0 | 0 |

La produzione contiene un nuovo profilo PHOTO-01 dopo il cleanup precedente: va preservato. Le due eccezioni legacy dello staging non sono foto legacy di produzione. I sette oggetti staging sono **candidati alla riconciliazione**, non un'autorizzazione al purge: vanno confrontati anche con tutti gli asset/manifest di fixture e con la realtà dello Storage API. Nessuna cancellazione effettuata. SQL assente non prova da solo l'assenza di byte nel servizio sottostante.

Comportamento verificato nel codice:

- PHOTO-01 non persiste gli originali ricevuti: input e decoder sono in RAM. Tre JPEG persistenti per upload: canonicale, `.detail.jpg`, `.thumb.jpg`; canonicale e detail sono oggi due copie dello stesso output. Preservare questo contratto.
- Preview JPEG base64 in `validated_photos.preview`; dopo pubblicazione anche in `photo_assets.preview`. Non sono soltanto metadata: sono copie persistenti dell'immagine.
- `begin_photo_upload` serializza admission per account, max 10 job distinti/ora, 3 tentativi, lease 45 s. Un retry aggiorna il percorso nel job; il percorso del tentativo precedente non ha un ledger dedicato.
- Tre upload paralleli precedono `finish_photo_upload`. Se due riescono e uno fallisce, rimangono oggetti privati non pubblicati. Un test esistente lo riproduce. Non è una regressione introdotta da PHOTO-02.
- `finish_photo_upload` verifica lease/account e presenza di tre oggetti; profilo e preview vengono pubblicati successivamente. Un fallimento preserva il vecchio profilo server-side; non elimina i nuovi oggetti incompleti.
- Pubblicazione profilo via upsert + trigger: la nuova foto è validata prima del cambio. La vecchia non viene cancellata. La policy foto autorizza ancora il proprietario tramite prefix UID, quindi può richiedere nuove firme per oggetti vecchi finché esistono. `can_publish_photo` permette ogni foto validata dell'owner, senza stato retired/purging: una foto vecchia può tornare corrente prima del purge futuro.
- Delete-account mette l'account in quarantena, verifica la barriera upload, cancella folder flat, esegue prepare_account_deletion e hard-delete Auth con cascade. Errori restano riprovabili dall'utente; manca un completamento autonomo. Non copre cartelle annidate.
- Nessuna quota cumulativa Storage e nessun collector/scheduler lifecycle attuale. `pg_cron` e `pg_net` sono disponibili ma non installati in entrambi i progetti; Vault è installato. Nessuna nuova estensione abilitata in questo task.

## B. Rischi trovati

| ID | Rischio | Evidenza e limite |
|---|---|---|
| P2-01 | Accumulo di foto vecchie e preview | Nessun purge in 016/Edge; asset non correnti già osservati nello staging |
| P2-02 | Parziali e tentativi dimenticati | Test mixed Storage success; job sovrascrive il path a ogni retry |
| P2-03 | Purge contro ripubblicazione | Registro validato attuale non distingue ready/current/retired/purging |
| P2-04 | Upload contro delete | Controllo lease prima dell'HTTP non è un lock durante tre scritture Storage; timeout/abort non prova annullamento remoto |
| P2-05 | Delete interrotto | Quarantena corretta ma retry affidato all'utente; folder solo flat |
| P2-06 | Quota e backlog | Limite orario non impedisce accumulo cumulativo; collector fermo non deve riaprire crescita illimitata |
| P2-07 | Cache e copie | URL firmata 30 s non equivale a cancellazione dei pixel; oggetti scritti con cacheControl3600 |
| P2-08 | Missing references | Collector non deve confondere 403/timeout/5xx con 404 confermato o eliminare profili per un problema di rete |

Non ci sono oggi oggetti problematici identificati in produzione. I rischi sono nel lifecycle, non nel decoder chiuso da PHOTO-01. La piattaforma non offre una transazione unica tra DB e tre chiamate Storage: l'obiettivo realistico è non pubblicare un set incompleto, tracciare ogni parziale e raggiungere la pulizia verificata tramite retry, non promettere zero byte temporanei durante qualsiasi failure.

## C. Design proposto

### Moduli e invarianti

Nuovo modulo `supabase/functions/_shared/photo-lifecycle.js`, nuovo collector `photo-lifecycle/index.ts` service-only; modulo dedicato alla cancellazione riprendibile dell'account richiamato dal delete-account esistente e dal collector. Nessuna suddivisione di live.js/backend.js. Piccoli hook necessari nei flussi admission/write/finalize/publication/delete; decoder, formato, qualità, dimensioni e limiti PHOTO-01 invariati.

Invarianti obbligatorie:

1. Mai cancellare un set corrente, pubblicabile o con writer non risolto.
2. Un attempt immutabile e un manifest esatto dei tre path devono essere committati **prima** di qualunque scrittura Storage; un retry crea un nuovo attempt senza cancellare la storia del precedente.
3. Pubblicazione e claim del purge usano lo stesso lock per owner, con ordine unico owner → profilo → asset → attempt. Il trigger/RLS revalida sotto lock; un check SELECT prima della cancellazione non basta.
4. Foto `purging/purged` non pubblicabili, neppure tramite client vecchio o upsert diretto. Se pubblicazione vince prima del claim, il collector la preserva. Se claim vince, pubblicazione della vecchia è rifiutata.
5. Storage rimosso soltanto via Storage API, mai con DELETE SQL su storage.objects. Supabase documenta che il DELETE SQL non cancella i byte: [Delete Objects](https://supabase.com/docs/guides/storage/management/delete-objects).
6. Nessun esito completed se un writer è ambiguo, esistono oggetti o riferimenti pendenti. Successo API non equivale da solo a pulizia dimostrata.

### State machine e replace

Set foto: `writing → ready_unpublished → current → retired → purging → purged`; `writing → failed/quiescing → purging`; `missing/needs_review` per incongruenze. Job e set sono distinti: un nonce può avere più attempt, ma soltanto quello corrente può finalizzare.

Il commit del profilo attiva il nuovo set e ritira il precedente nella stessa transazione. Il vecchio resta fisicamente disponibile durante un grace breve, senza ripubblicazione inconsapevole. Scadenza grace non autorizza da sola la cancellazione: il collector deve ricontrollare corrente, writer, ownership e stato sotto lock. Profile fields, social e sessione Ora90min restano invariati.

Un ready retry restituisce il percorso solo se ancora integro e pubblicabile. Se un draft è già stato purgato, non restituire ready con un file mancante: prevedere risposta distinta e rinnovo del nonce una sola volta nel modulo upload client, senza raw fallback. È un adattamento necessario del lifecycle, da testare con client aperti prima dell'aggiornamento.

### Collector e riconciliazione

Due modalità service-only: dry-run inventory e execute su task validamente claimed. Dry-run non modifica stati né avanza retry. Batch bounded, cursor stabile/keyset, lease e fencing token del collector; worker concorrenti non prendono lo stesso task. Nessun elenco illimitato in RAM.

Inventory completo: profili, photo_assets/varianti/preview, validated_photos, tutti gli attempt e intent di scrittura, job, delete queue e tutti gli oggetti bucket. Oggetti privi di ledger vanno in needs_review: nome UUID, prefix UID o età non bastano per cancellarli. Non inferire un proprietario solo dalla stringa del percorso. Cross-owner reference, path ambiguo e oggetto sconosciuto bloccano il purge automatico del caso.

Per oggetti noti: claim DB revoca pubblicabilità; rimuovi manifest esatto via Storage API in batch; verifica assenza nel catalogo e tramite API. Retry accetta oggetti già assenti; se una sola variante resta, conserva lo stato pending e riprova. Soltanto dopo assenza confermata elimina preview/asset/validation obsolete e compatta i record di retry secondo la policy approvata. Tombstone impedisce la riattivazione di nonce vecchi.

Missing record: verifica corrente/varianti tramite API, distingue assenza da errore rete/autorizzazione. Se corrente, registra anomalia e blocca il falso completamento; non cancella account/profilo. Se variante rigenerabile, riparazione soltanto dalla canonicale verificata e nello stesso contratto PHOTO-01, senza rendere autorevole una preview client. Canonicale realmente persa richiede nuova foto o recovery operativo separato, non una falsa riparazione HD dalla thumbnail.

### Delete account / delete photo

Persistenza del task delete prima di qualsiasi purge. Protezione owner mette in quarantena e nega nuovi admission/publication. Enumerazione ricorsiva paginata del solo bucket applicativo e dell'owner confermato, compresi originali sconosciuti nel perimetro di cancellazione account esplicitamente autorizzato; gestione di folder pseudo-object senza scambiarli per file. Prepare/cascade/Auth mantengono le regole esistenti su report e social: nessuna nuova retention di quei domini.

Il task non deve sparire per cascade prima della verifica finale: queue/tombstone minimale separata da Auth, non una copia del profilo. Il worker può riprendere dopo logout/crash; revoke/grant rimangono service-only. Restituisce deleted:true solo dopo quiescenza, purge e verifiche Auth/DB/Storage. Non introdurre un pulsante elimina-foto-corrente: la foto rimane obbligatoria. Delete photo riguarda set superati/draft; la foto corrente si rimuove soltanto con replacement valido o delete account. Un eventuale prodotto senza foto richiede un task separato.

**Gate tecnico importante:** deadline client e lease45s non provano la cessazione di un HTTP remoto. Ogni write ha intent persistente e stato success/failed/unknown; timeout conserva unknown. La prova staging deve includere risposta persa e scrittura tardiva. Se non si dimostra una barriera efficace o una riconciliazione che conserva il task finché l'ambiguità è risolta, niente completed e NO-GO produzione. Non introdurre trigger non supportati sulle tabelle Storage gestite come scorciatoia. Il design richiede questa prova, non assume che un'attesa arbitraria sia fencing.

### Quote e osservabilità

Quota sotto lock, contando byte persistenti e prenotazioni di scrittura; niente controllo client-only. Budget di ciascun set massimo 9 MiB secondo i caps attuali: canonicale4 + detail4 + thumb1. Preview DB conteggiata separatamente. Oggetti sconosciuti e tentativi pendenti consumano quota, non vengono ignorati per autorizzare altri upload. Un solo writer/account come oggi; candidato max2 ready non pubblicati, max128MiB complessivi, da approvare/misurare. Quota non cambia decoder12MP/6MP/8MiB.

Prima di rifiutare un upload per quota, cleanup di soli task già eleggibili entro un budget breve; se non basta, errore temporaneo comprensibile nei toast esistenti. Foto corrente non sacrificata per liberare spazio. Collector bloccato o backlog crescente produce alert e admission fail-closed, non crescita infinita. Testare fairness tra owner e burst legittimi.

Log strutturati: run/task opaque id, reason code, stage, attempt count, next_retry, oggetti/byte aggregati, durata, esito. Niente foto, preview, JWT, signed URL, email, nome, corpo RPC grezzo o stack con path personale. UUID tecnici delle queue sono comunque identificatori da proteggere nel DB operativo; non dati anonimi per definizione. Distinguere retryable (rete/429/5xx), needs_review (incoerenza/ownership) e completed. Backoff bounded, dead-letter visibile al gestore e allarme sul collector assente; niente infinite silent retries. Non inventare una soglia/SLA garantita senza owner.

## D. Migration prevista — non creata/applicata

Candidata `017_photo_lifecycle.sql`, additive e separata da 016:

- Ledger privato `photo_lifecycle_sets` e `photo_write_attempts`, manifest/ownership/stato, token/epoch, deadline e timestamps tecnici; riferimenti immutabili per tentativi precedenti.
- Queue privata `photo_cleanup_tasks` con reason, not_before, lease/fencing, retry, error_code e stato; task account/tombstone non cancellato prematuramente dal cascade Auth. TTL approvata per metadata tecnici, senza contenuti foto dopo purge.
- Quota/reservations private, indici per owner/state/not_before e vincoli unici; policy configuration tecnica private/server-only.
- Hook sui service RPC PHOTO-01 e sui trigger di pubblicazione, più accesso foto owner limitato ai set correnti/ready ammessi per evitare nuove firme dei retired. Le firme già emesse restano bearer fino ai limiti effettivi del provider. Preservare firme/payload di successo quando possibile; confronto delle definitions prima/dopo per confermare scope. `can_publish_photo` deve escludere i set ritirati/purgati e verificare integrità registrata.
- Nuove RPC inventory/claim/confirm/retry service-only; RLS ON, revoke public/anon/authenticated. Nessun allargamento delle API peer né accesso nuovo a Storage per i client.
- Bootstrap conserva foto correnti; metadata storici senza data certa non ricevono scadenze inventate. Foto legacy production assenti: nessuna normalizzazione e nessuna backfill dei byte.

Scheduler proposto Supabase pg_cron → pg_net → collector Edge, segreto di invocazione in Vault, senza nuovo provider. Dipendenza da abilitare/verificare prima in staging; credenziali mai nel SQL versionato. Le chiamate schedulate richiedono auth e protezione da overlap. Riferimento: [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions). Disponibilità locale non equivale a configurazione già funzionante.

Rollback: spegnere scheduler/execute, conservare ledger, tombstone, vincoli e processing PHOTO-01. Non tornare ai vecchi publication checks mentre esistono task purging. Un object già purgato non è ripristinabile dal rollback del codice. Rehearsal staging obbligatorio; nessun DROP distruttivo di 016/017.

## E–F. Test e staging

Matrice dettagliata separata: [piano test](soma-photo02-staging-test-plan-2026-10-08.md). Prima codice modulo + test unitari/DB, poi migration e worker staging versionati e prove cloud. PGlite non sostituisce i test con due transazioni Postgres reali, Storage reale e worker riutilizzati. In questa fase eseguita soltanto la suite baseline: **188/188 PASS**, build e typecheck PASS. Nessun nuovo test PHOTO-02 implementato o eseguito, nessuna race cloud dichiarata passata.

Staging `zjinjtkekmaqtxsuyvho`: isolare fixture sintetiche in manifest, preservare baseline fuori manifest; classificare i residui storici prima di mutazioni. Non copiare immagini/account di produzione. Snapshot schema/RPC/RLS/config prima delle modifiche; cron inizialmente OFF/dry-run; execute soltanto sui set del manifest. Testare scheduler reale senza dipendere da richieste client; cleanup e rollback verificati. Produzione `qlucwdjcjomwyziegxrn`: nessun deploy in questa fase e nessun auto-purge.

## G. Decisioni founder — proposte, non policy approvate

| Decisione | Proposta da convalidare | Motivo |
|---|---|---|
| Grace vecchia foto | 5 minuti dal replacement commit | Superiore al TTL signed30s e con margine per client in lettura; non una promessa di revoca delle copie |
| Draft validato non pubblicato | 24 ore dall'ultimo evento server pertinente | Consentire retry/onboarding interrotto; limite cumulativo indipendente |
| Parziale/fallito | Eleggibile solo dopo writer risolto e quiescenza; candidato margine tecnico30min | Nessuna cancellazione basata sul solo timer45s; misura da validare sui test di scrittura tardiva |
| Quota | 128MiB/owner incluse prenotazioni e vecchie copie; max2 ready non correnti | Verificare burst/profile UX, costo e capacità: non nuova quota attiva |
| Cache browser nuove foto | Ridurre cacheControl3600 a candidato60s, conservando cache RAM/preload | Ridurre copie HTTP; benchmark performance e compatibilità prima di decidere |
| Queue/nonce/tombstone | Candidata7giorni di metadata tecnici minimizzati dopo completamento; unknown non scade per età | Anti-replay e diagnosi, con cleanup; durata da approvare e sottoporre al pacchetto privacy |
| Owner anomalie | Federico, con sostituto da completare; alert operativo e soglia da definire | Anomalia permanente non deve essere silenziosa; nessuna copertura continua assunta |

Durate candidate non sono basi giuridiche o approvazione legale. Non cambiano retention di chat, Tribe, check-in, report o backup provider. Si può sviluppare il motore con configurazione non distruttiva mentre si approvano le policy; non attivare execute con durate provvisorie in produzione.

## Copie e cache: contratto verificabile

| Copia | Persistente? | Gestione prevista / limite |
|---|---|---|
| Tre JPEG Storage/set | Sì | Manifest, quota, replace/purge/delete, verifica API |
| Preview in validated_photos e photo_assets | Sì, due copie DB | Eliminate insieme al set quando non più necessario; non nei log |
| Input originali/decoded pixels/worker response | RAM Edge | PHOTO-01 mantiene caps e bounded processing; non introdurre temporary Storage raw |
| URL firmate in backend Maps | RAM client, TTL cache20s / firma30s | Invalidare set noto quando ritirato, logout/block/owner change già gestiti; no persistenza |
| Blob/canvas photo-memory | RAM client, limite16MiB/64 immagini | Rimozione mirata per path/owner mantenendo decode leases; clear su logout; nessuna cache persistente nuova |
| Foto nel DOM/stato discovery/chat | RAM della sessione | Aggiornare riferimenti al polling/refresh e liberare elementi chiusi; client offline può tenere pixel già ricevuti |
| HTTP browser/CDN | Cache gestita da browser/provider | Misurare headers/cancellazione reali; TTL proposta, non revoca istantanea garantita |
| Service worker CacheStorage | Persistente ma solo offline.html | Preservare divieto di cache foto/API/auth |
| Auth/localStorage e draft QR | Persistente, non archivio foto dell'app reale | Audit ha trovato token owner/QR; non aggiungere preview o signed URL. Demo esclusa dal lifecycle produzione |
| Screenshot/download dell'utente; backup/log provider | Fuori controllo diretto app | Non promettere recupero delle copie ricevute. Provider retention/backup separati da PHOTO-02 |

La documentazione Supabase distingue invalidazione CDN da cache browser e indica che scadenza/revoca della firma non purga da sola la cache CDN; Smart CDN è su Pro+, quindi non va assunto attivo sul progetto corrente. [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn). Nessun upgrade deciso o richiesto.

## H. Raccomandazione e stop

**GO per implementazione modulare e prove in staging**, inizialmente senza purge automatico. Le policy candidate richiedono decisione founder prima dell'attivazione. **NO-GO rollout produzione ora**: mancano implementazione, nuovi test, prove quiescenza/late-write, scheduler operativo, quota/cache benchmark e verifica rollback. Se il fencing tra scritture remote e delete non risulta dimostrabile, fermarsi e proporre una variante di architettura prima del rollout.

Commit previsti: audit/design/evidence, piano staging/test; implementazione/migration/test separati nella fase successiva. Documenti pubblicati su GitHub e main riallineato; non lasciare script privati come unica descrizione del contratto. Stop al report di questa prima fase.
