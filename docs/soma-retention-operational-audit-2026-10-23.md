# SOMA — Retention / Purge operationalization: audit read-only

Baseline: `codex/soma-schema-v2-staging`, `731cfb91d387b347fb674e0263c15bd2c420b505`. Audit 23 ottobre 2026. Nessuna migration, attivazione, chiamata purge (nemmeno dry-run), fixture o modifica dei dati staging. Nessun accesso Production; main invariato. L'ultimo messaggio founder limita esplicitamente il task all'audit: il prompt operativo precedente risultava troncato.

## Stato effettivo staging

Query in transazioni `READ ONLY`, solo sul ref `zjinjtkekmaqtxsuyvho`, alle 17:29 UTC. Evidenza: `evidence/retention-operational-audit/read-only-staging.json`; FK: `foreign-keys.json`. Non sono stati letti segreti, payload utente o comandi cron contenenti credenziali.

- 4 account Auth, 4 profili, 42 oggetti Storage. Zero hold aperti/overdue, zero eventi Analytics/OPS, zero esposizioni DD.
- `retention_control.paused=true`; tutte le 14 categorie `enabled=false`, `validation=DESIGN_ONLY`.
- DD OFF, policy v2 OFF/paused, jobs_paused=true. Analytics OFF/test_only. Notifications e delivery OFF.
- PHOTO phase OPEN; execute_enabled=false, scheduler_enabled=false, cleanup_all=false. Admission OPEN non equivale a cleanup ON.
- OPS OFF/test_only; purge_ready=false; email OFF. Retention OPS 14 giorni.
- Tre cron installati ma INATTIVI: `soma-photo02-staging`, `soma-photo02-cutover-staging`, `soma-privacy-retention-staging`, tutti con schedule `* * * * *`. Nessuna esecuzione presente nelle ultime 24h nel catalogo disponibile.
- Il precedente gate Observability resta BLOCKED per il canary di persistenza recorder non concluso (timeout). Questo audit non lo risolve né dichiara un outage provider.

## Matrice retention

APPROVATA indica una decisione tecnica founder, non validazione legale. DESIGN indica parametro esistente che non autorizza attivazione. Scadenza logica non implica cancellazione fisica. Le retention qui non si estendono ai backup/log dei provider.

| Categoria / tabelle | Regola effettiva / riferimento | Purge e gap |
|---|---|---|
| Analytics `analytics_events` | APPROVATA 90 giorni da created_at | `analytics_purge(false)` fisico, batch 500/tabella, lock; nessun cron |
| Analytics `analytics_days`, `analytics_fairness` | APPROVATA 90 giorni; fairness solo contatori account/finestra | Stesso executor; nessuna copia delle coppie; FK account cascade |
| `analytics_anonymous_rollups` | APPROVATA 24 mesi di calendario; soltanto aggregati realmente anonimi | Stesso executor; anonimato non dedotto dalla sola rimozione ID; nessuna generazione automatica introdotta |
| OPS `ops_events`, `ops_admission` | APPROVATA 14 giorni da created_at | `ops_purge`, eventi batch1000; admission delete non limitato; nessun cron |
| OPS `ops_incidents`, `ops_jobs` | Attuale implementazione: 14 giorni da opened_at / updated_at | Stesso executor; incidenti batch1000; jobs non limitati. Un incidente ancora aperto può scadere per opened_at anche con failure recente: verificare dedup/continuità dopo purge senza estendere retention |
| DD `discovery_exposures`, `discovery_allocations`, `discovery_windows` | APPROVATA 30 giorni dalla fine finestra | SOLO `dd_retention_preview(100..500)`, privata, nessun executor. Finestre ready/closed, lease null; finestre vuote cancellabili dopo figli. Building/failed/lease richiedono review |
| DD `discovery_pair_memory` | APPROVATA 30 giorni, last_exposed_at e purge_after | Solo preview; non cancellare stato aggiornato da nuova esposizione |
| DD `discovery_fairness_buckets` | APPROVATA 30 giorni/purge_after | Solo preview; aggregati minimizzati account/giorno, comunque identificabili e non indefiniti |
| ORA `checkins` | Presenza prodotto max4h, uscita/cambio Place elimina presenza; target DESIGN massimo24h dopo scadenza | Executor legacy elimina appena expires_at<=now(): NON attende24h; durata config non utilizzata per questa selezione. È coerente col massimo, non un TTL fisso24h. Hold/owner lock/recheck. Nessuna cronologia visite |
| Tribe membership / stato configurazione / rejoin guard | Membership corrente non è un evento visita; cooldown/grace non sono retention | Non purgare membership perché scade ORA. Nessuna nuova cronologia/last_visit. Purge dei soli guard superati da definire, senza inventare durata |
| Spot legacy `interests` | DESIGN90d, solo non reciproci e senza Match | Categoria `interests` implementata, con lock coppia/hold. NON copre Spot v2 |
| `spot_v2_intents` | APPROVATA validità logica pending30d; matched/expired/invalidated sono stati distinti | Nessun executor fisico dedicato; non inferire retention di intent terminali da valid_until |
| `spot_v2_operations` | Receipt risultato/idempotenza; nessuna durata fisica definita | Gap policy/executor; non cancellare prima di progettare anti-replay, quota e riferimento intent |
| ORA daily/place quota | Giorno Europe/Rome; `ora_spot_policy.quota_retention` nullable | Durata fisica mancante; nessun purge. Non resettare quota corrente o permettere replay |
| `matches` senza chat | DESIGN90d | Categoria `empty_matches`, verifica assenza messaggi/hold/report aperti; cascade messaggi e riferimenti va verificata |
| `messages` / chat inattive | DESIGN12 mesi da ultimo messaggio, possibilità avviso non implementata qui | `inactive_chats` elimina Match e messaggi per cascade; non è semplice eliminazione del singolo messaggio. Non attivare senza approvazione |
| SPOTTED post ordinario `board_posts` | APPROVATA invisibilità24h, purge al primo ciclo utile salvo report aperto/hold | `board_posts` implementato, batch100. `duration=1 second` è sentinella tecnica: l'eleggibilità usa expires_at, non aggiunge1s. Scheduler OFF |
| Commenti, likes, reactions | Seguono parent, non estendono24h | Cascade parent; hold/report dei commenti controllati nel purge post. Delete autore e safety capture separati |
| QoD ufficiali / risposte / `qod_answer_claims` | Fine esperienza attiva nel giorno Rome; **nessuna retention fisica approvata** | Migration047 esclude system post e risposte dal purge ordinario. Parent QoD `ON DELETE RESTRICT`; claims anti-replay, delete answer non rimborsa. Policy dedicata necessaria |
| `spotted_share_refs` | Nessun TTL inventato; token opaco subordinato ad autorizzazione e vita contenuto | Cascade post/comment; non serve un TTL separato per token. QoD non purgato mantiene mapping privato non risolvibile. Nessun click history |
| `board_romantic_requests` | APPROVATA pending7d; decline/expiry silenziosi; invalidazione opt-out | Scadenza logica lazy; colonna purge_after non è executor; retention terminale da confermare |
| `board_request_pair_guards` | APPROVATA30d da declined_at o expires_at originale, non estesa dai tentativi soppressi | Nessun executor fisico. Preservare guard prima di cancellare richieste scadute: lazy expire crea guard |
| `board_request_attempts` | Implementazione purge_after=created_at+7d; receipt neutra | Nessun executor; durata tecnica/anti-replay da confermare esplicitamente, non dedotta da TTL pending |
| Request/comment quota / `board_receipts`, legacy `board_quota` | Categoria DESIGN board_metadata7d per receipts/comment quota/legacy quota | Purge esistente non copre `board_request_quota`; alcuni delete non bounded. SPOTTED resta privo di quota3post/giorno |
| Report profilo `reports`, azioni `moderation_audit` | DESIGN180d dopo chiusura, non dopo creazione | Categoria closed_reports; hold/sospensione/report aperti; azioni standalone hanno filtri aggiuntivi. Reviews cascade dal parent |
| Report contenuto `board_reports`, `board_audit` | DESIGN180d chiusi | Categoria board_reports, attualmente loop non bounded. Non applicare Analytics90d |
| Hold/evidence/reviews | APPROVATA review manuale ogni30d keep/release/escalate; **nessun auto-release** | Hold attivo non scade perché review_due è passato; durata massima legale non definita. Released_safety_metadata180d DESIGN; cascade evidence/audit/review dopo rimozione hold |
| `anonymous_blocks`, blocks, preferenze notifiche/romantic | Stato corrente relazionale, non storico retention con TTL approvato | Account delete cascade; non cancellare per applicare durata Analytics |
| AGE/consent current state | Prova corrente per vita account/finalità; nessuna DOB | Account delete cascade; non applicare90d Analytics |
| `age_events`, `consent_events`, `moderation_role_events` | DESIGN privacy_operation_metadata7d | Executor rimuove eventi age/consent vecchi superseded, preserva ultimo. Role events delete non bounded e con policy condivisa |
| `consent_challenges` | Validità10min; DESIGN purge24h dopo expires_at | Executor dedicato in retention generica; non confondere validità e retention |
| `privacy_logs` diagnostic/security | DESIGN7d /30d legacy | Categorie distinte dai nuovi ops_events14d: non cambiare entrambe implicitamente |
| `retention_runs` | DESIGN technical_receipts7d, soli contatori/opid/versione | Executor esiste; ogni run crea receipt, perfino dry-run. Questo audit NON lo ha invocato |
| PHOTO correnti / varianti / manifest | Contratto congelato: precedente grace5min, draft24h, quota128MiB, max2draft | Worker PHOTO esistente, rimozione Storage verificata prima di finish; current esclusa, writer unknown richiede prova, review mai purge per età |
| PHOTO receipts concluse | APPROVATA7d, con condizioni lifecycle | `photo_metadata_purge` concatena017/018/019: lifecycle purged, cleanup completed, resolved anomalies, review audit terminale, cutover audit/attempts settled/deletions completed. Non tutti i record scadono7d dalla creazione; servono completamento e prove. Non reinterpretare come retention generica |
| `push_bindings` | Implementazione scadenza30d, revoca/logout e404/410 eliminano prima | `notification_prune` elimina scaduti; nessun cron. Non stampare endpoint/chiavi. Durata in contratto/codice, confermare readiness operativa senza cambiare |
| `notification_events`, `notification_deliveries` | Contratto7d outbox; reference max24h; TTL trasporto5min | `notification_prune` elimina eventi7d con deliveries cascade. Delete non bounded e nessuna dry_run; unknown/sending devono essere collaudati al confine con dispatch |
| Auth session/log, provider DB/Storage backup, CDN, email/push delivery esterna | Governati provider/config e gate PROVIDER/INCIDENT | Nessun executor applicativo garantisce cancellazione delle copie provider. Inventario/manual checks separati; nessun nuovo provider |

## Executor già presenti vs mancanti

Presenti: `privacy_retention_run`, `analytics_purge`, `ops_purge`, `notification_prune`, PHOTO cleanup e `photo_metadata_purge`. Tutti richiedono percorsi privilegiati; il fatto che siano richiamabili non costituisce autorizzazione a eseguirli. Analytics e OPS non consultano la pausa del vecchio retention_control: la pausa globale non li ferma automaticamente. Notification prune è separato da enabled/delivery; PHOTO usa i propri gate.

Mancanti: executor DD; purge Spot v2/operations e relativi contatori; purge romantic attempts/requests/guards/quota; policy/executor QoD. Da migliorare prima di scheduling generalizzato: limiti batch su board_reports/metadata/role events e prune notifiche, audit conteggi cascade, cadenze e lag massimo verificabile. Non introdurre nuove durate per colmare queste lacune.

## Dipendenze e cascade rischiose

1. **DD:** cancellare finestra esegue cascade su allocation/exposure. Non cancellare parent ancora con figli held. La preview richiede parent vuoto; l'executor futuro deve riusare board lock + retention lock e ricontrollo dopo lock. Exposure rimosso azzera FK exposure degli intent, non deve cancellare Spot pending né restituire quota/no-refill.
2. **ORA/Tribe:** purge checkin mette a NULL riferimenti presence; non elimina membership/Spot/Match. Il vecchio `interests` non equivale a v2. Non aggiungere uno storico attività per facilitare scheduling.
3. **Match/chat:** purge Match cancella messaggi e può nullificare match_id sugli intent/request, oltre a influire su authorization/notifications. Protezioni current/open report/hold vanno provate per ogni categoria, inclusi hold sui figli e azioni. Decisione product/legal necessaria prima di attivare i default.
4. **SPOTTED:** post cancella commenti/likes/reactions/share refs/report e audit collegati. Purge attuale protegge hold su post/report/comment e report aperti; verificare anche review/azioni collegate prima di ammettere un parent al purge. Parent QoD RESTRICT vieta cancellazione cieca del system post con risposte.
5. **Safety:** `moderation_reviews` ha FK cascade da hold, board_audit, moderation_audit; cancellare report può cancellare l'audit padre e relative review. I controlli sui report non sono una dimostrazione universale di preservazione di ogni hold su azione/figlio. Serve test della chiusura transitiva delle dipendenze e safety capture separata, senza copie superflue. Nessun purge basato sul solo review_due_at.
6. **Romantic:** prima di purge di expired pending, materializzare correttamente guard dal vecchio expires_at. Non cancellare guard ancora valido; non far rinascere richieste invalidate; preservare neutralità, quota e Match esistente. SET NULL di origin content non termina automaticamente il pending.
7. **Notifiche:** binding/event delete cascada delivery; concorrente dispatcher potrebbe aver già effettuato invio esterno. Test claim/unknown/retry e revoca necessario; TTL trasporto non cancella copie provider. Nessun invio abilitato per il purge.
8. **PHOTO:** non usare SQL delete Storage o cascata Auth come sostituto del lifecycle. Solo worker esistente con prove, claim, ownership, check current, rimozione verificata, receipt finale. Nessun timeout autorizza writer unknown/review. Non riattivare entrambi i cron PHOTO sovrapposti.
9. **Idempotenza:** stesso operation_id della retention generica restituisce receipt; un nuovo batch richiede nuovo ID. Purge receipt elimina memoria replay: i writer devono continuare a rifiutare nonce scaduti e non ricreare effetti/consumare quota. Le fasi v2 non sono tutte coperte dal vecchio board_metadata.
10. **Diagnostica:** purge OPS serializza col recorder; esiste rischio di incidente aperto rimosso a14d e successiva ricreazione. Non allungare retention per risolvere la continuità. Analytics/OPS purge possono operare con raccolta OFF: alert non deve confondere raccolta disabilitata con purge non necessario.

## Scheduling minimo proposto — NON approvato / NON installato

Nessun nuovo provider. Riutilizzare pg_cron e gli ingressi service-only/Vault esistenti, senza esporre chiavi o inventare un framework generale. Proposta da approvare separatamente:

- Un tick **orario** di manutenzione per Analytics/OPS e, dopo implementazione, DD. Task separati e serializzati per dominio; cutoff server-side e batch bounded ripetuti fino a limite di tempo/batch per ciclo, backlog residuo osservabile. Nessuna attivazione raccolta o Discovery necessaria per il solo purge.
- Post ordinari e notification prune: possibile stesso tick orario, solo dopo conferma lag prodotto e test race/hold; non includere QoD o terminal romantic privi di policy. Dispatch notifiche rimane OFF e distinto dal prune.
- PHOTO: mantenere esclusivamente il percorso cutover approvato e la sua cadenza già1min; prima inventory/dry-run e gate epoch/canary, poi autorizzazione esplicita. Non cambiare PHOTO per inserirlo nel job SQL generico.
- Review safety: controllo operativo giornaliero della coda due, senza rilascio/cancellazione automatica. Founder deve nominare owner/copertura; review resta ogni30d.
- Vecchio cron privacy: non riattivarlo genericamente. Dispatch seleziona tutte le policy enabled, non distingue approvazione e può fan-out verso Edge; l'HTTP accodato non prova che il purge sia concluso. Serve correlazione run/risposta/batch e allowlist delle sole categorie approvate.

**Le cadenze sono proposte, non nuovi periodi di retention.** Un tick orario produce potenziale ritardo fino al tick successivo, maggiore con outage/backlog. Poiché90/14/30d sono cap approvati, occorre concordare SLO/gestione outage e dimostrare capacità di smaltimento: non dichiarare rispetto esatto del cap con la sola presenza di cron. Non anticipare arbitrariamente la cancellazione per nascondere il ritardo.

Pausa per singolo dominio + pausa comune dell'orchestratore; stop impedisce nuovi claim/batch, non annulla transazioni già in corso. Resume riesegue eligibility, non replay cieco. Owner/MFA e service-only per operazioni, log minimizzati con run_id/categoria/policy/cutoff/count/outcome/duration senza ID utenti/contenuti. Segnalare fallimento dopo soglie già approvate, due cicli falliti/mancanti per job con cadenza nota; feature OFF non deve mascherare job purge dovuto. Email alert resta OFF finché manca transport configurato.

## Blocker e decisioni

| Severità | Punto | Azione prima di attivazione |
|---|---|---|
| BLOCKER attivazione | Nessuna autorizzazione attuale a scheduler/purge; categorie DESIGN_ONLY | Approvare scope operativo e singole categorie, non un enable globale |
| BLOCKER | DD senza executor fisico | Implementare/testare executor bounded, hold transitivi, lock e idempotenza, staging sintetico soltanto |
| BLOCKER categorie | QoD retention fisica assente; Spot v2/receipts, romantic terminali/quote senza contratto fisico completo | Decisione mirata founder + validazione professionale dove necessaria; nessuna durata inventata |
| HIGH | Cascade e hold transitivi, batch parzialmente non bounded | Test di parent/figlio held, concurrency, retry, interruption/resume, accuratezza conteggi |
| HIGH | Scheduling, massimo lag, outage/backlog, prova HTTP vs risultato | Approvare cadenza/SLO, controlli health e drill, run ledger minimizzato con retention definita |
| HIGH | Observability collector canary incompleto; email alert senza provider | Chiudere canary separato e completare transport esplicitamente, o accettare/documentare copertura operativa limitata |
| HIGH | Moderation max hold/legal e durate DESIGN | Owner e revisione manuale30d; validazione legale separata, niente auto-release |
| MEDIUM | Vecchie sezioni SoT32 dicono ancora TBD guard/opt-out, congelati in22 | Dare precedenza a decisioni esplicite recenti; correzione documentale futura senza reinterpretazione prodotto |
| MEDIUM | Backup/log provider non governati da purge applicativo | Chiudere gate PROVIDER/INCIDENT e restore/deletion reconciliation prima del pilot |

Nessun blocker viene risolto tramite cambio PHOTO, policy Analytics applicata a moderazione, cancellazione anticipata di evidence o attivazione Discovery.

## Test richiesti per la fase operativa futura

Boundary esatto/prima/dopo cutoff server; mesi calendario per aggregati; dry-run realmente non mutante o receipt esplicitamente documentata; doppio batch/replay/nuova op; stop/resume; due worker; writer che aggiorna eligibility durante purge; hold aggiunto/rilasciato durante selezione; parent held/figlio held/azione held; batch cap e backlog; quota e nonce dopo receipt purge; account delete; nessuna ricreazione dati; notifiche unknown/dispatch concorrente; PHOTO current/review/unknown invariati; nessun effetto su finestre DD/Spot/Match/chat. Cron reale solo dopo distinta autorizzazione, con fixture isolate e stato finale concordato.

## Verifiche di questo audit

Nessun E2E mutante/cron/dry-run RPC è stato eseguito in staging. La suite locale viene eseguita su database di test isolati, non sui dati staging. Suite completa: **756/756 PASS**, zero failure/skip, 140,842s. Build Vite PASS; typecheck `tsc --noEmit` PASS. Nessun nuovo test/runtime necessario per questo audit documentale.

Solo tre file documentali aggiunti: questo report e le due evidenze JSON indicate sopra. Nessun commit/push effettuato in questa fase di audit; HEAD resta731cfb9 e i tre file risultano non tracciati. Main locale/remoto resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

**Esito: audit completato; NO-GO all'attivazione generalizzata retention/purge.** Pronta una successiva implementazione limitata alle categorie già approvate solo dopo autorizzazione e definizione dei gate/SLO. Categorie non definite rimangono escluse.
