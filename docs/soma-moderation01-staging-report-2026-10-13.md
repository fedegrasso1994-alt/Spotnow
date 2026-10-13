# MODERATION-01 — collaudo staging e chiusura tecnica

13 ottobre 2026. Branch `codex/moderation-01-staging`, baseline RIGHTS `1d840a17fc015f429c4f76504d40aa346c4714ca`. Main e produzione invariati. Staging `zjinjtkekmaqtxsuyvho`. Nessun provider nuovo, nessun Cupido/Bacheca.

## A. Audit precedente

Vedere [design](soma-moderation01-design-2026-10-12.md): vecchia membership senza MFA, queue limitata globalmente a 100, assenza di cursor/operation ID/lease, sanzioni senza expiry. Le vecchie RPC sono ora revocate, anche al service role. Nessuna promozione automatica di account precedenti.

## B–E. Implementazione

Migration candidata `025_moderation.sql`, staging-only: ruoli privati MODERATOR/ADMIN, role events, RLS/grants, revision e claim del report, queue FIFO con keyset, sanzioni suspend/ban, audit minimizzato. USER non ha amministrazione. Staff richiede ruolo attivo, JWT AAL2, fattore Auth verificato ancora presente e account Auth non banned. Revoca ruolo/fattore vale per sessioni già aperte. Staff dedicato non eredita discovery/chat/photo del normale prodotto; accesso ai propri dati/delete rimane disponibile.

Queue con filtro all/open/under_review/closed, pagina 50/max100, lookahead e cursor `(created_at,id)`; nessun tetto totale. Azioni claim/review/dismiss/warn/suspend; ADMIN aggiunge ban/release/reopen/role_set. Lease claim 15 minuti, revision attesa, row/advisory locks. Stesso actor/op/payload: risultato idempotente; conflitti: refresh richiesto. Suspend 1–720 ore, ban fino revoca esplicita; MODERATOR non può declassare un ban. Enforcement server su sessioni/RPC esistenti, non dipendente dal pannello.

ADMIN può revocare una sanzione dopo cancellazione del reporter mediante `moderation_release`: report ID nullo, target FK cascade, audit e retry vincolati. Nessuna modifica ai decoder, limiti o lifecycle PHOTO. Solo predicate comuni aggiornati per expiry/isolamento staff.

## F–H. Safety, account, audit

Report e audit collegati cancellati al delete reporter/target; dati prodotto e foto seguono i normali RIGHTS/PHOTO-02. Hold esplicito conserva solo reason/status categorici, non note/chat/foto/preferenze/profilo. Anche hold su reversal standalone conserva solo categorie. Audit standalone segue closed_reports configurabile, escludendo hold, casi aperti o sanzioni attive; role events seguono privacy_operation_metadata. Conteggi purge aggiuntivi persistiti per replay stabile. Retention staging resta sospesa al termine.

Audit actor/server timestamp/action/reason/target/op/previous/new; nota opzionale 200 caratteri, non duplicata nel request JSON. Queue non espone reporter ID, preferenze, consensi o timestamp presenza. RIGHTS non esporta note interne. Le note libere richiedono formazione: non esiste un filtro infallibile contro ogni contenuto personale inserito da staff.

Pannello staging isolato dal flag `VITE_MODERATION_PHASE1` (default false, hostname esatto); login Auth normale e challenge TOTP, nessuna chiave admin/client. Warning personale generico via RPC owner-only, nessun nuovo push/email. Nessun file CSS modificato.

## I. Test automatici

16 test MODERATION aggiunti, suite totale **284/284 PASS**. Copertura: USER/AAL1 negati; staff MFA; revoca ruolo/fattore su sessione esistente; paginazione 151 timestamp uguali; claim concorrente e conflict; review/dismiss/warn; suspend/expiry/ban/reversal; own rights; delete banned/suspended; hold; closed/open/under_review retention; audit/export redaction; isolamento staff; positive core QR/Ora/Tribe/Spot/match/chat; stale warning dopo logout; reversal senza report; retention bounded/replay; rehearsal SQL rollback.

Comandi: `pnpm test` ha avuto un solo timeout del decoder foto sotto carico parallelo (283/284), non una regressione moderation. Stessa suite `node --test --test-concurrency=2 tests/*.test.js`: 284/284 in 93.8s. Nessun limite PHOTO o test modificato per aggirarlo. `pnpm build`: PASS. `pnpm typecheck`: PASS. `git diff --check`: PASS.

## J. Evidenze staging reali

Cinque account temporanei via normale signup/login con publishable key: due utenti con profilo/foto sintetica, tre staff con veri fattori TOTP verificati. Nessuna chiave service role letta, nessuna credenziale reale; credenziali fixture escluse dal repository/report.

- Auth/MFA reali: USER e AAL1 denied, AAL2 authorized; pannello browser login+challenge+queue PASS.
- 152 report percorsi via HTTP con cursor deterministico; nessuna perdita/duplicazione.
- Due richieste moderator simultanee: un solo claim vince; replay e dismiss PASS.
- Warn idempotente/own-only; private preferences/consent/location/raw tables e legacy RPC denied.
- Suspend e ban su JWT già aperto: check-in/Spot negati, RIGHTS preservati; ADMIN reversal PASS.
- Revoca ruolo MOD2: vecchia sessione denied. Rimozione fattore MOD1: vecchia AAL2 denied, RIGHTS preservati.
- Delete Auth reale dell'utente banned PASS; cancellazione reporter elimina il caso, ADMIN revoca la sanzione residua dell'altro utente senza perdere la sua foto; replay PASS.
- Delete degli altri quattro via normale Edge delete-account PASS; nessuna fixture Auth utilizzabile.
- Rehearsal SQL reale finale: 151 casi, RLS/claim/ban/RIGHTS/delete, rollback completo PASS. Questa prova SQL simula claim JWT e non sostituisce la distinta prova Auth/MFA reale.
- Hash `pg_proc.prosrc` delle 9 funzioni definite da 025 uguale al codice candidato: 9/9 PASS.
- Regresso completo social/foto/AGE/CONSENT/RETENTION/RIGHTS eseguito automaticamente su Postgres locale; non presentato come journey browser reale di tutte le schermate.

Post-cleanup: fixture accounts/profiles/objects/reports/roles/role-events/audit/MFA/ledger/jobs = 0, quota fixture = 0. Foto sintetiche: 6 oggetti rimossi dal normale lifecycle. Ricevute tecniche fixture settled/purged rimosse solo dopo guardie esplicite; nessun purge per timeout. Baseline ripristinata: 3 account, 3 profili, 39 oggetti, 3 writer preesistenti in review; zero writer unknown inattesi, zero riferimenti current mancanti. Admission PAUSED, cleanup OFF, scheduler OFF, retention paused.

La verifica globale segnala inoltre 6 oggetti non presenti nelle proiezioni ledger/validated: creati il 6 ottobre 2026, tutti con owner Auth/profilo ancora presente, precedenti alle fixture MODERATION, non toccati né dichiarati automaticamente eliminabili. Questo task certifica zero residui MODERATION, non pretende un cleanup globale di precedenti prove foto.

## K. Azioni manuali founder

Può essere riattivato **Confirm email** nel solo staging: tutte le fixture Auth sono eliminate. Il toggle non è stato modificato dall'agente.

Prima del pilot: nominare Federico e sostituto, finestre/copertura/escalation/ricorso; account personali dedicati e recovery MFA; bootstrap primo ADMIN verificato manualmente da operatore autorizzato, poi grant/revoke tramite RPC MFA auditata. Nessun accesso automatico a console Supabase/GitHub/Vercel/chat complete. Inventario accessi e review periodica; formazione note minimali e gestione underage. Nessun account reale di moderazione creato in questo task.

## L–N. Validazione, rischi, decisione

Professionista: policy warn/suspend/ban/ricorso, dati safety ed eventuali redazioni, retention e tempi di risposta. Nessuna conclusione legale definitiva.

**GO tecnico alla chiusura MODERATION-01 in staging.** Non è autorizzazione a rollout né readiness legale/operativa del pilot. Rischi residui: account staff/recovery/copertura da predisporre, note libere governate da formazione, queue non snapshot fra pagine e richiede refresh se cambiano stati, oggetti preesistenti staging da review separata. Main/produzione invariati.

Rollback operativo: flag OFF e revoca nuovi ruoli, mantenere schema additivo/RLS; non riabilitare le RPC legacy senza MFA, niente rollback distruttivo. Prima di futuro rollout servono preflight dedicato e autorizzazione.

Tutto il codice, test, design e report è da versionare/pushare sul branch dedicato; nessun merge main.
