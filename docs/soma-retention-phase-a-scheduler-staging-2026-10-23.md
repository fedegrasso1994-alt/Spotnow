# SOMA — Retention Phase A scheduler staging

23 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `cc84cbdee6cef3612bd3d2a36f8adaa70f159f10`. Autorizzazione founder limitata all'attivazione Phase A staging, giornaliera alle03:00UTC. Preflight riportato prima del cambio di stato. Nessuna migration, modifica runtime, policy o purge logic; nessun deploy o accesso Production.

## Esito e limite della verifica

**Scheduler Phase A staging: ON. Attivazione e smoke manuale: PASS. Primo tick automatico: NON ANCORA OSSERVATO.**

Il job è stato attivato il23 ottobre, prima esecuzione automatica attesa **2026-10-24 03:00UTC**. Non è stata alterata temporaneamente la cadenza per simulare un tick; `cron.job_run_details` per questo nuovo job contiene0run al controllo finale. Lo smoke qui documentato esegue manualmente il medesimo comando memorizzato in `cron.job`: prova autenticazione/Edge/RPC/receipt ma non dimostra che il daemon cron abbia già eseguito quel comando. GO all'attivazione; verifica del primo tick resta aperta.

## Preflight e target esatto

- Progetto esclusivo `zjinjtkekmaqtxsuyvho`.
- Job ID4, nome `soma-retention-phase-a-staging`, schedule esatta `0 3 * * *`.
- `cron.timezone=GMT` verificata live, quindi03:00UTC senza DST. Nessuna modifica globale al timezone.
- POST `https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/operations`, action `phase_a_run`, dry_run=false, batch_limit100, max_batches4.
- Credenziale server già esistente in Vault, riutilizzata esclusivamente DB→Edge. Verificata solo la presenza; nessun valore restituito/salvato in evidenze.
- Entrambi i gate `manual_enabled` e `scheduler_enabled` necessari al comando. Il primo abilita le batch service-only necessarie anche al cron, non espone un percorso browser.
- Root operation_id deterministica per giorno UTC; replay dello stesso ciclo non duplica il purge. Massimo400candidati/path/ciclo; partial/busy/failure richiedono verifica e follow-up esplicito con nuova operation_id, non retry incontrollati.
- Nessun target Production nei due script operativi; Edge ha anche guard esplicita sullo staging hostname. Nessun segreto aggiunto/modificato.

| Path incluso | Scope approvato invariato |
|---|---|
| Analytics | eventi/account-day/fairness pseudonimi90giorni; no rollup anonimi |
| Observability | diagnostica14giorni, preservando stato operativo minimo corrente e hold |
| DD | esposizioni/allocazioni/finestre/pair-memory/fairness30giorni, protezioni dipendenze e hold |
| Notifications | soli binding stale/revocati e relativi child eleggibili; sending/unknown/hold protetti |

Esclusi: PHOTO interamente, Match/chat, QoD, Spotv2, romantic requests/guards, purge moderation/safety, legacy privacy retention, backup/provider log e qualsiasi durata non approvata. Nessuna delivery Notifications attivata. Safety hold non scade automaticamente.

Preflight live: candidati eleggibili0 su tutti i quattro path. Esito atteso primo ciclo: quattro batch completed, zeroDELETE, nuove receipt tecniche minimali14giorni.

## Attivazione e rollback

Script versionati sotto `supabase/operations/`, NON nuove migration:

- `retention-phase-a-staging-enable.sql`: verifica timezone, hash executor, feature OFF, altri cron OFF, presenza credenziale e assenza collisione job; registra soltanto questo cron e apre i due gate Phase A atomicamente. Rifiuta seconda installazione per richiedere review esplicita invece di sovrascrivere un job esistente.
- `retention-phase-a-staging-pause.sql`: chiude entrambi i gate e rende inattivo soltanto questo job in una transazione. Nessuna cancellazione schema/dati, nessun rollback PHOTO.

Esecuzione pausa, se necessaria:

```sh
supabase db query --linked --project-ref zjinjtkekmaqtxsuyvho --file supabase/operations/retention-phase-a-staging-pause.sql --output json
```

Pausa provata in transazione: gatefalse, croninactive, esecuzione del comando restituisce nessuna richiesta HTTP; ROLLBACK della prova ripristina ON. Questa prova non ha interrotto una batch in corso: una batch già iniziata termina atomicamente; nuovi batch sono bloccati dalla pausa. Non promette recupero di dati già legittimamente purgati.

## Smoke post-attivazione

Alle19:53:35UTC invocato lo stesso comando registrato, mantenendo la schedule03:00. pg_net request14: **HTTP200, timed_out=false, nessun errore trasporto**, JSONcompleted, needs_followup vuoto. Tutti i4path completed, eligible0/deleted0, error_code nullo. Quattro receipt tecniche nuove, nessun dato prodotto eliminato.

Seconda invocazione controllata request15: HTTP200completed, stessi quattro operation_id/timestamp e `replay=true`; nessuna nuova batch receipt né cancellazione. Il primo controllo locale dell'evidenza assumeva uguaglianza dell'intero JSON senza prevedere il campo `replay`; corretto solo il confronto diagnostico per verificare esplicitamente replay=true e identità di tutti gli altri campi. Nessun difetto runtime o modifica purge.

## Stato finale e invarianti

- Solo Phase A ON; job1/2 PHOTO e job3 privacy legacy restanoinactive.
- DiscoveryOFF; AnalyticsOFF; Notifications/deliveryOFF; OPScollection/email/purge_readyOFF. L'orchestratore Phase A non attiva raccolta OPS.
- PHOTOadmissionOPEN come baseline; PHOTOcleanup/schedulerOFF; legacyretentionpaused=true.
- 4Auth,4profili,42oggettiStorage,1Match,2messaggi. Hash profili `ad4067f19890f61846176521b32aaf92`; Storage `94a9f5b6fc83f6345287b4c1e714c4f7`: invariati.
- Fixture Auth/profilo/Storage0; deletionpending0; receiptPHOTOconclusa preesistente1 invariata, soggetta ai7giorni propri. Nessuna nuova fixture introdotta.
- Funzioni purge/config/hash invariati; migration054 blob `a45f16732d58ba06b03d51644adb3baa1ea6e64e`. Nessun file src/public/functions/migrations modificato.
- Main locale/remoto `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`, invariato. Nessun merge/Production.

## Verifiche e presidio residuo

Suite completa **776/776PASS**,0fail/skip/cancel; buildPASS, typecheckPASS, diff-checkPASS. Test durante questo task eseguiti una volta prima dell'attivazione, senza retry fino a green. Nessun nuovo comportamento runtime da testare; smoke e pausa verificati contro Postgres/Edge staging reali. Log completi ignorati in `.local/retention-scheduler/`; evidenze minimizzate in `docs/evidence/retention-phase-a-scheduler/`.

Dopo il primo orario03:00 verificare `cron.job_run_details`, correlazione pg_netHTTP e receipt delle quattro path: il solo successo cron/HTTP200 non basta. Richiedere completed, needs_followup vuoto e assenza di errori; su failure/partial non dichiarare purge completo e valutare pausa con lo script sopra. Confrontare feature/hash/integrità, senza attivare altri scheduler. La capacità400/path/die va rivalutata su backlog reale prima del pilot; oggi backlog0. Gli alert email restano non operativi senza provider configurato: necessaria consultazione manuale, nessun nuovo canale introdotto. Primo tick e presidio operativo non vengono dichiarati risolti da questo smoke.

Commit/push e working tree finale nella consegna. STOP: nessun altro job/feature o task prodotto avviato.
