# Recovery v3 — clock harness fix e prosecuzione Storage

29 ottobre 2026, branch `codex/soma-schema-v2-staging`.

**ISOLATED RECOVERY V3: BLOCKED**. Il test moderation è corretto e verde. Il DB restaurato è stato riutilizzato; byte Storage e accesso privato sono verificati. La prosecuzione si ferma sul bootstrap API locale: PostgREST richiede uno schema assente e il bootstrap Storage aggiunge una funzione non presente nell'inventario del checkpoint. Nessun secondo restore, rimozione di vincoli o workaround applicato. Auth/MFA recovery e RPO/RTO non sono attestati.

## A–E. Correzione harness e verifiche

- `qodDatabase(t, {freezeClock=true}={})`: default invariato; disabilitazione del clock sintetico soltanto nel test non-QoD `Anonymous block preserves named Match/chat and delivered request/profile; only future delivery suppressed neutrally`.
- L'helper locale del test inoltra l'opzione. Nessuna assertion modificata. `profile_request_authorized()`, blocchi anonimi/profilo e codice prodotto invariati.
- Una sola esecuzione focalizzata dopo la correzione: **1/1 PASS**. Richiesta valida e autorizzazione profilo vere già prima del blocco; dopo il blocco anonimo rimangono vere; `authorized_profile` restituisce **1**. La diagnostica era in memoria, senza registrare contenuti o credenziali.
- Suite mirate moderation/profile/anonymous block/romantic/QoD: **77/77 PASS**, escludendo dal run mirato la singola prova appena eseguita. Il default dei test QoD rimane `freezeClock=true`.
- Prima della prosecuzione recovery: full suite **852/852 PASS**, build e typecheck PASS. Nessun rerun-until-green.
- Fix harness committato e push verificato: `415f993ad697b7a4e3180b79301129c0a89dfc2e`, working tree pulito prima della prosecuzione.
- Nuovi contratti operativi Storage/Auth locali: **3/3 PASS**. Suite finale dopo i nuovi tool: **855/855 PASS**, zero fail/skip/cancel, build e typecheck PASS. Nessun rerun dopo fallimento. Riferimenti Git nella consegna finale/evidence.

## F. DB riutilizzato

Database `soma_recovery_v3_retry_20261028`, PostgreSQL 17.11, owner `postgres`; `public` owner `pg_database_owner`. Nessuna nuova importazione DB. Prima dell'avvio API l'inventario conservava 137 tabelle, 316 funzioni, 125 RLS enablements, 12 policy, 343 ACL e 15 default ACL; hash `6bba7b606352b281f3ad44b678e8d6f27ff8fe15f9e15a41372c5afd07c40e5b`.

Archivio v3 originale invariato: checkpoint `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`, SHA-256 `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae`, 46 file. Nessuna nuova cattura o attività GCP.

## G–H. Storage: PASS

- Apertura autenticata dell'archivio; ripristino dei **42 oggetti** attraverso il `FileBackend` reale dell'immagine Storage v1.82.1, preservando nomi, versioni e metadata MIME/cache tramite l'API backend provider.
- Volume Docker Linux dedicato `soma-recovery-v3-storage-20261028`: necessario per gli extended attributes usati dal backend. Nessun upsert delle righe `storage.objects`, upload prodotto o modifica dei riferimenti PHOTO.
- **42/42** file fisici verificati per dimensione/SHA-256 e successivamente **42/42** scaricati/hashati tramite l'API Storage privata del recovery.
- Download senza credenziale e percorso pubblico: HTTP **400**, nessun byte immagine restituito. Download server autorizzato: HTTP **200**, SHA-256 identico per tutti i file.
- Mapping DB↔Storage PASS: **12** varianti canoniche correnti richieste presenti, **0** oggetti non riconciliati, **0** canoniche mancanti. Gli altri 30 oggetti sono riferiti dai ledger/lifecycle originali: non sono dichiarati orfani né cancellati.
- Digest righe Storage e ledger PHOTO invariati anche alla verifica finale. Nessuna modifica a lifecycle/retention/admission PHOTO.

## I–M. STOP prima di Auth/MFA e application smoke

### Replay post-cutoff

Confronto read-only con staging tramite lettore backup già autorizzato: hold, suspension e moderation invariati; piano riconciliato con **una cancellazione account** post-cutoff. È la fixture sintetica vuota presente nel checkpoint e già cancellata dalla sorgente. Nessun account staging creato o modificato.

Il target conferma assenza di profilo, oggetti Storage o ruolo per questa identità. Il candidato executor usa i normali RPC e `cleanupPhotoAccount`, senza DELETE Auth manuali, FK bypass o reset password. Il primo RPC **non è stato eseguito**: PostgREST lo rifiuta prima della risoluzione della funzione. Nessun replay completato; la fixture resta nel target in quarantena e non deve poter effettuare login.

### Blocker esatto: configurazione REST locale

```
HTTP 503 / PGRST002
Could not query the database for the schema cache. Retrying.
SQLSTATE 3F000: schema "graphql_public" does not exist
```

Il servizio locale ereditava `PGRST_DB_SCHEMAS=public,graphql_public` dal vecchio stack locale. Il checkpoint ripristina gli schemi applicativi/Auth/Storage previsti, non `graphql_public`. È un mismatch tra configurazione del servizio locale e perimetro del restore, non il precedente bug moderation né un errore di ownership del DB. Nessuna chiamata API può essere attestata finché la cache schema non si carica.

### Ulteriore drift di bootstrap rilevato

Il confronto schema-only dopo l'avvio dei servizi mostra **una sola aggiunta**, nessuna rimozione/modifica degli oggetti originari:

`storage.enforce_versioning_status_transition()`

Owner `supabase_storage_admin`, funzione trigger PL/pgSQL, **non SECURITY DEFINER**, ACL esplicita nulla. Controlla transizioni di `versioning_status`; non contiene contenuti o credenziali. L'avvio del runtime Storage ha quindi effetti DDL di bootstrap da includere esplicitamente nel contratto operativo. Non si dichiara equivalenza esatta dello schema dopo tale bootstrap. La funzione non è stata rimossa o modificata per nascondere il drift.

I tre nuovi servizi recovery Auth/REST/Storage sono **arrestati**, senza porte pubblicate. Volume e DB conservati. Nessun login umano è stato richiesto o eseguito: **zero sessioni, refresh token e fattori MFA** nel DB recovery alla chiusura. I ruoli durevoli ADMIN e MODERATOR restano presenti e attivi; ciò non costituisce prova di accesso AAL2. Nessun fattore o ruolo sorgente modificato.

| Prova finale | Esito |
|---|---|
| Source USER/ADMIN/MODERATOR JWT contro target recuperato | NON ESEGUITA |
| Source refresh capability contro target | NON ESEGUITA |
| Fresh recovered USER login | NON ESEGUITO |
| Secure staff MFA re-enrollment e AAL2 | NON ESEGUITO |
| Separazione privilegi API ADMIN/MODERATOR recuperati | NON VERIFICATA |
| Application smoke dopo restore | NON ESEGUITO |

I vecchi probe contro il precedente DB locale non sono promossi a prova post-restore. Il founder ha confermato disponibilità per i login/MFA privati: nessuna azione umana è necessaria finché il bootstrap è bloccato.

## N–P. Misure e prossimo gate

**RPO e RTO: NON MISURATI / NON ATTESTATI.** Storage e DB da soli non chiudono il recovery end-to-end.

Prossimo task minimo: allineare esplicitamente il bootstrap API al contratto recuperato, verificando quali schemi REST siano realmente necessari e classificando il DDL automatico Storage. Valutare una configurazione REST limitata agli schemi realmente ripristinati se equivalente al runtime Soma; non creare uno schema vuoto, stripping ownership o broad grant come espediente. Prima di altri login/replay, dimostrare il carico schema/API e l'equivalenza delle autorizzazioni. **Nessuna nuova importazione DB è attualmente giustificata.** Nessun cloud target/costo aggiuntivo richiesto da questo errore.

## Q–S. Perimetro, file e Git

Tooling aggiunto solo sotto `scripts/recovery/`, test dedicati sotto `tests/`, questo report ed evidence minimizzata. Nessuna modifica a `src/`, `supabase/`, migration 055, Auth/sessioni/MFA sorgenti, policy, cron/scheduler o feature flag. main/Production invariati; nessun deploy o alias modificato.

Configurazioni locali contenenti credenziali del solo target: file ignorati da Git, permessi 0600, mai stampati/coperti dai report. Materiale decifrato temporaneo Storage rimosso dopo l'import. Nessuna chiave/token/OTP/QR in Git o evidence. Le risorse locali sono conservate in quarantena per la diagnosi, non presentate come fixture cleanup completo o ambiente pilot pronto.

Vedere [evidence finale](evidence/ops-phase-a/recovery-clock-fix-storage-continuation-2026-10-29.json). Hash commit finale, push e working tree nella risposta conclusiva.
