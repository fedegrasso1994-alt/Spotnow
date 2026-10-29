# Local restore bootstrap — retry v3

**Follow-up 29 ottobre:** [clock harness fix e prosecuzione Storage](soma-recovery-clock-fix-storage-continuation-2026-10-29.md): moderation harness risolto, DB riutilizzato, Storage bytes/hash/private access PASS. Recovery ancora bloccato sul bootstrap API locale; esito storico sotto preservato.

28 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `228a1444db29e336e15175a5bd9f5ca6374013db`.

**ISOLATED RECOVERY V3: BLOCKED**. Il blocker ownership è risolto: l'unico retry autorizzato ha completato il restore DB, la barriera Auth vuota e il confronto owner/ACL/RLS. Lo STOP successivo è un fallimento osservato nella suite completa, fuori scope bootstrap. Storage bytes/Auth/MFA recovery non sono proseguiti. Nessun RPO/RTO attestato.

## A–H. Importatore, owner e prove DB

- L'importatore si connette come **`supabase_admin`** soltanto per bootstrap, importazione e verifica. Non rende `postgres` superuser, non cambia membership, non usa `--no-owner`, non elimina ACL o riscrive owner nel dump.
- Nuovo database **`soma_recovery_v3_retry_20261028 OWNER postgres TEMPLATE template0`**. Il DB fallito precedente non è stato sovrascritto o cancellato. Sentinel locale esclusivo impedisce altri tentativi dello stesso retry.
- Preflight PASS: PostgreSQL 17.11; immagine `ghcr.io/supabase/postgres:17.11.0.004`, digest `b15d862126dd2dac02da524696ccfde2dcce2ceaee0a58973b2727befe492706`; cinque owner del dump presenti; attributi dei 15 ruoli piattaforma e 23 membership attesi; servizi esclusi dal DB nuovo.
- I servizi esistenti continuano a usare `supabase_auth_admin`, `supabase_storage_admin`, `authenticator`, sul precedente DB `postgres`. Nessun runtime usa `supabase_admin` o punta al DB restaurato.
- Due letture **di soli cataloghi strutturali** sullo staging hanno verificato owner DB/public e owner/versioni delle estensioni, senza leggere o modificare dati prodotto. Il DB sorgente attuale è owned da `postgres`; `public` da `pg_database_owner`. Tale owner DB non era nel vecchio manifest: witness supplementare read-only legato all'hash dell'archivio, senza modificare o riattestare retroattivamente il manifest.
- Il DB nuovo mantiene esattamente questo modello: owner **`postgres`**, schema `public` **`pg_database_owner`**, quindi stesso principal implicito. Importare come `supabase_admin` non lo rende owner del DB/public. Nessun remap silenzioso.
- Bootstrap delle normali estensioni sotto `postgres`, Vault sotto `supabase_admin`, rispettando gli owner strutturali verificati. Restano i soli due CREATE SCHEMA public/extensions già inizializzati omessi dal catalogo, come nel precedente v3: nessuno statement OWNER/GRANT/RLS eliminato.
- Unica transazione di restore nel retry: **PASS**. Apertura AES-GCM e hash dei 46 file PASS. Checkpoint `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`, SHA-256 `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae`, archivio originale invariato.

### Confronto dello schema prima/dopo

Il confronto usa schema-only metadata prodotti da pg_restore/pg_dump 17.11, mai payload di dati. Confronta owner degli oggetti, flag SECURITY DEFINER, statement ACL/default ACL, policy e ROW SECURITY, ordinati e normalizzati soltanto per l'inventario. Non modifica SQL, definizioni o dump. Gli altri statement e corpi funzione vengono importati integralmente dall'archivio autenticato.

| Categoria | Dump atteso | DB restaurato |
|---|---:|---:|
| Tabelle | 137 | 137 |
| Funzioni | 316 | 316 |
| RLS enablements | 125 | 125 |
| Policy | 12 | 12 |
| ACL entries | 343 | 343 |
| Default ACL entries | 15 | 15 |
| SECURITY DEFINER owner `postgres` | 273 | 273 |
| SECURITY DEFINER owner `supabase_admin` | 1 | 1 |

**Identità dell'inventario di sicurezza PASS**, SHA-256 prima/dopo: `6bba7b606352b281f3ad44b678e8d6f27ff8fe15f9e15a41372c5afd07c40e5b`.

- `auth` e `storage`: schema owner `supabase_admin`; tabelle Auth `supabase_auth_admin`, tabelle Storage `supabase_storage_admin`, oggetti applicativi con owner originali. Nessun owner superuser inatteso nel perimetro del dump.
- Attributi ruoli/membership verificati anche dopo: nessun drift, hash membership `6893f035091ca75f23eb98503e005797d73dcf875452f9f2cd4b138064d7a147`.
- Barrier PASS: zero sessioni/refresh/flow/challenge/fattori MFA/receipt effimeri importati; FK attive e validate. Le righe ruolo/fence staff durevoli sono ripristinate; non sostituiscono login/MFA freschi.

### G. Smoke con identità DB effettive

Connessioni TCP con le credenziali dei servizi locali, trasferite esclusivamente via stdin, mai argv/log/report. Nessuna credenziale source/coperta dal backup usata. Per i ruoli NOLOGIN si usa il normale percorso `authenticator → SET LOCAL ROLE`.

| Controllo | Esito |
|---|---|
| `supabase_auth_admin` legge la propria `auth.users` | PASS |
| Auth DB role legge staff table privata | DENIED, 42501 |
| `supabase_storage_admin` legge la propria `storage.objects` | PASS |
| Storage DB role legge staff table privata | DENIED, 42501 |
| authenticator → authenticated: profilo proprio | 1 riga, PASS |
| stesso contesto: altro profilo | 0 righe, PASS |
| anon: lettura diretta profiles | DENIED, 42501 |
| authenticator senza SET ROLE: lettura profiles | DENIED, 42501 |
| authenticator → service_role: comportamento BYPASSRLS previsto | PASS |

Sono prove reali di ruoli PostgreSQL/RLS, **non** login GoTrue o verifica crittografica JWT: il contesto UID del test DB è impostato come fa il gateway, senza fingere una sessione Auth. Nessun dato profilo testuale viene registrato.

Il primo harness usava socket Unix/peer con ruoli applicativi: errore di trasporto `Peer authentication failed`, diagnosticato prima di correggere il test al TCP usato dai servizi. Nessuna modifica a password, pg_hba, ruoli o permessi; test specifico aggiunto. Il restore non è stato ripetuto.

## I–N. Prove successive e RPO/RTO

| Gate | Stato |
|---|---|
| Restore Storage bytes e SHA-256 target | NON ESEGUITO |
| DB↔Storage mapping/orphan/missing canonical | NON VERIFICATO sul backend target |
| Source JWT USER/ADMIN/MODERATOR contro il DB restaurato | NON ESEGUITO; precedenti probe preliminari non promossi a questa prova |
| Source refresh capability | NON ESEGUITO |
| Fresh recovered Auth login | NON ESEGUITO |
| Staff secure re-enrollment/AAL2/separazione API | NON ESEGUITO; nessun fattore source modificato |
| RPO/RTO | NON MISURATI / NON ATTESTATI |

Il DB resta in quarantena: API/Auth/Storage esistenti non sono stati riconnessi. Non esporre contenuto dal DB restaurato finché byte, trust, replay post-cutoff e recovery Auth non sono verificati. In particolare, l'archivio contiene una fixture cancellata dopo cutoff: il suo delete deve essere riconciliato prima di aprire Auth. Il precedente planner non equivale a un journal/executor operativo completo.

## O. Nuovo blocker e STOP

Unica esecuzione completa: **850/851 PASS, 1 FAIL**, zero skip/cancel. Test esistente e non modificato:

```
tests/moderation-finalization.test.js:7:393
Anonymous block preserves named Match/chat and delivered request/profile;
only future delivery suppressed neutrally
```

Assert fallito:

```js
assert.equal((await d.query('select *from authorized_profile($1)',[ids.b])).rows.length,1);
```

Risultato: **0**, atteso **1**, dopo blocco anonimo in presenza di richiesta già consegnata. Non è l'assert iniziale sull'inbox né quello successivo sui Match. Causa **NON CLASSIFICATA** in questo task: non dichiarata flake o bug runtime senza evidenza. Nessuna modifica a Moderation, profile authorization, test fallito o product semantics.

Applicato lo STOP richiesto per blocco estraneo: niente retry del restore, rerun della suite fino al verde o prosecuzione Storage/Auth. **Prossimo passo singolo:** indagine circoscritta di questo test/fixture e dell'autorizzazione alla richiesta consegnata; nessuna ragione attuale per rifare il DB restore riuscito o cambiare owner.

## P–U. Test, file e consegna

- Recovery mirati finali **31/31 PASS**, inclusi crypto/contratto v3, empty-session/055, bootstrap/owner/ACL/RLS e trasporto credenziali runtime. Non rappresentano un PASS del recovery completo.
- Suite completa **850/851**, una sola esecuzione, FAIL sopra. Avviata prima dell'aggiunta del test di trasporto; quest'ultimo è incluso e PASS nei 31 mirati finali. Nessun secondo full run dopo il FAIL.
- Build PASS; typecheck PASS. Nessun frontend/backend prodotto modificato.
- File: `scripts/recovery/restore-isolated.mjs`, `local-target.mjs`; nuovi `restore-bootstrap.mjs`, `local-runtime-connection.mjs`, `runtime-role-smoke.mjs`; due nuovi test; questo report, evidence e collegamento dal precedente report.
- Commit/push sul solo branch staging; hash finale nella consegna. Nessun merge/deploy. main/origin-main restano `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
- Nessuna modifica dati staging/Production, PHOTO, signing trust, MFA, sessioni o ruoli staff sorgenti. Solo letture strutturali source per il preflight. Nessun nuovo provider, piano, costo cloud o attività GCP.
- Nuovo DB locale restaurato mantenuto intenzionalmente in quarantena; nessuna fixture source creata in questo task. Copie decifrate e temporanei container del retry eliminati; archivio cifrato/key preesistenti restano privati e fuori Git.

**ISOLATED RECOVERY V3: BLOCKED**
