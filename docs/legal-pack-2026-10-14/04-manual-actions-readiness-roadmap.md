# Master checklist, readiness matrix e roadmap pre-pilot

14 ottobre 2026. Stati OPEN salvo evidenza esplicita; nessun acquisto, accesso account, contratto o test cloud recovery eseguito qui. **NO-GO pilot / rollout**. GO alla consegna del pack per review con gap dichiarati.

## Master checklist unica

Fasi: **A prima della legal review** (input/configurazione effettiva, non necessariamente upgrade già pagato); ** B durante review** (decisioni professionali); ** C prima rollout produzione** (capacità/config approvate e provate); ** D prima pilot** (collaudo sul deploy e operatori reali). La colonna gate indica l'ultima scadenza; azioni si possono anticipare. Se un'azione produce costi/accessi/provider nuovi richiede autorizzazione separata. “Tecnico” e “sostituto” sono incarichi ancora da nominare, non accessi già concessi.

| ID | Azione e stato | Fase input → gate | Owner | Evidenza richiesta / dipendenza |
|---|---|---|---|---|
| M01 | Vercel Pro deciso, upgrade OPEN | A → C | Federico | Piano effettivo/budget, prova billing redatta; nessun Hobby per pilot |
| M02 | MFA amministratori Vercel OPEN, avviso single-factor storico | A → C | Federico / singoli admin | MFA+recovery verificati per ogni account, device sano e revoca accessi; no account condivisi |
| M03 | Vercel Data Preferences opt-out OPEN; ON osservato 11 ottobre | A → C | Federico | OFF salvato team e override progetto verificato dopo upgrade; effetto non retroattivo, altre telemetry separate |
| M04 | Supabase piano/config OPEN; Pro candidato, Free storico | A/B → C | Federico +tecnico | Regione/compute/quote/alert e backup adeguati per 2 università/>200; scelta budget, nessuna garanzia zero outage |
| M05 | DB/Auth backup OPEN | A/B → C | Backup owner +tecnico | Scope/schema/versioni, retention/accessi/cifratura, successo e scadenza; no assunzione da solo piano |
| M06 | Bytes Storage backup OPEN | A/B → C | Backup owner +tecnico | Canonical/detail/thumb referenziati, manifest coerente, no originali/draft inutili, expiry copie, costi approvati |
| M07 | Restore cloud test OPEN/BLOCKER | A/B → C | Tecnico +incident owner | Prova sintetica DB+Storage +ledger/quota; scheduler/egress isolati prima restore; reapply delete/revoca/ban e stop se incoerente |
| M08 | Custom SMTP OPEN/BLOCKER, default escluso pilot | A/B → C | Federico +tecnico | Provider scelto in task separato, regione/log/DPA, sender/DKIM/SPF/DMARC applicabili, credenziali server, Auth delivery staging/test inbox |
| M09 | DPA e contratti effettivi OPEN | A/B → C | Federico +professionista | Versione/entità/piano/servizio per Supabase, Vercel, GitHub e altri reali; Gmail/OAuth ruoli da qualificare |
| M10 | Subprocessors OPEN | A/B → C | Professionista +Federico | Elenchi pertinenti, paesi/copie/supporto remoto, data raccolta/versione/riesame; non checklist generica |
| M11 | Transfer/residency OPEN | A/B → C | Professionista +tecnico | DB Irlanda storico distinto da Edge/CDN/log/backup/Auth; meccanismi concreti e valutazione da validare |
| M12 | Recovery access e least privilege OPEN | A → C | Federico +backup owner | Inventario ruoli/PAT/apps/deploy keys/MFA, prove handoff/revoca, niente valori secret nei report |
| M13 | Incident owner e reperibilità OPEN | A → D | Federico | Nome owner/sostituto, finestre e canale alternativo, tabletop umano, chi può fermare il servizio, escalation fuori finestra |
| M14 | Backup owner OPEN | A → C | Federico | Persona responsabile dei successi/failure/expiry/restore, accessi minimi, sostituto e prova recupero |
| M15 | RPO/RTO OPEN, 24 h/4 h candidati | A/B → C | Federico +owner tecnici | RPO DB e Storage separati, metriche misurate, budget e accettazione perdita/downtime; nessuna promessa “mai” |
| M16 | Moderator/ADMIN dedicati OPEN | A/B → D | Federico +sostituto nominato | Account individuali, MFA/recovery, bootstrap auditato, ruoli minimi, training/revoca; fixture eliminate non sono account operativi |
| M17 | Supporto/privacy/safety/ricorso inbox OPEN | A/B → D | Federico +sostituto | somadatingapp@gmail.com, MFA/recovery/label/accessi/test ricezione, retention trash/sent/export e trattamento dati sensibili approvato |
| M18 | Log/cache/telemetry/config OPEN | A/B → C | Tecnico +professionista | Campi/TTL/regioni/Auth-IP-UA/QR-query/Edge/cron/Vercel; no UGC/secret, data preferences e font self-host confermati live candidato |
| M19 | Google OAuth manual check OPEN | A/B → C | Federico +tecnico | **Solo rare-array-510414-d 9**; verificare ID prima attività, preannunciare risorsa/motivo/impatto; scopes/audience/redirect/privacy URL e recovery senza usare Luigi |
| M20 | Legal review OPEN | A → B | Federico +professionista da individuare | PackLP 01–25, risposte/sign-off condizioni, ruoli/basi/Art 9/minori/DPIA/DSA/retention; nessun autoregistro “conforme” |
| M21 | Legal remediation e document delivery OPEN | B → C | Professionista +tecnico +Federico | Testi validati/versionati, consenso placeholder sostituito con validato, policy/settings coerenti, task indipendenti e regressioni |
| M22 | Preflight e final rollout approval OPEN | B → C | Federico +tecnico | Snapshot read-only nuovo, compatibilità 020–026 con guard staging, old clients/AGE reconfirm/policy OFF, canary/pause/rollback; autorizzazione founder esplicita prima merge/deploy |
| M23 | Device QA/physical testing OPEN | C → D | Federico +collaudatori | Almeno iOS/Android reali browser/PWA, camera/QR, login/ritorno, keyboard/chat/send, foto, boardcreate/report/retry/offline, logout/delete; versioni/dispositivi/esiti registrati |
| M24 | Pilot readiness operativo OPEN | C → D | Federico +owner | Coda/urgenti/overdue hold, privacy rights manuale, incident/recovery handoff, capacity oltre 200/2 università e stop testati |
| M25 | Chat push requisito founder storico da chiarire nel gate release | A → D | Federico | Notifiche messaggi ad app chiusa non risultano implementate. Distinguere requisito prima lancio dal pilot controllato; nessuna autorizzazione a provider/push in questo pack, nessuna promessa nelle Terms |
| M26 | Bacheca review del comportamento aperto OPEN | A/B → C | Professionista +Federico +tecnico | BP02/03/07/09/11/12: inferenze, piccoli gruppi, blocks dating≠isolamentoUGC, hold finiti, UIexpiry e batching; accettazione motivata o task separato |
| M27 | Notice/action e rimedi OPEN | A/B → C | Professionista +moderation owner | DSA qualificazione, canale esterno/restricted, decision reason/delivery/record TTL, urgenze/ricorsi; test sintetici se richiesti |
| M28 | Safety hold governance OPEN | A/B → D | Professionista +moderation owner | Reviewer, reason/ref, review frequency/max duration/rilascio e alert overdue; nessun purge incerto solo per età |
| M29 | RIGHTS manual full inventory OPEN | A/B → D | Privacy owner +professionista | Risposta caso complesso V (chat ricevute/provider/inbox/binary/hold), verifica identità minima/redazioni/consegna e calendario applicabile |
| M30 | Final no-test-config check OPEN al futuro rollout | C → D | Tecnico | Confirm email ON, flag runtime voluti, candidate non direttamente deployate, scheduler giusti per ambiente, zero fixture/secret/debug grant; prod PHOTO ON intenzionale diverso stageOFF |

Tutte le evidenze account/contratti/restore vanno in custodia privata. La checklist PROVIDER MC01–35 conserva il dettaglio vendor; questiM sono gate unificati, non attestazioni di chiusura retroattiva. Assenza di advertising SDK non prova assenza di ogni telemetry provider. Upgrade di piano non chiude automaticamente recovery o trasferimenti.

## Final readiness matrix

“TECH READY” significa perimetro tecnico verificato, non compliance. I cinque stati non sono alternativi: un'area può essere pronta tecnicamente e avere gli altri gate aperti.

| Area | TECH READY | OPERATIONAL READY | LEGAL VALIDATION PENDING | MANUAL ACTION PENDING | PRODUCTION ROLLOUT PENDING |
|---|---|---|---|---|---|
| PHOTO-01/02 | YES, DONE produzione | Lifecycle YES; backup/recovery completo NO | YES disclosure/receipts/copie | YES backup/log/provider | NO per PHOTO; non riaprire senza dipendenza |
| AGE | YES staging | NO account reali/reconfirm/procedura underage | YES sufficienza 18+ | YES minori/training | YES 020+frontend/gate |
| CONSENT | YES staging | NO testo validato/versione/delivery | YES Art 6/Art 9/prova/revoca | YES professionista | YES 021, placeholder vietato |
| RETENTION | YES staging dry-run/race/hold | NO job prod/durate/alert/review; board batching da valutare | YES durate/eccezioni | YES owner/backup/overdue | YES 022–023/025–026+policy/scheduler |
| PROVIDER | PARTIAL repo remediation | NO piani/accordi/SMTP/restore | YES ruoli/transfer | YES M01–12/17–19 | YES font/config candidato; non upgrade da repo |
| INCIDENT-01A | PARTIAL design/drill locale | NO restore cloud/copertura/contenimento social/alert | YES breach/evidence/authority | YES M07/12–15 | Non solo deploy: prove/capacità da task separati |
| RIGHTS | YES perimetro automatico staging | NO intero inventario manuale V/delivery | YES redazioni/tempi/eccezioni | YES privacy owner/procedure | YES 024+026/callback/flags |
| MODERATION | YES staging | NO staff vero/finestre/escalation/ricorso | YES sanzioni/records/DSA | YES M16/17/27–29 | YES 025–026+account ruoli autorizzati |
| BACHECA | YES MVP staging | NO policy/urgenze UGC/expiry su schermo aperto/review hold | YES UGC/anonimato/DSA | YES M26–28/QA | YES 026+flags, nessuna autorizzazione qui |

Confirm email staging ON verificato API nel presente task. PHOTO/cleanup/scheduler OFF e retention paused da ultima evidenza 14 ottobre, non da nuova ispezione admin. Produzione non ispezionata qui; PHOTO operativo ON documentato è intenzionale, non da spegnere. Tre review storici stage restano governati e non vengono puliti da questo audit.

## Blocker reali e severità

- **BLOCKER PILOT B1:** professionista ancora da individuare; basi/condizioni, 18+, DPIA/DSA e testi non validati. Non blocca la consegna per review.
- **BLOCKER PILOT B2:** piani/accessi/MFA/provider accordi/transfer e SMTP, backupDB+Storage/restore non chiusi; non dichiarare servizi resilienza operativi dai soli runbook.
- **BLOCKER PILOT B3:** owner/sostituti/staff dedicati, finestre, triage/diritti/ricorsi/incidenti e recovery non provati per 2 università/>200.
- **BLOCKER ROLLOUT B4:** 020–026 staging-only e flag/cataloghi/policy non pronti per produzione. Nuovo piano e preflight necessari; no bypass guard o merge automatico.
- **BLOCKER PILOT B5 condizionato alla review:** notice-and-action/motivazioni/rimedi e governance hold finita; se richiesti nuovi flussi, vanno implementati/testati prima apertura.
- **HIGH H1:** anonimato inferenziale, precisione orario post, blocks UGC e rischio outing; decisioni/delta BP02/07 da review, non garanzia assoluta.
- **HIGH H2:** hold attivi/report aperti senza termine enforce, cache/backup/log non governati, Data Preferences ON storico finché non verificato OFF.
- **MEDIUM M1:** expiry su schermo già aperto/refresh, copie già ricevute, batching/carico global lock; misurare e validare aspettative, non “bug risolti” in task documentale.
- **MEDIUM M2:** QA fisico/login/PWA/camera/rete dopo integrazione font locali/push chat requisito release da chiarire; viewport browser non equivale a telefono fisico.
- **LOW L1:** manutenzione indici versioni documenti e changelog, riferimenti storici esplicitamente marcati; nessun nuovo secret nel perimetro docs.

## Roadmap finale raccomandata

| Ordine | Attività | Gate per procedere / stop |
|---|---|---|
|1 | Chiusura manual action prioritarie | Raccogliere input A, piani/contatti/owner/contratti reali; MFA/recovery e log minimizzazione prima test operativi. Se capacità o accordi non disponibili dichiararli al professionista |
|2 | Legal review | Consegna pack LP+draft +vendor evidence; qualificazione/rischi/condizioni e risposte versionate. Nessun testo pubblicato prima |
|3 | Remediation legale | Task indipendenti per indicazioni, inclusi eventuali diritti UGC/notice/hold/expiry; test staging +delta draft +review finale. Stop su blocker non risolti |
|4 | Preflight produzione read-only | Snapshot fresco, schema/client vecchi/account reconfirm, configurazione provider, copie e gate; compatibilità dello schema staging-only da progettare, non semplicemente applicare 026 |
|5 | Rollout controllato | Founder autorizza merge/deploy dopo GO; canary e smoke, policy inizialmente OFF, rollback compatibile/pausa; mai writer PHOTO-01 o schema distruttivo |
|6 | Device QA | Dispositivi fisici iOS/Android/PWA e reti mobili sul deploy, camera/Auth/chat/foto/Bacheca +delete; stop su errore critico, fixture test autorizzate e cleanup |
|7 | Pilot readiness QA | Coverage operatori/recovery/rights/hold/capacity, backlog/alert/RPO-RTO e checklist completa, legal sign-off sul reale comportamento. Non usare smoke tecnici come prova di reperibilità |
|8 | Closed pilot | Italia/italiano/18+, 2 università/>200 progressivi; venue solo QR, owner/sostituto operativo, criteri stop e review. Nessuna apertura finché blocker applicabili restano aperti |

**GO alla review finale come attività professionale con gap dichiarati; NO-GO al sign-off di pilot-ready, rollout o apertura**. Nessun costo/ruolo/configurazione esterna scelto o attivato in questo task.
