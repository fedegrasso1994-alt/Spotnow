# Soma — Observability MVP: audit e decision gate

Baseline `0655a8f7674dbf0f33eb3421955a73c836263d9e`, branch `codex/soma-schema-v2-staging`, 23 ottobre 2026. Source of Truth e AGENTS letti. Fase completata: inventario read-only; **implementazione non iniziata**. Main e Production non utilizzati né modificati. Nessun provider, migration, deploy, fixture, invio alert o job attivato.

Il prompt ricevuto si interrompe dopo «Prefer conservative thresholds suitable for ~». Il canale/destinatario degli alert e le soglie non sono definiti nel testo disponibile. Il task richiede esplicitamente STOP in questa situazione: le proposte sotto non sono policy approvate.

## Evidenze e stato reale staging

Interrogazioni limitate a flag, metadati schema e aggregati cron, senza comandi cron, payload, token, chiavi o dati utente. Inventario Edge via CLI read-only. Evidenza minimizzata: `evidence/observability-mvp/audit-readonly.json`.

- Discovery OFF; Analytics OFF, dropped=0; Notifications OFF e delivery OFF.
- PHOTO cleanup OFF e scheduler OFF; retention paused.
- Tre cron installati ma **tutti inattivi**: `soma-photo02-staging`, `soma-photo02-cutover-staging`, `soma-privacy-retention-staging`; schedule configurata ogni minuto. Nessuna esecuzione nelle ultime 24 ore nei record disponibili. Questo non dimostra assenza di errori storici o retention illimitata del cron log.
- Nove Edge ACTIVE: photo-assets v14; delete-account v8; photo-normalize-jpeg v7; photo-normalize-png v5; photo-normalize-webp v5; photo-lifecycle v11; privacy-retention v5; profile-photo v4; notifications v5. Verify JWT è true per tutte eccetto notifications, che usa le prove device/secret previste. ACTIVE significa deploy presente, non esecuzione sana o job attivo.
- Il task non ha letto secret, raw Auth/Edge/API log o contenuti dei messaggi. Campi, TTL, accessi e alert configurati esternamente nei provider richiedono verifica console/manuale: non sono deducibili dalla sola codebase.

## Inventario diagnostica, retry e gap per percorso

| Percorso / codice | Evidenza esistente | Gap operativo da colmare |
|---|---|---|
| Client globale: `src/diagnostics.js`, `request.js`, `backend.js`, `errors.js` | 30 eventi type/time in RAM, error/unhandled/offline/online; timeout fetch 20s; read condivise 15s, code/cancellazione; errori UI sanitizzati | Nessuna raccolta centrale o operation/correlation ID comune. Errori catturati non entrano negli unhandled. Cancellazione intenzionale non va contata come outage. Nessun log body nell'helper fetch attuale |
| Auth: `auth-preview.js`, `backend.js`, `live.js` | Readiness Google, gestione callback, link/OTP, session bootstrap e messaggi safe; log provider separati; 429 cooldown già diagnosticato nei report | Nessun conteggio affidabile per signup/login/callback/bootstrap falliti. Molti catch mostrano solo UI. Non raccogliere email, URL callback, code/hash/token, OAuth claims o intere sessioni. Distinguere 429/OTP scaduta/denial attesa da 5xx/timeouts |
| PHOTO upload/canonical/save | Edge PHOTO, `photo-upload.js`, ledger/upload jobs/cutover attempts, request_id/lease, error_code/retries; failure safe; decoder e deadline bounded | Request ID PHOTO esiste ma non è una tracing API comune. Canonicalization/upload/save non hanno un unico esito tecnico correlato. Alcuni catch di compensazione sono intenzionalmente silenziosi. Non esportare path/manifest/hash immagine/lease o URL firmati nei nuovi log |
| PHOTO read/sign/cleanup | `profile-photo`, inventari/review/cleanup account; retry/state/error_code/reconcile_attempts/last_attempt_at; photo-lifecycle stampa summary strutturato PHOTO02 e codice DATABASE | Buona base di diagnosi, manca alert sul fallimento/backlog e separazione chiara di errore firma/autorizzazione. HTTP 200 del lifecycle può contenere failed>0: non equivale a successo completo. Review/unknown non autorizzano purge per età |
| TRIBE/DD | `my_daily_discovery`, `send_tribe_spot`, engine server reciproco, window/exposure/receipt; recenti test 039–041 e idempotenza | Nessun trend operativo allocation/read/Spot failure. Transaction rollback può annullare anche un log scritto nella stessa transazione. Pool vuoto, notte, OFF, quote esaurite e risposta parziale sono esiti prodotto validi, non failure. Non copiare coppie esposte o inventory |
| ORA | `start_ora_manual`, `start_ora_qr`, `end_ora`, `my_presence`, `ora_people_page`; Spot `send_spot_v2`; limiti e receipts server | Nessun esito operativo comune start/end/read/Spot/Match; errori UI generici. Nessun Place ID, QR token, GPS o cronologia presenza nel nuovo evento. Nessun nuovo retry di write |
| SPOTTED/QoD/romantic/Share | Adapter scalar RPC e idempotency key; board receipts, request attempts/guard; resolver neutral unavailable | Nessun conteggio di dependency/timeouts su create post/comment, submit/decide e resolver. Unavailable/decline/suppression neutra non sono errori; non registrare ragione nascosta di incompatibilità/autore o correlare contenuto e account nei log generici |
| Match/chat | Match unico server; `send_message` client_nonce, draft preservato, fetch/poll bounded; conferma invio distinta da refresh fallito | Fallimento write vs read non aggregato; polling può amplificare conteggi. Niente testo, ID coppia, match ID o peer nei nuovi eventi. Retry conserva nonce; nessun doppio invio o nuova Match semantics |
| Notifications | Outbox/eventi/delivery con state, attempts, next_at, result; bounded claim; 429 retry limitato, outcome ambiguo unknown; prune separato | Dispatcher ritorna conteggi ma non li pubblica in log applicativi; catch Edge→503 generico. Finish RPC fallita può lasciare esito incerto. Client subscription/revoke/resolve falliti spesso solo UI. Non leggere endpoint/binding/key/payload per costruire monitor |
| Analytics | Canonical emit fail-open; dropped counter best effort; observe client catch silenzioso; purge service-only con conteggi bounded | dropped=0 con Analytics OFF non dimostra ingestion sana. Manca ultimo purge riuscito/fallito/lag e heartbeat: la sola funzione purge non impone scadenza. Nessuna transazione prodotto deve fallire per telemetry; non cambiare retention 90 giorni/24 mesi |
| Moderation/report | Private report/action audit, claim/revision/op; 052 review queue/hold metadata; ruolo+MFA | Audit del successo non registra azioni fallite/rollback. Serve failure code minimo per report/action/audit write e backlog review, senza note, reporter, autore, testo UGC o espansione di accesso analytics |
| Retention/cron/async | `retention_runs` con policy_version/dry_run/candidates/purged/completed_at; cron.job_run_details; PHOTO epoch/canary | Runs contiene successi committati, non prova completa di tentativi falliti. Un tick cron che invia HTTP non prova successo Edge/DB: distinguere tick, risposta, outcome e ultimo completamento. OFF intenzionale non deve generare missing-heartbeat |
| CI/CD / Vercel | GitHub CI test/typecheck/build/release guard; report incident/provider; hosting/deployment log esterni | CI failure non equivale a salute runtime. Nessuna configurazione di alert delivery operativa nel repo. Retention e redazione access log/IP/UA/query del provider non verificate ora |

I riferimenti storici INCIDENT-01A e PROVIDER-01 restano validi come inventario/runbook, non come prova che le azioni manuali provider siano state completate. Technical receipts contengono identificatori necessari al lifecycle: riusarle tramite aggregati/operatori autorizzati, non copiarle integralmente in un nuovo data lake.

## Gap ordinati per rischio

1. **BLOCKER implementazione alert:** canale, destinatario/backup e cadenza di controllo non definiti; recapito e handoff non testabili. Nessuna soglia approvata. Non presumere che il recapito supporto sia autorizzato a ricevere email automatiche.
2. **BLOCKER pilot osservabilità:** assenza di monitor indipendente di errore/heartbeat per job che verranno attivati e purge Analytics; occorre chiudere prima dell'attivazione reale, non accendere job durante questo audit.
3. **HIGH:** errori Auth/DB/RPC frontend catturati senza evidenza centrale; nessuna correlazione uniforme, source/version/deploy non sempre visibili all'operatore.
4. **HIGH:** log provider possono includere IP/UA, query, identificatori o metadati Auth; campi/TTL/accesso/export non verificati. Non dichiarare privacy completa solo perché i log applicativi sono minimali.
5. **HIGH:** success HTTP non sufficiente per async; summary.failed, unknown/review e dropped separati da esito prodotto. Mancano baseline/tasso e heartbeat, non solo contatori assoluti.
6. **MEDIUM:** doppio conteggio tra client/Edge/DB/retry, polling e cancellazioni; allarmi falsi durante pause intenzionali; falsificabilità degli eventi client.
7. **MEDIUM:** durate e accessi della nuova diagnostica da approvare; i default DESIGN_ONLY diagnostic7/security30 non autorizzano automaticamente una nuova raccolta.

## Design minimo proposto, non implementato

Riutilizzare Supabase e la diagnostica già presente. Modulo dedicato con allowlist di operazioni e codici, nessun SDK/provider nuovo. No redesign o tracking cross-session. Payload suggerito: random request_id per tentativo, operation enum, status/result enum, error_class enum, timestamp server, source client/edge/job, environment e release identifier verificati. Niente account ID per default; qualsiasi eccezione richiede necessità dimostrata e separata documentazione. Niente body/raw message/stack/header/URL/query/referrer; niente ID contenuto/coppia/Place, endpoint push, lease o prove device. Codici DB/provider solo allowlist, mai SQL detail/hint, err.message o err.stack arbitrari.

Taxonomy candidata: validation_error, authorization_error, conflict_error, dependency_error, timeout_error, internal_error. expected_pause/cancelled/unavailable/quota/retry sono esiti distinti, non automaticamente allarmi. La response utente resta quella attuale, senza stack. Client e correlation header sono input non fidati: lunghezza/formato validati, limiti tecnici anti-spam, nessuna permission derivata dall'ID, niente request-id nei token di prodotto.

Correlazione: ID per tentativo HTTP; collegamento al retry solo dove già necessario all'operazione, senza cambiare nonce/receipt. Header custom e risposta richiedono CORS/expose-headers sulle Edge interessate. Per RPC PostgREST verificare realmente la lettura da request.headers e l'esposizione della risposta: non promettere tracing DB automatico. Il fallimento DB annulla la sua transazione, perciò la traccia deve poter sopravvivere nel chiamante/Edge/provider; un INSERT log nella stessa transazione non basta. Un DB down rende indisponibile anche un collector nello stesso DB: documentare il limite e usare il canale provider/operatore esistente per diagnosi esterna, senza promettere monitor indipendente.

Per errori DB correlati a Match creato dentro Spot/romantic, strumentare l'esito esterno della mutazione: non introdurre eventi che distinguano la soppressione neutra o rivelino identità. Client-eventi sono non affidabili e vanno separati dai segnali server ai fini degli alert. Nessun retry automatico nuovo per write, nessuna modifica a quota, timeout prodotto, auth, canonicalizzazione, fairness, purge o retention prodotto.

Eventuale schema additivo dovrà essere annunciato prima del codice: store tecnico privato/bounded oppure summary minimizzati con accesso operativo dedicato; non allargare `admin_analytics_summary` o confondere product analytics e log tecnici. Considerare pattern retention esistente ma non attivarlo tacitamente. Failure del collector non deve bloccare le operazioni prodotto o generare ricorsione; limitare copie e volume. L'assenza di segnale deve restare distinguibile da zero errori.

## Alert: opzioni da approvare prima del codice

**Minimo senza nuovo provider:** vista/rapporto operativo privato in Supabase, controllato da owner e sostituto con cadenza esplicita. Evidenzia incidenti deduplicati, ultimo esito e lag, senza inviare messaggi. È monitoraggio a consultazione, non paging o garanzia di rilevazione fuori copertura. Un piccolo controllo manuale CLI può essere sufficiente: nessun obbligo di creare un nuovo dashboard.

**Se serve recapito automatico:** scegliere un canale già operativo e destinatario/backup, con autorizzazione specifica. L'Auth SMTP default non è una piattaforma di allarme da assumere; Gmail è un workflow manuale, non una API runtime approvata. Web Push prodotto è OFF e non è un canale indipendente per i suoi stessi guasti. Nessuna email/webhook/push è stata inviata.

Soglie candidate da discutere, NON attivate:

- Error spike server: almeno 5 failure inattesi nella stessa famiglia in 10 minuti **e** almeno 20% di errori su almeno 20 tentativi server; con poco traffico, 3 failure inattesi consecutivi → warning a consultazione, senza paging automatico.
- Auth: spike dei soli 5xx/timeouts o callback/bootstrap interni; invalid OTP/password/cooldown non generano alert singolo. Non creare counter per email o IP.
- Job attivo: warning al primo fallimento verificato; alert dopo due cicli consecutivi falliti o heartbeat mancante oltre due intervalli configurati più tolleranza da approvare. In assenza di una cadenza attiva, nessun timeout inventato.
- Analytics purge: eccezione o deadline/lag osservato → warning operativo con owner; nessun parametro 90 giorni cambiato. Verificare anticipo operativo prima della scadenza, non attendere che sia violata.
- Dedup per famiglia/incident window, stato open/ack/resolved, una sola segnalazione finché aperta; niente alert per ogni retry o user error. La durata della dedup e la severità/recapito devono essere approvati insieme alle soglie.

Questi numeri sono semplici ipotesi per il pilot, non una stima derivata da traffico reale: manca la parte finale del prompt sulla scala. Tassi richiedono contatori di tentativi, non soltanto failure raccolti; non inventare denominatori o account distinti. Soglie, intervalli e canale vanno confermati prima di qualunque implementazione che generi rumore/paging.

## Decisioni richieste e gate successivo

1. Inviare la parte finale del task troncata: scala pilot, eventuali vincoli/output/test mancanti.
2. Approvare consultazione manuale privata oppure indicare canale automatico, destinatario e backup; stabilire cadenza/coverage e prova di recapito.
3. Approvare soglie/dedup/escalation, o richiedere la sola raccolta con alert completamente OFF finché rivisti.
4. Approvare retention diagnostica nuova: proposta 7 giorni per eventi tecnici minimizzati, cancellazione fisica e nessun aggregato identificabile indefinito; eventuali security log restano separati e non ereditano questa decisione. La policy di prodotto/Analytics resta invariata.

Test da prevedere dopo approvazione: allowlist/redazione con payload sentinella; Auth/RPC/Edge failure e timeout/cancel separati; impossibilità di account injection; log privo di segreti; correlation effettiva; rollback DB visibile al chiamante; collector down non blocca prodotto; retry dedup senza cambio business; piccoli volumi e flag OFF non allarmano; job tick HTTP200 con summary.failed rilevato; alert dedup/ack/recovery e recapito concordato; purge tecnico/pausa/accessi/revoca; regressioni core e staging sintetico. Nessuno smoke di failure indotto è stato eseguito adesso.

**Gate attuale: BLOCKED prima dell'implementazione**, per il gate esplicito alert/canale/soglie e il prompt incompleto. Audit completo per il perimetro ricevuto; nessun nuovo comportamento runtime o raccolta attivato.

## Verifiche repository in questa fase

- Suite completa invariata, con concorrenza test limitata a 2: **736/737 PASS**, 1 FAIL, zero skip, circa 138 secondi.
- Failure: `tests/notifications.test.js:24`, «DD committed reciprocal availability once/window; repeated reads cannot notify again and overnight is silent». L'asserzione iniziale non trova profili nel payload del primo drop (riga 26).
- Una riesecuzione mirata dello stesso test: **1/1 PASS**. Classificazione: failure intermittente nella baseline invariata; causa non ancora provata. Non è corretto dichiarare 737/737 PASS per questa esecuzione né attribuirla con certezza all'orologio. Nessun test/runtime/DD/Notifications è stato modificato per farla passare. Richiede indagine separata o estensione esplicita dello scope prima del prossimo GO completo.
- Build **PASS**; typecheck **PASS**; whitespace check **PASS**.
- Solo documentazione/evidenza minimizzata aggiunta. Nessun nuovo codice di raccolta, schema o collector; nessuna prova di alert delivery effettuata. Il working tree finale viene verificato dopo il commit/push della sola documentazione sul branch staging.
