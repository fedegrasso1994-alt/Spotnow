# Checkpoint restore — staff session contract v2

26 ottobre 2026, solo tooling staging. Baseline `4fd95b3f6201fce3a886d0d33c83c5ad03ea6492`.

**CHECKPOINT SESSION DEPENDENCY: BLOCKED**. Fix candidato staff implementato e testato; il preflight del nuovo capture si è fermato su una dipendenza Auth/SAML distinta. Nessun nuovo dump, archivio, chiave, upload o restore eseguito. Non è un GO recovery/pilot.

## A–B. Root cause, FK e audit campi

Migration 055 definisce `spot_private.staff_revoked_sessions(session_id uuid PRIMARY KEY REFERENCES auth.sessions(id) ON DELETE CASCADE)`. Non esistono altri campi in questa tabella. Il precedente capture includeva queste righe ma escludeva `auth.sessions`: il restore terminava sulla FK, con rollback atomico.

| Campo / stato | Significato | Contratto candidato |
|---|---|---|
| `staff_revoked_sessions.session_id` | Identità effimera di una specifica sessione Auth già fenced, non un grant, evento storico o token | Escludere i dati insieme alle sessioni; preservare schema, FK, RLS e guardia |
| PK / FK cascade | Una ricevuta per sessione; impossibile avere ricevute senza sessione parent; Auth session/account deletion rimuove la ricevuta | Ripristinare integralmente i vincoli, mai disabilitarli |
| `moderation_roles.user_id,role,active` e metadati grant | Stato durevole di assegnazione/revoca del ruolo | Restore diretto, nessuna espansione di privilegi |
| `moderation_roles.session_not_before` | Fence durevole e monotona del grant corrente | Restore diretto, senza azzerare o arretrare |
| `moderation_role_events` / audit | Eventi durevoli di provisioning, separati dalle ricevute | Restore diretto; il replay post-cutoff resta un gate distinto |
| Identità e fattori MFA | Identità account e fattori verificati necessari all'autenticazione | Selezione precedente non ampliata; nessuna lettura/esposizione del segreto TOTP da parte del collaudo |

Le ricevute non sono ricostruibili correttamente da UID, ultimo login o timestamp. Non generare nuove sessioni o identificativi per soddisfare la FK. Non cancellarle dalla sorgente o da un sistema operativo con sessioni vive. Il loro lifetime è la sessione parent, non una retention inventata dal backup.

La guardia 055 richiede contemporaneamente account attivo, ruolo attivo, JWT AAL2 ben formato, **stessa sessione presente lato server e appartenente al principal**, creazione strettamente successiva al fence e non futura, scadenza valida, AAL2 registrato sulla sessione e suo fattore TOTP verificato. Usa il lock condiviso delle transizioni ruolo e nega snapshot pinned. Regrant e refresh della stessa sessione non annullano le ricevute. Logout/session deletion fa fallire il join server-side.

Consumatori correnti: `public.is_moderator`, role-management e moderation queue/action (025 e successive sostituzioni), board moderation (026/042/052), analytics ADMIN (051), ops/health (053). Tutti restano subordinati a `spot_private.moderation_role()`. Nessuna guardia, ruolo, migrazione o fattore MFA modificato.

## C–D. Opzioni e scelta minima

| Opzione | Valutazione |
|---|---|
| A — escludere dati receipt e ricostruire barriera sicura | Scelta candidata: nessuna vecchia sessione o refresh token importato; verify fail-closed del DB vuoto di sessioni prima di aprire Auth/API. È la guardia 055 esistente a negare i vecchi session ID |
| B — nuovo stato durevole senza FK | Non necessario per una ricevuta la cui utilità termina con la sessione; duplicazione del modello di revoca e nuova migrazione non giustificata |
| C — epoch globale staff | Possibile ulteriore hardening, ma richiederebbe guardie condivise/migrazione. Non serve per dimostrare la negazione quando il parent session store è vuoto e la 055 resta identica |
| D — importare sessioni e cancellarle dopo | Respinta: elaborerebbe segreti non necessari e introdurrebbe una fase di rischio evitabile. Nessuna dummy session o FK bypass |

La barriera è un requisito operativo del restore in quarantena: DB nuovo, nessun Auth/API writer collegato durante importazione/verifica; zero righe nelle sette tabelle escluse; FK validata con cascade presente; grant/fence originali preservati. Solo dopo la verifica può partire Auth e creare nuove sessioni con login e MFA. Non equivale a una disattivazione automatica di tutti i JWT ordinari.

Supabase documenta che il JWT contiene il `session_id` corrispondente ad `auth.sessions`, e che un access token può restare crittograficamente valido fino alla scadenza dopo logout. Per questo **non** si assume invalidazione solo perché mancano refresh token o cambia l'ambiente: il rifiuto staff dipende dal join sessione corrente della 055. [Sessioni Supabase](https://supabase.com/docs/guides/auth/sessions), [sign-out](https://supabase.com/docs/guides/auth/signout).

## E–G. Cambiamenti al contratto, nessuna migration

- Nuovo modulo operatore `scripts/recovery/session-contract.mjs`: contratto **v2**, esclusioni esplicite, classificazione di ogni tabella selezionata, controllo FK prima del dump, barriera read-only per un futuro restore in quarantena.
- L'unica nuova esclusione di dati rispetto al capture precedente è `spot_private.staff_revoked_sessions`; quelle Auth precedenti restano: sessions, refresh_tokens, one_time_tokens, flow_state, mfa_challenges, mfa_amr_claims. Nessuna nuova categoria Auth raccolta.
- Inventario nello stesso snapshot: tutte le tabelle selezionate e FK qualificate schema/tabella; una tabella inclusa che referenzia un parent escluso deve essere classificata prima di produrre un checkpoint.
- Controllo fail-closed dei campi token di `auth.users`: nessun valore viene letto in output; se esiste un campo token non vuoto, capture bloccato. Audit iniziale: conteggio **0**. Non è una scansione universale di ogni possibile secret del provider; non dichiararlo tale.
- Manifest cifrato/autenticato contiene `contract.version=2`, barriera, elenco esclusioni, classificazioni e FK. Il formato crittografico esterno resta v1: è distinto dalla versione del contratto DB. `validateManifest` rifiuta contratto assente, precedente o incompatibile; `openCheckpoint` rimuove i temporanei dopo rifiuto, senza materializzare i singoli payload.
- Il vecchio oggetto GCS v1 non viene riscritto, convertito o attestato retroattivamente. Rimane soggetto alla retention GCS già approvata.

[Catalogo candidato completo, 136 tabelle](evidence/ops-phase-a/checkpoint-session-contract-catalog-2026-10-26.json): classifica restore diretto/esclusione; il flag `approved_for_restore=false` segnala la dipendenza SAML non risolta, **non** una nuova policy approvata. Nessuna tabella è stata implicitamente spostata a replay. Il replay di revoche, delete, consenso, hold e altri cambiamenti dopo cutoff resta requisito separato prima di riaprire un recovery reale.

## H–M. Prove e STOP reale

Test mirati **22/22 PASS**: artifact 15, nuovo contratto/recovery model 2, staff 055 esistenti 5. Provati: v1 rifiutato, dipendenza non classificata rifiutata, barrier non vuota negata, FK/cascade preservati; nessuna regressione sulle vecchie protezioni.

| Acceptance | Evidenza effettiva |
|---|---|
| Vecchi ADMIN/MODERATOR, anche claim AAL2 | Negati nel modello PostgreSQL dopo svuotamento session store; nessuna reinserzione del vecchio ID |
| Ruoli/fence | Prima/dopo identici nel test PostgreSQL |
| Login nuovo e MFA | Modello Auth PostgreSQL verificato: AAL1 negato, sessione nuova/fattore verified/AAL2 ammessa. **Non** prova un login/challenge reale GoTrue sul restore |
| Separazione | MODERATOR nega analytics, ops e role-management; ADMIN mantiene permessi esistenti |
| Revoke/regrant/logout | Negazione stale e successivo accesso fresco provati nel modello e suite 055 |
| Auth reale e replay token nel restore | **NON ESEGUITI**; nessun token di account reale letto o riutilizzato |
| Nuovo checkpoint / DB restore / Storage restore | **NON ESEGUITI**, capture bloccato durante inventory |

Il primo test nuovo si è fermato perché il shared harness non modella le tabelle effimere Auth oltre a session/factor. Aggiunti soltanto schemi tabella vuoti nel test; nessuna dummy session o vincolo disabilitato. Le righe sessione sintetiche del normale harness modellano l'autenticazione nei test e non vengono usate per far passare un restore reale.

Il tentativo autorizzato di capture v2 ha restituito:

```
phase: inventory
RECOVERY_UNCLASSIFIED_SESSION_DEPENDENCY
```

Dipendenza precisa: **`auth.saml_relay_states` → `auth.flow_state`**, constraint **`saml_relay_states_flow_state_id_fkey`**. Il parent era già escluso dal vecchio capture. È una dipendenza diversa da staff, rilevata dal nuovo preflight. Non è stato eseguito un restore SQL e non è dimostrato che vi siano righe SAML orfane: la presenza di righe e la policy di esclusione richiedono verifica separata. Non confondere il controllo conservativo sullo schema con un secondo errore live PostgreSQL.

Come da stop condition, nessuna esclusione SAML aggiunta, nessuna correzione a catena, nessun nuovo tentativo. Snapshot reader terminato, directory capture ripulita: resta il solo `failure.json` minimizzato; nessun nuovo dump, archivio o chiave. Nessun oggetto GCS aggiunto. I quattro container locali precedenti rimangono invariati; nessun nuovo database restore creato in questo task.

## N–V. Esito, limiti e consegna

- RPO/RTO: **non misurati/attestati**; manca DB+Storage restore completo. Il precedente download GCS/hash/decifratura PASS non sostituisce questa prova.
- Blocker immediato: classificazione esplicita della dipendenza SAML preesistente. Prossimo passo singolo: audit read-only della sua effettiva presenza/uso e proposta di contratto, senza introdurre esclusioni automatiche o riutilizzare sessioni.
- Ulteriori gate non chiusi: restore DB, API Storage/hash/mapping/private access/orfani, reale fresh Auth/MFA nel recovery, replay post-cutoff. Non promuovere le prove di modello a prove operative.
- Nessun cambiamento a schema/RLS/API applicative, migration 055, PHOTO, Auth staging, ruoli operativi, main o Production. Nessun costo aggiuntivo cloud, account o acquisto introdotto. Nessuna azione manuale immediata richiesta.
- File: modulo session-contract; capture-staging, snapshot-inventory e artifact adattati; nuovo test recovery-session-contract e aggiornamento artifact tests; questo report e catalogo minimizzato.
- Suite completa **823/823 PASS**, zero fail/skip/cancel; build **PASS**, typecheck **PASS**. Nessun nuovo tentativo di capture o restore dopo il preflight bloccato. [Evidenza finale](evidence/ops-phase-a/checkpoint-session-contract-result-2026-10-26.json). SHA finale nella consegna/Git. Commit/push esclusivamente branch `codex/soma-schema-v2-staging`; nessun merge/force push.

**CHECKPOINT SESSION DEPENDENCY: BLOCKED**
