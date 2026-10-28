# Checkpoint v3 — durable Auth / isolated recovery

28 ottobre 2026. Branch `codex/soma-schema-v2-staging`, baseline `5eeebf11e34fff8f23efc480661c13dc8d84ee19`.

**CHECKPOINT V3 + ISOLATED RECOVERY: BLOCKED**. Archivio v3 prodotto e verificato; l'unico restore si è fermato su ownership nel target locale, con rollback completo. Nessun recovery point o RPO/RTO attestato. Il logout globale del progetto **non è più un blocker**. Nessuna rotazione sorgente o cancellazione manuale di sessioni.

## A–P. Risultati effettivi

| Gate | Risultato |
|---|---|
| A. Checkpoint v3 | Capture implementato: stesso snapshot read-only, proiezioni Auth, classificazione tabelle e FK closure |
| B. Durable Auth | users/identities solo tramite CSV proiettati; campi sotto |
| C. Transient exclusions | Session/refresh/flow/SAML/OAuth runtime/MFA e vecchie staff receipts escluse; nessun seed MFA copiato |
| D. Manifest | Manifest/contract **3**, 46 file autenticati/hashati aperti con successo; v1/v2 rifiutati nei test |
| E. Isolated DB restore | **FAIL**, un solo tentativo: SQLSTATE 42501, `must be able to SET ROLE "supabase_admin"`. Rollback confermato |
| F. Source access JWT | USER sintetico reale respinto da Auth/REST/Storage locali precedenti, prima del restore. Non prova post-restore; ADMIN/MODERATOR non acquisiti/testati |
| G. Source refresh | Catturato privatamente USER, exchange target **NON ESEGUITO**, capability poi eliminata |
| H. Recovered identity | Login fresco **NON VERIFICATO** |
| I. Staff MFA recovery | Re-enrollment/challenge reale **NON VERIFICATO**; fattori sorgente reali non letti/modificati |
| J. ADMIN/MODERATOR | Modello 055 PostgreSQL PASS; niente prova positiva GoTrue post-restore. Ruoli sorgenti dedicati invariati |
| K. DB↔Storage | 42 oggetti copiati nel capture e verificati nell'archivio; restore bytes/reconciliation/private access target **NON ESEGUITI** |
| L–M. RPO/RTO | **Non misurati / non attestati**: manca percorso completo DB + Storage + sicurezza + application smoke |
| N. Blocker | Owner/bootstrap del restore locale; altri gate Auth/replay restano aperti |
| O. Verifiche | 27/27 recovery mirati PASS; full suite **848/848 PASS**, build PASS, typecheck PASS |
| P. Git | Solo tooling operatore/test/documentazione. Nessuna migration o runtime app modificato; SHA/push nella consegna |

## Durable Auth a livello campo

`auth-durable.mjs` classifica esplicitamente 27 tabelle Auth e il catalogo atteso di colonne. Nuove tabelle/colonne non classificate bloccano il capture; nessun `SELECT *` nei payload Auth misti.

| Campi/stato | Contratto v3 |
|---|---|
| users `id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,phone,phone_confirmed_at,banned_until,is_sso_user,deleted_at,is_anonymous` | Durevoli, solo archivio cifrato. Password hash = dato sensibile di recovery, mai report/diagnostica |
| users `raw_app_meta_data` | Soli `provider,providers` |
| users `raw_user_meta_data` | Oggetto vuoto; profilo prodotto nelle proprie tabelle |
| users `instance_id` | UUID zero esplicito per self-hosted; source non-zero blocca il preflight, nessuna conversione silenziosa |
| users `confirmed_at` | Generato dal DB |
| Token confirmation/recovery/reauthentication, pending email/phone, inviti, last-sign-in | Non proiettati né ricostruiti, nuove operazioni Auth richieste |
| users `is_super_admin` | Non proiettato; source super-admin blocca il capture |
| identities `provider_id,user_id,provider,created_at,updated_at,id` | Linkage durevole |
| identities `identity_data` | Soli `sub,email,email_verified,phone,phone_verified,iss`; niente token/avatar/metadata arbitrari |
| identities `email`, `last_sign_in_at` | Primo generato dal DB, secondo escluso |
| `auth.schema_migrations` | Ripristino diretto dello stato schema tecnico |

Config esterna SSO/SCIM/OAuth/provider non ricostruibile dagli utenti non viene ignorata: righe o utenti non supportati bloccano `RECOVERY_AUTH_EXTERNAL_CONFIGURATION_REQUIRED`. Nel capture valido il preflight è passato. Config OAuth/email target resta separata dalla sorgente e da autorizzare ove necessaria.

## Esclusioni, FK e guardie 055

Esclusi tutti i dati Auth diversi da users/identities proiettati e schema_migrations: sessions, refresh_tokens, one_time_tokens, flow_state, SAML relay, OAuth authorizations/client states, MFA challenges/AMR/factors/recovery codes, WebAuthn challenges/credentials, audit Auth e config da ricostruire. Nessun TOTP seed/recovery code importato.

`staff_revoked_sessions` contiene un solo session ID effimero: dati esclusi; schema, PK, FK cascade e RLS conservati. La 055 mantiene ruolo attivo, sessione server corrente del principal, fence del grant, AAL2 e fattore verified. Nessun dummy session, vincolo disabilitato o `session_replication_role`.

Tabelle classificate `restore_directly`, `restore_projected`, `reconstruct_safely` o `deliberately_exclude`. Inventario FK include colonne child/parent ordinate: dipendenza da parent escluso/mancante o campo Auth non proiettato → STOP. Live preflight v3 PASS, compreso SAML→flow; validazione finale dei vincoli nel DB restaurato **non ancora raggiunta**.

Prima di aprire un target servono trust distinto verificato, runtime Auth vuoto, FK validate, replay riconciliato, login fresco e re-enrollment MFA staff sicuro in quarantena con verifica dell'identità operativa. Barrier SQL da sola non prova rifiuto crittografico dei JWT ordinari. Nessun password-only reset/backdoor introdotto.

## Archivio reale e tentativo unico

- ID `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`; cutoff **2026-10-28 07:40:43.624898 UTC**.
- Ciphertext **2.315.372 byte**, SHA-256 `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae`.
- **46 file**: DB, inventario, due CSV Auth, 42 oggetti Storage. Apertura autenticata e hash dei file PASS prima del restore.
- AES-256-GCM, chiave separata locale 0600; nessun nuovo upload GCS. Framing `SOMA-RECOVERY-1` distinto dal manifest semantico v3. Vecchi archivi non convertiti/riattestati.
- users/identities grezzi esclusi dal dump; CSV nello stesso snapshot del dump/inventario. Import file `\copy`, mai concatenazione del contenuto a script psql.
- Primo capture invalido fermato in `auth-projection`: connessioni CSV senza ruolo lettore approvato. Temporanei eliminati, nessun archivio/chiave pubblicata. Fix adapter e test specifico **prima** del capture valido. Nessun retry cieco del restore.
- Unico restore nel nuovo DB locale `soma_recovery_v3_20261028`, senza writer Auth/API. Estensioni bootstrap inizializzate; omessi dal solo CREATE SCHEMA i public/extensions già presenti. Nessun `--no-owner` o rewrite ownership.

## Blocker esatto e STOP

Il lettore sorgente aveva incontrato `permission denied for schema auth`; il controllo automatico aveva rifiutato `SET ROLE postgres`. Il founder ha poi autorizzato esplicitamente tale accesso **solo per letture backup staging**: prevalidazione e capture sono passati. Il gate di autorizzazione iniziale è **risolto**, non è il blocker finale.

Il restore locale usa psql come `postgres`. Audit read-only: **`postgres.rolsuper=false`**. Il dump preserva oggetti con owner provider `supabase_admin`; PostgreSQL ha restituito:

```
SQLSTATE 42501
must be able to SET ROLE "supabase_admin"
```

Confermato dai log locali leggendo soltanto l'errore di autorizzazione, senza DETAIL/CONTEXT dei dati. Nessuna nuova FK violata: non è staff receipt o SAML. Dipendenza diversa di bootstrap/ownership, quindi STOP. Nessun secondo restore, grant o SUPERUSER aggiunto per aggirare l'errore.

Rollback verificato in sola lettura: **0 tabelle Auth e 0 tabelle `spot_private`**. Rimangono DB senza dati applicativi/Auth ed estensioni bootstrap. Payload decifrato e copia temporanea nel container eliminati. Diagnostica persistita minimizzata, senza righe dati.

**Prossimo passo singolo:** audit read-only del ruolo owner/bootstrap locale supportato, confronto completo con gli owner del dump e preflight privilegi prima di proporre un nuovo restore. Valutare l'owner locale previsto, non promuovere `postgres` o indebolire guardie. Nessun cloud target necessario ora: il blocco è ownership DB, non impossibilità dimostrata del trust locale.

## Prova preliminare di trust: limiti

Servizi locali precedenti già esistenti nella rete interna `soma-recovery-isolated-20261026`, Auth/REST/Storage senza porte pubblicate. GoTrue v2.197.0, PostgreSQL 17.11, PostgREST v16.4, Storage v1.82.1.

JWT USER sintetico source inviato direttamente, senza altri JWT/cookie:

| Endpoint | Esito |
|---|---|
| Auth `GET /user` | 403, kid sorgente non riconosciuto |
| REST `GET /` | 401 `PGRST301`, nessuna chiave adatta |
| Storage `GET /bucket` | 400 `AccessDenied`, errore verifica ES256 |

Storage negativo non dimostra il percorso positivo ES256. Questi probe non usano il nuovo DB v3 e non sostituiscono prove post-restore: source ADMIN/MODERATOR, refresh exchange, login/MFA fresco, revoke/regrant/logout e application smoke restano **NON VERIFICATI**.

## Replay e fixture

Implementato un **planner fail-closed**, non un journal operativo/executor attestato. Snapshot di sicurezza allo stesso cutoff; confronto utenti, identità dei sopravvissuti, ruoli, consenso e digest safety/moderation. Azioni candidate: `account.delete`, `role.revoke`, `consent.revoke`. Mutazioni credenziali/identità/restrizioni Auth/hold/suspension/moderation e promozioni ruolo richiedono review; nessun auto-release/grant.

Restano delta indipendente post-cutoff, binding checkpoint, executor tramite engine autorizzati sul target in quarantena e verifica finale. Con sorgente perduta il confronto live non sostituisce un journal indipendente. Nessun replay eseguito. L'archivio include una fixture poi cancellata: **non riaprire Auth da esso senza replay deletion/revoche post-cutoff**.

Due fixture USER create **in sequenza** (fase preliminare e capture), entrambe cancellate tramite login e normale `delete-account`; successivo nuovo login negato. Nessun profilo/foto creato. Capability temporanee access/refresh/password e chiave eliminate dopo ciascuna fase. Nessun account reale/staff modificato; technical receipts non cancellate ad hoc. Non dichiarare una verifica globale zero-orphan SQL non effettuata.

## Verifiche e invarianti

- 27/27 recovery mirati PASS: drift, proiezioni, esclusioni/FK, crypto/hash, v1/v2 rifiutati prima dell'estrazione, CSV vuote, ruolo/snapshot lettore, planner e modello 055.
- Prima suite completa 847/847 PASS; suite finale dopo il fix adapter **848/848 PASS**, zero fail/skip/cancel, nessun rerun-until-green.
- Build/typecheck finali PASS. PASS locali non sostituiscono FAIL restore.
- Moduli: auth-durable, session-contract, security-replay, local-target, private-state, prepare-fixtures, cleanup-fixtures, read-source, restore-isolated; capture/artifact/inventory aggiornati; quattro test recovery; report/evidence.
- Nessun file `src/` o `supabase/` modificato, nessuna migration/RLS/API o semantica PHOTO cambiata. Signing trust, sessioni/MFA esistenti, ruoli staff, Vault, scheduler e feature flags invariati.
- main/origin-main `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production non letta/modificata. Nessuna attività GCP/Luigi, nuovo costo o restore distruttivo su staging.
- Archivio/key locali privati rimangono candidati non attestati, non backup giornaliero operativo o recovery point. DB locale bootstrap rimane in quarantena, senza dati applicativi.

**CHECKPOINT V3 + ISOLATED RECOVERY: BLOCKED**
