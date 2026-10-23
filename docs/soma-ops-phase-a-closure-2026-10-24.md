# SOMA — OPS BLOCKER CLOSURE PHASE A

24 ottobre2026. Branch `codex/soma-schema-v2-staging`; baseline `8a3067a30253cfe6d2cd5cebc9c55384556b2a39`. Target unico staging `zjinjtkekmaqtxsuyvho`. **OPS PHASE A: BLOCKED**: audit, processo e prove locali completati; provisioning umano e provenienza completa dello storico migration non ancora dimostrati. Nessun cambiamento runtime, schema, dati staging, account, secret, Auth, flag o scheduler. Nessuna chiamata a Production, GCP o Vercel. Nessun lavoro su altri blocker.

## A–F. ADMIN / MODERATOR / recovery

[Procedura operativa dettagliata](soma-ops-staff-provisioning-recovery-2026-10-24.md), con passi manuali, endpoint/RPC, custodia MFA e limiti. Nessun hardcoding email o accesso DB/service-role dal client.

| Area | Verificato | Stato live / limite |
|---|---|---|
| ADMIN | Ruolo distinto ma comprende moderation; dashboard051/health053 richiedono ADMIN, verified MFA e AAL2 server-side | ADMIN attivi0, eventi ruolo0. Nessun nuovo account/grant |
| MODERATOR | Code e review autorizzate; Analytics/health/role-set negati. Ban/release/reopen del percorso025 riservati ADMIN | MODERATOR attivi0. Custode/persona/account non nominati |
| MFA | AAL1, fattore mancante/nonverified negati; pannelli fanno challenge del fattore già enrolled | Enrollment umano non eseguito; pannelli attuali non offrono enrollment/reset-password. Nessuna falsa MFA SQL cloud |
| Revoca | `active=false` controllato su ogni RPC; vecchi claim e nuovo contesto login restano negati, sia ADMIN sia MODERATOR | Test su PostgreSQL embedded e schema/RPC attuali, non nuovi login/TOTP/session-revoke cloud |
| Recupero | Processo tramite ADMIN sano o owner provider verificato; recovery su nuova identità testato come separazione server | Lost-device/account recovery reale non eseguito, owner/custodi mancanti |

**Cautela dimostrata e non corretta cambiando semantica:** regrant allo stesso UUID rende nuovamente autorizzati anche claim AAL2 precedenti che siano ancora validi. Un logout/revoke dei refresh token non dimostra revoca istantanea degli access JWT. Dopo compromissione mantenere il vecchio UUID revocato e usare nuova identità dedicata/MFA verificata. Per recuperare lo stesso UUID occorre prova di scadenza di tutti i JWT precedenti, sessioni e TTL massimo verificati; altrimenti STOP. Il ruolo025 non ha grant/session epoch o legame token→fattore. Nessun bypass introdotto.

**Passo necessario dal founder:** nominare due nuove identità staging, UUID e custodi; signup/conferma ordinari, credenziali proprie e MFA vero tramite setup Auth fidato. Non mandare password, seed, OTP, QR o recovery code in chat. Quindi bootstrap nominativo del primo ADMIN da owner autorizzato (con audit/opid e controllo concorrente), grant MODERATOR dalla RPC ADMIN e smoke reale. Non riutilizzare vecchie fixture, non promuovere l'account attualmente aperto o account di amici. La richiesta asincrona dei soli UUID/custodi è rimasta senza risposta durante l'audit; nessuna nomina è stata dedotta dal generico “procedi”.

## G–I. Inventario e riconciliazione migration

[Mappa canonica completa](soma-ops-phase-a-migration-map-2026-10-24.md) e [identità file/evidenze JSON](evidence/ops-phase-a/migration-map.json). Inventario53 file attivi, nessun identificatore duplicato;17 righe live e nessuna versione registrata senza file attivo.

| Gruppo | History staging | Identità / trattamento |
|---|---|---|
| 001–015 | Registrate, uno statement ciascuna | MD5 dei bytes dello statement uguale al file completo per tutte15; SHA-256 file nella mappa |
| 016 | Registrata, zero statement | L'identità storica del file non è provata dal ledger vuoto; effetti/schema corrente ricostruibili. Nessun replay |
| 017–044,046–053 | **36 versioni non registrate**, oggetti correnti presenti | Definizioni/componenti confrontate, non prova di esecuzione storica dell'intero file. Nessun repair cumulativo |
| 029 | Compresa tra le36 non registrate | Backfill **solo dati**, legato a snapshot3Auth/3profili/2venue/2membership ecc. Il guard rifiuta giustamente un DB vuoto. Dati e provenienza storica non ricreati da oggetti DDL: esplicitamente unresolved |
| 045 | Nessun file attivo, nessuna riga | Bozza deliberatamente non applicata, sostituita047; evidenza nel contratto QoD. Non riempire il buco né applicare stash |
| 054 | Registrata,24 statement | File SHA-256 noto e corpi finali coerenti; stringa degli statement parserizzati non è il file originale byte-per-byte. Nessuna cancellazione/riparazione di una riga già corretta |

**Riparazioni metadata effettuate:0.** Lo scopo non autorizza a certificare retroattivamente un intero file dalla sola presenza di tabelle/funzioni. I report precedenti documentano applicazioni candidate e allineamenti mirati (026nonce,050Analytics,051dashboard,053OPS); si conserva questa distinzione, senza cambiare vecchi file o attestare falsamente un'unica esecuzione canonica. Non eseguire `db push`, migrazioni vecchie o un repair17–53 per “allineare” i numeri.

Per chiudere lo storico occorre un successivo piano nominativo che colleghi ricevute di esecuzione/patch storiche alle identità finali, distingua versioni dati-only e bootstrap non numerati e autorizzi ogni eventuale repair supportato dal provider. Il presente inventario individua gli oggetti/identità verificabili e le eccezioni, ma non converte un'incertezza in migration applicata. Se manca la prova storica, resta un'eccezione dichiarata; un eventuale baseline consolidato futuro non deve riscrivere lo storico Production o i file originari.

## J. Riproducibilità e confronto schema

**Riproducibile con eccezioni documentate per lo schema applicativo previsto; NON riproduzione generica di tutto lo staging con il solo comando migration-up.** Eseguito localmente, senza network o dati reali:

1. Database PGlite/PostgreSQL vuoto, ruoli e strutture Auth/Storage stub dichiarati. Default ACL public Supabase esplicitamente modellati solo dopo verifica live read-only. Nessuna Auth server, firma JWT provider o Storage byte viene simulata come reale.
2. File001–016 eseguiti senza modificarne il testo; bootstrap `supabase/cutover/prepare.sql` prima017 e `photo_cutover_set('close',...)` su zero writer.017–023 applicate; dichiarazione staging tramite RPC esistente `privacy_staging_enable` prima024/025, solo sessione locale.
3. 029 provata in DB vuoto: fallisce `BACKFILL_SNAPSHOT_DRIFT`, rollback e skip **espliciti**, non disattivazione del guard. Restanti file eseguiti esattamente fino054.52 file applicati,1 eccezione dati-only.
4. Nessun codice dei normali helper DD/romantic usato per attivare feature, seedare utenti, falsare il clock o sostituire funzioni nella ricostruzione. Il bootstrap di piattaforma riusa soltanto `database({limit:0})`.
5. Confronto con snapshot live metadata-only: nessuna modifica staging, né dump di contenuti/foto/credenziali.

| Oggetti nel perimetro | Esito |
|---|---|
| Tabelle public/spot_private, RLS/forceRLS | **99/99** uguali |
| Colonne, tipo/nullability/default | **635/635** uguali |
| Indici | **175/175** uguali |
| Trigger applicativi inclusi trigger Auth | **61/61** uguali |
| Policies public/private/Storage | **12/12** uguali |
| Constraint non-null esclusi | **422/422** uguali |
| Funzioni numerate/bootstrap, body hash e proprietà confrontate | **279/279** uguali, incluse security-definer/config/volatility/return-type e privilegi execute anon/authenticated/service_role |
| Privilegi relazione SELECT/INSERT/UPDATE/DELETE | **297/297** combinazioni uguali |
| Funzioni live aggiuntive | **5**, tutte attribuite ai file scheduler non numerati sotto, corpi5/5 uguali |

Limite del confronto: è un inventario delle proprietà elencate, non ogni possibile proprietà del catalogo PostgreSQL né una prova di equivalenza semantica universale. Hash MD5 dei corpi come diagnostica di uguaglianza, SHA-256 per identità dei file; nessun corpo/credenziale restituito dalle query live.

Differenza di catalogo dichiarata: PGlite/PostgreSQL18 espone466 constraint NOT NULL nominati aggiuntivi rispetto al server staging17.11. Nessun NOT NULL viene ignorato semanticamente: `attnotnull` coincide per tutte635 colonne. Si conserva il delta grezzo nell'evidenza, senza normalizzare via ALTER sullo staging. Default grants Supabase verificati nel postflight spiegano35execute service-role e6relazioni public che differivano nel primo confronto con stub senza ACL; la ricostruzione finale include esplicitamente quel prerequisito e il delta dei privilegi è0.

Dipendenze extra non numerate:

- `supabase/cutover/prepare.sql`:14 corpi live corrispondenti; indispensabile prima017, non da reinstallare su staging.
- `supabase/cutover/scheduler.sql`:1 funzione live corrispondente.
- `supabase/staging/017_photo_lifecycle_scheduler.sql`:1 funzione live corrispondente.
- `supabase/privacy-staging-scheduler.sql`:3 funzioni live corrispondenti.
- `supabase/staging/bacheca-nonce-alignment.sql`:3 corpi corrispondenti, già incorporati nella026 finale; patch storica, non nuovo step da eseguire.

Le definizioni scheduler sono ricondotte ai file con hash del corpo **senza chiamarle** o modellare Vault/cron/pg_net come restore reale. L'ordine di setup/config e bootstrap è un'eccezione della riproducibilità globale. Edge/Auth provider/config operativa e bytes Storage non si ricostruiscono dalle sole migration.

## K–L. Test e verifiche

Quattro test aggiunti: inventario IDs/checksum/045/029; replay esatto con eccezioni e riconoscimento drift; MODERATOR AAL1/factor/revoke/new-login; ADMIN revoke e recovery isolata con dimostrazione del limite regrant stessoUUID. Riutilizzati i test esistenti su role RPC, audit/retry e isolamento.

Risultati finali e SHA dei log: [verification.json](evidence/ops-phase-a/verification.json). Suite completa **783/783 PASS**, targeted **7/7 PASS**, build PASS, typecheck PASS, diff-check PASS. Test di provisioning/recovery sono locali, non collaudo umano live. Nessuna prova cloud affermata per supplire alla mancanza di credenziali/owner.

## M. Account, dati e controlli

Nessun account o fixture cloud creato, nessun account intenzionalmente mantenuto da questo task. Nessun utente esistente modificato. Pre/post:4Auth,4profili,42Storage,1Match,2messaggi; ADMIN0/MODERATOR0/eventi0. Fingerprint profili/Storage, conteggi, controlli, cron e history identici tra le due letture. Non affermare “zero fixture pregresse”: i4account preesistenti non vengono riclassificati né eliminati.

DiscoveryOFF, NotificationsOFF, PHOTO admissionOPEN/cleanupOFF/schedulerOFF; unico cron attivo già esistente PhaseA03UTC, lasciato invariato. Nessun tick, purge, backup, SMTP, Vercel o nuovo test prodotto avviato. Nessun intervento sui3review/unknown PHOTO preesistenti. Main e Production invariati; nessun deploy o merge.

## N–Q. File, commit e gate

File nuovi: questo report, mappa migration, runbook staff, evidenze `docs/evidence/ops-phase-a/`, script **offline** `scripts/ops-phase-a-inventory.mjs`, query metadata/counts read-only `supabase/tests/ops_phase_a_catalog.sql` e `ops_phase_a_state.sql`, test inventario. File aggiornato: `tests/ops-readiness.test.js`. **Zero migration nuove o modificate; zero runtime/API/RLS modificate.**

Baseline tree per confronto: `src=b52566b876449f7b75867866c328815e15d9288f`, migration=`5005acb3151d5526bda8730b2886b8afc8941b04`, functions=`5637ab8bb4575069bcae93a9e2aecc5284176e43`,054 blob=`a45f16732d58ba06b03d51644adb3baa1ea6e64e`. Main locale/remoto=`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Consegna: commit documentazione/tooling/test su branch staging, push senza force, SHA remoto e working tree verificati nel messaggio finale. Il commit non viene scritto dentro se stesso.

Gate ancora aperti **solo Fase A**:
1. Due identità dedicate/custodi, enrollment umano, bootstrap autorizzato e smoke live provisioning/revoca/recovery.
2. History36versioni assente +016senza statement e029data provenance non dimostrati. Nessuna certificazione o repair basati su supposizioni.

Gli altri blocker OPS rimangono fuori task; questo report non li aggiorna o chiude implicitamente. Nessuna nuova feature o fase avviata.

**OPS PHASE A: BLOCKED**
