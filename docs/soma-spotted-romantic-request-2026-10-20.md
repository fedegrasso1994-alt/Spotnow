# Soma — SPOTTED ROMANTIC REQUEST

Data: 2026-10-20. Branch: `codex/soma-schema-v2-staging`.
Baseline: `ab2ebd0373d54cf1d2a3d03c6fa33a1aafb08d17`.
Implementazione: `3643304fbf6579a9de7fd1df1bae853a8b946f45`.
Codice/artifact Preview: `294531a01e9164678c84e189e4b02b3ff0e18afe`.
Il commit di consegna successivo contiene soltanto questo report, evidenze e il
post-check diagnostico, senza differenze runtime rispetto alla Preview.

**SPOTTED ROMANTIC: GO FOR REVIEW** — esclusivamente staging, non autorizzazione al pilot o a Production.

## A–C. Inventario, riuso e schema

La migration 027 aveva già predisposto `board_preferences`, `board_request_quota`,
`board_request_attempts`, `board_romantic_requests`, `board_request_pair_guards`.
Tabelle private con RLS e nessun accesso diretto client. Nessun motore romantico
attivo: `requests_enabled=false`; l'hook `profile_request_authorized` restituiva false.

Riusati: post/commenti/visibilità social, `board_lock`, eleggibilità AGE/consenso,
blocco/sospensione, `authorized_profile`, autorizzazione foto esistente,
`report_profile`, Match unico con `unique(user_a,user_b)` e chat esistente.
Nessun invio attraverso Spot v2, nessun secondo Match o conversazione.

Migration **043**, applicata solo a `zjinjtkekmaqtxsuyvho`:

- aggiunge `declined_at` e `match_id` al record richiesta;
- indice unico pending sulla coppia non ordinata, indice expiry;
- vincoli quota <=6 e pending di 168 ore;
- RPC `spotted_romantic_settings`, `spotted_romantic_opt_in`,
  `spotted_romantic_submit`, `spotted_romantic_inbox`, `spotted_romantic_decide`;
- hook direzionale e invalidazione per cambiamenti safety/eliggibilità;
- aggiunge alla proiezione social solo `romantic_content`: proprietà pubblica del
  tipo di contenuto e flag globale, mai compatibilità, opt-out o stato Match.

Migration **044**, additiva e applicata successivamente:
non salva ricevute per chiamate già oltre quota, mantenendo identica la risposta.
Non modifica la 043 già applicata, né il credito dei sei tentativi validi.
Le ricevute dei tentativi validi vengono lette prima del contatore: retry gratuito.

Le funzioni live sono state confrontate via MD5 di `prosrc` con quelle installate
nel PostgreSQL locale dei test: **corrispondenza completa**, inclusa la patch 044.
Non sono state deployate Edge Function nuove o modificate.

## D–F. Quota, privacy e autorizzazione

Sei tentativi validi per account/giorno di calendario **Europe/Rome**, globali tra
le Tribe. Contatore atomico sotto il lock server condiviso; nessun giorno,
mittente, destinatario o contatore fornito dal client. Snapshot mutanti diversi
da READ COMMITTED vengono rifiutati. Il pending è person-level, non per contenuto.

Ogni nuovo tentativo valido consuma credito anche se non consegnabile per
incompatibilità, opt-out, pending esistente, guard, blocco o Match esistente.
Opposte direzioni non creano automaticamente un Match.

Risposta uniforme: HTTP 200, `{"submitted":true}`. Nessun request ID al mittente,
nessuna outbox, delivered/seen/declined, identità autore, motivazione di soppressione
o stato del destinatario. Anche la chiamata oltre quota resta neutra, senza
consegna, credito aggiuntivo o nuove ricevute dopo la 044. La UI usa soltanto il
budget proprio per disabilitare tutte le CTA a quota esaurita.

Contenuti propri/system/inaccessibili/scaduti non sono tentativi validi. Gli errori
su questa accessibilità già pubblica sono distinti dalle condizioni private di
consegna, che restano sempre silenziose. CTA uniforme anche sugli autori già matched.

Il destinatario riceve solo ID opaco richiesta, profilo mittente autorizzato e
contesto minimo. Autorizzazione **destinatario → mittente**, mai simmetrica.
Termina con revoca/risoluzione/scadenza/safety; un Match continua tramite il ramo
Match preesistente. Nessuna directory basata sulla sola membership.

## G–K. UI e lifecycle approvati

- CTA su post/commenti user eleggibili, nessun redesign del social core.
- Conferma neutra; nonce incerto conservato anche navigando tra Tribe, cancellato
  al cambio account. Risposte tardive non ripopolano un altro account/contesto.
- Sezione leggera «Vorrebbero conoscerti» dentro MATCH, senza una seconda chat.
- Foto/profilo mittente, contesto, Accetta, Rifiuta, Segnala e blocca.
- Opt-out nel PROFILO, tramite `board_preferences` già esistente.
- Accetta risolve atomicamente la richiesta e crea/riusa il Match unico; duplicate
  accept restituiscono lo stesso Match senza azzerare una conversazione esistente.
- Il Match senza messaggi mantiene il rendering esistente «❤️ Nuovo match!».
- Rifiuta non crea Match e non produce comunicazioni al mittente.
- Pending valido 7 giorni; sweep logico lazy, nessuno scheduler nuovo.
- Guard unordered di **720 ore** da `declined_at` oppure dall'`expires_at` originale;
  sweep tardivi e tentativi soppressi non prolungano il guard.
- Opt-out invalida immediatamente i pending ricevuti; opt-in successivo non li
  riattiva. Match e chat rimangono. Nessun nuovo cooldown per l'invalidazione opt-out.
- Nessuna copia del testo originario nel record richiesta: se scade/viene eliminato
  o moderato, la lettura usa contesto neutro senza recuperare testo rimosso.
- Moderazione/blocchi/consenso/età/preferenze possono invalidare silenziosamente
  le richieste. Segnalazioni tramite l'infrastruttura profilo/moderazione esistente.
- Nessun nuovo sottosistema notifiche; nessuna notifica di rifiuto/scadenza.

## L–O. Verifiche

**19 nuovi test PostgreSQL-backed + 6 client = 25; suite completa 610/610 PASS.**
Build, typecheck e verifica release/font/segreti: **PASS**.

Coperti: validità post/commento; quota globale tra Tribe e giorno Rome; settimo
neutro; retry; coppia unica/inversa; assenza outbox e raw access; autorizzazione
direzionale; accettazione/duplicato/Match già creato; rifiuto; guard esatto e non
esteso; expiry tardiva anche oltre il guard; opt-out/no resurrection; incompatibilità;
blocco/sospensione/consenso; report; contesto eliminato; bypass diretto; fixed snapshot;
delete account; concorrenza accodata e controlli UI/errori/refresh/account switch.

I test PGlite eseguono PostgreSQL reale in-process: la coda locale non è spacciata
per prova multi-sessione. Il collaudo remoto ha verificato accept concorrenti reali,
quota sotto chiamate concorrenti, login JWT normale e lettura chat dopo nuovo login.

Timing: campioni locali registrati in `local-timing.json`, corpi identici e stessa
quota. Non è un'implementazione constant-time né una dimostrazione statistica di
indistinguibilità su rete. Non introdotti sleep artificiali o nuovi worker/provider.

## M. E2E staging e cleanup

Tre identità temporanee `fea43000-*`, marcate sintetiche, due Tribe isolate.
Credenziali generate solo in `.local`, mai nel repository/report/chat. Auth password
reale, AGE/consenso, JPEG sintetico nel normale PHOTO-01/02, profilo e Membership
Engine. Nessuna modifica globale a Confirm email (verificato **ON**).

E2E API reale: invio, recipient profile/foto, sender senza accesso reciproco,
richiesta inversa senza Match automatico, accept concorrenti → unico Match/chat,
commento/rifiuto/guard/quota, opt-out con Match conservato. HTTP 200 neutro verificato
anche oltre quota dopo la 044, senza nuove ricevute.

E2E browser: frontend reale su `http://127.0.0.1:4181`, **Supabase staging reale**,
nessun mock backend. Invio neutro anche su autore già matched; destinatario vede
profilo/foto; accetta → Match → invio messaggio → lettura dopo refresh. Opt-out
persistente dopo reload. Nessun errore console. Viewport 390×844 e 320×700: nessun
overflow; controlli alti 53,5 px e raggiungibili sopra la tab bar dopo scroll.

Tre account eliminati tramite il normale delete account/PHOTO-02, poi rimosse
solo le due venue sintetiche vuote, dopo controllo delle dipendenze.

Stato finale osservato:

| Dato | Finale |
| --- | ---: |
| Account/profili preesistenti | 4 / 4, preservati |
| Storage preesistente | 42 oggetti, preservati |
| Account/profili/Storage/venue fixture | 0 / 0 / 0 / 0 |
| Post/commenti/like/report fixture | 0 |
| Richieste/tentativi/quota/guard/preferenze romantiche | 0 |
| Foto correnti mancanti | 0 |
| PHOTO technical receipts fixture | 3 `purged`, normale policy 7 giorni |

I sei oggetti fuori da `photo_lifecycle_sets` sono tutti già referenziati in
`photo_assets` e appartenenti ad account esistenti: **non sono nuovi orfani**.
Preservati, senza cleanup ad hoc. Nessun file/foto/record prodotto delle fixture
rimasto. Le sole technical receipts PHOTO-02 non sono forzate fuori dal lifecycle.

## P. Preview e screenshot

- URL: https://spot-aaiv8cyqj-fedegrasso1994-1482.vercel.app
- Deployment: `dpl_4rednQbBBXRZqWGP9k376nLa5evP`, READY, target Preview.
- Commit: `294531a01e9164678c84e189e4b02b3ff0e18afe`.
- Artefatto precompilato, 37 file; ref staging verificato; nessun ref production
  o secret server nel bundle. Rimane attiva Deployment Protection.
- Browser hosted: landing/login/import/reload verificati. E2E autenticato delle
  fixture eseguito sul medesimo codice localmente contro staging, non dichiarato
  falsamente come login fixture sulla URL hosted. Nessun endpoint login-test pubblicato.
- Non ripetuto un login Google reale; configurazione Google/GCP invariata.
- Aggiunta solo la nuova Preview alla allowlist Auth staging: 12→13 URL; nessuna
  modifica Site URL o altre voci. Nessuna wildcard fra domini/progetti.
- Screenshot sintetici locali: `.local/spotted-romantic/screenshots/` (sender,
  destinatario 390/320, chat 320). Nessuna foto reale nei test.

## Q. Limiti residui / prima del pilot

Nessuna decisione founder residua su guard, opt-out o CTA. Nessun blocker nei
journey collaudati per la review staging. Non equivale a readiness production/pilot.

- Read inbox bounded a 50 richieste per chiamata; risolvendole compaiono le successive.
- Purge fisico di richieste/ricevute/guard e relativa operatività rimangono nel blocco
  retention successivo: `purge_after` predisposto, nessun job attivato qui.
- Aggiornare nel blocco RIGHTS/legal la mappa/export delle nuove categorie romantiche,
  evitando di trasformare l'export mittente in un'outbox di consegna/rifiuto.
- Validazione professionale di basi/consenso/retention/guard e procedure safety prima
  del pilot resta separata dall'approvazione tecnica founder.
- Revoca server-side immediata non cancella immagini già scaricate né invalida
  retroattivamente URL foto già emessi: cache/TTL PHOTO-02 preesistenti, non modificati.
- Timing di rete/abuse hardening resta da approfondire nel QA avversariale pre-pilot;
  non promettiamo proprietà constant-time da un campione locale ridotto.
- Nessuna notifica push romantica: delivery/notifications MVP è un task separato.

Rollback operativo staging: `requests_enabled=false` nel controllo singleton,
senza rollback schema distruttivo. Revoca il ramo request delle autorizzazioni e
rifiuta le mutazioni romantiche; Match/chat esistenti continuano sui rami normali.

## R–S. Git, ambienti e STOP

Codice/migration/test/strumenti pushati sul solo branch staging. Report/evidenze
pushati con commit di consegna separato; SHA finale riportato nel messaggio finale.

Stato staging: `requests_enabled=true` per review; Discovery OFF; jobs paused;
retention paused; PHOTO epoch 12 OPEN, cleanup OFF, scheduler OFF. Nessuna modifica
PHOTO-01/02, ORA, DD, Spot v2 o Membership Engine; nessun refactor globale/design.

Main invariato: `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
Vercel Production invariata: `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`.
Nessun accesso/modifica a Google Cloud/Luigi, nessun merge main, nessun deploy Production.

QoD e share/deep links **non iniziati**. STOP al gate di review.
