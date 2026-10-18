# SOMA Information Architecture + Pilot UI Alignment — 2026-10-18

Scope: staging only, branch `codex/soma-schema-v2-staging`, baseline
`b03f29257d8b2404d5be996a41ece979966e3ffe`. Nessun merge main, produzione o deploy backend.
Nessuna migration/schema/RLS/RPC modificata. Nessun Spot v2, quota enforcement, allocation DD,
Spotted v2, scheduler o modifica PHOTO-01/02.

## Architettura e visual language

Nuovi moduli dedicati `pilot-ui.js`, `pilot-onboarding.js`, `pilot-ora-ui.js` e CSS esclusivamente
scoped. Shell attiva quando sono presenti i backend onboarding/ORA v2 già limitati allo staging.
Produzione legacy e demo restano separati. Nessun nuovo design system: palette, font, radius,
componenti condivisi e profilo/Auth/PHOTO preservati. Design freeze aggiunto ad AGENTS.md.

| Area | Prima | Dopo |
|---|---|---|
| Bottom nav | Ora / Tribe / Match / Chat / Profilo | TRIBE / SPOTTED / ORA / MATCH / PROFILO |
| Onboarding Tribe | Ricerca, aggiunta immediata, max3 UI | Tre card pilot, unica scelta locale, join al Continua, skip |
| Post-onboarding | Ora | Tribe, anche dopo skip e senza loop |
| Tribe | Menu community, directory Persone, Bacheca | Stato Daily Discovery preparatorio, nessun profilo inventato |
| Spotted | Bacheca sotto Tribe | Tab indipendente, medesime RPC/reactions/report/retention legacy |
| Ora | Ricerca Places da avviare | Catalogo visibile automaticamente, tap manuale esplicito, live/residuo/exit |
| Match | Due tab Match e Chat | Una sezione; vecchie route chat-list confluiscono in Match |
| Profilo | Versione approvata | Invariato |

## Contratti preservati

- Membership engine max3 invariato; pilot limita solo una nuova scelta UI. Membership preesistenti
  non vengono eliminate né sostituite. Skip non salva la scelta ancora locale.
- Il retry dopo complete fallito non duplica un join già riuscito. Double-tap serializzato.
- Tribe non legge più la directory e non monta il selettore Persone/Bacheca nella nuova shell.
  Nessun countdown DD, quota DD, refill o contatore falsamente live.
- Spotted riusa `mountBoard` in modalità standalone e le stesse API legacy. La scelta community,
  se più membership esistono, serve soltanto a contestualizzare quel feed; non cambia membership.
- Ora usa solo search_places/start_ora_manual/my_presence/end_ora già esistenti.
  Nessun auto-start, nessun rinnovo client, nessun auto-join Tribe.
- Residuo ORA calcolato dal delta expires_at/server_now con tempo monotonic elapsed. Timer solo UI;
  quattro ore, retry stesso Place, switch atomico e scadenza rimangono server-authoritative.
- Nessuna quota futura attivata o mostrata come effettiva. send_spot_v2 non implementata.
- Match usa lo stesso ID e la stessa chat. first_message_at null mostra “❤️ Nuovo match!”;
  dopo messaggi mostra “Conversazione avviata” (o last_message se il contratto lo fornirà), senza
  inventare un testo messaggio o introdurre nuove letture/API backend per le preview.
- Vecchie route tribes/tribe → daily, chats → matches nella shell pilot. History normalizzata;
  i guard Auth/AGE/suspension/deletion comprendono entrambe le nuove route.

## Catalogo staging: decisione esterna richiesta

Inventario read-only: soltanto TEST Università 1 e TEST Università 2, entrambe con ora_enabled null.
Le tre venue richieste IULM/Bocconi/FitActive non esistono nel catalogo.
Nessun record esistente rinominato, nessuna configurazione dati modificata in questo task finora.

Domanda founder pendente: autorizzare tre nuove voci Place+Tribe, joinable e ORA-enabled, esclusivamente
staging, preservando le due TEST. Il piano SQL è preparato localmente ma NON eseguito senza risposta.
Non è una migration né una modifica delle semantics.

La UI mostra i tre nomi approvati ma disabilita quelli che non hanno un'identità backend esatta e
univoca. Non associa per posizione/euristica le venue TEST a università diverse.
ORA mostra soltanto catalogo realmente disponibile via API; non inventa Places abilitati.
Finché manca il catalogo, onboarding reale dei tre luoghi e start/exit ORA live restano BLOCKED,
non dichiarati PASS sulla base di mock.

## Verifiche

- Suite completa: **433/433 PASS**, zero fail/skipped.
- Build staging: PASS. Typecheck attuale repository: PASS.
- Targeted UI/navigation/social e integrazione PASS.
- Nuovi test: onboarding per ciascuno dei tre luoghi, unica selezione, skip senza join,
  retry/double-submit, nessuna rimozione membership legacy, mapping catalogo esatto,
  nav order/alias, DD senza letture directory, Spotted indipendente da Persone,
  ORA senza ricerca/Tribe, tap/exit e residuo monotonic server delta.
- Integrazione controller: scelta → Tribe anche con presenza Ora già attiva; skip → Tribe;
  Ora ancora raggiungibile con zero Tribe. Regressioni Auth/PHOTO/AGE/consent/membership/Ora/Bacheca/social
  incluse nella suite esistente.
- Browser locale DEV con fixture esplicitamente sintetiche: card/selection, scelta→Tribe, skip→Tribe,
  Spotted standalone, zero Tribe→Ora, start/exit PASS. Nessuna evidenza Auth/Storage reale attribuita ai mock.
- Fixture DEV in scripts/pilot-fixture, HTML generato solo nella directory test ignorata; non nel bundle Preview.
- Bundle scan: ref staging presente, ref produzione assente, fixture DEV assenti.

## Gate e Preview

Codice pronto per Preview staging. Report di deployment/browser e URL saranno aggiunti dopo il deploy.
Gate end-to-end completo **GO WITH CONDITIONS** finché il catalogo dei tre luoghi non è approvato/configurato
ed eseguito lo smoke live relativo. Nessun task Spot v2 avviato.
