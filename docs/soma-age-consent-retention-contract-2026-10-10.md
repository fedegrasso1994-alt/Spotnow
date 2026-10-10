# AGE-01 / CONSENT-01 / RETENTION-01 — contratto staging

Stato: implementato e collaudato solo su `zjinjtkekmaqtxsuyvho`. Produzione e `main` invariati. Non è una policy legale né autorizzazione al pilot. Cupido/Bacheca esclusi. Decisioni founder del 10 ottobre 2026; i punti giuridici restano da validare professionalmente.

## Dipendenze e scope

Baseline PHOTO-01/02 con bootstrap cutover e migrations 001–019; ordine 020 → 021 → 022 → 023. Nessuna modifica ai decoder, limiti, ledger o scheduler PHOTO. Unico hook foto necessario: `photo_account_active` richiede eleggibilità, senza cambiare lease/quota/processing. I controlli UI sono abilitabili soltanto con `VITE_PRIVACY_PHASE1=true` e URL esatto staging; il bundle ordinario li lascia disabilitati. Nessun CSS, logo o redesign.

Moduli: `src/privacy-phase1.js` (controlli/API propri); `supabase/functions/_shared/privacy-retention.js` (handler); `supabase/functions/privacy-retention/index.ts` (adattatore Supabase); scheduler SQL separato e hard-bound staging. I file live/backend contengono solo hook mirati. Avatar propri caricati eager solo nel flusso staging: un'immagine lazy nascosta durante il nuovo gate non deve attendere oltre la scadenza del signed URL. Nessuna modifica ai moduli PHOTO.

## 020 — AGE

`spot_private.account_eligibility`: stato `confirmation_required`, `eligible`, `restricted`; età numerica dichiarata solo per maggiorenni, dichiarazione `adult-v1`, server timestamp/revision. Nessuna DOB. Account preesistenti inizialmente non eleggibili; nessuna deduzione dall'età del vecchio profilo. Underage non conserva età esatta nel fingerprint, solo classificazione `underage`.

RPC proprie `my_privacy_state`, `attest_adult(age,declared,statement_version,operation_id)`. 17 blocca e salva `restricted`; 18–120 + dichiarazione valida ammette. Età nulla/non intera/fuori range/versione invalida fallisce. Il rifiuto underage restituisce stato, non una eccezione che annullerebbe la restrizione. Trigger profilo impedisce bypass REST e divergenza dall'età dichiarata. Server gates su check-in, discovery/list/page/count, nuovo social e chat/foto: eleggibilità dei partecipanti verificata. Delete/supporto/autorità moderatore restano separati. Alias prior RPC revocati anche al service role.

## 021 — CONSENT

Tabelle private: catalogo versioni immutabili, stato owner-only, challenge monouso con scadenza 10 minuti/revision, audit minimo. RPC proprie: `dating_consent_challenge`, `accept_dating_consent`, `revoke_dating_consent`. Versione, server timestamp, text hash, azione e operation ID; nessun consenso o preferenza privata nel payload discovery peer. Il hash è un identificatore di testo immutabile, non una firma crittografica.

Placeholder chiaramente marcato NON VALIDATO, SOLO STAGING. La migration nuova assume **production**, quindi non accetta placeholder per default. Abilitazione staging richiede service role verificato e claim del project ref esatto tramite `privacy_staging_enable`; non basta rinominare un progetto. Un futuro rollout richiede catalogo validato e frontend production dedicato: questi controlli staging non sono distribuibili come consenso legale.

Revoca idempotente: preferenza → NULL, challenge invalidati, cache propria pulita; nessun fallback ALL. Discovery e nuovi Spot/match bloccati senza consenso corrente valido di entrambi. Membership Tribe invariata; conteggi membership non implicano discovery. Nuova versione materiale richiede nuovo consenso. Challenge stale non può annullare revoca. Accettare non ripristina la preferenza cancellata: nuova scelta esplicita nel profilo.

**Match e chat esistenti restano conservati e utilizzabili dopo revoca**, con gates età, blocco/sospensione/delete invariati. Scelta founder da validare professionalmente. Stato non eleggibile blocca accesso social anche con sessione già aperta. UI offre revoca anche nel gate ristretto, assistenza e delete account.

## 022 — minimizzazione visite

Nessun storico `last_visit`. `tribe_memberships.last_checkin_at` e `interests.sender_checkin` rimangono chiavi legacy nullable, ma valori vecchi cancellati e nuovi valori forzati NULL anche per write privilegiati. Membership conserva solo appartenenza, non visita. `activity_window` deve essere NULL: altrimenti migration si ferma, non modifica automaticamente logica prodotto. QR e Ora restano 90 minuti; sole informazioni correnti interne in checkins fino a purge. Nessuna geolocalizzazione introdotta.

## 023 — retention e safety

Parametri centralizzati, tutti OFF, `DESIGN_ONLY`, global pause ON. Nessuna durata giuridica definitiva scelta. Attivazione distruttiva fuori staging rifiutata se policy non `VALIDATED`.

| Categoria | Default di design | Regola |
|---|---|---|
| Check-in | massimo 24h dopo scadenza | purge appena scaduto, mai attivo; alert oltre SLO |
| Spot non ricambiati | 90 giorni | reciproci o legati a match preservati |
| Match senza chat | 90 giorni | nuovo primo messaggio esclude purge |
| Chat inattive | 12 mesi di calendario | ultima attività; safety/report aperti proteggono |
| Report conclusi | 180 giorni | `closed_at` esplicito, non dedotto da reviewed; ban attivo protegge |
| Log diagnostici | 7 giorni | codici tecnici, no contenuti |
| Log security | 30 giorni | codici tecnici, no contenuti |
| Ricevute purge | 7 giorni | solo contatori/versione/opid |
| Operazioni privacy storiche | 7 giorni | preserva ultimo evento età e consenso + stato corrente |
| Challenge consenso scaduti | 24 ore oltre scadenza | non conserva token inutili |
| Metadata safety rilasciati | 180 giorni dal rilascio | nessun purge automatico di hold attivo |

Gli ultimi quattro default sono tecnici di design, ancora da validare. La prova corrente dura per la vita account/finalità corrente e viene cancellata con l'account. Catalogo testi non contiene utenti. Idempotency receipt window finita: dopo purge receipt il job ricontrolla eleggibilità; vecchi challenge restano invalidi e una vecchia revoca resta una revoca, non riattiva consenso. Nessuno storico posizione è conservato nell'audit purge.

RPC service-only: run, config, status, safety hold. Worker authenticated; nessuna categoria arbitraria accede a SQL/tabelle fuori allowlist. `dry_run` esplicito e pause; batch 100, massimo 500. Singola transazione, rollback completo se interrotta; global retention lock e owner locks ordinati condivisi con publish/check-in/revoca/Spot/message/delete; ricontrollo candidato dopo lock. Nessun timeout autorizza cancellazione. Pausa si applica al batch seguente, non cancella una transazione già in esecuzione.

Safety hold: case reference/categoria/target/reason/review_at, operation ID e audit operatore; accesso privato, nessun uso discovery. Hold scaduto per review genera allarme, non purge. Per account deletion, solo report esplicitamente held possono lasciare `safety_evidence` separata con reason/status/hold/time: mai dettagli report, chat, nomi, foto o preferenze. Rilascio auditabile; dopo retention configurata rimuove evidence/hold/audit. Chiusura casi e decisione finale durata ancora professionali/operative.

## Scheduler, autenticazione e osservabilità

SQL `supabase/privacy-staging-scheduler.sql`: OFF iniziale, Vault credential preesistente senza duplicazione, tick minuto, operation ID per categoria/minuto/dry-run. POST Edge e service-only probe Postgres per validare eventuale service JWT precedente alla rotazione; nessuna fiducia a claims non verificati. User/anon rifiutati. Errori generici senza payload personali. `privacy_retention_status` misura policy/pause/overdue hold/check-in oltre SLO; cron status misura dispatch/runs/HTTP. Due tick reali HTTP 200 dry-run verificati; OFF al termine.

Log Supabase/Vercel/Auth/backup non sono cancellabili dal worker app: durata/accessi configurabili nei provider devono essere verificati in PROVIDER-01/INCIDENT-01. Nessuna promessa di cancellazione dei backup o uptime assoluto. Non ci sono nuove analytics.

## Rollback / attivazione futura

Staging: pause retention, scheduler OFF, PHOTO cutover PAUSED; feature flag UI OFF quando necessario. Non ripristinare preferenze sensibili cancellate, timestamp visite o contenuti purgati. Nessun rollback distruttivo schema o ritorno writer PHOTO-01. Alias bypass revocati restano revocati. Prima di qualsiasi produzione: preflight read-only, review professionale testi/durate/safety, catalogo `validated`, strategia account esistenti e frontend production, owner alert, scheduler production apposito, rollout separatamente autorizzato.

## Verifiche riproducibili

`pnpm test`, `pnpm build`, `pnpm typecheck`. Test DB applicano 001–023 da zero su fixture sintetiche, non solo confronto di stringhe SQL. Script staging hanno allowlist project hardcoded e manifest privato ignored. Installare fixture temporanea service-only, prepare → canary → smoke → cleanup; teardown rimuove API e tabella fixture. Mai usare su produzione, mai caricare dati reali, mai versionare password/token/manifest. Il report staging distingue collaudi reali concorrenti da simulazioni transazionali/unit test.
