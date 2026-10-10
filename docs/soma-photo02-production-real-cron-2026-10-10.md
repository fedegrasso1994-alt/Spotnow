# PHOTO-02 — tick cron reale verificato, 10 ottobre 2026

**GO tecnico finale PHOTO-02 produzione.** Al termine il servizio foto è
nuovamente PAUSED, admission/cleanup/scheduler OFF. Nessuna riapertura permanente
è implicata dal collaudo. Nessuna migration, deploy o modifica PHOTO-01.

## Pre-check e fixture

Gate live superati: Storage/ledger/quota coerenti, nessun missing/orfano,
processing o writer incerto, scheduler OFF. Baseline2account (reale+fixtureA),
6oggetti. Usa soltanto A già tracciata e account sintetici C/D nuovi, registrati
in manifest privato: C/D servono alle prove reali di delete richieste dal gate
server. Sono preprofile senza foto, non account reali.

In CANARY: replace di A crea una foto retired; grace5min **trascorso realmente**,
nessuna modifica di not_before. Nuova current protetta. Un tentativo controllato
senza Storage write viene chiuso con receipt terminale esplicita, failed e hold
manuale review per verificare esclusione dal cron. Nessuna terminalità dedotta
solo da timeout/assenza file. Delete C/D completati tramite endpoint reale;
approve_smoke verificato dal server su publish/replace/delete effettivi.

Cleanup_all semprefalse. In OPEN inventory/claims di background rimangono
limitati ai canary_users, senza coinvolgere l'account reale.

## Finestre OPEN osservate (UTC; ora italiana UTC+2)

| Finestra | Inizio | Fine | Durata | Esito |
|---|---|---|---|---|
| Prima | 09:08:05.916 | 09:08:51.845 | 45.929s | Attivazione dopo il tick; nessun cron eseguito. Watchdog richiude. |
| Seconda | 09:10:40.001 | 09:11:02.806 | 22.805s | Tick normale09:11; cleanup osservato e richiusura immediata. |

La prima attivazione è arrivata tardi per la latenza del runner. Non è stata
estesa oltre il watchdog per attendere il minuto successivo. È stata corretta
solo la sincronizzazione del runner: attesa del secondo40 **prima** di OPEN,
chiusura appena osservata la rimozione sintetica o entro45s circa. Nessuna
modifica al cron/runtime/contratto per aggirare una protezione. Una nuova prova
delete sintetica rinnova l'approvazione server, senza forzarne i campi.

## Tick reale e correlazione

Cron production `soma-photo02-production`, jobid1, runid1:
start09:11:00.114624UTC, end09:11:00.142335UTC, status `succeeded`.
Questo indica invio pg_net; **non basta da solo a provare il cleanup HTTP**.

Risposta pg_net request_id1 registrata nella stessa finestra:
HTTP200, timed_outfalse, errornull. Body collector reale:
completed1, failed0, reconciled0, pending0, reviewed0, review_total1;
anomalies missing0/untracked0. Endpoint del job verificato sul progetto corretto;
nessuna chiamata manuale al collector durante la finestra cron. Correlazione
fondata su unico job/run/richiesta della finestra e sugli effetti ledger/Storage,
non su cron `succeeded` soltanto.

Gate effetti:
- vecchia foto sintetica purged, retries1, reserved_bytes0, copie Storage0;
- current ancora current con3copie;
- review ancora review, writer settled e retries0 (non processato);
- zero writer incerti e foto/Storage reale con impronte baseline identiche.

Post-tick, già con admission globale chiusa: collector ripetuto solo nello scope
CANARY, completed0/failed0/reviewed0/review_total1. Nessun doppio purge. Scheduler
rimane OFF; poi execute_off. Nessun claim di review o current.

## Chiusura fixture e verifica finale

A eliminata tramite delete-account reale dopo prova cron positiva; C e D già
eliminati; B eliminata negli smoke precedenti. Venue sintetica rimossa solo dopo
verifica assenza check-in. Nessun account diverso dalle fixture coinvolto.

Finale: PAUSED epoch6, execute_enabledfalse, scheduler_enabledfalse,
cleanup_allfalse, cron job inattivo. Un cron run totale.

| Invariante finale live | Valore |
|---|---|
| Account / profili reali | 1 / 1 |
| Account / venue sintetici | 0 / 0 |
| Storage | 3oggetti, 368.181byte, identici alla baseline |
| Ledger | 1current, 11purged |
| Upload job | 1ready, nessun processing |
| Unknown/review/pending cleanup/missing/orfani | tutti0 |
| Purged con riserva nonzero | 0 |
| Quota charged attiva | 9.469.184byte, solo riserva conservativa dell'account reale |

Metadata tecnici conclusi mantengono retention7giorni approvata; non sono foto,
quota attiva delle fixture o orfani permanenti. Nessun originale/legacy
normalizzato. Foto fingerprint `481b0f016cdb54faae1218e1442fc4e5`, Storage
fingerprint `dac9a189fe97289fac5d32823e72726b`, invariati.

## Raccomandazione e GitHub

La verifica cron chiude l'ultimo limite del precedente report: **GO tecnico**
alla successiva attivazione operativa PHOTO-02. Il collaudo lascia tutto OFF;
non abilita cleanup globale/cron in permanenza. La pausa incrementa epoch e
invalida smoke_approved per progetto: la riapertura richiede nuovo pre-check e
approvazione server nel nuovo epoch, non un update manuale dei flag.

Harness e report pubblicati su photo02-staging, con commit test/docs separati;
main non mergiato. Runtime produzione è già versionato `ad27260`. Nessun deploy
aggiuntivo. Test235/235, build/typecheck/sintassi harness PASS. Credenziale locale
temporanea rimossa; segreti/UUID/password delle fixture non versionati. Nessun
log anomalo osservato nelle evidenze cron/pg_net/summary del collector; il primo
watchdog senza tick è documentato come tentativo di sincronizzazione non riuscito.
