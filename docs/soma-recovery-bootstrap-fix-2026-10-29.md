# Recovery v3 — bootstrap approvato e gate Auth

29 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `540fd4a10631cb490688dad7872d6ce83c7d7798`.

**ISOLATED RECOVERY V3: BLOCKED**. Correzione REST e qualificazione Storage 73→74 PASS. Startup REST→Auth→Storage PASS, byte privati 42/42 PASS. STOP successivo su GoTrue: il record Auth recuperato contiene `confirmation_token=NULL`, incompatibile con il caricamento utente del provider. Nessun login/MFA umano, nuovo restore o modifica al payload Auth durevole.

## A. Configurazione PostgREST

Solo il container stateless PostgREST recovery è stato sostituito, dopo averne verificato stato arrestato, rete isolata e assenza di porte pubblicate. `PGRST_DB_SCHEMAS=public`; conservati `public,extensions` come extra search path, impostazioni JWT, identità `authenticator` e collegamento al DB recuperato. Nessun intervento sul normale PostgREST staging o sul vecchio stack locale.

`recoveredEnvironment()` rende esplicita questa configurazione; regression test verifica che non trascini `graphql_public` e non cambi trust/search path. Nessuno schema GraphQL creato manualmente.

## B–C. Contratto Storage e confronto esteso

Il witness di bootstrap (versione 1) è vincolato al contratto checkpoint v3 e all'archivio originale:

- checkpoint `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`;
- SHA-256 `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae`;
- payload Auth e archivio invariati, nessuna nuova cattura/importazione.

Il registro Storage prima del bootstrap viene letto **dal dump originale autenticato**, non inferito dalla situazione attuale. Il confronto schema-only comprende **1547 oggetti originari**, inclusi constraint nei CREATE TABLE, trigger, funzioni, owner, ACL/default ACL e RLS. Le default ACL hanno identità distinta per owner: non vengono sovrascritte nella mappa di confronto.

| Evidenza | Prima, archivio | Dopo, target |
|---|---|---|
| Ultima migrazione Storage | 73 | 74, `unlock-object-versioning` |
| Registrazioni della 74 | 0 | **1** |
| Funzione versioning | assente | presente |
| Trigger versioning su buckets | assente | presente |
| `buckets_versioning_dark_check` | presente | rimosso |
| Owner funzione/trigger | N/A | `supabase_storage_admin` |
| SECURITY DEFINER | N/A | **false / INVOKER** |
| ACL esplicita funzione | N/A | NULL, default provider |
| Bucket con versioning attivo | 0 | 0 |
| PHOTO ledger | originale | digest invariato |

Classificazione: **RECREATE BY PROVIDER BOOTSTRAP**. Corpo funzione confrontato con il file SQL 0074 della reale immagine Storage v1.82.1; definizione trigger esatta verificata. Nessuna funzione scritta manualmente, nessun vincolo rimosso dal tooling per forzare il PASS. La 74 era già stata applicata dal provider nel precedente tentativo: questo task ne verifica il delta approvato, senza riapplicarla.

Tutti gli altri oggetti, owner, ACL e RLS confrontati rimangono equivalenti. Un'unica normalizzazione diagnostica è esplicita: PostgreSQL deparse il CHECK di lunghezza/body `board_posts` appiattendo una parentesi ridondante fra tre condizioni AND. Il confronto normalizza solo quell'espressione identica, con test che rifiuta la sostituzione AND→OR. **Nessun SQL del dump viene riscritto.**

Il nuovo verificatore inizialmente ha fermato il preflight su due limiti del parser: punto e virgola assente in `pg_get_functiondef`, e default ACL omonime con owner diversi. Entrambi corretti nel tooling con test specifici prima dello startup. Non erano fallimenti dei servizi né tentativi di restore/replay ripetuti; nessuna assertion indebolita o oggetto ignorato.

## D–F. Startup controllato

`continue-bootstrap.mjs` avvia e verifica un servizio prima del successivo, ricontrollando il contratto schema completo dopo ogni avvio. Solo rete Docker interna, nessuna porta pubblicata.

1. **PostgREST PASS**: HTTP 200, nessun PGRST002; richiesta con `Accept-Profile: graphql_public` → **406/PGRST106**; lettura anonima profiles → **401**; credenziale server locale → **200**.
2. **Auth startup PASS**: `/health` → **200**. Questo non equivale a un login riuscito; il caricamento utenti fallisce successivamente, sotto.
3. **Storage startup PASS**: `/status` → **200**, nessun ulteriore delta schema inatteso.

Smoke con le reali identità DB: Auth/Storage leggono le proprie tabelle e sono negati sulla tabella staff privata; authenticator→authenticated legge il proprio profilo (1), non l'altro (0); anon e authenticator raw negati; service_role mantiene il comportamento BYPASSRLS previsto. Sono prove DB/RLS reali, **non** un login utente/JWT API simulato.

## G. Storage dopo startup: PASS

**42/42** download dalla API privata, dimensioni/MIME/SHA-256 identici all'archivio. Percorso pubblico e richiesta non autenticata → HTTP 400 senza byte foto. **0 orfani**, **0 canoniche mancanti**, bucket privato; digest ledger PHOTO invariato. Nessun cambiamento al lifecycle, all'admission o alla retention PHOTO. Le varianti storiche ancora riferite non vengono eliminate.

## H–L. Nuovo blocker Auth e STOP

Prima del gate Auth: **0 sessions, 0 refresh_tokens, 0 flow_state, 0 mfa_factors**. Identità durevoli ripristinate e ruoli ADMIN/MODERATOR attivi presenti.

Confronto source read-only post-cutoff: un solo delete da riprodurre, quello della fixture sintetica vuota già cancellata in staging. Hold, suspension e moderation invariati. Il normale engine `photo02_begin_account_deletion`/barrier/`cleanupPhotoAccount` è stato eseguito **una sola volta** sul target, senza bypass o modifica PHOTO. La fase Auth di questa cancellazione ha fallito; nessun secondo tentativo.

Diagnosi:

```
GET /admin/users/<synthetic fixture>  -> HTTP 500
error_code: unexpected_failure
error finding user: sql: Scan error on column index 3,
name "confirmation_token": converting NULL to string is unsupported
```

La chiamata Storage list della stessa fixture, riprodotta in sola lettura, restituisce **200 e lista vuota**. Il codice tecnico `STORAGE` nella coda delete è il catch generico dell'engine, non evidenza di byte mancanti. Il vero errore è il caricamento del record in GoTrue v2.197.0.

Il checkpoint omette correttamente i token transitori, ma lo schema importato lascia `confirmation_token` (e altri campi transitori esclusi) a NULL. **7/7** identità recuperate hanno `confirmation_token=NULL`; nessun valore credenziale è stato letto o registrato. Il modello di ricostruzione deve definire esplicitamente valori vuoti/inerti compatibili con GoTrue prima di avviarlo. Non vengono ricreati vecchi token, sessioni o fattori.

Non è stata applicata una patch al singolo campo né riscritto il payload durevole. Prima di un fix serve l'inventario completo dei campi transitori misti e delle invarianti del loader GoTrue, con inizializzazione target-only sicura e test negativi. Nessuna modifica ad Auth staging o a credenziali/fattori reali è giustificata da questo errore locale.

| Gate reale | Risultato |
|---|---|
| Source USER/ADMIN/MODERATOR JWT negati nel recovery restaurato | NON ESEGUITO |
| Source refresh incapace di creare sessione target | NON ESEGUITO |
| Fresh recovered USER login | BLOCCATO prima del login |
| Staff secure re-enrollment/AAL2 | NON ESEGUITO |
| Privilege separation API staff recuperati | NON ATTESTATA; model/DB tests PASS separati |
| Migration 055 runtime/prodotto | invariata; test di sicurezza PASS |
| Application smoke dopo recovery completo | NON ESEGUITO |

I tre nuovi servizi recovery sono stati **arrestati** di nuovo. DB e volume conservati, nessun nuovo restore. Rimangono 0 sessioni/refresh/fattori/flow; ADMIN e MODERATOR durevoli attivi. La fixture source-deleted rimane nel recovery in quarantena, con cancellazione **pending** e codice generico STORAGE: non dichiarare cleanup o replay completato. Nessun account source coinvolto/modificato.

## M–O. RPO/RTO e prossimo passo

**RPO/RTO NON MISURATI / NON ATTESTATI**: manca il recovery Auth/MFA e application smoke. Nessun target raggiunto dichiarato sulla sola base di DB+byte.

Prossimo task minimo: audit/fix del contratto di **ricostruzione dei campi Auth transitori esclusi** nel solo target, preservando proiezione durevole, trust distinto, assenza delle vecchie sessioni e re-enrollment MFA staff. Dopo test, ricontrollare loader GoTrue e riprendere il replay pendente attraverso l'engine normale; non forzare claim/lease e non ripetere il restore DB. Poi unica checklist umana per i login/MFA, quando tecnicamente pronta. Nessuna azione manuale richiesta al founder adesso.

## P–U. Test, file e Git

Test mirati recovery/checkpoint/crypto/bootstrap/Storage/Auth/staff/MFA/revocation: **62/62 PASS**, zero skip/fail. Test specifici bootstrap/config: **6/6 PASS** inclusi nel run mirato. Suite completa finale **860/860 PASS**, zero fail/skip/cancel, una sola esecuzione. Hash Git nell'evidence/consegna. Build e typecheck PASS. Nessun rerun-until-green della suite completa o della cancellazione.

File: configurazione operator-only Auth/REST e relativo test aggiornati; nuovi `archive-metadata.mjs`, `provider-bootstrap-contract.mjs`, `verify-provider-bootstrap.mjs`, `continue-bootstrap.mjs`, test provider; questo report ed evidence. Nessuna modifica a `src/`, `supabase/`, migration, policy o payload v3; nessun deploy.

Configurazioni `.local` ignorate da Git e 0600; nessun secret/token/OTP/QR persistito nei file tracciati. Letture sorgente autorizzate in transazioni read-only; zero scritture staging. main/Production/PHOTO invariati, nessuna attività GCP o nuovo costo cloud. Working tree finale e push nella consegna; nessun merge main.

[Evidence minimizzata](evidence/ops-phase-a/recovery-bootstrap-fix-2026-10-29.json).
