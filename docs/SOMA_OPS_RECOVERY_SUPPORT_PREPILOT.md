# SOMA — Ops / Recovery / Support pre-pilot

23 ottobre 2026. Baseline `d9e96e1b512749bbc33859727d3a32ebc36e9623`, branch `codex/soma-schema-v2-staging`. Questo documento è la checklist operativa unica; [runbook A–H](soma-ops-runbooks-2026-10-23.md) per esecuzione durante un incidente. Il [dossier privacy/legal](SOMA_FINAL_PRIVACY_LEGAL_PREPILOT_AUDIT.md) rimane la fonte delle questioni professionali: nessuna remediation legale o nuova policy in questo task.

**OPS / RECOVERY / SUPPORT: BLOCKED.** Preparazione documentale e verifiche locali completate, readiness del pilot non chiusa. Non è un incidente attivo né un NO-GO del codice core. Non sono autorizzati produzione, main, nuovi account esterni, billing, DNS, restore distruttivi o nuove durate.

## A. Matrice readiness

READY significa capacità dimostrata nel perimetro indicato, non certificazione generale. PARTIAL: implementazione/prova incompleta; MISSING: capacità/evidenza necessaria non disponibile; UNKNOWN / TO VERIFY: dato non verificato, non assenza presunta.

| Area | Stato | Evidenza / limite |
|---|---|---|
| Separazione Supabase staging/Production | PARTIAL | Tutti i comandi di questo task vincolati a zjinjtkekmaqtxsuyvho. Nessuna chiamata a Production. Drift attuale Production non misurato |
| Vercel Preview/Production | PARTIAL | Progetto spot-now identificato; lista Preview sul team approvato restituisce403. Nessun deploy, alias, protezione o dominio cambiato |
| Rollback deployment | PARTIAL | Runbook compatibile preparato; nessun candidato live verificato né rollback cloud simulato per403. Vecchio deploy-production.sh è esplicitamente Production, non strumento di recovery staging |
| Backup DB | UNKNOWN / TO VERIFY | API staging: backups=null, physical_backup_data={}, pitr_enabled=false, region=eu-west-1. Nessun restore point disponibile dimostrato. Non dedurre da questo risposta il piano acquistato o assenza di ogni copia esterna |
| Restore DB | PARTIAL | Drill locale su schema attuale PASS; zero branch isolati elencati nello staging. Nessun overwrite, dump dati reali o creazione progetto. Prova cloud ancora mancante |
| Storage/photo recovery | PARTIAL | Current e varianti referenziate: missing0. Bytes Storage non coperti da restore DB; nessun backup Storage operativo verificato |
| Secret/env | PARTIAL | Nomi12 secret staging inventariati, cinque Notifications presenti; file locale Notifications ignorato e0600. Scan limitato dei file tracciati senza pattern privilegiati trovati. Non prova tutta history, rotazione o identità delle chiavi attive |
| Google OAuth | PARTIAL | Flow reale storicamente PASS; progetto autorizzato rare-array-510414-d9. Nessuna GCP console toccata; scope/client/audience/redirect correnti non riesaminati. Luigi escluso |
| SMTP/email | MISSING | Custom SMTP pilot non scelto/configurato secondo ultime evidenze; nessun nuovo provider o invio. Sender/domain/DNS e accesso console da owner |
| Web Push/VAPID | PARTIAL | Cinque nomi secret presenti; Edge notifications ACTIVE, gateway verify_jwt=false intenzionale con prove device/dispatch interne. Generazione/deliveryOFF; QA OS reale e rotazioni note da attestare |
| ADMIN operativo | MISSING | Ruoli ADMIN attivi0. Account dedicato/UUID/owner MFA non forniti; non attribuiti privilegi all'account corrente o per email |
| MODERATOR operativo | MISSING | Ruoli MODERATOR attivi0. Persona sostituta approvata in principio ma ancora senza nome/account/finestre |
| Supporto/privacy/safety/ricorsi | PARTIAL | Casella unica già approvata somadatingapp@gmail.com. MFA/recovery/accessi/label/ricezione e copertura non verificati, nessun contenuto email letto |
| Recovery account/cloud | UNKNOWN / TO VERIFY | Procedure e test locali disponibili; recovery cloud/Google/mailbox e perdita MFA reali non provati. Nessun reset/bypass eseguito |
| Incident ownership | PARTIAL | Federico primary founder/operator; sostituto, tecnico reperibile e professionista non nominati. Nessuna copertura24/7 dedotta |
| Observability | PARTIAL | Schema/UI/metriche e test esistono; collectorOFF, background canary finaleBLOCKED, emailhardOFF/provider mancante |
| Retention Phase A | PARTIAL | Unico job ON03UTC; smoke manuale precedente PASS. Live job_run_details0: primo tick automatico non ancora osservato; altri jobOFF |
| Feature controls | PARTIAL | Matrice §L; membership_enabled/share_enabled non kill switch effettivi. Non esiste un arresto globale del core dimostrato |
| Config drift | PARTIAL | Snapshot staging attuale e confronto con sorgente/main storico; schema17–53 presente ma versioni non registrate nella tabella migrations. 045 resta bozza intenzionalmente non applicata. Nessuna sincronizzazione o repair per supposizione |
| Outage handling | PARTIAL | Runbook e retry/pause test locali; failover automatico assente e non richiesto. Recapito automatico/backup owner non operativi |

## B–C. Accessi e provisioning

| Capacità attuale | ADMIN | MODERATOR |
|---|---|---|
| Dashboard Analytics / health | Sì, server-role attivo + MFA verificata + JWT AAL2 | No |
| Coda/casi moderation | Sì, secondo autorizzazione/claim | Sì, con MFA e limiti dell'azione |
| Ban/azioni riservate/assegnazione ruoli | Amministrazione ampia secondo025/052, non solo analytics | Limitato; non può assegnare ruoli |
| Supabase/Vercel/GitHub/cloud DB | Nessun permesso automatico dall'app | Nessun permesso automatico dall'app |

Non esiste un ruolo analytics-only distinto: non dare ADMIN a un analista presumendo che sia sola lettura. Nessuna nuova granularità RBAC implementata. Client route/flag/email non concedono privilegi. Il ruolo server è ricontrollato anche con JWT già emesso; revoca ruolo o fattore verificato rimuove l'accesso privilegiato. I fattori sintetici dei test sono record del database locale, NON un nuovo MFA reale o recupero dispositivo.

### Processo minimo, staging soltanto

1. **Primo ADMIN:** founder indica esplicitamente account dedicato e UUID staging; ordinario signup/login, enrollment e challenge MFA reali. Operatore cloud già autorizzato verifica identità, progetto, non-anonymous/non-banned, fattore verified e accesso owner. Non associare ruolo per indirizzo hardcoded.
2. Con zero ADMIN la RPC moderation_role_set non può bootstrapparsi da sola: serve una transazione owner controllata sulle strutture esistenti moderation_roles/moderation_role_events, con attore reale, operation ID, prova esterna e revisione. Nessun seed o script che auto-promuova chi lo esegue viene creato qui. **STOP attuale: UUID e autorizzazione del proprietario di quell'identità assenti.**
3. **Altri ADMIN/MODERATOR:** un ADMIN sano con MFA/AAL2 usa la RPC esistente `moderation_role_set(target_user,new_role,operation_id)`; nominativo, ruolo minimo, scopo e reviewer registrati. Stesso opid per retry identico; non concedere database/service-role.
4. Verificare login+AAL1 negato, AAL2 ammesso, scope MODERATOR distinto, audit, logout e revoca con sessione già aperta. Autorizzare la persona solo dopo esito positivo. Nessun account operativo è stato creato in questo task.
5. **Revoca:** ADMIN sano imposta REVOKED tramite RPC e controlla diniego sulla sessione precedente; revocare separatamente eventuali accessi cloud nominativi. Nessun automatismo app rimuove cloud membership.
6. **Perdita dispositivo:** usare altro ADMIN verificato o procedura recovery owner con prova identità fuori chat. Revocare temporaneamente ruolo/fattore/sessioni pertinenti, recuperare account via canale ufficiale, enrollment MFA nuovo e nuova challenge prima del ripristino. Mai Confirm emailOFF, MFA globaleOFF, password/OTP/recoverycode in ticket.
7. **Compromissione:** revoca immediata da attore sano, preservare evidenza minima, controllare role events/sessioni e grant derivati. Se unico ADMIN compromesso: owner cloud verificato, non un fallback client o secret pubblicato. La protezione dall'auto-revoca dell'ultimo ADMIN non è garantita dal codice: verificarne l'effetto nel piano, senza bloccare una revoca urgente necessaria.

## D. Canali supporto e workflow

Decisione founder già approvata: una casella iniziale **somadatingapp@gmail.com** per SUPPORTO, PRIVACY, SAFETY, RICORSO. Non sono quattro account da creare. Labels separate e accessi personali autorizzati; nessun inoltro indiscriminato, nessun documento d'identità per l'age flow attuale. Inbox/sent/trash/allegati restano nel perimetro della procedura, non vengono cancellati dall'app. Non è un backend SMTP né un nuovo provider per gli alert.

Destinazione automatica alert esplicitamente approvata: stessa casella, ma trasporto assente/OFF. Il contatto pubblico per segnalazioni di sicurezza e il canale alternativo se Google/Gmail è indisponibile sono **DA CONFERMARE**, non destinatari impliciti. Non viene promessa ricezione operativa finché owner non prova MFA/recovery, consegna da account controllato, labels, accessi e finestre. Nessuna email inviata o letta qui.

Workflow manuale: **ricevuta → ID e categoria → owner → acknowledgement → indagine → risoluzione/escalation → esito e review**. Registro privato autorizzato, non GitHub pubblico: ID, tempi UTC, categoria/severity, owner, stato, evidenza tecnica opaca, azioni e outcome; niente token, testo chat/foto/preferenze. Contenuti eventualmente indispensabili solo nel caso safety autorizzato, non nel log generico. Nessun ticketing nuovo, nuova retention o SLA approvato.

| Categoria | Prima azione / instradamento |
|---|---|
| Login/accesso | Distinguere Google/email/sessione, URL/build, HTTP e cooldown; mai chiedere link Auth/OTP/password; verificare recupero dal provider |
| Accesso/export dati | Percorso owner-only già disponibile più richiesta manuale per categorie non coperte; RB-G |
| Cancellazione | Conferma identità proporzionata tramite account; engine normale,409/503 sono pending non successo; RB-D/G |
| Consenso/privacy | Revoca UI esistente se accessibile; preferenza eliminata, Match/chat esistenti restano secondo contratto; questioni giuridiche al professionista |
| Correzione | Campi modificabili dal normale profilo; stato età/sanction/non modificabile da supporto non va falsificato in DB; escalation tecnica/professionale |
| Abuso/report | Coda server, claim e ruolo/MFA; no copia contenuti in chat sviluppo; safety urgente prevale su normale bug |
| Ricorso/review | Persona autorizzata riesamina decisione, audit keep/release/escalate; no auto-release hold né ripubblicazione automatica |
| Safety concern | Triage riservato, owner/backup, caso ed evidenza minima; escalation umana, nessuna promessa24/7 |
| Bug tecnico | Commit/Preview, browser, momento, operation/request ID e classe errore; niente HAR grezzo con credenziali |
| Payment | N/A nel MVP esaminato; nessun sistema pagamenti introdotto |

## E–F. Severità e ownership

| Severità | Esempi / risposta operativa |
|---|---|
| SEV-1 | Esposizione dati o auth bypass sospetti, rischio distruttivo/perdita dati, login indisponibile su larga scala. Priorità massima, contenimento autorizzato ed escalation founder/tecnico/privacy; non attendere tutti i log |
| SEV-2 | Core materialmente indisponibile, write Match/chat, ORA/DD/SPOTTED, foto su molti utenti. Isolare percorso, preservare dati/current, indagine dipendenza e ripristino a gate |
| SEV-3 | Bug isolato/UI limitata/degrado non critico. Registrare e pianificare fix mirato; riclassificare se impatto aumenta |

Nessun tempo di presa in carico garantito senza copertura definita. I vecchi15min/1h sono candidati, NON nuovi SLA. Un incidente di sicurezza non coincide automaticamente con un data breach giuridicamente qualificato; registrare detection e conoscenza/valutazioni separatamente e coinvolgere il professionista. Nessun invio alle autorità/utenti eseguito da questo task.

| Ruolo operativo | Persona / stato |
|---|---|
| Primary founder/operator e coordinatore | Federico Grasso, responsabilità già indicata; finestre di copertura da completare |
| Sostituto owner/moderation | Un sostituto approvato in principio; nominativo, orari e account DA COMPLETARE |
| Esecutore tecnico recovery/cloud | DA NOMINARE; non dedotto dal ruolo MODERATOR |
| Escalation privacy/legal | Professionista DA INDIVIDUARE; no parere legale assunto |
| Safety/moderation escalation | Federico + sostituto autorizzato da completare; review hold manuale30giorni |
| Trasporto automatico alert | Assente; destinazione approvata, secondo destinatario non approvato |

## G–I. Rollback e recovery

[RB-A](soma-ops-runbooks-2026-10-23.md#rb-a--deployment-rollback) distingue Preview immutabile, rollback Production futuro e forward-fix quando vecchia build è incompatibile. Nessun candidato deployment live certificato: Vercel403 impedisce confronto effettivo SHA/env. Nessuna modifica a dominio/protezione/alias, nessun nuovo deploy necessario.

API backup staging: eu-west-1, PITRfalse, backupsnull, physicaldata vuoto. Non c'è un punto restore verificato né prova piano/rolling retention. Nessun costo/upgrade sostenuto. Branch isolati elencati:0; cloud restore non eseguito perché non c'è una destinazione sicura già disponibile e creare risorse può richiedere approvazione costi/owner. Non fare clone del normale staging con utenti esistenti per aggirare questo blocco.

**Drill locale sintetico attuale:** snapshot database PGlite con stack fino a054, caricamento in un secondo database senza overwrite del primo; dimostrato che lo snapshot ripristina anche vecchi gate ON e un record cancellato dopo snapshot. Quarantena chiude writer PHOTO e nuove batch purge; DB da solo lascia assenti tutti i bytes dello store sintetico separato, ripristinabili solo dal suo backup. Nessun originale foto conservato, nessun file reale copiato. Il test resta in quarantena: non dimostra un registro durabile di replay delete/revoca, un restore Supabase o RPO/RTO cloud. Il primo tentativo è fallito per il clock locale del fixture non inizializzato nella nuova sessione; corretto solo il test, non runtime.

Foto staging attuali: current4 settled, ready8 settled, review3 unknown, purged112 settled; current/varianti mancanti0; nessuna anomaly irrisolta registrata. I3review sono residui già noti, preservati: non risolverli per età né dichiarare zero writer incerti. La query non certifica zero orfani su tutto lo Storage: nessuna attribuzione forte né cancellazione oggetti eseguita. PHOTO cleanup/scheduler restanoOFF; quota/review/lifecycle invariati.

## J. Inventario secret/config, soli nomi

| Nome/famiglia | Dove / owner fonte | Stato e rotazione |
|---|---|---|
| SUPABASE_URL, SUPABASE_ANON_KEY / public publishable | Progetto provider; frontend solo URL+public key. Owner cloud | Nomi runtime presenti nello staging, valori non stampati. Mai server key in VITE_ |
| SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_SECRET_KEYS, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_JWKS | Secret gestiti provider/Edge; accesso amministratore autorizzato | Presenza nomi verificata; non tutte sono dipendenze dirette dell'app. Rotazione coordinata con Edge/Vault/cron/Auth e sonde, senza leggere in chat |
| Google client ID/client secret | Supabase Auth server + OAuth client Soma, progetto rare-array-510414-d9 | Config/stato live corrente non letto, credenziali non recuperate. Prima di ogni attività GCP verificare progetto; Luigi mai usato/coperto |
| Custom SMTP host/user/password/from | Supabase Auth server, nuovo provider solo dopo scelta autorizzata | Non selezionato/provato; non fallback Gmail o default pilot. DNS/provider setup da owner |
| NOTIFICATIONS_VAPID_PUBLIC / PRIVATE / SUBJECT | Edge Notifications staging; chiave pubblica soltanto in bundle | Tutti nomi presenti, file locale ignored0600. Presenza non prova coppia coerente, revoca chiavi vecchie o delivery |
| NOTIFICATIONS_DISPATCH_SECRET | Solo Edge/operatore scheduler Notifications | Presente. Dispatch/prune negati senza secret da test precedenti. Nessuna rotazione qui |
| NOTIFICATIONS_PREVIEW_ORIGIN | Edge CORS/origine Preview esplicita | Nome presente; valore non letto, origine effettiva da verificare contro deployment autorizzato |
| Vault credential dei cron | Vault DB, non browser/Git/report | Riferimento esistente, valore non letto. Rotazione legata ai consumer e pause; non creare copie/export |
| Vercel access/OIDC e env target | Connessione/console provider, owner team | Accesso project metadata sì, deploymentlist403; nessun token manuale richiesto, nessun envpull effettuato |
| VITE_* | Build pubblica, nomi da src; mappa §L | Non segreti. .env.example incompleto rispetto ai flag nuovi; inventario qui non modifica valori o builder |

I cinque secret Notifications sono stati rigenerati in task precedenti dopo esposizioni screenshot; questo audit non può attestare la disattivazione delle vecchie coppie/secret dalla sola lista dei nomi. Serve attestazione owner/rotazione registrata e test del consumer, senza ripubblicare valori. Non rilevata una nuova esposizione. Lo scan corrente ricerca JWT service-role, private-key block e sb_secret literals nei file tracciati testuali<=5MB:0hit, non audit esaustivo Git history/entropia/artifact/provider. Il file locale secret non è tracciato ed è0600. La risposta list è stata ridotta ai soli nomi e il file grezzo eliminato; non viene versionato alcun valore/fingerprint.

## K. Drift staging / Production prevista

Questo è un confronto **strutturale con baseline documentata/main**, NON un audit live Production, che resta vietato.

| Dimensione | Staging attuale / sorgente | Production documentata / gate futuro |
|---|---|---|
| Migration | Tabelle/RPC020–054 presenti; schema_migrations registra001–016 e054, non017–053 | Main storico PHOTO fino019; niente automatica equivalenza tra history e schema. Reconcile fonti/hash/ledger in task controllato prima release, non repair cieco;045 non va applicata o registrata |
| Edge |10ACTIVE: photo-assets18,delete-account12,jpeg11,png9,webp9,photo-lifecycle15,privacy-retention7,profile-photo8,notifications9,operations7 | Versioni/entrypoint attuali Production UNKNOWN; nessun redeploy/diff live |
| Feature flags | §L, diversi gate staged-only; placeholder consent e privacy_environment staging | Non copiare flag/default o migration stagingguard in Production alla cieca; futuro piano compatibilità separato |
| Auth/OAuth/redirect | Flussi storicamente provati, Confirm email ultimo stato notoON; nuove URL necessitano allowlist | Auth config corrente Production e allowlist UNKNOWN; nessun sync Site URL/provider |
| Storage/RLS | Private bucket e signer v2 da audit, referenze current mancanti0 | Production PHOTO DONE storico; nuove autorizzazioni036 non automaticamente deployate |
| Scheduler | Solo Phase A job4 ON03UTC; legacy/PHOTO OFF | PHOTOproductionON da report storico; stato live non letto. Il worker operations è hard-staging: non trasferire cronstaging a Production |
| Ruoli | ADMIN0/MODERATOR0; server-role+MFA | Nessun provisioning Production; staff/membership cloud separati |
| Analytics/OPS | RaccolteOFF/test_only; OPSemailOFF/purge_readyfalse | Nuova raccolta e dashboard non autorizzate in Production |
| Push / SMTP | Generazione/deliveryOFF, cinque nomi; SMTPcustom non provato | Presenza nomi/valori e delivery Production UNKNOWN, nessun secret copiato |

## L. Switch critici e condizioni di attivazione

“Stato pilot previsto” è un requisito condizionale di release, NON un'autorizzazione ad accenderlo oggi. Ogni attivazione richiede owner nominativo, snapshot prima/dopo, canary e pausa specifica. Nessun flag modificato in questo task.

| Switch | Stato staging | Stato pilot previsto / prerequisito / owner |
|---|---|---|
| discovery_enabled + policy.enabled/paused | OFF ordinario, policy da verificare insieme | ON solo dopo gate DD/frontend/QA e autorizzazione; tecnico+Federico |
| dd_controlled_admission + allowlist | false, baseline non ammette fixture in questa sessione | Modalità test solo fixture quando autorizzata; ordinario richiede decisione esplicita, niente ammissione reale implicita |
| notification_control enabled/delivery_enabled | false/false | ON solo dopo deviceQA, transport/rotation/outboxprune e autorizzazione; owner tecnico |
| PHOTO admission/execute/scheduler | OPEN/false/false | Pipeline frozen, cleanup/scheduler solo propri gate PHOTO; non attivati da Phase A o da questo task |
| retention_phase_a manual/scheduler | true/true,03UTC | Primo tick e capacity/lag verificati, owner monitoraggio. Production richiede implementazione apposita autorizzata, non URLstaging |
| retention_control.paused / legacy cron | true / OFF | RestaOFF finché policy/categorie/worker specifici approvati; non accendere per “fare retention completa” |
| analytics enabled/test_only/admission | false/true, nessuna nuova admission | ON solo dopo gate raccolta/privacy e purge monitorato. Pausa collection non elimina dati già conservati |
| ops enabled/test_only/purge_ready/email | false/true/false/false | ON solo dopo collectorcanary e attestazione readiness; emailhardOFF richiede task trasporto approvato, non semplice toggle |
| comments_enabled/requests_enabled | true/true | Non equivale accesso pubblico: membership/eligibility/autorizzazione restano server-side |
| system_posts_enabled | false | QoD ON soltanto con gate editoriale/retention/QA separati |
| membership_enabled/share_enabled | false/false nel record | NON kill switch effettivi delle RPC join/Share. Non usarli come prova di contenimento |
| VITE_* principali | Default sorgenteOFF; valori del deployment attuale UNKNOWN per403 | VITE_PRIVACY_PHASE1,RIGHTS_PHASE1,MODERATION_PHASE1,ADMIN_ANALYTICS,ONBOARDING_NO_QR,ORA_V2,SPOT_V2,PROFILE_AUTHORIZATION_V2,BACHECA_PHASE1,NOTIFICATIONS_MVP,ANALYTICS_MVP,OBSERVABILITY_MVP,AUTH_EMAIL_OTP,GOOGLE_ENABLED e public VAPID: inventariare per deployment e ref; nessun flagclient autorizza il server |
| jobs_paused | true | Non sostituisce gli switch dei worker distinti; Phase A opera comunque. Non esiste killswitch globale verificato |

## M. RPO / RTO candidati

Proposta da approvare dopo prova capacità: RPO DB<=24h e Storage<=24h separatamente; RTO core candidato4h durante copertura concordata / stesso giorno operativo. Non nuovi SLA né scelta retention backup. PITR eventuale riduce RPO DB solo dopo acquisto autorizzato/prova e non recupera bytes foto. Oggi non sono dimostrabili: nessun restore point cloud disponibile nell'inventario, nessuna copia Storage verificata, recovery isolato/cloud e owner non pronti. Uno snapshot locale in pochi secondi NON misura RTO del servizio. Se capacità reale non sostiene i target, rivedere budget/obiettivi prima del pilot, non accettare silenziosamente perdita maggiore.

## N–P. Runbook e diritti

[Runbook operativi A–H](soma-ops-runbooks-2026-10-23.md): rollback; DB; auth; Storage; secret exposure; safety; diritti; shutdown. Coprono anche outage Supabase/Vercel/Google/email/push. Nessun failover o ticketing sviluppato. Esempi/sequenze Production sono istruzioni future soggette a esplicita autorizzazione, non azioni eseguite qui.

Diritti: automatico owner-only disponibile per subset, export10k/8MiB, foto solo metadata e download separato; dati protetti/provider/nuove categorie da workflow manuale con professionista. Delete non dipende dal consenso ma PHOTO_PAUSED/lease può differirne completamento;409/503 richiedono seguito operativo e acknowledgement, mai “deleted”. Consenso revocabile da UI esistente cancella preference, non Match/chat; correzione non deve aggirare età/moderazione. Nessun testo legale né periodo di gestione finale deciso qui.

## Q. Checklist definitiva pre-pilot

Unica checklist di chiusura: non duplicare esiti su runbook storici. I nomi non assegnati restano DA NOMINARE, non diventano autorizzazioni per il primo account disponibile. “Sì, se inclusa” richiede gate positivo o una separata decisione esplicita di esclusione dal pilot.

| ID / controllo | Owner | Stato / evidenza corrente | Blocker pilot |
|---|---|---|---|
| OP01 Legal review e testi approvati | Federico + professionista da individuare | MISSING; dossier finale disponibile, nessuna approvazione legale | Sì |
| OP02 Remediation obbligatoria risultante dalla review | Professionista + tecnico nominativo | MISSING; fuori scope implementativo attuale | Sì |
| OP03 ADMIN dedicato provisionato, MFA/revoca/recovery provati | Federico + operatore cloud sano | MISSING; ADMIN0, UUID/account da scegliere, test solo locali/sintetici | Sì |
| OP04 MODERATOR dedicato, least privilege, MFA e revoca | Federico + sostituto da nominare | MISSING; MODERATOR0; nessun grant effettuato | Sì |
| OP05 Casella support/privacy/safety/ricorsi live | Federico | PARTIAL; canale approvato, MFA/recovery/label/ricezione/accessi da attestare | Sì |
| OP06 Incident owner, backup e canale alternativo | Federico | PARTIAL; primary noto, backup/finestre/privacy escalation da completare | Sì |
| OP07 Backup DB verificato e retention copie approvata | Operatore cloud + Federico | MISSING; API staging non mostra restore point, piano/backup pilot non verificati | Sì |
| OP08 Backup Storage canonicale verificato | Tecnico recovery da nominare | UNKNOWN; runbook candidato, nessuna copia/expiry operativa dimostrata | Sì |
| OP09 Restore cloud isolato + replay delete/revoca/ban | Tecnico recovery + owner | MISSING; drill localePASS, ambiente cloud sicuro non disponibile; no overwrite | Sì |
| OP10 RPO/RTO approvati e misurati | Federico + tecnico recovery | PARTIAL; candidati24h/4h non sostenuti da prova cloud | Sì |
| OP11 Custom SMTP operativo | Federico + operatore Auth | MISSING; provider/sender/DNS da autorizzare; nessun default fallback pilot | Sì |
| OP12 Notifications delivery e tap deviceQA | Tecnico + collaudatore autorizzato | DEFERRED; nessuna ricezione OS provata, deliveryOFF | Sì, se inclusa |
| OP13 Primo tick automatico Retention Phase A | Operatore retention da nominare | PENDING; job03UTC attivo,0run al postcheck23ottobre, smoke manuale storicoPASS | Sì per operational readiness della raccolta interessata |
| OP14 Observability collector canary background | Tecnico | BLOCKED; timeout storico non risolto da questo task | Sì |
| OP15 Alert email configurate o waiver esplicito successivo | Federico + operatore alert | MISSING; destinazione approvata, emailhardOFF; nessun waiver presente | Sì |
| OP16 Freeze feature flags e admission | Federico + tecnico release | PARTIAL; stato staging registrato, non stato finale pilot; reserved flag non kill switch | Sì |
| OP17 QA device | Collaudatore da nominare | NOT RUN in questo task; iOS/Android/QR/auth/foto/push/share da gate separato | Sì |
| OP18 Accessibilità | Owner frontend da nominare | UNKNOWN / TO VERIFY; test automatici non certificano percorso assistivo reale | Sì |
| OP19 Regression finale releasecandidate | Tecnico release | PARTIAL;779/779 correntePASS, build/typecheckPASS; candidato/flag pilot futuri da ricollaudare | Sì alla release futura |
| OP20 Rollback compatibile verificato | Owner deployment | PARTIAL; runbook pronto, Vercellist403, nessun candidato live validato | Sì |
| OP21 Reconcile ledger migration / release manifest | Tecnico DB/release | PARTIAL; schema successivo a016 presente, history17–53 assente. Nessun repair cieco | Sì prima preflight Production |
| OP22 Secret rotation/exposure e recovery attestati | Owner secret/cloud | PARTIAL; nomi e scan corrente verificati, vecchi secret esposti non attestati inattivi qui | Sì per consumer interessati |
| OP23 PHOTO inventory e policy review note | Operatore PHOTO | PARTIAL; current/varianti missing0, review3unknown già noti preservati. Nessuna globale prova zero-orfani | Inventario da verificare sul target; non richiede purge forzato dei review |
| OP24 Prod preflight e rollout autorizzati | Federico + tecnico release | NOT AUTHORIZED; nessuna Production contattata/config sincronizzata | Sì |
| OP25 Provider piani/MFA/recovery/configurazioni esterne | Federico + professionista per contratti | UNKNOWN/PARTIAL; VercelPro richiesto, Supabase capacità recovery, consensi/dati provider non chiusi | Sì |
| OP26 Diritti manuali e support delivery | Owner support + professionista | PARTIAL; workflow pronto, identità/canale sicuro/completa coverage da provare senza dati reali | Sì |

## R. Blocker operativi residui e prossimi task minimi

**P0, prima di utenti reali:** provisioning nominativo e accesso recovery; support/safety/incident coverage; backup DB e Storage con expiry e restore cloud sicuro; SMTP pilot; chiusura review/remediation professionale come gate esterno; preflight Production separato. Non acquistare o creare account per risolverli automaticamente.

**P1:** Vercel403 e candidato rollback non verificato; ledger migrations incompleto; primo tick Phase A; OBS canary/trasporto alert; pushdevice e secretrotations attestati; operatore review/unknown e config drift. Nessuna richiesta di eliminare i3review o cambiare PHOTO. Le categorie escluse dal pilot possono essere rinviate solo con decisione esplicita e senza dichiararle operative.

Sequenza proposta:
1. Founder identifica account/UUID staging dedicati, sostituto e tecnico/finestre; owner completa MFA/recovery/canali. Poi task provisioning stretto con prova reale login/MFA/revoca.
2. Ripristinare accesso del connector al team Vercel autorizzato (nessun token in chat); verificare deployment/SHA/Preview/candidato sano senza Production mutation. Non disattivare Protection.
3. Owner sceglie piano/capacità e autorizza eventuali costi/destinazione recovery; prova cloud isolata prima di backup/restore reali. Seguire RB-B, non clone binario ingenuo.
4. Reconcile migration history con sorgente/hash/compatibilità in task dedicato; primo tick Phase A e health, poi canary OBS mancante e trasporto alert esplicitamente scelto. Non accendere tutte le feature.
5. SMTP/provider e secret/rotation attestati, future deviceQA/accessibilità/gate legali e regression finale; solo allora Production preflight/rollout con autorizzazione distinta.

Le stop conditions sono state applicate alle sole azioni bloccate: niente owner sconosciuto per grant, niente nuovi account esterni, niente acquisto/progetto/restore distruttivo, niente decisione legale. Il lavoro documentale e i test offline indipendenti sono completati.

## S–W. File, verifiche ed evidenze

File di questo task:
- questo documento readiness/checklist;
- `docs/soma-ops-runbooks-2026-10-23.md` (A–H);
- `supabase/tests/ops_readiness_read_only.sql` (solo SELECT/counts/catalogo, BEGIN READ ONLY, nessun purge);
- `tests/ops-readiness.test.js` (3 drill locali);
- evidenze metadata-only in `docs/evidence/ops-readiness/`.

Preflight ripetibile staging, nessuna scrittura:

```sh
supabase db query --linked --project-ref zjinjtkekmaqtxsuyvho --file supabase/tests/ops_readiness_read_only.sql --output json
```

Evidenze: `postflight.json` per controlli/ruoli/migration history/referenze/writer/cron; `infrastructure.json` per nomi secret, funzioni, risposta backup ridotta, branch0 e403Vercel; `tracked-scan.json` per scope/limiti scan; `verification.json` per test e invarianti. Nessuna credential/fingerprint, corpo UGC, foto o account reale esportato. Query/preflight non concedono privilegi.

Test:3/3 nuoviPASS; suite completa **779/779PASS**,0fail/skip/cancel; buildPASS,typecheckPASS,diff-checkPASS. Sono prove local PostgreSQL/PGlite con RPC reali dello schema, non nuovi account MFAcloud, recoveryprovider o rollbackVercel riusciti. Snapshot locale include la stack attuale attraverso054; non un backup di utenti esistenti staging. Il codice di prodotto, migrations, Edge, env, flag, scheduler e PHOTO non cambiano. Nessuna fixture cloud creata/eliminata o account reale modificato. Nessun OAuth/SMTP/DNS/billing/secret cambiato, nessuna nuova integrazione.

Riferimenti operativi: [INCIDENT01A](soma-incident01a-runbook-2026-10-11.md), [drill e limiti](soma-incident01a-drill-report-2026-10-11.md), [backup/restore](soma-provider01-backup-restore-runbook-2026-10-11.md), [SMTP](soma-provider01-smtp-runbook-2026-10-11.md), [PhaseA](soma-retention-phase-a-scheduler-staging-2026-10-23.md), [OBS finale](soma-observability-mvp-staging-report-2026-10-23.md), [moderation](soma-moderation-finalization-staging-report-2026-10-23.md), [dashboard](soma-admin-dashboard-staging-report-2026-10-23.md), [Analytics](soma-analytics-mvp-staging-report-2026-10-22.md). Il vecchio `operazioni-pilota.md` è storico: “no leaveTribe/foto abbandonate non ripulite” non descrive più Membership/PHOTO02, e il suo script Production non viene eseguito per staging.

Commit/push del solo pacchetto operativo e test vengono verificati nella consegna. Working tree pulito dopo commit; nessun merge main. Nessuna dichiarazione di pilot-ready o autorizzazione Production derivata dai test verdi.

**OPS / RECOVERY / SUPPORT: BLOCKED**
