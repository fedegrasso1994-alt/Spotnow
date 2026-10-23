# SOMA — Retention / Purge Phase A contract

Founder freeze 23 ottobre 2026. STAGING ONLY: `zjinjtkekmaqtxsuyvho`. Nessun cambiamento prodotto/Production/main. Nessuna attivazione scheduler implicita.

## Architettura e scope

Migration candidata **054_retention_phase_a.sql**, applicata solo in staging. Nuovi `retention_phase_a_control`, `retention_phase_a_runs`; RLS, nessun accesso browser. Unica RPC batch `retention_phase_a_batch(path,operation_id,dry_run=true,batch_limit=100)`, status service-only. `operations` Edge riusa il suo ingresso autenticato e un modulo dedicato `retention-phase-a.js`; nessun nuovo secret/provider. Un JWT service preesistente è verificato tramite RPC service-only, mai decodificando claim non verificati. L'API rifiuta anon/authenticated e non permette SQL/tabella arbitrari.

Percorsi chiusi:

| Path | Tabelle | Criterio |
|---|---|---|
| analytics | analytics_events, analytics_days, analytics_fairness | created_at strettamente precedente a server_now −90 giorni |
| observability | ops_events, ops_admission, ops_incidents, ops_jobs, retention_phase_a_runs | 14 giorni; dettagli sotto |
| dd | discovery_exposures, discovery_allocations, discovery_windows, discovery_pair_memory, discovery_fairness_buckets | fine finestra/ultima esposizione >30 giorni; purge_after dei bucket secondo policy DD30d |
| notifications | notification_deliveries dei soli binding scaduti/inactive, poi push_bindings vuoti | subscription expires_at passato o inactive; sending/unknown esclusi |

Analytics anonymous rollups: **nessuna creazione né cancellazione** in Phase A. Il contratto24mesi resta indipendente; non introdotto un generatore. Notification events/outbox7d non sono aggiunti a questo orchestratore: questa fase collauda esclusivamente stale/revoked subscriptions. Nessuna delivery inviata o attivata.

Legacy `privacy_retention_run`, `analytics_purge`, `ops_purge`, `notification_prune` restano presenti per retrocompatibilità, ma il nuovo orchestratore NON li usa: la sua allowlist e le sue verifiche cascade sono dedicate. Vecchio cron privacy resta OFF; non è copertura Spot v2.

## Confini temporali

Timestamp e cutoff server-authoritative. Funzioni di selezione/batch con contesto `TimeZone=UTC`: durate90/14/30d non dipendono dal fuso client/caller e non richiedono Europe/Rome. Il giorno/finestra prodotto DD non cambia. Cutoff stretto `<`: un record esattamente sul limite non è ancora candidato; nessun client può fornire stamp/cutoff alla RPC pubblica.

OPS: eventi/admission14d dalla creazione, job14d dall'aggiornamento, run14d dalla conclusione. Un incidente aperto vecchio che ha ricevuto un failure negli ultimi14d resta quale **stato operativo corrente minimo**, non storico eventi; una volta non più alimentato, torna eleggibile. Stesso termine14d, nessuna estensione ai log eventi. Nessun account/contenuto è presente nello schema incidente. Hold esplicito protegge la relativa riga. Il precedente collector canary resta un gate separato, non viene dichiarato risolto da uno smoke di questo orchestratore.

Run receipt nuova: operation_id casuale/derivato per debug, path, dry_run, batch_limit, started_at, finished_at, status, eligible/deleted/protected/skipped, safe error enum. Niente contenuti/ID utente/device/URL/secret. Retention14d come diagnostica minimizzata; cancellazione tramite stesso path observability. Non sostituisce ricevute PHOTO7d o policy prodotto.

## Batch e transazioni

Default100, range1–200; limite **totale per RPC**, non per tabella. Ordinamento due/rel/key deterministico. Conteggi eligible e protected sono bounded al limite; NON sono stime globali del backlog. Ogni DELETE usa PK tipizzata/unique, una riga, senza cascade implicita ammessa. Indici nuovi su analytics_days/fairness.created_at, ops_admission.created_at, push_bindings.expires_at e runs.finished_at. Query plan reale: index scan; backlog sintetico5000, batch100 circa0,70s dopo ottimizzazione (prima circa9,36s).

Una RPC = una transazione breve. Try-lock non accoda attese globali; riusa il lock hold/board e quello Analytics/OPS pertinenti. Row lock `FOR UPDATE SKIP LOCKED`; dopo lock ricontrollo puntuale per PK con snapshot READ COMMITTED corrente. Nessuna scansione dell'intero backlog per ciascuna riga. Un errore rollback dell'intero batch, deleted=0, stato failed/codice sicuro; stesso operation_id failed può essere riprovato. Completato/paused replay restituisce receipt e non riapplica DELETE; operation_id riusato con argomenti diversi è rifiutato. Un nuovo tentativo dopo pausa deve usare una nuova operation_id.

Modulo orchestratore: max4 batch/path di default, configurabile1–8, batch100 default. Ogni RPC usa una transazione separata; nessun lock globale per l'intero ciclo. ID batch deterministico da operation_id del ciclo/path/indice. Failure isolata alla categoria. Se il budget finisce con batch pieno o lock busy, risposta `partial`/`needs_followup`, mai falso successo. Un ciclo con soli path paused è `paused`, non failure. Lo scheduler giornaliero non è ancora installato/attivato; la capacità di smaltire il carico pilot entro circa24h va verificata prima di abilitazioni ordinarie: il budget bounded non autorizza accumulo silenzioso. Follow-up manuale esplicito con nuova root operation_id oppure budget maggiore; non introdotto un secondo cron nascosto.

## Hold e cascade

- `phase_a_held` protegge target esplicito (ID o chiave composita canonica JSON), hold account e seam DD; `dd_retention_held` mantiene le categorie DD già esistenti. Hold attivo non scade al review_due.
- FK entrante nuova/non prevista => `SCHEMA_DRIFT`, rollback batch. Il controllo verifica schema effettivo a runtime; non si basa solo su convenzioni di nome Storage.
- DD exposures prima; allocation solo senza exposure; window solo senza figli e senza riferimento legacy interests. Exposure ancora referenziata da intent/operation Spot v2 è protetta: nessun SET NULL su dati Spot. Un figlio held resta e impedisce DELETE parent. Nessuna cancellazione Match/chat/Spot e nessun decremento/rimborso quote. Building/failed/lease non null non sono eleggibili; richiedono classificazione/review, non timeout-purge.
- Notifications: child delivery solo per binding scaduto/inactive; hold binding/account/event/delivery protegge il figlio. Sending e unknown protetti. Binding solo dopo assenza di TUTTI i figli. `FOR UPDATE` parent impedisce nuove FK key-share durante il recheck/delete. Nessun cascade delete usato per aggirare un figlio held.
- Un'incertezza non si risolve cancellando per età. Nessun auto-release moderazione, nessuna nuova durata safety.

## Off / pause / rollback operativo

Controlli iniziali/finali `manual_enabled=false`, `scheduler_enabled=false`. Nessuna funzione client può mutarli. Il worker manuale restituisce paused senza purge se manual_enabled=false; dry-run resta disponibile ma crea la receipt tecnica documentata. Nessun nuovo cron è creato dalla054. Pausa: admission batch OFF + scheduler OFF impediscono nuovi batch; una transazione già avviata termina atomicamente. Mantenere schema additivo, non rollback distruttivo dei dati; versione Edge precedente può essere ripristinata lasciando controlli OFF. Non tornare né intervenire sul writer PHOTO.

PHOTO NON integrata: nessun richiamo lifecycle nel worker retention. Il solo teardown della fixture Auth della prova concorrente usa il normale delete account e lascia una receipt conclusa soggetta ai7d già esistenti. Correnti/review/unknown, decoder, quota, grace, receipts PHOTO e scheduler restano invariati.

Fuori scope: QoD/system question/answers/claims, Spot v2/operations/quota, romantic attempts/requests/guards, report/moderation/safety purge, Match/chat, legacyinterests, privacy legacy7d, security logs30d, backup/provider logs e legal review. Nessuna loro retention viene definita per analogia.

## Proposta scheduler giornaliero — NON eseguita

Nome proposto `soma-retention-phase-a-staging`, cron **`0 3 * * *` UTC**, una volta al giorno; nessun riferimento Europe/Rome. Prima verificare `cron.timezone` UTC/GMT (nel catalogo staging il GUC non è valorizzato; non modificarlo globalmente senza distinta verifica/autorizzazione). Ritardo nominale circa0–24h dal cutoff, salvo backlog/outage/hold: partial deve essere osservato e gestito, non dichiarato rispetto del cap.

Definizione del comando candidato, da registrare solo dopo approvazione separata:

```sql
select net.http_post(
 url := 'https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/operations',
 headers := jsonb_build_object(
  'Content-Type','application/json',
  'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets
    where name='soma-photo02-cutover-staging-key')),
 body := jsonb_build_object('action','phase_a_run',
  'operation_id',('a1a154ff-0000-4000-8000-'||
    to_char(clock_timestamp()at time zone 'UTC','YYYYMMDD')||'0001')::uuid,
  'dry_run',false,'batch_limit',100,'max_batches',4),
 timeout_milliseconds := 60000)
where exists(select 1 from spot_private.retention_phase_a_control
 where manual_enabled and scheduler_enabled);
```

Nessun valore credential viene letto nel client/chat/report. Percorso Vault→Edge service-role collaudato manualmente dry-runHTTP200. La risposta HTTP200 **non basta**: verificare JSON status, needs_followup, tutti i run; request ID di pg_net non è prova di purge. View service-only `retention_phase_a_status()` e ledger minimizzato permettono verifica. Email alert resta disabilitata senza provider; non è stata introdotta una nuova destinazione o soglia.

Prima di approvare ON: suite stabile, canary/dry-run, capacità/backlog/lag, timezone cron, owner della review partial/failure e rollback OFF verificati. Non attivare i tre cron legacy per attivare questo worker. L'autorizzazione richiesta è separatamente **STAGING RETENTION SCHEDULER = ON**. Nessuna approvazione Production implicita.
