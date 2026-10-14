# BACHECA-01 — implementazione staging e gate residuo

14 ottobre 2026. Branch `codex/bacheca-01-staging`, baseline `cdb7640` / feature baseline `73eaa31`. Contratto founder approvato, validazione legale pending. Nessuna produzione/main, Cupido, provider nuovo o modifica PHOTO-01/02.

## A–F — implementazione

| Area | Implementazione |
|---|---|
| A Schema | 026_tribe_board.sql: sette tabelle private posts/reactions/quota/receipts/reports/audit/evidence, RLS su tutte; nessun SELECT anon/authenticated. Guard staging prima DDL, eligibility e nuove API staging-only. |
| B RPC | Feed keyset30/max50, create280 Unicode code point, quota3 per giorno civile Europe/Rome/utente/Tribe, delete proprio, quattro reactions uniche/change/remove, report reference. Proiezione peer solo post id/testo/timestamp prodotto, counts/propria reaction/can_delete; nessun author/profile/dating/check-in/moderation metadata. |
| C Frontend | Moduli bacheca API/UI/CSS dedicati, tab Persone/Bacheca, composer/counter, feed, report, reactions, delete, loading/empty/error/retry. textContent per UGC, epoch anti-stale/reset account; nonce conservato per retry della stessa intenzione. VITE_BACHECA_PHASE1 guard solo progetto staging. |
| D Moderation | Coda post separata con MODERATION-01 RBAC/AAL2/fattore verificato; claim/revision/idempotenza; author lookup solo caso claimed/non scaduto e auditato; review/dismiss/hide/warn/suspend/ban. Ban ADMIN-only, nessun downgrade ban→suspend. Trigger anche sulle sospensioni provenienti dalla moderazione profili: vecchi post permanentemente hidden, reversal non li ripubblica. |
| E RIGHTS | Tre categorie board_posts/board_reactions/board_reports, solo propri dati, paginazione bounded. Estensione client opt-in; baseline15sezioni preservata se Bacheca OFF. Prepare delete archivia solo evidence di hold espliciti, poi il normale delete cascada dati ordinari; nessun cambiamento PHOTO. |
| F Retention | Tre policy centralizzate OFF/DESIGN_ONLY: board_posts eleggibile al primo ciclo dopo expiry24h; closed board_reports180giorni candidato; board_metadata7giorni candidato. Job esistente service-only/pause/dry-run/replay/global lock, nessun nuovo scheduler. Report aperto/hold blocca purge; reactions/audit seguono il parent. Held evidence separata segue hold/review/release e retention esistente. |

Tabelle: `spot_private.board_posts`, `board_reactions`, `board_quota`, `board_receipts`, `board_reports`, `board_audit`, `board_evidence`. Author resta solo nella tabella privata; non viene semplicemente rimosso in JavaScript. Nessuna nuova preferenza/ranking/tracking visita.

RPC nuove: board_feed, board_operation, board_create, board_react, board_delete, board_report, board_moderation_queue, board_moderation_action. Wrapper compatibili per my_rights_page, prepare_account_deletion, privacy_retention_run, vecchie implementazioni rese non eseguibili dai client. I decoder, limiti e lifecycle PHOTO restano immutati; la preparazione delete aggiunge solo hook Bacheca prima del callback esistente.

## Retry e allineamento reale

Creazione con nonce UUIDv7 temporale ottenuto da board_operation, tempo server. Non è una credenziale: Auth/AGE/membership restano i controlli di accesso. Versione4, nonce futuro o nonce fuori finestra board_metadata rifiutati; impossibile riutilizzare un vecchio nonce dopo purge receipts per creare nuovamente un post. Receipt privata conserva owner/op/action/fingerprint/result UUID/timestamp, non copia del testo; cascada con account, retention candidata7d. Reaction/report/delete rimangono idempotenti, nessun replay che ripristini uno stato precedente.

026 è stata applicata nello staging, poi il piccolo allineamento nonce della stessa versione candidata (`supabase/staging/bacheca-nonce-alignment.sql`, guard staging/Bacheca vuota). Nessuna seconda migration o produzione. Un timeout dashboard ha temporaneamente impedito la patch; nuova scheda ripristinata, patch applicata e rehearsal ripetuto. Verifica `pg_proc.prosrc` contro hash dei corpi nel file026 finale: **18 attesi, 0 mancanti, 0 drift**.

Il controllo automatico iniziale ha rifiutato “Run without RLS”; utilizzata l'opzione “Run and enable RLS” dopo verifica del SQL. Verifica effettiva successiva: **7/7 RLS, zero grant SELECT client**. Nessun bypass del controllo e nessuna tabella lasciata accessibile.

## G — test automatici

**312/312 PASS**, baseline293 +19 nuovi gruppi test. Build/typecheck PASS, release guard37asset e9font locali PASS. Test di database eseguono migration001–026, non verifiche testuali che sostituiscono RLS. Nuovi file tests/bacheca.test.js, bacheca-client.test.js; include regressione phase-a SQL e rehearsal Bacheca completo con rollback.

| Requisiti richiesti | Evidenza |
|---|---|
|1–6 create/281/quota/crossTribe/anonimato/direct leakage | Database/API contract tests e SQL reale; nessun author nella proiezione, private SELECT e author route USER denied |
|7–10 create/change/remove/counts reactions | Quattro valori, unica row owner/post, replay non stale-toggle; UI fixture nel browser |
|11–13 report/moderator identity/normal deny | Caso con claim+AAL2, author read auditato, ruolo normale/aal1 denied; SQL reale con claims simulati |
|14–17 expiry/purge/open report/hold | Filtro server24h/read/react/report, dry-run/retry, holds espliciti; purge reale SQL sintetico transazionale |
|18–22 delete/account/suspend/reversal/ban | Cascade e held minimal evidence, normal callbacks preservati, hidden persistente, ban gate |
|23–26 revoked/AGE/RIGHTS/retention | Revoca non blocca board, underage/missing denied, own export/no author peer, categorie configurabili e paused |
|27–29 concurrency/retry | Promise concurrent su PGlite e locks server; nonce expirato/v4 reject, replay/conflict e double purge. **Concorrenza su connessioni HTTP reali ancora pending**, non equiparata a PGlite. |
|30–31 fixture/residui | Rollback staging e conteggi globali/board verificati0 nuovi residui |

## H–I — staging / UI / privacy

Due rehearsal SQL eseguiti sul Postgres reale staging (prima/dopo nonce alignment), ultimo con contratto finale. Onboarding AGE, consenso/revoca, QR/membership, Ora/Tribe, Spot/match/chat, create/feed/reaction/report, moderation/author/suspend/reversal, expiry/purge, RIGHTS e delete PASS; rollback e fixture prefixff400 residui0. **Auth/JWT/MFA di questo rehearsal sono simulati in SQL**: non signup/login browser, non nuove foto Storage reali. I test PHOTO e lo smoke Auth della baseline restano evidenze precedenti separate.

UI nel browser con API sintetica locale, non collegata a dati reali: Persone/Bacheca, counter281 e pulsante disabled, create/reset composer, change/remove reaction, report select, rete error/recovery, reset account/empty. Stringa HTML/onerror resa letteralmente, niente image/JS eseguito. Palette/font/logo esistenti preservati; solo CSS nuovi componenti. Il tentativo di viewport390 non ha cambiato il viewport effettivo1280: **non si dichiara collaudo mobile riuscito**; override ripristinato. Harness dev-only non entra nel bundle produzione.

**Smoke autenticato HTTP/browser Bacheca pending**: Confirm email server continua ON, nessuna nuova fixture Auth creata. Richiesta al founder temporaneo OFF + ripristino ON dopo cleanup, senza modifica automatica Auth. Runner predisposto riusando helper normale Auth/MFA, nuovo modulo scripts/bacheca-staging-cases.mjs per test quota/reactions paralleli reali, anonimato REST/RPC, moderazione MFA, restricted export/revoca/ban. Non dichiarato già eseguito.

## J–K — regressioni / cleanup / stato finale

Suite core e rehearsal integrato PASS: Profilo/Ora/Tribe/Persone/Spot/match/chat/AGE/CONSENT/RETENTION/RIGHTS/MODERATION/PHOTO. Nessuna nuova foto reale o account Auth persistente; fixture SQL tutte rollback. Finale staging: **3 account/3profili/39oggetti**, current_missing0; board_posts/reactions/reports/audit/receipts/quota/evidence tutti0; fixture0; PHOTO PAUSED, cleanup OFF, scheduler OFF, retention paused, cron attivi0. Tre review storici PHOTO non toccati; zero nuovo residuo, non cleanup storico indiscriminato. Confirm email ON all'ultimo probe API. Nessuna chiave admin, password/TOTP/token reale letti o pubblicati.

## L–N — rischi / legale / gate

**NO-GO alla chiusura BACHECA-01** finché smoke autenticato browser/HTTP (inclusa concorrenza su connessioni indipendenti, purge/delete/cleanup reale fixture) e mobile UI integrata non sono completati. Codice/RPC allineati nello staging; non pilot-ready, nessun rollout autorizzato. Necessaria azione founder Auth temporanea e finale ON, già richiesta; il dashboard è tornato disponibile.

Rischi/limiti: global lock serializza scritture Bacheca con retention per sicurezza; misurare carico reale prima pilot. Feed senza filtraggio author-based dei blocchi dating per evitare oracle di deanonymizzazione; report/azioni post rimangono separati, nessun commento/chat Bacheca. Testo e correlazioni esterne possono identificare chi scrive: anonimato è la proiezione peer, non promessa di anonimato assoluto. Open reports/holds richiedono review operativa: non cancellati solo per età; data/claim visibili allo staff. Metadata/report durations candidate e procedure review/legal hold **LEGAL VALIDATION PENDING**, non policy legale approvata. Report/audit closed possono essere rimossi prima del massimo180d con purge del parent post; la policy non impone conservazione minima. Parametro board_posts.duration1s è placeholder positivo di schema: l'eleggibilità usa expiry prodotto, non un ritardo extra opaco.

Da professionista: UGC/anonimato disclosure, termini/community, dati/evidence sotto hold, retention/report/ricorsi, diritto access/delete, staff access/ruoli. Nessun documento legale definitivo o base giuridica scelti.

Operativamente pausa: VITE_BACHECA_PHASE1 OFF; retention paused/policyOFF; mantenere schema, non rollback distruttivo con dati. Rollback candidate prima utenti: restore wrapper prior solo con board vuota e verifica dipendenze; non tornare a PHOTO-01 né alterare PHOTO. Nessun merge main.
