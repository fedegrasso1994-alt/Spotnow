# AGE / CONSENT / RETENTION — collaudo staging 10 ottobre 2026

**GO al prossimo preflight produzione READ-ONLY. NO-GO a deploy/attivazione/pilot in questo task.** Nessun dato reale, nessuna modifica produzione/main. Staging `zjinjtkekmaqtxsuyvho`; contratto nel documento omonimo, evidenze aggregate nel JSON omonimo.

## Implementazione e migration

020: stato 18+ e prove minime, re-confirm per account esistenti, server gates/RLS/RPC.
021: consenso separato/versionato, revoca/NULL, nuovi Spot gated, chat esistenti conservate, ambiente production safe-default.
022: timestamp visita legacy NULL e bloccati; Tribe membership preservata, Ora 90 minuti.
023: parametri retention, dry-run/pause, purge transazionale, locks, safety hold/audit/evidence separata, purge metadata tecnico storico.
Applicate solo in staging. Correzioni successive applicate lì come `CREATE OR REPLACE` diagnostici temporanei; sorgenti candidate finali 020–023 incorporano tutte le correzioni e suite ricrea schema da zero.

## Test automatici

Baseline 235; finale **257/257 PASS**, 0 fail, 0 skip. **22 nuovi test**: 13 DB/PGlite, 7 client/handler/API, 2 navigazione; test Tribe esistente aggiornato per eseguire davvero 020–023. Build PASS; typecheck PASS; diff whitespace PASS. Suite completa PHOTO-01/02 e core invariata inclusa.

Copertura: 17/18/missing/invalid/versione/dichiarazione, REST bypass e sessione resa restricted; consenso mancante/accettazione/revoca/doppia revoca/versione nuova/challenge stale/payload privato; zero fallback ALL; old chat preservata; membership senza timestamp; dry-run/pause/record attivo/reciproci/safety/report/sospensione/log/privacy metadata; retry/replay/transazione interrotta con rollback; delete cascade ed evidence minima. PGlite prova regole SQL e rollback, non da solo concorrenza multi-connessione.

## Prove reali Postgres / Storage / Edge

Due account nuovi `example.invalid`, marcati fixture e tracciati nel manifest privato; canary PHOTO limitato a questi due. Baseline tre account staging correlati a manifest precedenti sintetici; nessuna foto reale copiata.

- Upload JPEG e replacement, foto canonicale/quote, QR, Ora, Tribe, Spot reciproco, match, invio/lettura chat: PASS.
- Revoca ripetuta, NULL preferenza, blocco nuovi Spot/discovery, stale challenge, chat dopo revoca: PASS.
- Connessioni reali concorrenti: check-in renew lento contro purge; revoca contro Spot; invio messaggio contro purge chat inattiva: PASS. Writer lento mantiene lock, worker ricontrolla dopo attesa, record attivo preservato.
- Retention dry-run/purge/replay e membership invariata: PASS.
- Moderatore con consenso revocato può usare report/review autorizzato; reviewed non dedotto closed: PASS.
- Vecchi metadata privacy e challenge scaduti sintetici purgati, prova corrente preservata: PASS.
- Delete account **entrambi i sintetici**, mentre restricted/revoked: Auth/profilo/prove/chat/social/foto/varianti/quota eliminate, normal lifecycle PHOTO rispettato: PASS.
- Scheduler authenticated: anon/user rifiutati; service verificato PASS; **2 tick cron reali HTTP 200** in dry-run; pausa/OFF PASS.
- Browser staging: gate 17, conferma18, checkbox separata obbligatoria non preselezionata, profilo/revoca/chat, ritorno settings, avatar proprio decodificato `naturalWidth=64` (fixture64px): PASS. Non è un nuovo collaudo di tutti i dispositivi fisici.

## Problemi incontrati e risolti

La prima fixture JPEG uniforme è stata rifiutata dal processing PHOTO esistente; usata fixture sintetica a pattern già collaudata, nessun decoder modificato. Corrette ambiguità parametri SQL in candidate/log/fixture, `UPDATE` config con WHERE richiesto da safeupdates Supabase, service JWT storico diverso dal secret Edge corrente (probe service-only, non bypass), gate UI che resettava checkbox durante polling, avatar lazy nascosto troppo a lungo. Due asserzioni finali delete fallivano nell'helper diagnostico **dopo** cancellazione riuscita: qualifica parametro owner e registrazione fixture/retry con account già assente; ricontrollo indipendente PASS, nessun account duplicato ricreato.

Questi errori restano nei log locali storici e sono descritti qui; non si sostiene che tutti i primi tentativi siano riusciti. Non risultano errori irrisolti nei gate finali.

## Stato finale staging

- 3 account/profili preesistenti, 3 foto correnti **invariate**, 39 oggetti Storage referenziati (comprende set sintetici preesistenti, non solo foto correnti).
- Zero foto correnti mancanti, zero Storage non referenziato, zero nuovi writer incerti.
- Tre writer preesistenti `review`/unknown preservati deliberatamente; nessun timeout autorizza purge. Non sono nuovi residui di questo task.
- Zero nuove fixture Auth/Storage/quote/ledger attivo/prove; venue fixture, hold temporanei e API diagnostica rimossi. Tombstone PHOTO già purged restano governate dal normale metadata lifecycle PHOTO-02.
- Zero timestamp visita Tribe, zero nuove tabelle private senza RLS.
- Tutte policy OFF/DESIGN_ONLY, retention paused, cron privacy OFF, PHOTO cutover PAUSED/execute OFF/scheduler OFF.
- Due check-in sintetici preesistenti oltre24h restano perché job definitivamente in pausa: SLO alert rilevato, non rivendicata retention continua quando disabilitata. Non autorizzato purge baseline fuori fixture.

## Rischi / validazione prima del pilot

Autodichiarazione non è age assurance indipendente. Placeholder non è testo giuridico. Art.6/Art.9/finalità, revoca e chat già esistenti, catalogo/versioning/prova e durate devono essere validati; nessuna base scelta. Safety owner/review/closure/allarmi e preavviso chat inattive non definitivi. Provider/backup/log esterni non coperti da purge app. SLO24h soggetto a outage, job e hold. Limite tecnico: consent renewal/erasure è immediato server-side, pixels già ricevuti dai client non sono revocabili retroattivamente.

## GitHub e gate successivo

Codice finale collaudato e pubblicato: `6ef3522f87652eb154608f528c7ceaa2cbb885e9` (tree `b99607511f82780e4d5b0bf43a64b3c12e33d7ae`). Il release marker PHOTO staging precedente punta alla stessa baseline PHOTO, non è usato come prova di versione del blocco privacy. Branch `codex/age-consent-retention-staging`, commit distinti AGE, CONSENT, RETENTION/integration, hardening/collaudo e report. `main` rimane `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Commit finale verificabile dal branch remoto e dalla cronologia; nessun merge/deploy produzione. GO significa solo autorizzabilità di un successivo preflight READ-ONLY per collisioni, account esistenti, dipendenze e rollout plan. Attivazione produzione richiede task e autorizzazione separati.
