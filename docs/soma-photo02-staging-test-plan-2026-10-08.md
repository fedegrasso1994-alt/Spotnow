# Soma — PHOTO-02: piano test e staging

8 ottobre 2026. Prima fase: **test da implementare**, non risultati di PHOTO-02. Baseline `f477c39`. Riferimento: [audit/design](soma-photo02-design-2026-10-08.md). Suite esistente rieseguita 188/188 PASS; build e typecheck PASS. Nessuna migration o function PHOTO-02 deployata.

## Perimetro e sequenza

1. Congelare contratto e approvare durate/quota/cache/owner dei casi needs_review. Implementazione iniziale configurabile, dry-run default, nessun purge attivo per decisioni mancanti.
2. Codice in modulo lifecycle separato; test unitari e DB con fake clock/transport fault deterministici; migration017 separata/additive; vincoli privati e role tests. Versionare prima del deploy staging.
3. Preflight staging: snapshot schema/RPC/RLS/grants, configurazione Auth, bucket, versioni Edge, estensioni, quota e log. Verificare che API PHOTO-01 siano quelle versionate; non supporre drift assente. Inventario già letto: 3 profili,40 oggetti,2 legacy sintetiche; non eliminare nulla senza un manifest di fixture verificato. Nessuna copia di produzione.
4. Nuova venue isolata, due owner, un peer autorizzato e uno non autorizzato; credenziali sintetiche private, immagini generate, nominativi fittizi. Nessun account/foto/amico reale. Snapshot degli oggetti esterni al manifest per dimostrare preservazione.
5. Apply017 staging e deploy collector service-only con execute OFF. Scheduler pg_cron/pg_net da abilitare solo lì; segreto in Vault, nessuna chiave nel repository. Dry-run completo e confronto con manifest prima di execute. Non richiede nuovo provider; se emerge costo/upgrade, fermarsi prima dell'acquisto.
6. Eseguire matrice sotto con latches/barriere controllate. Due connessioni Postgres reali per lock/race; PGlite non basta per SKIP LOCKED e concorrenza reale. Trasporti Storage reali per successo/assenza; fault injection isolata solo sulle fixture, protetta e rimossa dopo test. Non installare backdoor o endpoint di test in produzione.
7. Eseguire scheduler senza richieste dell'utente, kill/restart worker, pause/resume e rollback rehearsal. Pulire solo fixture del manifest; verificare Auth/DB/Storage e hash dei dati non coinvolti.
8. Suite completa/build/typecheck/release check e benchmark UI/foto; commit test/evidence. NO-GO produzione finché tutti i gate obbligatori non passano. Rollout sarà task separato con codice già su GitHub, pre/post controlli e autorizzazione specifica.

## Matrice automatica richiesta

| ID | Scenario | Livello / aspettativa |
|---|---|---|
| INV-01 | Manifest tre oggetti + entrambe preview DB | Unit/DB/cloud: inventario completo; originali input mai persistiti |
| INV-02 | Asset vecchio, job corrente e attempt precedente | DB: tutti i path restano tracciati dopo retry |
| INV-03 | Oggetto sconosciuto, path nested, cross-owner, collisione | DB/cloud: needs_review, zero cancellazioni euristiche; nessun owner estraneo coinvolto |
| INV-04 | Canonicale o variante registrata realmente mancante | Cloud: assenza confermata separata da 403/5xx/timeout; profilo non cancellato |
| INV-05 | Dry-run ripetuto | DB/cloud: zero mutazioni, zero advance retry, stesso esito a stato immutato |
| REP-01 | Replacement JPEG/PNG/WebP | Cloud: nuova validata/pubblicata prima del ritiro; nessun cambio limiti PHOTO-01 |
| REP-02 | Errore decode, Storage1/2/3, finalize o profile commit | Unit/DB/cloud: vecchia foto/profilo restano correnti; parziali registrati e infine rimossi |
| REP-03 | Purge prima/dopo commit profile | Due transazioni reali: soltanto un ordine vince; nessuna foto corrente cancellata |
| REP-04 | Tentata ripubblicazione retired/purging | DB con vecchio upsert client: negata se claim ha vinto; nessuna finestra SELECT/delete |
| REP-05 | Reader con vecchia signed URL e nuovo profilo | Browser/cloud: nuovo path corretto; vecchio leggibile nel grace secondo contratto; nessun flicker introdotto |
| REP-06 | Profilo save perso dopo commit e retry | DB/cloud: stesso risultato; nessuna doppia retirement/purge; server corrente non cambia indietro |
| UP-01 | Due upload concorrenti stesso owner | Due worker reali: una lease/admission attiva, niente double quota o due finalizer validi |
| UP-02 | Due owner contemporanei | Cloud: isolamento; un owner busy non blocca permanentemente gli altri |
| UP-03 | Stesso nonce/hash, nonce riusato con hash diverso | DB: idempotenza o conflitto esplicito; niente bypass rate/quota |
| UP-04 | Retry dopo purge draft / ready corrotto | DB/client: non restituisce path inesistente; rinnovo nonce controllato, niente loop infinito |
| DEL-01 | Delete account completo | Cloud: tre oggetti, preview/registry/job/attempt/set e normali dati correlati eliminati; Auth assente |
| DEL-02 | Delete durante decode/write/finish/profile publish | Cloud: account quarantinato; nessuna nuova pubblicazione, niente successo mentre writer irrisolto |
| DEL-03 | Risposta write persa ma Storage completa in ritardo | Unit + cloud: intent unknown conservato; riapparizione rilevata; completed non falso. **Gate bloccante** |
| DEL-04 | Timeout al purge; oggetti rimossi ma risposta persa | Unit/cloud: verify + retry idempotente, nessuna rimozione di set corrente/estraneo |
| DEL-05 | Crash dopo Storage, prepare, Auth delete | Cloud: queue persiste e completa senza JWT dell'utente; nessun success prematuro |
| DEL-06 | Oltre una pagina e folder annidati | Cloud: enumerazione ricorsiva bounded, nessuna omissione per offset mutante; verifica zero residui |
| DEL-07 | Delete photo corrente | DB: negato senza replacement/account delete; foto obbligatoria e UX invariate |
| GC-01 | Cleanup due volte; due collector stessi task | DB/cloud: claim unico, assenza idempotente, contatori corretti |
| GC-02 | Collector interrotto e ripreso; fencing scaduto | DB/cloud: task reclaimed, worker vecchio non finalizza, zero perdita di stato |
| GC-03 | TTL/grace boundary esatto e ±1ms | DB fake clock: non prima; dopo soltanto se gli altri predicati sono soddisfatti |
| GC-04 | Batch/cursor, backlog, scheduler overlap | DB/cloud: lavoro bounded e ripetibile; corrente non eliminata; nessuna starvation persistente |
| Q-01 | Quota esatta e +1byte incluse prenotazioni | DB: atomicità, niente oversubscription o quota liberata su HTTP ambiguo |
| Q-02 | Molti replace, massimo output, collector OFF | Cloud: spazio resta bounded o admission rifiuta; never delete current per fare spazio |
| Q-03 | Uso normale/burst e cleanup pre-admission | Browser/cloud: retry ragionevole, toast esistente; misure cold/warm e caricamento griglia/dettaglio rispetto alla baseline |
| CACHE-01 | Logout/owner change/block, refresh path e decode in corso | Browser/unit: lease Blob protetta, invalidazione mirata, nessuna foto di altro owner riutilizzata |
| CACHE-02 | Browser HTTP/CDN e signed URL expired | Cloud/browser: headers effettivi e accesso dopo purge misurati; nessuna promessa di revoca immediata dei pixel |
| CACHE-03 | CacheStorage/localStorage/IndexedDB reale | Browser: nessuna nuova persistenza foto, preview o signed URL; SW soltanto offline.html |
| OBS-01 | Retry/transient/permanent/completed | Unit/cloud: codici e contatori distinti; alert/dead-letter visibile e nessuna failure silenziosa |
| OBS-02 | Log e report | Unit/cloud: nessuna foto, preview, JWT, email, URL firmata o path personale; evidence aggregata |
| AUTH-01 | RPC/collector invocati da anon/user | DB/cloud: accesso negato; niente service credential nel frontend, nessun allargamento Storage/RLS |
| REG-01 | Onboarding, edit e refresh profilo | Browser/cloud: funziona con vecchio e nuovo client; nome/età/preference/occupation e foto obbligatoria invariati |
| REG-02 | QR, Ora90min, Tribe, Spot, match, chat | Cloud/browser: active/expired, reciprocità e send/read come prima; nessuna nuova retention social |
| REG-03 | PHOTO-01 corpus e limiti | Unit/staging: 8MiB/8192/JPEG12MP96MiB/PNG8bit12MP/WebP6MP64MiB e rejection patologici invariati |
| ROLL-01 | Pause collector e rollback | Cloud: nuove foto/current photo usabili, queue conservata, raw fallback ancora negato |

## Oracoli e reporting

Un test PASS richiede sia la risposta API sia gli effetti: profilo corrente, manifest, oggetti reali, preview/validation/queue e diritti di lettura. Verificare prima/durante/dopo; non equiparare HTTP200, una COUNT SQL o un array remove vuoto al successo completo. Per race usare barriere osservabili, non attese arbitrarie. Ogni richiesta timeout resta irrisolta finché la riconciliazione ne prova l'esito; non cancellare il ledger per far passare il conteggio.

Il collaudo di purge non richiede recuperare originali persi. Una variante può essere rigenerata dalla canonicale ancora integra; canonicale persa non si ricrea dalla thumbnail dichiarandola HD. Registrare anomalia/azione necessaria senza cambiare profilo o nascondere il finding.

Output staging: versione Git e hash Edge/migration, manifest fixture privato, risultati aggregati per test, tempi e picco memoria collector, byte/oggetti owner prima/dopo, retry e anomalie, queue final state, baseline non-target preservata, scheduler e rollback. Nuova evidence senza dati personali. Distinguere PASS/FAIL/BLOCKED/NOT RUN; i risultati baseline188 non contano come nuove race PHOTO-02 superate.

Criteri GO produzione futuri: tutti i gate obbligatori PASS, unknown writer zero o caso gestito fail-closed dimostrato, nessun residuo dopo completed, quote e fairness verificate, zero regressioni social/foto e test security, policy founder approvate, scheduler/alert/owner operativi, rollback provato, sorgenti versionati e approvazione rollout. Nessuna garanzia “mai un errore”: gli errori devono essere gestiti, osservabili e recuperabili.
