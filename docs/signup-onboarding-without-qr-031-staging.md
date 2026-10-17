# Signup / onboarding senza QR — 031 staging

Data: 2026-10-17. Branch: `codex/soma-schema-v2-staging`.
Baseline: `c9cd3b92d68a7fc4fe19d5465ff54fb5bbcca234` (362 test).
Esito: **GO WITH CONDITIONS al gate successivo; nessun GO produzione**.

## Audit e scope

Il frontend richiedeva un QR prima del profilo: `go('onboarding')` tornava
all'intro senza foto/QR, `loadAccount` instradava il nuovo account senza QR
all'intro e consumava automaticamente il QR pendente dopo il salvataggio.
`backend.saveProfile` non richiedeva invece una venue: non occorre modificare
il writer del profilo o la pipeline foto.

Implementato il percorso login esistente → AGE/consenso esistenti → profilo
→ scelta Tribe opzionale → app. Non vengono introdotti nuovi flussi Auth.
La ricerca e i join non richiedono check-in. Skip ammette zero Tribe.
Il join usa esclusivamente `join_tribe` della 030: niente secondo writer,
budget/grace/cooldown duplicati nel client o creazione di presenza.
Gli errori parziali conservano i join già confermati; refresh e ritorno
recuperano lo stato dal server.

## Contratto e migration 031

Applicata **solo a `zjinjtkekmaqtxsuyvho`**. MD5 sorgente:
`427eb8d85af66b622e88ec114230540e`.

- `spot_private.account_onboarding`: `user_id` PK/FK Auth con cascade,
  `completed_at` nullable; RLS, nessuna policy/accesso diretto client.
- Trigger AFTER INSERT profilo: iscrive i nuovi profili allo step incompleto.
  Nessun backfill dei profili legacy; un profilo esistente senza marker è
  considerato completo. Un UPDATE profilo non riapre l'onboarding.
- `my_onboarding_state()`: stato del solo chiamante e proprie Tribe id/nome;
  nessun timestamp o dato di altri utenti.
- `complete_onboarding()`: lock coerenti Board/owner; completamento idempotente
  senza membership, grace o presenza implicite.
- `search_joinable_tribes(text, integer)`: catalogo attivo/joinable e venue
  attiva, substring letterale, query ≤80 caratteri, offset 0–10000, pagine20;
  risposta solo id/nome. Eligibility server-side, non richiede consenso dating
  per il solo step community opzionale.
- Le tre RPC sono eseguibili solo da authenticated; identità da Auth,
  SECURITY DEFINER con search_path vuoto. Helper privato non eseguibile.

Le quattro definizioni function installate sono state confrontate con le
sorgenti locali. Check hosted PASS su RLS/grants/trigger, zero backfill e
tutti i flag discovery v2 OFF. Nessuna modifica a 027–030.

## Attivazione e QR differito

`VITE_ONBOARDING_NO_QR=false` è il default. L'attivazione richiede privacy
gates e hostname esatto del Supabase staging; altra configurazione è rifiutata.
Il bundle staging è stato compilato con flag true e verificato privo del ref
production e del runtime fixture. Nessun deploy Vercel effettuato: URL e
deployment ID cloud non applicabili.

Il QR pendente può essere ricordato, ma non viene consumato dall'onboarding,
da reload o da ritorno con sessione. Non crea membership/presenza. Per un
account già completo resta disponibile l'esplicita scansione del flusso
legacy, fuori dal nuovo onboarding: la separazione completa Place/ORA/QR
non appartiene a questo task.

## Verifiche

- Suite completa: **378/378 PASS**, inclusi16 nuovi test rispetto alla baseline.
- Build standard e build staging: PASS. Typecheck: PASS. `git diff --check`: PASS.
- PGlite: migration reale, nuovo profilo/marker, skip, zero presenza/grace,
  idempotenza, 1/2/3 join, quarto negato, legacy, ripresa, owner isolation,
  delete cascade, AGE, ban/sospensione/revoca, input/catalogo e grants.
- Frontend VM: nuovo percorso senza QR, QR differito senza check-in,
  salvataggio profilo, ritorno con zero Tribe, Auth/AGE e modalità legacy.
- Componente UI: errore parziale, skip anche con errore ricerca, risposte
  obsolete dopo reset account e contrasto delle schede.
- Hosted staging SQL in transazione/ROLLBACK: skip zero Tribe, nessuna grace
  o presenza, join manuali1/2/3, quarto negato, ripresa/isolation. Risultato
  PASS; residual_auth=0 e residual_onboarding=0.
- Smoke legacy hosted in rollback: completato senza eccezioni,
  residual_board_fixture=0.
- Snapshot post:3 account/profili,2 membership,39 oggetti Storage; impronte
  profili/membership/Storage corrispondenti al preflight. Raccolte anche
  impronte di79 tabelle, funzioni, policies e ACL senza esportare contenuti.
  Non si dichiara confronto automatico completo delle79 impronte: il binding
  della snapshot iniziale non era disponibile nel controllo finale.
- Check finale031 hosted: PASS, zero marker di onboarding/fixture residue,
  tutti i flag v2 OFF. Scheduler/cleanup non modificati; baseline PAUSED.

### Limiti delle evidenze browser

UI reale locale a390×844: intro/login, AGE e consenso, profilo, skip, reload,
join fino3, quarto rifiutato senza perdita delle scelte, continue, ritorno e
logout/login simulato. QR pendente: zero `check_in` nel modello di collaudo.
Screenshot: `.local/onboarding-031/mobile-final.jpg` (artefatto locale ignorato).
Fixture test svuotata tramite reset al termine; viewport ripristinato.

**Auth e backend/foto del collaudo browser sono simulati**, chiaramente
etichettati. Una PNG sintetica400×500 attraversa la validazione client reale;
non equivale a un upload Storage. Il collaudo SQL usa identità/JWT e metadata
sintetici in rollback, non signup Google/email o upload reale. Restano da
collaudare Google/email reali, selettore file del dispositivo e PHOTO upload
reale nel nuovo percorso cloud. Confirm email/Auth non sono stati modificati;
non si certifica una nuova lettura live del toggle in questo task.

## File modificati

- `.env.example`
- `src/backend.js`
- `src/live.js`
- `src/navigation.js`
- `src/supabase-client.js`
- `src/onboarding.js`
- `src/onboarding-ui.js`
- `supabase/migrations/031_signup_without_qr.sql`
- `tests/live-navigation.test.js`
- `tests/onboarding.test.js`
- `tests/staging/onboarding-check.sql`
- `tests/staging/onboarding-integrity.sql`
- `tests/staging/onboarding-without-qr-smoke.sql`
- `scripts/prepare-onboarding-preview.mjs`
- `scripts/onboarding-fixture/preview.js`
- questo report.

Nessun stylesheet, PHOTO decoder/lifecycle, migration precedente, main o
risorsa production modificato. Il testo e la schermata opzionale sono le
sole aggiunte UX autorizzate; stile esistente riutilizzato.

## Gate successivo e rischi

**HIGH pre-pilot:** il writer QR legacy può ancora aggirare i vincoli del
nuovo membership engine. Da affrontare separatamente in
**PLACES + ORA V2 + QR SEPARATION**, prima di abilitare il sistema complessivo.
Il nuovo onboarding non lo invoca automaticamente.

**MEDIUM pre-pilot:** purge fisico dei rejoin guard scaduti ancora da chiudere
nel relativo task retention; nessuna modifica qui.

Richiesto successivo collaudo cloud Auth/foto reale e dispositivo prima di
promozione. Restano i gate privacy/legal già aperti. Nessuna implementazione
Daily Discovery/ORA v2, gestione Tribe completa, Bacheca nuova o Cupido.
Fermarsi qui al gate successivo; nessun merge main o rollout production.
