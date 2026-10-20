# SPOTTED — rimozione quota prodotto giornaliera

20 ottobre 2026. Solo branch `codex/soma-schema-v2-staging`.
Baseline `7d2dc37394232ba406798cdc09f8057e9751ea83`.
Codice `1c7a195258d0f1a143f0214b3d52a9728c6f6fb5`.

## Modifica approvata

SPOTTED non ha più la quota user-facing di tre post/giorno/utente/Tribe.
`spotted_create_post` è indipendente da `board_create` e non legge/scrive
`board_quota`. Preserva membership/AGE/safety, feature gate, testo 280/no link,
nonce temporale, idempotenza/fingerprint precedenti, lock, expiry 24h e trigger
moderazione. Un retry di un post legacy già pubblicato mantiene lo stesso ID.

Prima di ogni nuova pubblicazione richiama il rate limiter tecnico già esistente
`spotted_rate()` (120 ricevute/ultimo minuto). Soglia e definizione del limiter non
cambiano; retry riconosciuti prima del controllo, nessuna nuova quota giornaliera.
Il limite tecnico dei commenti (10/minuto) e gli altri gate rimangono invariati.

`spotted_feed` restituisce ora soltanto `items` e `more`, senza `remaining`.
UI: “I post restano visibili per 24 ore.”, nessun residuo giornaliero e nessun
messaggio “Hai già pubblicato 3 post oggi”. Il budget romantico `remaining` resta
separato e invariato (sei tentativi/giorno). Nessuna modifica visiva/CSS.

Legacy: tabella, vincolo, contatori, `board_create`, `board_feed`, relativo errore
Bacheca e purge legacy restano invariati. La vecchia Bacheca conserva la sua quota;
non viene estesa a SPOTTED o automaticamente al futuro QoD.

## Migration e staging

Applicata **solo 046_spotted_remove_daily_post_quota.sql** nel progetto
`zjinjtkekmaqtxsuyvho`, mediante SQL esplicito; nessun bulk migration runner.
Nessun cambiamento a tabelle/RLS/indici: sostituite soltanto le due RPC SPOTTED
con le stesse firme/grant autenticati. Schema reload notificato.

Bozza `045_spotted_qod.sql`: preesistente, locale/untracked, non applicata,
non committata, non modificata in questo task. QoD rimane sospeso. Numerazione
046 scelta per non confondere la migration attiva con la bozza 045 non autorizzata.

Verifica live prima/dopo:
- quattro account, quattro profili, 42 oggetti Storage, un post, una riga quota:
  conteggi invariati; nessun dato utente scritto per il collaudo.
- Hash `board_create`, `board_feed` e `spotted_rate` identici prima/dopo.
- Hash delle nuove RPC identici alle definizioni PostgreSQL-backed testate.
- Colonne QoD assenti (`qod_applied=false`).
- Discovery OFF, jobs paused, PHOTO cleanup/scheduler OFF, invariati.

Non viene dichiarato un nuovo E2E remoto autenticato di pubblicazione: la prova di
più di tre post è PostgreSQL-backed locale; sul server staging sono verificate
le stesse definizioni e l'integrità dei dati in sola lettura.

## Test e impedimento globale

**57/57 mirati PASS**: frontend, social e romantic SPOTTED.
Verifiche nuove/aggiornate:
- cinque o più post SPOTTED, risposta feed senza `remaining`;
- quota legacy piena e quarto post Bacheca bloccato, SPOTTED continua;
- retry preesistente, conflitto payload, nessuna scrittura quota legacy;
- soglia tecnica 120: ultimo consentito, successivo negato, retry gratuito;
- sei operazioni distinte e retry accodati: nessun duplicato né quota legacy
  (PGlite single-session, non prova di concorrenza multi-connessione);
- autorizzazioni/non-member/leave/suspension, testo, commenti, moderazione,
  anonimato e romantic request tramite le regressioni esistenti;
- UI ignora anche un vecchio `remaining=0` e permette il submit valido.

Build PASS, typecheck PASS, release scan PASS (37 asset, nove font locali).

**Suite completa: 621/622 PASS, una failure DD preesistente.**
`tests/daily-discovery.test.js:58` attende `DD_WINDOW_IMMUTABLE`, riceve
`DD_WINDOW_DAY`. Riprodotto anche eseguendo solo quel test. Test, helper e
migration DD non differiscono dalla baseline e il suo setup termina alla 037:
non carica 042, 043, 044 o 046. Nessuna dipendenza dalla modifica di questo task.

Causa: l'helper costruisce una finestra con fine `min(now+20min, mezzanotte Roma)`;
il test modifica `ends_at + 1 minuto`. Quando il confine supera mezzanotte, la
validazione del giorno precede quella di immutabilità. Non correggiamo fixture,
assertion o logica DD fuori scope. La suite globale **non è dichiarata verde**.
Log separati e hash in `docs/evidence/spotted-post-quota/validation.json`.

## Preview di review

https://spot-233tsp3j0-fedegrasso1994-1482.vercel.app

Deployment `dpl_12Tm54GQ5TjS5CHM2TKqLb9Ln2Um`, READY, solo staging,
SHA codice `1c7a195258d0f1a143f0214b3d52a9728c6f6fb5`.
Bundle senza URL production o secret; flag frontend baseline preservati.
Welcome e login verificati, zero errori console; nessun nuovo login Google reale.
Deployment Protection invariata. Solo nuovo callback della Preview nella allowlist
Auth staging (15→16 URL), Site URL e voci precedenti invariati.

I vecchi deployment Preview sono immutabili: usare questo URL per la UI aggiornata.
La rimozione del campo `remaining` dal contratto è intenzionale e autorizzata;
vecchi bundle non aggiornati possono ancora mostrare il vecchio testo.

## File

- `supabase/migrations/046_spotted_remove_daily_post_quota.sql`
- `src/spotted-social.js`, `src/spotted-social-ui.js`
- `tests/spotted-social.test.js`, `tests/spotted-social-client.test.js`
- `tests/helpers/romantic-database.js` (carica anche 046)
- fixture feed in `tests/spotted-beauty.test.js`,
  `tests/spotted-micro-polish.test.js`, `tests/spotted-romantic-client.test.js`
- `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`
- questo report e `docs/evidence/spotted-post-quota/validation.json`.

## Stato finale

Modifica mirata completata e verificata in staging; gate suite globale resta
non verde per il test DD descritto, da affrontare in un task separato.
Nessuna modifica a main (`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`) o
Production (`dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`).
Commit report separato dal codice. Working tree residuo: soltanto la bozza QoD
045 già presente all'inizio. Nessuna prosecuzione QoD/Share. STOP.
