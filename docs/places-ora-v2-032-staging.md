# Places + ORA v2 + QR separation — staging 032

Data: 18 ottobre 2026. Baseline `cd02f61`, branch
`codex/soma-schema-v2-staging`. Solo Supabase staging
`zjinjtkekmaqtxsuyvho`. Nessuna modifica a main/Production/Vercel Production.

## A. Audit writer QR e chiusura bypass

Il vecchio frontend chiamava `backend.scanVenue` → `public.check_in(uuid)`
→ `public.privacy_prior_check_in(uuid)`. La seconda funzione, definita nella
022, scriveva `checkins` e poi `tribe_memberships` senza passare da `join_tribe`.

La 032 ritira **entrambi** i corpi: restituiscono sempre l'errore
`ORA_LEGACY_RETIRED`. Revocato EXECUTE a PUBLIC, anon, authenticated e
service_role. Neppure un'invocazione accidentale dell'owner crea membership.
Le firme restano per diagnosticare client vecchi; non sono writer utilizzabili.
Non esistono altri alias check-in trovati nell'audit. I nuovi path manuale,
QR e pending onboarding non li chiamano. Il writer applicativo membership
resta esclusivamente `join_tribe` della030. Nessun bypass max3/grace/cooldown
rimane attraverso queste RPC, nemmeno mediante una chiamata client crafted.
Come sempre, un amministratore DB con poteri DDL può modificare direttamente
dati e autorizzazioni: non è un percorso client del prodotto.

## B–E. Contratto Places/presenza/uscita

| RPC | Contratto |
| --- | --- |
| `search_places(search_text,page_offset)` | Substring letterale, massimo80 caratteri, offset0–10000, pagina20; solo venue attiva e ora_enabled; place_id, nome, address/local label, boolean has_tribe. Nessun token QR, GPS o catalogo esterno. |
| `start_ora_manual(place_id)` | Identità Auth, source manual e durata4h derivati sul server. |
| `start_ora_qr(qr_token)` | Risoluzione esatta dell'UUID controllato in venue_codes, con lock e verifica Place; source qr. Nessun join. |
| `my_presence()` | Solo presenza live propria, ID, Place, orari propri e server_now; null se assente. Nessuna history. Include alias venue_id/checked_in_at per riutilizzare il coordinatore esistente. |
| `end_ora(presence_id)` | Solo owner; delete immediato e idempotente. Un ID vecchio non chiude quello nuovo. Disponibile anche dopo revoca/restrizione. |

È riutilizzata la PK user_id di `checkins`: una sola riga per account.
Start/exit acquisiscono lock Board → owner, coerenti con delete/consent/foto.
I writer acquisiscono anche row lock sul catalogo e sulla presenza. Il server
cattura clock_timestamp dopo l'attesa. Retry sullo stesso Place ancora live
restituisce ID/start/expiry/source esistenti senza rinnovo. Cambio Place o
presenza scaduta: delete+insert atomico con nuovo ID; nessuna nuova history.
Le eventuali FK predisposte su origin_presence_id si staccano con SET NULL.

La 032 allarga esclusivamente il CHECK durata: positiva e ≤4h. Non aggiorna
i due check-in legacy né li estende. Una presenza legacy ancora live nello
stesso Place conserva la durata/identità precedente fino a fine sessione.
Nessun limite giornaliero Places o requisito Tribe.

### Pending QR

Login/AGE/consenso/profilo e completamento dello step Tribe precedono il
consumo. Skip con zero Tribe è valido. Successo o QR definitivamente invalido
rimuovono draft, session context e query venue. Un errore transitorio mantiene
il contesto per retry; il server rende idempotente la ripetizione nello stesso
Place. Cambio account/logout ripulisce il contesto precedente. I draft ORA
locali hanno lifetime UX di1h, senza rinnovo a ogni boot; draft vecchi senza
savedAt vengono scartati. Il limite locale non è un controllo di sicurezza:
ogni richiesta è nuovamente autorizzata dal server. I QR controllati restano
riutilizzabili secondo il modello precedente, senza rotazione in questo task.

## F. Ora people e autorizzazione minima foto

`ora_people_page(page_size,page_offset)` richiede presenza live del chiamante,
AGE, consenso dating valido e account normale attivo. Parte dall'indice delle
presenze nello stesso Place e poi applica filtro preferenza esistente,
block bidirezionale, sospensione, ban, deletion e staff exclusion. Zero Tribe
è ammesso. Massimo49 righe per richiesta per paginazione48+sentinella.
Non restituisce checked_in_at/expires_at di altri, preferenze o stato consenso.

La relazione ORA condivisa viene aggiunta alla sola `can_view_profile` già
riusata da proiezioni/foto firmate. Il ramo Tribe preesistente, own access,
match e tutti i controlli PHOTO lifecycle restano presenti. Il nuovo ramo
richiede stessa presenza live, eligibility e assenza blocchi: nessuna apertura
globale. Prove positive/negative su signed-photo authorization in SQL.
Non è il redesign PROFILE / PHOTO AUTHORIZATION V2. Decoder, storage writer,
cache foto e lifecycle PHOTO-01/02 non sono stati modificati. Le URL firmate
già emesse conservano il loro breve TTL preesistente; non si promette revoca
retroattiva dei byte già scaricati.

## G–I. Compatibilità, quota e sicurezza

- Migration027–031 invariate. Signup senza QR e join/leave engine preservati;
  il QR differito viene ora completato nel nuovo percorso.
- Membri, due check-in90m e relativi expiry invariati sullo staging.
- Spot legacy, match/chat e Bacheca non cambiano contratto. Il nuovo dettaglio
  Ora non offre invio Spot legacy; un match già esistente può aprire la chat.
- Nessun send_spot_v2, contatore, person-level reciprocity o nuova quota.
  ora_spot_policy OFF e entrambe le tabelle quota vuote. Altri discovery flag
  OFF, jobs_paused true; nessun scheduler/cleanup abilitato.
- Nessun user_id, source, linked Tribe o expiry impostabile dalle RPC client.
  UUID crafted non viene interpretato come Place da start_ora_qr.
- Tabelle/grants/RLS presenza non ampliati per scritture dirette; helper
  privati non eseguibili e nuove RPC solo authenticated/SECURITY DEFINER con
  search_path vuoto. Auth/AGE/CONSENT/account gates server-side.
- Stato live UI basato su server_now e tempo monotono, con polling server;
  il clock civile del telefono non decide la validità della presenza.

## J. Evidenze

Baseline378; suite finale **396/396 PASS** (+18). Build staging, typecheck e
release checks PASS. Bundle contiene onboarding e tutte le RPC Ora, solo ref
staging, nessun ref production/fixture hook/server secret o Google Fonts remoto.

Nuovi test coprono start/retry/switch/4h/exit/stale exit, source, zero Tribe,
QR crafted/no autojoin, grants e corpi legacy ritirati, AGE/consent/ban/staff/
suspension/delete, same-Place discovery e blocchi, expiry, foto autorizzate
solo nella relazione prevista, Spot/match/chat legacy, policy quota OFF,
onboarding pending/idempotenza/invalid QR, UI error/reset e clock monotono.
Le verifiche hosted smoke/fixture/grants/source/activation sono anche
rehearsed in PGlite. Il test storico che esercita il QR legacy è esplicitamente
limitato fino031; il nuovo test032 dimostra il ritiro intenzionale invece di
continuare ad aspettarsi l'auto-join rimosso.

### Hosted PostgreSQL staging

- Preflight:3 account/profili,2 membership,2 check-in legacy scaduti,
  39 oggetti Storage; nessuna collisione RPC; PHOTO PAUSED.
- Smoke A–F con fixture SQL/JWT sintetiche e ROLLBACK: manuale/QR4h,
  onboarding completato→QR, same-Place retry, switch, stale exit,
  discovery stessa venue, legacy denied, zero membership/grace nuova; PASS.
  Residual Auth e Places=0.
- Race su **due sessioni PostgreSQL distinte**, transazione A in lock con
  pausa12s e transazione B in attesa: manuale/QR e manuale/manuale su Places
  diversi serializzate, massimo una riga live. Same-Place: identici ID,
  started_at ed expires_at. Setup e teardown sono versionati e nominativi;
  nessuna password, nessun file Storage scritto.
- Sotto snapshot RR/serializable stantio, PK/row-write conflicts possono
  produrre errore di serializzazione/unique conflict: occorre retry in una
  nuova transazione, mai bypassare i lock. Le race hosted sono READ COMMITTED;
  non si dichiara un benchmark hosted RR separato.
- Teardown:0 Auth/membership/state/guard sintetici. Confronto automatico
  pre/post: **tutte79 impronte tabella identiche**, Auth identity hash,
  policies e ACL/RLS identici. Le differenze funzione/schema sono quelle032.
- Source check: tutti14 corpi funzione corrispondono alla032 versionata.
  Grants check PASS, nessun direct write presenza, nessuna fixture nominata,
  PHOTO control PAUSED e scheduler/cleanup OFF.
- Confirm email verificato **ON via API pubblica**, non modificato. Il DNS
  del runner sandbox non risolveva l'host; la stessa richiesta read-only con
  rete autorizzata risponde HTTP200: nessun workaround sul provider.

### Browser/mobile

UI integrata locale390×844: idle, ricerca, Sono qui, live, exit, step Tribe
incompleto→skip→QR; URL venue rimossa, qr=1/legacy=0/members=0. Screenshot
locale `.local/ora-032/mobile-ora-live.jpg`. Viewport ripristinato.
**Backend/Auth/foto del browser locale sono simulati** e segnalati nella UI;
non è una prova di login Google, permesso fotocamera o upload reale.
Le garanzie server provengono dai test PostgreSQL separati. Nessun toggle
Auth cambiato e nessun account reale aggiunto per il collaudo.

## K–M. GitHub, preview e ambiente

Commit implementazione, push e Preview: evidenze operative riportate nel
successivo checkpoint finale di questo documento. Nessun force push, merge
main o promozione Production autorizzati. La preview è una build statica
precompilata con soli parametri pubblici staging; non usa env production
scaricati dal provider. VITE_ORA_V2 è false per default e accetta true solo
con onboarding/privacy e hostname staging esatto.

Attivazione server separata con `tests/staging/ora-v2-enable.sql`, solo dopo
i gate. Il GUC supabase.project_ref è NULL nell'editor hosted: la selezione
esplicita del progetto/URL e privacy_environment=staging costituiscono il
controllo ambiente; il GUC, quando presente, deve coincidere. Il solo flag
ora_enabled è autorizzato all'ON in staging. Tutti gli altri rimangono OFF.

## N. Gate e rischi residui

**GO WITH CONDITIONS a SPOT V2 + ORA QUOTA ENFORCEMENT.** Bypass membership
QR chiuso nello staging. Nessun GO pilot o production.

- Prima del pilot: collaudo Auth reale e QR/fotocamera su dispositivi fisici,
  futuro profile/photo authorization v2 e gate legal/privacy già aperti.
- Lifecycle fisico check-in/guard scaduti da chiudere nel task retention;
  qui non si abilita purge. Nessuna nuova cronologia visite.
- Il lock Board globale è conservativo e coerente con il sistema esistente;
  non è un claim di capacità/carico illimitato.
- Vecchi client staging che chiamano check_in devono aggiornarsi: falliscono
  chiusi. Non riabilitare il writer come rollback.

Rollback operativo: spegnere ora_enabled e/o disabilitare flag frontend;
end_ora resta owner-only utilizzabile. Conservare schema e writer legacy
ritirati; nessun rollback distruttivo, nessuna ricreazione di auto-join.
Non iniziare Spot v2, quota enforcement, Daily Discovery, SPOTTED o scheduler.

## Checkpoint operativo finale

- Commit implementazione: `ef1332eb491e793d875294cf44f2eca82f5a8106`.
- Test finali:396/396 PASS; build/typecheck/release checks PASS.
- Staging: ORA ON; resto dei flag OFF; jobs paused; PHOTO admission/cleanup/
  scheduler restano nella baseline PAUSED/OFF. La sola impronta tabella variata
  dopo l'attivazione è soma_v2_control. Tutti i dati prodotto e Storage invariati.
- Auth confirmation ON verificata HTTP200. Nessuna fixture reale creata dal
  browser; fixture SQL eliminate/rollback. Nessuna modifica main o Production.
- Il branch remoto staging non esisteva al preflight; main remoto è rimasto
  `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
- **Push NON riuscito**: normale helper Git HTTPS senza credenziali utilizzabili
  (anche specificando lo username del repository). SSH strict non trova un host
  verificato; nessuna chiave/credenziale/protezione è stata modificata per
  aggirarlo. Serve autenticazione GitHub sul Mac e successivo push normale.
  Non si dichiara uno SHA remoto staging verificato o GitHub sincronizzato.
- **Preview NON pubblicata**: rispettato il gate push→deploy richiesto.
  URL/deployment ID: N/A. CLI Vercel62.2.0 già autenticata; cartella dist linkata
  localmente al progetto esistente, senza cambiare configurazione remota.
  Dry-run target Preview:39 file, nessun artefatto vietato.
- La CLI link ha generato una env locale temporanea in dist: eliminata senza
  leggerne/stamparne i valori prima di qualsiasi upload; release checker PASS.
  `.env.local` alla radice non è stata modificata. Nessun secret nel bundle.
- Build pronta: Supabase staging e onboarding/ORA true; esistenti privacy,
  Rights, Moderation e Bacheca staging true. Nessuna futura discovery abilitata.
- Il collaudo con un nuovo account e upload reale resta inoltre subordinato
  a una canary PHOTO esplicitamente controllata: non è stata riaperta admission
  PHOTO solo per far passare lo smoke. Non confondere questa preview candidata
  con una certificazione dell'intero signup Google/foto su dispositivo.

### Ripresa del checkpoint

Dopo autenticazione GitHub: push normale del branch (senza force), verifica
HEAD locale=SHA branch remoto; main deve restare invariato. Solo dopo:
ricompilare/verificare gli stessi flag staging, release/secret scan, deploy
statico **target Preview**, verificare URL/deployment ID/SHA/ref effettivo,
smoke browser e documentare il risultato. Nessuna promozione Production.

La chiusura remota è quindi **BLOCCATA**, pur con GO tecnico del motore.
Il gate al task successivo resta **GO WITH CONDITIONS**: completare prima
il checkpoint GitHub e, se disponibile in sicurezza, la Preview richiesta.
Non iniziare autonomamente SPOT V2/ORA quota.

### File del task

- `.env.example`
- `docs/places-ora-v2-032-staging.md`
- `scripts/ora-fixture/preview.js`
- `scripts/prepare-ora-preview.mjs`
- `src/backend.js`
- `src/live-social.js`
- `src/live.js`
- `src/ora-ui.js`
- `src/ora.js`
- `src/supabase-client.js`
- `supabase/migrations/032_places_ora_v2.sql`
- `tests/live-navigation.test.js`
- `tests/live-social.test.js`
- `tests/ora-v2.test.js`
- `tests/staging/ora-v2-check.sql`
- `tests/staging/ora-v2-concurrency-fixture.sql`
- `tests/staging/ora-v2-concurrency-sessions.sql`
- `tests/staging/ora-v2-concurrency-teardown.sql`
- `tests/staging/ora-v2-enable.sql`
- `tests/staging/ora-v2-smoke.sql`
- `tests/staging/ora-v2-source-check.sql`
- `tests/tribe-database.test.js`
