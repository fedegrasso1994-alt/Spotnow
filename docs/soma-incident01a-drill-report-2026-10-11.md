# INCIDENT-01A — rapporto collaudo sintetico e limiti

11 ottobre2026. Nessun incidente reale dichiarato. Nessuna richiesta cloud/produzione o email reale in questi drill; non applicate migration staging o main. Three nuovi test offline in `tests/incident-recovery.test.js`, usando dipendenze già presenti. Ambienti PGlite in RAM, bytes sintetici in Map, snapshot Blob volatile: nessun backup/file foto permanente. Staging privacy verificato attraverso snapshot **sorgente** del branch, non accesso al servizio cloud né modifica dell'ambiente staging.

## Prove eseguite

| Drill | Evidenza / esito | Cosa NON dimostra |
|---|---|---|
| D-01 Contenimento foto | SQL reale PGlite con001–019: pause ripetuta, phase PAUSED, execute/scheduler OFF; writer rifiutato, current invariato, shortcut OPEN negata senza smoke — PASS | cron cloud/call già in volo, pause discovery/chat/global, accessi admin reali |
| D-02 Perdita DB e restore | tre profili fixture, dumpDataDir Blob, cancellazione profili solo locale, nuovo DB da backup; riferimenti recuperati — PASS | backup Supabase, restore provider, HA, RPO/RTO4h o zero perdita |
| D-03 Storage distinto | dopo DB restore nessun byte-store foto recuperato automaticamente; 3 missing rilevati, copia sintetica separata recupera3; gate resta PAUSED — PASS | download/upload/hash di foto reali, varianti Supabase/CDN, storage replication |
| D-04 Gate ripristinati | snapshot pre-pausa riporta OPEN; ambiente offline immediatamente messo PAUSED prima di uso — PASS | clone fisico provider sicuro; cron/net reale può partire prima della pausa |
| D-05 Outage locale | mock fetch stalls, abort tramite boundedFetch e successivo retry valido — PASS | outage DNS/TLS/Supabase/Vercel, delivery alert, SLA; nessuna richiesta a synthetic.invalid |
| D-06 Confini disclosure | suite corrente include SEC-01 peer query/direct/join/filter, LOC-01 own vs peer timestamp, RLS foto/chat; totale suite243 — PASS | impossibilità di abuso con credential service role o log vendor; RLS non ferma quel ruolo |
| D-07 Age/consent/retention | 20 test da snapshot `ef964a56b99e6947c1244dc2639a5668613839dc`, due file privacy-gates-database/privacy-phase1 — PASS | feature attive in prod, cron cloud/purge realmente eseguito in questo task o nuovo collaudo multi-connessione |
| D-08 Scenari privilege/CI/vendor | 15 schede desk-review con detection/contain/recovery/limite nell'inventario — COMPLETE come preparazione | esercitazione umana, revoca key/session vera, accesso recovery senza owner, notifica/restore/provider outages reali |

D-07 eseguito con `git archive` in directory temporanea isolata, stesso node_modules esistente; nessun merge del branch privacy. Test:17/18/missing/stale age, consenso/missing/revoca/replay/nuova versione senza ALL, chat existing preservata; dry-run/pause/hold/purge/retry/rollback retention e endpoints denied prod. La copia sorgente temporanea è rimossa a fine task. Evidenze JSON aggregate senza account/path/secret/contenuti.

## Esito operativo

**GO preparazione INCIDENT-01A; NO-GO chiusura incident readiness/pilot.** Test offline e desk review completati, non tutti15scenari collaudati live. Le capacità mancanti sono esplicite; non si passa da “documentato” a “operativo”. PHOTO-01/02 rimangono DONE; qui si riusano le protezioni esistenti, senza cambiarle.

## Blocker e prossimo collaudo controllato

1. Founder: nominare incident owner/sostituto e orari/canale alternativo; tabletop umano con handoff fuori finestra. Il sostituto moderazione non riceve automaticamente privilegi cloud.
2. Provider manual actions: MFA/recovery/least privilege, Vercel Pro/Data Preferences, Supabase backup/piano e log, custom SMTP da scegliere a task separato. Non acquistati/attivati qui.
3. Tecnico: prova cloud staging **sintetica** DB + Storage canonicali + ledger/quota + expiry backup, interruzione/retry, restore senza jobs/secrets/egress, deletion/revoca dopo snapshot; non copiare prod in staging. Stop riapertura se missing/review/unknown o eventi postbackup non riconciliabili.
4. Tecnico/founder: dimostrare contenimento server core social e cached clients, revoke delle credenziali di test, ripristino cron/Auth con secret corrente, canale recovery da account sano; nessun nuovo provider implicito.
5. Professionista: criteri breach, clock awareness/notifica, autorità/canali, comunicazioni, durata evidenze/registro/hold e trasferimenti/contratti. Nessun messaggio/invio eseguito.
6. Founder: approvare RPO/RTO/budget **dopo** capacità e metriche reali. RPO24h/RTO4h e variante PITR restano candidati PROVIDER-01; durata test2s NON è RTO prodotto.

## Verifiche repository e file

Suite corrente **243/243 PASS**, build/typecheck/release guard/diff whitespace PASS. Rerun privacy isolata **20/20 PASS** separata: non sommare come se263 test fossero una singola suite della produzione. Nessun src/, supabase/, public/, index.html, package/lock, UI o config deploy modificati rispetto a `3cab930`. Nessuna migration nuova. Main resta `d0f515e`, provider rimane `3cab930`; branch dedicato INCIDENT-01A.

File aggiunti: inventario, runbook, template registro, questo rapporto, JSON evidence e `tests/incident-recovery.test.js`. Registro vuoto pubblico; istanze e log incidenti reali vanno solo in custodia privata approvata, non in GitHub pubblico. Tutti gli snapshot e bytes test sono sintetici e volatili.
