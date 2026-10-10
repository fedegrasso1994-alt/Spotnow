# PHOTO-02 — checklist smoke residua, 10 ottobre 2026

**Smoke applicativi residui passati. NO-GO alla riapertura globale e a cleanup/
scheduler globale: manca il tick cron production reale.** Il suo gate validato
richiede OPEN, mentre questo task vieta la riapertura globale prima della fine
dei gate. Non è stato aggirato né modificato il gate per far passare il test.

Nessuna migration riapplicata, nessun deploy o rollback, nessuna modifica ai
limiti/decoder PHOTO-01, UI/UX, schema o API condivise. Usate solo le due fixture
sintetiche già tracciate e la loro venue. Admission è stata CANARY solo per
queste fixture; mai OPEN. Codice produzione resta `ad27260` già su GitHub.

## A. Profilo, Ora, Tribe, foto

PASS via **client applicativo createBackend + API/Storage production reali**:
nuove sessioni autenticate, lettura profili, check-in QR sintetico, discovery
live con peer presente, timestamp di presenza null, lettura canonical/detail/
thumbnail autorizzata, appartenenza Tribe con due membri live.

Confronto corretto: peer attivo in live=true, assente dalla discovery offline
live=false; membership presente in my_tribes. Nessuna asserzione alterata per
modificare il prodotto. Non è un collaudo visuale manuale su tutti i dispositivi:
foto verificate come copie reali scaricabili, non come screenshot del profilo.

## B. Spot, match, chat

PASS: due Spot reciproci, match risolto da backend.matchWith; messaggio inviato
con nonce e ritentato con lo stesso nonce; nuova sessione del destinatario legge
un solo messaggio, match persistente. Nessun doppio messaggio dopo retry.

## C. Delete account della fixture B

PASS tramite backend.deleteAccount → funzione delete-account reale. Controllo
post-delete SQL + Auth/REST/Storage: Auth, profilo, prefix Storage, validazione,
asset/varianti, job, membership, interessi, match, messaggi: **tutti0**. Ledger
attivo0, reserved_bytes0, nessun tentativo incerto; account cleanup completed.

I record conclusi di ledger/cutover/audit/queue restano **metadata tecnici** con
retention7giorni approvata: non sono foto residue, quota attiva o orfani.

## D. Quota / race / retry

PASS con due prove distinte, senza cambiare il limite128MiB:

1. PostgreSQL production, transazione con guardia sulla sola fixture B e owner
   lock: pressione sulle riserve tecniche della fixture; quota+1byte rifiutata
   PHOTO_QUOTA; quota esatta134.217.728byte accettata; retry della prenotazione
   in corso rifiutato PHOTO_BUSY senza doppia riserva. **Rollback completo** di
   tutta la prova: nessun file o variazione quota persistente. Non è un upload
   reale da128MiB: testa il contratto di ammissione e contabilizzazione.
2. Due RPC begin concorrenti reali per B: una sola accettata, seconda PHOTO_BUSY.
   Il controller è l'unico writer della prova e non invia alcun intent o Storage
   write: receipt terminale esplicita e fail_photo_upload chiudono il tentativo.
   Non si assume terminalità da timeout o assenza di file.

Due draft pronti accettati tramite Edge; terzo rifiutato409 senza modificare la
foto corrente. Il failed/no-write sintetico è posto in review auditabile per
verificare l'esclusione dal cleanup. Le riserve failed vengono rilasciate dal
purge; tutte le riserve B sono0 dopo delete. Nessun unknown residuo.

## E. Cleanup controllato

Dopo i gate precedenti: execute_on **solo in CANARY**, cleanup_all mai attivato.
PASS: claim null per current, due draft freschi24h e review sintetico; collector
con richieste concorrenti e ripetute; failed0 e reviewed0; seconda esecuzione
completed0. Le vecchie foto A sono eliminate solo dopo il grace reale già
trascorso: nessuna anticipazione di not_before.

Le foto correnti e i draft freschi restano leggibili; review resta osservabile.
Hold manuale ripetuto con operation_id identico produce un solo effetto.
Successiva cancellazione esplicita dell'account B elimina anche le copie draft
non eleggibili al purge di background. Nessun file o record parziale.

Massimo retries del ledger purgato1: nessuna doppia claim riuscita. Purged con
reserved_bytes nonzero0. L'account/foto reale è escluso dal canary e conserva le
impronte iniziali.

## F. Scheduler: PASS dei controlli, tick cron ancora NON eseguito

PASS: collector non amministrativo negato; execute OFF503; dry-run autenticato
200; claim concorrenti/idempotenti; pausa execute_off503; ripresa CANARY200,
failed0; nuova pausa503. Configuratore scheduler OFF ripetuto restituisce stesso
job; project_ref errato rifiutato PHOTO_SCHEDULER_AUTH; enabled=true prima di
OPEN rifiutato PHOTO_SMOKE_REQUIRED.

Job configurato, endpoint corretto, activefalse, **cron runs0**. Non dichiarare
che un tick cron/HTTP reale sia stato testato: l'attivazione richiede
phaseOPEN + smoke approvato + execute_enabled. Con il vincolo di questo task
non è possibile dimostrare quel passo senza riaprire globalmente. Nessun errore
inatteso nei collector eseguiti; i rifiuti503/401/403 e PHOTO_SMOKE_REQUIRED sono
comportamenti di gate attesi, non failure da ignorare.

Resta da scegliere un percorso autorizzato: collaudo cron con stato OPEN secondo
il rollout originale, oppure una modalità scheduler ristretto al canary da
progettare/collaudare prima in staging. Nessuna di queste viene implementata
in questo task. Lo scheduler NON è stato acceso e poi spento per aggirare il gate.

## G–H. Fixture e stato finale

Finale PAUSED epoch5; execute_enabledfalse, scheduler_enabledfalse, nessun job
cron attivo. Rimane **una fixture A**, la sua foto current con3copie e la venue
sintetica/membership. È preservata e tracciata: la condizione «tutti i gate
passano» per eliminare le fixture finali non è soddisfatta per il tick cron.
La fixture B è eliminata integralmente come previsto dal test delete-account.

| Stato finale live | Valore |
|---|---|
| Account / profili | 2: reale + fixture A |
| Storage | 6: tre copie reali + tre copie fixture A |
| Ledger | 2current, 8purged; nessun altro stato |
| Upload job | 2ready, nessun processing/failed |
| Unknown / review / missing / orfani / pending account cleanup | tutti0 |
| Quota charged max per owner | 9.469.184byte |
| Quota charged totale | 10.553.786byte |
| Purged reserved_bytes nonzero | 0 |
| Scheduler attivi / cron run | 0 / 0 |

Impronte reale: foto `481b0f016cdb54faae1218e1442fc4e5`, Storage
`dac9a189fe97289fac5d32823e72726b`, identiche alla baseline. Il valore di quota
è una riserva conservativa, non equivale ai byte fisici Storage. Nessuna copia
originale o legacy creata/normalizzata da questo task.

## I–L. Anomalie, decisione e GitHub

Nessuna anomalia tecnica inattesa nei test eseguiti. Il limite residuo è
l'incompatibilità tra richiesta di collaudare il cron live e divieto di OPEN
previsto dal suo gate attuale: **NO-GO admission globale, NO-GO cleanup/scheduler
globale** finché questo punto non viene risolto e il tick verificato.

Test235/235, build, typecheck e sintassi harness PASS. Test live automatici nel
nuovo modulo scripts/photo02-production-remaining.mjs; prova quota parametrica
in tests/production/photo02-quota-probe.sql. Report aggregato nel JSON omonimo.
Solo questi test/report sono aggiunti; nessuna modifica runtime. Tutto pubblicato
su photo02-staging con commit separati test/docs. Main non mergiato senza GO;
produzione usa codice già versionato. Credenziale locale temporanea rimossa al
termine; UUID/password/token delle fixture rimangono esclusi dal repository.
