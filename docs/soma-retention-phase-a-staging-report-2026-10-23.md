# SOMA — Retention Phase A staging report

23 ottobre2026. Baseline731cfb9, branch `codex/soma-schema-v2-staging`. Audit approvato versionato separatamente in `cae6f7c`. Implementazione/contratto al commit `7ced51ba6cebab677d9e48c093c4ba1f72a93a8d`. Contratto: `soma-retention-phase-a-contract-2026-10-23.md`.

## Esito

**RETENTION PHASE A: BLOCKED**

Implementazione/canary Phase A passati; gate finale bloccato dalla suite completa non stabile: test preesistente `DD committed reciprocal availability once/window; repeated reads cannot notify again and overnight is silent`, `tests/notifications.test.js:26`. Assertion del primo drop vuoto, stesso failure già noto prima di Phase A. Nessuna patch DD/Notifications prodotto introdotta per farlo passare; nessuna conclusione sulla root cause oltre l'osservazione riproducibile. Non proporre ON finché il gate non viene risolto separatamente. Il precedente collector canary Observability resta un'altra condizione separata.

## A–C. Architettura, batch, protezioni

054 additiva: due tabelle private control/run, funzioni candidati/hold/FK/batch/status, indici di retention. Edge `operations` aggiornata solo staging con modulo dedicato. Service-only, nessun accesso browser, niente nuovi secret/provider. Gate manual/scheduler OFF. Dettagli e FK effettive nell'audit approvato e nel contratto.

Batch100 (max200), una riga per PK per DELETE, totale100/RPC, transazioni separate per batch, try-lock e recheck dopo rowlock. Prima versione aveva9,36s/100 su5000righe; ottimizzazione PK riduce a0,702s. Index scan selection100righe in0,068ms nel benchmark specifico; non è una promessa di latenza universale. `query-plan.json` conserva plan/buffers e tempi. Nessun DELETE non limitato nuovo; cascade parent evitata conservando parent finché ha figli. Nuova FK inattesa fallisce il batch.

## D–L. Dry-run, purge e retry reali

`supabase/tests/retention_phase_a_canary.sql`, staging PostgreSQL reale, timestamp storici sintetici, import storico in transazione non visibile ad altri, replica mode **session-local solo durante INSERT** e ripristinata prima dei dry-run/purge. Serve a costruire vecchie finestre immutabili senza cambiare clock server o trigger runtime. Non è una prova onboarding/PHOTO; solo metadata profilo placeholder nella transazione, nessun upload/registro/lifecycle/oggetto Storage. Verificata la chiusura FK delle esposizioni prima del purge. Tutta la transazione viene rollbackata dopo assertions. Primo tentativo fallito per alias ambiguo nell'assert del test, rollback completo; corretto il solo harness e rieseguito. Nessun dato persistente è stato purgato per quell'errore.

| Path | Dry-run eligible | Protected/dipendenze (bounded) | DELETE batch successivi |
|---|---:|---:|---|
| Analytics | 2 | 0 | 2,0,0,0 |
| Observability | 1 | 1 | 1,0,0,0 |
| DD | 1 | 7 | 1,2,1,0 |
| Notifications | 1 | 1 | 1,1,0,0 |

- Analytics91d eliminati (evento/account-day),89d preservati; fairness e cutoff90d esatto provati nei test automatici.
- OPS15d eliminati,13d preservati; incidente aperto alimentato resta minimo stato corrente, senza trattenere eventi scaduti.
- DD31d libero rimosso fisicamente (exposure→2allocation→window),29d preservato. Exposure32d held resta e protegge allocation/parent. Match/chat/profili identici. Pair-memory/fairness e Spot referenziati coperti dai test PostgreSQL embedded.
- Stale binding: prima delivery eleggibile, poi parent vuoto. Nessun purge di sending/unknown o figlio held.
- Ulteriore purge per categoria: deleted0. Batch cap, replay opid, conflitto opid e rollback/retry dopo errore iniettato verificati nei test automatici. Rollback di batch fallito conserva tutte le righe e registra solo errore sicuro, senza il sentinel secret.

Concorrenza Notifications su **due sessioni PostgreSQL reali** (`scripts/retention-phase-a-concurrency.mjs`): prima sessione chiama la vera `notification_finish` e conserva row lock; seconda invoca batch durante la sovrapposizione, elimina0; `notification_claim` resta vuota perché delivery OFF. Dopo commit finish, due batch eliminano figlio e binding, terzo è no-op. Prova di lock/finish/prune, NON di invio Web Push esterno. Fixture Auth rimossa con normale engine delete; zero prodotto/Storage residui. Evidenza `notification-concurrency.json`.

Orchestratore completo invocato manualmente tramite credenziale server già presente in Vault, mai esposta: **HTTP200, status completed, quattro path dry-run completed, zero deleted**. Nessun timeout. `edge-dry-run.json`. Non è un tick cron e non risolve il vecchio canary del collector OPS. Anon/authenticated non hanno EXECUTE della batch né SELECT sul ledger; server verificato service-only.

## H–I. Invarianti e categorie non toccate

Nessuna modifica ai file src/public, alle migration precedenti o alle Edge PHOTO/delete; nessuna pipeline decoder/lifecycle cambiata o integrata nell'orchestratore. Storage hash invariato `94a9f5b6fc83f6345287b4c1e714c4f7`, profili hash invariato `ad4067f19890f61846176521b32aaf92`. Nessuna copia reale scritta/eliminata. Teardown fixture concorrente produce **una receipt PHOTO conclusa**, mantenuta secondo7d esistenti; non forzata la rimozione. Nessuna deletion pending.

QoD, Spot v2, romantic, report/moderation/safety purge, Match/chat, legacyinterests e rispettive policy NON implementati/schedulati. References Spot a DD sono preservate, non nullificate. Analytics rollups non creati/purgati. Notification outbox non aggiunta al purge. Nessuna modifica legale/UI/prodotto o rollout Production.

## M–N. Test

- Nuovi test Phase A: **17/17 PASS**, PostgreSQL embedded più modulo orchestratore/auth; inclusi timezone caller Rome/NewYork con DST, default OFF e privacy/grants.
- Prima suite completa:769/770 PASS, failure DD→Notifications già noto.
- Iterazione dopo ottimizzazione/auth/budget:772/772 PASS.
- Suite finale dopo prova UTC/DST: **772/773 PASS,1FAIL**, stesso test preesistente. Risultati intermedi non sostituiscono il failure finale.
- Build PASS; typecheck PASS; `git diff --check` PASS.
- Canary reale SQL PASS, concurrency reale PASS, Edge dry-run reale PASS. Nessuna simulazione push dichiarata delivery reale.

## O–P. Deployment/scheduler

Solo migration054 applicata e registrata applied nello staging; candidate perfezionata prima della pubblicazione finale mediante sostituzione atomica delle sole funzioni nuove e config UTC. Hash funzioni/config raccolti in `final-state.json`. Solo Edge `operations` deployata, nessun cambiamento verify_jwt/config/secret.

Proposta non installata: un cron giornaliero `0 3 * * *` UTC, comando nel contratto, durata server-based, gate doppio. Circa24h lag nominale; capacity/backlog e `partial` devono essere presidiati prima di ON: budget bounded non garantisce da solo lo smaltimento di un carico arbitrario. Verifica timezone cron ancora preliminare all'attivazione; nessuna timezone globale cambiata. Nessun cron nuovo registrato. Tre vecchi cron esistenti tutti OFF.

## Stato finale

4Auth,4profili,42Storage,1Match,2messaggi. Fixture Auth/profilo/Storage0, pending deletion0, una technical receipt conclusa7d attesa. Run tecnici Phase A minimizzati persistono per diagnostica14d, non sono dati prodotto e non sono stati rimossi ad hoc. `final-state.json`.

manual_enabled=false; scheduler_enabled=false; retention legacy paused; Discovery/Analytics/Notifications/delivery OFF; PHOTO admission OPEN, cleanup/scheduler OFF; OPS collection/email/purge_ready OFF. Main locale/remoto resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Nessuna API Production contattata.

## Rischi residui / prossimo gate

1. Failure intermittente DD→Notifications non chiuso: task separato, niente scheduling automatico ora.
2. Collector OPS persistency canary precedente separato; email provider assente, nessuna nuova integrazione.
3. Carico massimo giornaliero/backlog/SLO, timezone cron e owner operativo da verificare prima di autorizzareON. `partial` richiede follow-up, non è successo completo.
4. Hold/review, QoD/Spot/romantic e copie backup mantengono i gate già noti; nessuna durata inventata.

Commit/push e stato working tree riportati nella consegna finale; report/evidenze versionati separatamente dal codice. **STOP: nessuna richiesta di attivazione finché il gate finale resta BLOCKED.**
