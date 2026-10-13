# Soma — checkpoint privacy/safety pre-Bacheca

13 ottobre 2026, Europe/Paris. Audit/documentazione soltanto. Branch documentale `codex/pre-bacheca-checkpoint`, baseline MODERATION `eff4e02ced186864c1f097ece2dcf39b16876eb9`. Nessun merge, migration, deploy, modifica Auth, acquisto, provider nuovo o dato reale aggiuntivo. Bacheca non implementata; Cupido post-pilot.

## A. Executive summary

PHOTO-01/02 sono DONE in produzione secondo gli ultimi report live; AGE/CONSENT/RETENTION, RIGHTS e MODERATION hanno GO tecnico in staging. Questi GO non chiudono integrazione, rollout, gestione operativa o validazione professionale. PROVIDER ha remediation repository completata su una linea diversa; INCIDENT ha drill offline e design, non recovery cloud provato.

**NO-GO al pilot. NO-GO all'avvio immediato dell'implementazione Bacheca sulla baseline frammentata; GO alla sua fase di design.** Prima del coding va chiuso il gate A: baseline integrata staging collaudata, diagnostica Edge residua verificata/ritirata e contratto Bacheca per autorizzazione, anonimato, report/hold/export/delete/expiry approvato. Non occorre attendere upgrade billing, SMTP o legal review finale per sviluppare con soli sintetici, una volta chiuso quel gate. Nessun blocco amministrativo è trasformato artificialmente in prerequisito del coding.

Conferma email staging riattivata: riscontro API read-only nel checkpoint, `mailer_autoconfirm=false`. Staging sicuro: PHOTO PAUSED, cleanup/scheduler OFF, retention paused, tre cron registrati tutti inattivi. Nessuna fixture MODERATION o ruolo staff residuo. Restano tre account/profili e 39 oggetti **preesistenti**: non viene dichiarato “zero account sintetici assoluti”. Tre writer review e sei oggetti fuori dalle proiezioni ledger/validated richiedono review separata; nessun purge autorizzato da questo documento.

## B. Status matrix

Legenda: tecnico DONE significa chiuso nel perimetro indicato; MA=manual action, OP=operational gate, LEG=professionista, PROD=rollout ancora necessario. Non sommare suite di branch differenti come se fossero un unico collaudo.

| Blocco | Stato tecnico ed evidenza | MA / OP aperti | LEG aperto | PROD |
|---|---|---|---|---|
| PHOTO-01 | DONE produzione; 016, contratto bounded-memory; oversize applicativo SIZE/413 prima di write, trasporto talvolta503/reset; retry e cleanup legacy verificati | Nessun fix PHOTO riaperto; recovery copie provider resta PROVIDER/INCIDENT | Copie/backup/disclosure nel pacchetto generale | No |
| PHOTO-02 | DONE produzione 10ottobre; 017–019; admission/cleanup/scheduler ON e cron reale HTTP200; foto preservata | Health periodico/recovery del servizio, non nuova implementazione | Retention receipts7d/copie provider nel pacchetto | No |
| AGE-01 | GO staging, 020: età numerica+dichiarazione, niente DOB persistente, server gates/reconfirm | Trattamento account esistenti, onboarding e rollout controllato | Sufficienza 18+, underage/escalation/age assurance | Sì |
| CONSENT-01 | GO staging, 021: separato/versionato; revoca idempotente cancella preferenza, zero ALL fallback; vecchie chat conservate | Testo ancora placeholder, versione validata e attivazione controllata | Art.6/9, finalità/prova/revoca/rapporti esistenti | Sì |
| RETENTION-01 | GO staging, 022–023: Tribe senza timestamp visita, parametri/dry-run/pause/hold/locks | Owner/SLO/allarmi/preavviso, durate finali, scheduler OFF intenzionale | Durate e safety hold, cancellazioni/backup | Sì |
| PROVIDER-01 | Repository DONE `3cab930`: stessi font self-hosted, CSP/guard/runbook; 240 test del branch | Piani/MFA/opt-out/log/contratti/SMTP/backup e prove live aperti | DPA/subprocessor/transfer/Gmail e ruoli | Sì, font/config non su main |
| INCIDENT-01A | Design+drill offline `563319a`, 243 test; privacy snapshot20 separati | Owner/backup/recovery/accessi/alert/restore cloud/tabletop/RPO-RTO | Breach criteria/comunicazioni/hold/registro | Procedure/config approvate da attivare; non rollout runtime equivalente a DONE |
| RIGHTS-01 | GO staging `1d840a1`; 024, Auth/export/download/delete sintetici, 268 test | Procedura richieste/casella/identità/terzi/binary/provider copie | Completezza/esclusioni/protected evidence/backup | Sì |
| MODERATION-01 | GO staging `eff4e02`; 025 MFA/RBAC/keyset/claim/sanzioni/audit, 284 test | Staff reali dedicati/recovery/formazione/copertura/ricorsi | Policy sanzioni, note/hold/retention/ricorsi | Sì |

Produzione non interrogata o modificata in questo task: stato PHOTO tratto dai report live del 7–10ottobre, non spacciato per health check del 13ottobre. Nessuna prova nuova di piani, MFA cloud o contratti provider: restano manual checks. Snapshot Git remoto fresco del checkpoint.

## C. Checklist unica dei blocker

Stato iniziale di ogni riga: OPEN salvo riscontro indicato. Owner nominativo tecnico ancora da assegnare; Federico owner founder. Una riga si chiude solo con evidenza/versione/data/verificatore, non con intenzione.

| ID / severità | Azione e condizione di chiusura | Owner | Quando |
|---|---|---|---|
| B01 BLOCKER pilot / gate coding | Consolidare linea MODERATION+linea INCIDENT/PROVIDER su futuro branch integrazione, senza duplicare AGE/RIGHTS; suite complessiva/schema da zero, regressioni e smoke staging con font locali/Auth reale | Tecnico | **A: prima Bacheca coding** |
| B02 BLOCKER pilot / gate coding | Approvare contratto Bacheca: audience/membership, author mapping privato, eligibility, reaction identity, report contenuto, hide24h vs purge, safety hold/export/delete e stati moderazione | Federico+tecnico; validazione legale successiva | **A** |
| B03 BLOCKER pilot | Prova backup DB e bytes Storage separati, expiry e restore cloud sintetico; no originali; replay delete/revoca dopo snapshot; isolamento cron/egress; metriche recovery | Tecnico+Federico | Durante B; evidenze prima legal review finale / pilot |
| B04 BLOCKER pilot | Vercel Pro; piano/config Supabase adeguati con budget/quote/alert; upgrade manuale, nessun acquisto qui | Federico | Prima pilot; piano candidato prima legal review |
| B05 BLOCKER pilot | MFA/recovery/least privilege per cloud/GitHub/Google/casella e staff; owner/sostituto nominativi, revoca e recovery testato | Federico | Durante B, completare prima pilot |
| B06 BLOCKER pilot | Custom SMTP scelto separatamente, contratto/config e signup/login/reset/linking/delivery staging provati; default SMTP escluso dal pilot | Federico+tecnico | Durante B; provider/dati prima legal review, attivo prima pilot |
| B07 BLOCKER pilot | Professionista individuato; dossier completo e validazione 18+/Art9/retention/UGC/diritti/safety/contratti/transfer; nessuna base scelta dall'agente | Federico+professionista | Inputs prima D; approvazioni dopo D/E, prima pilot |
| B08 BLOCKER pilot | Moderatori reali dedicati con MFA, owner+sostituto, finestre/reazione/escalation/ricorso; non accesso cloud implicito; formazione/trial con sintetici | Federico | Durante B, prima pilot |
| B09 BLOCKER pilot | Incident owner+backup, canali alternativi, alert delivery, tabletop umano, contenimento social e cached clients/recovery; RPO/RTO/budget approvati dopo misure | Federico+tecnico | Durante B; piano prima D, prove prima pilot |
| B10 BLOCKER pilot | Futuro preflight e rollout autorizzato AGE/CONSENT/RETENTION/RIGHTS/MODERATION/provider/Bacheca; canary, vecchi client/account, rollback, scheduler ultimo | Tecnico+Federico | F, dopo review/remediation; prima pilot |
| B11 BLOCKER pilot | Diritti/supporto operativi: email ricezione, accessi/labels, verifica identità/redazioni/export foto/copie provider, tempi/procedure, deletion holds | Federico+professionista+tecnico | Inputs prima D, operativo prima pilot |
| B12 BLOCKER pilot | QA ambiente integrato e device reali Android/iOS, Auth/installazione/chat/upload/rights/moderation/retention/Bacheca; carico >200 e2università, fault/retry/purge | Tecnico+founder/tester | G, prima pilot |
| H01 HIGH | Vercel Data Preferences opt-out team/progetto e verifica dopo upgrade; ultimo riscontro11ottobre ON | Federico | Durante B; prima pilot |
| H02 HIGH | Log/CDN/provider/backups/admin inventory con TTL/accessi/region; niente dating/UGC/token/signedURL nei log ordinari | Tecnico+professionista | Evidenza prima D; remediation prima pilot |
| H03 HIGH | Manifest di flag/config/scheduler production e audit accessi/CI/secrets/history/preview; candidate024/025 guard staging-only da rendere deployabili con processo approvato | Tecnico | B/F; chiusura prima rollout |
| H04 HIGH / gate ambiente | Tre Edge diagnostiche staging ancora deployate: photo01-bounded-bench, photo01-preflight, photo01-verification, assenti dal sorgente corrente. Verificare codice/grants senza invocazioni mutanti; ritiro o isolamento esplicito autorizzato. JWT gateway da solo non certifica service-only | Tecnico | **A**, prima nuove prove Bacheca |
| M01 MEDIUM | Review separata baseline staging: 3 account sintetici precedenti/39oggetti, 3writerreview,6oggetti non mappati dalle proiezioni; dimostrare ownership/riferimenti, mai purge per età | Tecnico | A: classificazione/fence; eventuale cleanup separato durante B |
| M02 MEDIUM | Conferma rete zero font remoti prima/dopo Auth live dopo integrazione/provider deploy; demo non sostituisce Auth | Tecnico | B/F |
| L01 LOW | Allineare esempi env/documentazione flag privacy e indice dei report/snapshot; evitare SHA intermedi interpretati come tip finale | Tecnico | Durante B |

Non è necessario cancellare i writer review per iniziare sviluppo: vanno isolati e documentati, senza mescolarli a nuove fixture o considerare il timeout autorizzazione al purge. Sevità è relativa al pilot, distinta dalla colonna “quando”: un BLOCKER pilot non blocca automaticamente il coding sintetico.

## D. Manual action founder — riscontri e prove necessarie

| Controllo noto | Riscontro attuale | Evidenza di chiusura |
|---|---|---|
| Vercel Pro | Decisione approvata; ultimo audit11ottobre Hobby, nessun upgrade confermato | Piano effettivo/budget/data, senza dati pagamento pubblici |
| MFA amministratori | Obbligatoria; avviso Vercel single-factor storico, stato attuale non verificato | Membri nominativi, MFA+recovery provati, review/revoca |
| Vercel Data Preferences | Ultimo11ottobre ON; opt-out non verificato | Team OFF/progetto senza override, screenshot redatto/data |
| Supabase piano/config | Free/eu-west-1 ultimo11ottobre; Pro minimo candidato, non billing approvato | Disponibilità/compute/quote e recovery adeguati al carico; conferma costi per add-on |
| Backup DB | Runbook, non prova backup attivo | Coverage/retention/cifratura/restore point/accessi |
| Backup Storage | Distinto dal DB; solo canonicali necessari, nessuna copia originale | Manifest coerente/expiry/accessi e ripristino bytes |
| Restore cloud | Drill offline PASS; cloud NON provato | Prova staging sintetica, cron OFF, restore+delete replay+hash/core |
| Custom SMTP | Non selezionato/attivato | Provider autorizzato a task separato, requisiti privacy/delivery e test |
| Recovery access | Piano parziale | Owner e backup separati, recupero senza owner principale, evidenza privata |
| Incident owner / backup | Federico referente; sostituto non nominato/formalizzato | Nomi, orari, canali, formazione, privilegi e handoff |
| RPO/RTO | DB/Storage24h e RTO4h candidati; varianti più strette da budget/test | Metriche reali e approvazione founder; non promessa zero outage/perdita |
| DPA/subprocessors/transfers | Checklist aperta Supabase/Vercel/Google/GitHub/Gmail/tooling | Accordi/versioni/paesi/copertura dei servizi, valutazione professionale |
| Moderator/admin operativo | Solo fixture eliminate; nessun ruolo staff staging rimasto | Account personali dedicati, verified MFA/recovery, grant auditato e coverage |
| Casella supporto | somadatingapp@gmail.com, workflow manuale e amministrazione, non runtime Gmail API | MFA/labels/recovery/accesso nominativo, test ricezione e retention/hold |

Non accedere alla posta personale per questi controlli. Contratti/account/recovery evidence vanno in custodia privata, non repo pubblico. PROVIDER checklist MC01–35 resta il dettaglio di servizio; questa tabella è il gate unico e non cancella gli item granulari.

## E. Operational action e pulizia

**Verifiche nuove read-only staging:** accounts3/profiles3/objects39; reports0/staff roles0/moderation fixture0; environment staging; PHOTO PAUSED/execute=false/scheduler=false, retention paused=true. Cron `soma-privacy-retention-staging`, `soma-photo02-staging`, `soma-photo02-cutover-staging`: tutti active=false. Query catalogo public con nomi debug/diagnostic/probe/fixture: nessuna funzione. Non è una scansione semantica di ogni endpoint.

**Fixture:** zero residue dei task RIGHTS/MODERATION nei rispettivi teardown; i tre account storici correlati a vecchi test restano baseline, non eliminati. MODERATION prova zero missing current e6oggetti preesistenti6ottobre non mappati dalle proiezioni, owner Auth/profilo presenti: non equivalgono automaticamente a6orfani eliminabili. Review3 protetti. Retention paused implica check-in oltre default24h possibili: non dichiarare SLO continuamente rispettato se job OFF.

**Flag:** VITE_PRIVACY_PHASE1, VITE_RIGHTS_PHASE1, VITE_MODERATION_PHASE1 sono guard staging, non residui da eliminare alla cieca; RIGHTS/MODERATION defaultfalse, host/env protetti. Release production finale necessita manifest esplicito e test. Le policy retention sono OFF/DESIGN_ONLY. PHOTO production ON è intenzionale dopo DONE, distinto dallo staging OFF: nessun cambio consigliato qui. Config effettiva dei frontend cloud e env/secrets esterni resta manual check, senza lettura valori.

**Secrets:** scan delimitato dei tip dei6branch su testo tracciato: nessun JWT lungo, sb_secret o PEM private key trovato; guard bundle24asset PASS. Non prova full Git history, GitHub Actions secrets, file ignorati/cache/download/ticket: owner review ancora aperta. Nessun valore stampato. Credenziali fixture MODERATION eliminate dal precedente task; nessuna nuova fixture o credenziale in questo checkpoint.

**Font/debug:** Google Fonts remoti ancora in main/MODERATION/RIGHTS/AGE; self-host+guard solo PROVIDER/INCIDENT, non integrato o deployato. Diagnostica frontend è ring30eventi tipo/tempo locale, senza body o invio; demo=1 e vecchio admin route non sono backdoor autorizzative, restano entry point deliberati. Bridge PHOTO è artefatto versionato di cutover, non nuovo writer legacy autorizzato. Nessun sorgente Edge diagnostico nel tip, ma console staging mostra10funzioni deployate, incluse **photo01-bounded-bench / photo01-preflight / photo01-verification** diagnostiche storiche assenti dal repository. photo01-preflight Verify JWT legacy=ON, Save disabled: nessun toggle cambiato. Questo non dimostra autorizzazione service-only; codice e risposte non esaminati/invocati per evitare effetti. H04 resta aperto. Inventario production/Vercel/hook/log esterni ancora manual check. Fixture HTML/tests non nel dist controllato dal release guard; nessun private artifact nel bundle. Permission temporanee MODERATION rimosse (role0), non equivale a review di tutti gli accessi cloud.

## F. Professional/legal validation

Preparare prima della review finale: data map aggiornato **comprensivo Bacheca**, audit e decision sheet Italia-only/18+/2università/>200, contratti/provider/copie/backup, testo consenso candidato, retention/versioni, procedure diritti/safety/moderazione/incidenti, threat model anonimo e receipt minime. Segnalare tutte le verifiche manuali incomplete.

Validare con professionista: condizioni Art9 e altre basi senza scelte autonome; 18+/minori; revoca dating e chat esistenti; UGC anonimo e autore interno, accesso/report/redazioni/safety hold; durate e backup/cancellazioni; ruoli venue senza dati individuali; processor/transfer/contratti/Gmail; ricorsi e gestione breach. DPA checklist documentata non equivale a accordi verificati. Privacy/Terms/Community Guidelines/disclosure tracking-location ed eventuali notice UGC solo dopo validazione; nessun testo definitivo prodotto ora. Nessuna disclosure AI per feature inesistenti.

Prima della review servono **input ed evidenze**; l'approvazione professionale di testi/durate appartiene a D/E. Un consulto preliminare può iniziare subito con gap dichiarati; non serve fingere chiusi i blocker per consultare il professionista.

## G. Branch e integration risks

Snapshot remoto fresco, tutti i branch feature verificati allineati ai rispettivi remoti:

| Branch | Tip | Contenuto/dipendenza |
|---|---|---|
| main | d0f515e8d2c80eeae60f2d5c33dd8901558d5287 | PHOTO001–019, baseline produzione documentata |
| codex/age-consent-retention-staging | ef964a56b99e6947c1244dc2639a5668613839dc | main +020–023 |
| codex/provider-01-audit | 3cab930fa84adfcdf727691469eef116f69cd251 | main +font/config/report/test |
| codex/incident-01a | 563319af347b91f235c763da508b3a3e23d2c521 | include PROVIDER +drill/report/test |
| codex/rights-01-staging | 1d840a17fc015f429c4f76504d40aa346c4714ca | include AGE +024 |
| codex/moderation-01-staging | eff4e02ced186864c1f097ece2dcf39b16876eb9 | include RIGHTS/AGE +025 |

Non cherry-pickare di nuovo AGE/RIGHTS sopra MODERATION; non duplicare PROVIDER se si integra INCIDENT. Nessun hash differente per migration con stesso numero001–025 tra i6tip: nessuna collisione numerica osservata. Nessun path modificato in parallelo nell'intersezione `main...MODERATION` e `main...INCIDENT`; **non prova** compatibilità runtime o una merge riuscita. Nessun merge simulato/eseguito.

Ordine futuro raccomandato: branch integrazione da MODERATION → integrare linea INCIDENT (include PROVIDER) con review separata dei commit → suite unificata/schema/staging → Bacheca modulare e future migration con numero riservato dopo025, mai assegnato qui → legal remediation → preflight/merge main/rollout esplicitamente autorizzati. Provider e incident non sono ancora presenti nel checkout attuale: i loro5+3test non sono sommati ai284.

Rischi concreti: helpers/RPC/security definitions estesi da025 dipendono020–024; RIGHTS enum15sezioni va ampliato per Bacheca; report schema attuale target profilo non rappresenta post/reaction; safety evidence attuale reason/status non conserva automaticamente prova UGC. Retention wrapper025 e future categorie vanno testati insieme. Migration024/025 hanno guard staging-only: **non direttamente applicabili in produzione**, serve piano/config approvata senza bypass ad hoc.020reconfirm account e021versione non validata possono restricted/discovery denial se rollout parziale. Frontend flag, API e scheduler vanno attivati coerentemente, rollback operativo/pause invece di schema distruttivo.

## H. Gate Bacheca MVP

Il perimetro founder è fissato: Tribe→Bacheca, post brevi, anonimi ai peer ma autore interno tracciato, reactions/report/moderazione, expiry24h, delete/suspend/ban e retention dedicata; no poll/Pulse/share card/notifiche sofisticate/Cupido.

Prima implementazione definire e approvare:

1. **Audience/eligibility:** read/write solo membro autorizzato della stessa Tribe e18+/non suspended/banned; non derivare visite o posizione. Decidere accesso dopo revoca dating separatamente, senza riusare consenso dating come consenso UGC automatico. Scope membership persistent vs Ora esplicito.
2. **Anonimato del contratto:** author UUID/profile/occupation/preference non restituiti ai peer neppure join/RPC/REST/reactions/export; mapping privato server, capability staff per caso autorizzato, audit. Anonimo fra utenti, non promessa di anonimato verso Soma. Contenuto può auto-identificare: misure/report e disclosure.
3. **Post/reactions:** lunghezza/testo consentito, rate/quota e reaction uniqueness/idempotenza da approvare; aggregati peer invece di roster reaction non necessario. Non introdurre tracking/immagini/nuovi provider.
4. **Expiry/lifecycle:** server hides allo scadere24h, distinto da purge fisico/retry/outage; categoria retention esplicita, no cronologia visite, no copie indefinite. Safety hold minimo fuori prodotto con review/TTL e nessun uso discovery.
5. **Safety/rights:** reference tipo post/report, moderazione con claim/revision/RBAC, warning/hide/suspend/ban/reversal; delete autore/reaction ordinari, export proprio/redazioni terzi, preservazione solo held evidence esplicita. Decidere hide vs remove/reversal di contenuto segnalato senza ampliare copie chat/foto.
6. **Acceptance tests:** dueTribe/no cross-read; userA non scopre autoreB; owner/export/privilegi; restricted/revoked states; expiry esatto; delete ehold; report sotto load/claim; retry/race/react-delete/purge; content XSS/render safe; nuovo indice/cursor; scheduler off/on; regressioni core/PHOTO.

B02 è approvazione del **contratto tecnico**, non validazione legale. A gate chiuso, MVP staging sintetico può procedere mentre azioni manuali vengono chiuse in parallelo. Bacheca non entra nel pilot prima C/D/E/F/G.

## I. Componenti riutilizzabili, senza assumere supporto già esistente

| Componente | Riutilizzo | Estensione necessaria in futuro |
|---|---|---|
| Moderation queue/action | keyset, lease/revision, opID, sanzioni e owner warning | Subject post/reaction/report, hide/restore e redazione, non finto target profilo |
| RBAC/MFA | staff role attivo/fattore/AAL2, least privilege e revoca | Capability visibilità author/evidence limitata al caso, audit accessi |
| RIGHTS | owner-only/API pagination/export e restricted delete | Nuove sezioni post/reactions/report, privato peer escluso |
| Retention | policy versionata/OFF/dry-run/locks/retry/pause | expiry letture24h+purge categoria UGC, cron/reconciliation testati |
| Safety hold | case/ref/review/audit/TTL | Schema evidenza UGC minimale approvato, non estendere reason/status implicitamente |
| Audit | actor/op/reason/previous/new, note minima | Accesso author/moderazione contenuto senza duplicare testo/log ordinari |
| Delete semantics | prodotto rimosso, receipts7d, hold separato, retry-safe | FK/race/report/reaction/purge validati; non toccare PHOTO |

## J. Roadmap e criteri di uscita

| Fase | Lavoro | Gate uscita |
|---|---|---|
| A — blocker pre-Bacheca | B01 baseline integrata staging; B02 contratto; H04 diagnostica e classificazione/fence M01 e nuova fixture policy | Suite/build/typecheck/release+smoke integrati, contratto approvato, ambienti sicuri; nessun rollout |
| B — MVP | Implementazione modulare staging sola con sintetici; parallelo piani/MFA/SMTP/backup/owner/contratti | Core Bacheca e negative/race test PASS, fixture eliminate, codice versionato |
| C — privacy/safety extension | Export/delete/holds/moderazione/retention/audit e UGC data map, provider/log/restore evidence | Scope end-to-end verificato, dossier completo e gap espliciti |
| D — legal review finale | Professionista sul prodotto reale core+Bacheca e sugli accordi/config | Decisioni/testi/durate/azioni richieste formalizzate, non solo founder GO |
| E — remediation legale | Task indipendenti per indicazioni professionista, test/versioni aggiornati | Nessun blocker professionale irrisolto, review delta |
| F — rollout produzione | Preflight fresco, codice versionato, merge autorizzato, ordine schema/runtime/flag/canary, pause rollback; scheduler ultimi | Smoke/gate live PASS, repo=produzione, zero fixture inattese |
| G — pilot readiness QA | Device reali e>200/dueuniversità; operazioni supporto/moderazione/recovery/RPO-RTO/log/provider | Checklist B03–B12/H01–H03 chiusa con evidenze, owner e stop criteria |
| H — closed pilot | SoloItalia/italiano/18+,2università,crescita>200senza tetto inventato; venue solo QR/recruiting senza dati individuali | Apertura founder con safety cover, health/recovery e possibilità pausa; Cupido escluso |

Ordine delle quattro scadenze richieste: **prima Bacheca=A/B01+B02+H04+fence**; **durante Bacheca=manuali/operazioni/contratti/integration QA**; **prima legal review finale=dossier C, evidenze e decisioni candidate complete**; **solo prima pilot=attivazioni prod, billing effettivo, staff/recovery/delivery/QA reali e legal remediation chiusa**. Le prove possono essere anticipate; nessun rinvio di un requisito safety dopo apertura.

## K. Raccomandazione e verifiche checkpoint

**NO-GO a coding MVP immediato sulla baseline non consolidata; GO al prossimo task FASE A (integrazione staging + chiusura diagnostica residua + design contratto Bacheca). NO-GO pilot.** Chiuso A, B può partire senza aspettare il completamento di tutti i manual check pilot. Nessuna implementazione autorizzata implicitamente da questo report.

Questo checkpoint modifica solo questo documento. Suite della baseline MODERATION rieseguita: **284/284 PASS**, `node --test --test-concurrency=2 tests/*.test.js`; build/typecheck PASS; release guard24asset PASS; scan delimitato tip6branch PASS. Nessuna suite integrata PROVIDER+INCIDENT+MODERATION dichiarata. Working tree iniziale pulito, main/remoto invariati; commit/push del report sul branch dedicato e verifica tree/remote a fine task.

### Fonti versionate principali

- PHOTO DONE: `docs/soma-photo02-operational-done-2026-10-10.md`; PHOTO oversize e cleanup: `docs/soma-photo01-oversize-production-verification-2026-10-07.md`, `docs/soma-legacy-cleanup-2026-10-08.md`.
- AGE/CONSENT/RETENTION, RIGHTS e MODERATION: report/contratti omonimi nel checkout, con limiti dei collaudi espliciti.
- [PROVIDER remediation](https://github.com/fedegrasso1994-alt/Spotnow/blob/3cab930fa84adfcdf727691469eef116f69cd251/docs/soma-provider01-remediation-2026-10-11.md), [manual checklist](https://github.com/fedegrasso1994-alt/Spotnow/blob/3cab930fa84adfcdf727691469eef116f69cd251/docs/soma-provider01-manual-checklist-2026-10-11.md), [backup runbook](https://github.com/fedegrasso1994-alt/Spotnow/blob/3cab930fa84adfcdf727691469eef116f69cd251/docs/soma-provider01-backup-restore-runbook-2026-10-11.md).
- [INCIDENT drill](https://github.com/fedegrasso1994-alt/Spotnow/blob/563319af347b91f235c763da508b3a3e23d2c521/docs/soma-incident01a-drill-report-2026-10-11.md), runbook/inventory dello stesso commit. Fonti usate come evidenze storiche, non nuova verifica delle condizioni commerciali/giuridiche dei provider.
