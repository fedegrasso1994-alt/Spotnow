# SOMA — Runbook operativi A–H

23 ottobre2026. [Stato, owner e checklist unica](SOMA_OPS_RECOVERY_SUPPORT_PREPILOT.md). Documenti utilizzabili dall'operatore autorizzato; **nessuna azione Production è autorizzata da questo file**. Verificare sempre ambiente, ref, release e persona prima del comando. Non usare dati reali per un drill. No token/password/linkAuth/signedURL/UGC nei log, email tecniche o repository.

Per ogni intervento: ID caso privato, UTC, owner, sintomo/SEV, stato iniziale, azione e autorizzazione, verifica, esito e prossimo responsabile. Se target, ownership, compatibilità o contenimento non sono dimostrabili: STOP ed escalation. Non riaprire dopo un semplice HTTP200 senza valutare body/stato/integrità.

## RB-A — Deployment rollback

**Trigger:** errore dopo deploy o shell/asset/build sbagliati. **Owner:** tecnico deployment autorizzato + Federico. **Prima:** annotare URL esatta, deploymentID, commit effettivamente servito, target Preview/Production, team/progetto, schema/RPC/Edge richiesti. Il branch Git non prova il deployment.

### Preview staging

1. In Vercel team `fedegrasso1994-1482`, progetto `spot-now`, filtrare Preview e branch staging. NON usare Instant Rollback Production o lo script deploy-production.sh.
2. Selezionare la precedente URL immutabile verificata, controllare ref Supabase staging e compatibilità con schema/RPC correnti. Non scegliere una vecchia shell o un frontend pre-autorizzazione036/PHOTO02.
3. Reindirizzare la review a quella URL, preservando Deployment Protection. Una URL immutabile errata non viene sovrascritta: un eventuale nuovo deploy/alias è un'azione separata da autorizzare. Se Authredirect assente, serve la sola voce staging approvata, mai cambio Site URL improvvisato.
4. Smoke: asset/import, login e reload/logout, nav TRIBE|SPOTTED|ORA|MATCH|PROFILO, no contenuto protetto dopo logout, diritti/foto/core nei gate consentiti. Non attivare DD/push/cleanup per verificare una shell.
5. Se nessun deployment compatibile o accesso403: mantenere review bloccata, preparare forward-fix; non disattivare protezione né ottenere token manuali per aggirarla. Follow-up 26 ottobre: 403 risolto con autorizzazione team della connessione; letture deployment disponibili. Simulazione URL immutabili A→B→A PASS sulla shell pubblica, non rollback alias o smoke autenticato. Vedi [evidenze correnti](soma-backup-restore-vercel-rollback-2026-10-26.md#g–j-vercel-accesso-inventario-e-prova).

### Production — SOLO futura autorizzazione

1. Owner approva esatto deployment Production precedente e compatibile, snapshot dei gate e rischio dati. Un rollback frontend non annulla migration, dati o Edge.
2. Dashboard progetto→Production deployment→Instant Rollback→verificare deployment/domìni e confermare **solo dopo autorizzazione**. Alternativa CLI dopo verifica versione/accessi: `vercel rollback <APPROVED_DEPLOYMENT_ID> --scope fedegrasso1994-1482`. Placeholder non è un candidato verificato. Non promuovere una Preview come scorciatoia di rollback.
3. Rileggere URL/SHA effettivi, env/build, Authredirect, API/Edge, RLS e gate. Vietato writer PHOTO01 post017 o frontend incompatibile con privilegi/consenso attuali. Se incompatibile: pausa del percorso e forward-fix.
4. Smoke/integrità dati, job ancora negli stati autorizzati, niente duplicate write; registrare esito. Ripristinare auto-assignment soltanto in un'altra azione approvata.

Vercel Instant Rollback ripristina build/config precedente, non aggiorna automaticamente env della build; può ripristinare definizioni cron Vercel e disabilita auto-assignment Production. Verificare ciò che il piano effettivo permette. I cron DB Supabase sono separati. [Documentazione ufficiale](https://vercel.com/docs/instant-rollback). Nessun rollback/deploy è stato eseguito nel presente task.

## RB-B — DB recovery e restore isolato

**Trigger:** perdita/corruzione o cancellazione accidentale; rischio distruttivo→SEV-1. **Owner:** operatore cloud sano nominativo + Federico; privacy per cancellazioni/hold. **Prerequisiti:** restore point reale disponibile e autorizzato, piano/costi approvati, schema/release inventariati, destinazione isolata già autorizzata, accessi recovery e protezione egress prima dell'import.

1. Fermare le scritture/purge che aggravano danno tramite controlli realmente supportati; salvare metadata/evidenza minima senza dump superflui. Non sovrascrivere staging o Production per “provare”.
2. Verificare backup DB e manifest/backup bytes Storage separati, completezza, hash, cutoff e scadenza. Scegliere punto coerente. RPO/RTO non ancora approvati.
3. Usare restore logico selettivo in destinazione quarantena: escludere credenziali, Vault, cron/net queue, webhook/email e integrazioni esterne; ripristinare configurazione OFF prima di esporre dati o auth. Non copiare utenti Production nel normale staging.
4. **STOP se non si può isolare prima:** il clone binario Supabase può avviare pg_cron/pg_net appena completato, senza possibilità di escluderli durante clone. [Avvertenza ufficiale](https://supabase.com/docs/guides/platform/clone-project). Non cliccare Restore/Create project in questo task; costi/risorse necessitano autorizzazione distinta.
5. Dopo import verificare schema/FK/RLS, source/versioni ed Edge compatibili, account/ruoli/sessioni, ledger/quota/current/Storage. Snapshot può resuscitare account cancellati e vecchi gate ON: riapplicare delete/revoche/ban/purge successivi prima di qualunque riapertura. Il registro durabile di replay resta un gap, non una funzione già presente.
6. Recuperare sole copie canonicali ancora necessarie da manifest coerente; niente originali scartati, niente new bucket pubblico o retention PHOTO allungata. Missing/unknown/review→STOP e riconciliazione con prova, non purge per età.
7. Solo dopo canary sintetici core, diritti, foto, permessi e assenza side effect: owner approva riapertura a gate, job ultimi. Misurare RPO/RTO effettivi, far scadere copie temporanee/manifest secondo policy approvata e revocare accessi temporanei.

Aggiornamento 26 ottobre: console staging conferma Free, senza project backups; PITR non attivo, restore-to-new-project richiede Pro. API senza timestamp/restore point dimostrato, branch isolati0. `walg_enabled:true` non certifica backup recuperabili. STOP prima di upgrade o restore. [Report e acceptance cloud](soma-backup-restore-vercel-rollback-2026-10-26.md). Il drill locale dimostra restore schema e rischio di resurrezione, non restore cloud. La documentazione Supabase distingue [backup DB dai bytes Storage](https://supabase.com/docs/guides/platform/backups).

## RB-C — Auth e outage provider

**Triage comune:** URL/ref/build esatti, ora UTC, classeerrore/status, DNS→TLS→Auth/API→Storage da sonde minime autorizzate; confrontare status ufficiale e un secondo punto osservazione se disponibile. ENOTFOUND/timeout del runner non prova outage globale. Nessun test con account reale non autorizzato, password/OTP/link nel ticket o retry continuo.

| Dipendenza | Impatto / cosa può restare disponibile | Contenimento e comunicazione | Gate recupero |
|---|---|---|---|
| Supabase | Auth/RPC/DB/Edge/Storage indisponibili; shell già caricata non prova dati accessibili | Sospendere tentativi ripetuti, preservare current e richieste; se API non risponde non dichiarare pause server eseguite. Nessun fallback DB/provider | Auth/RPC/Storage minimi raggiungibili, nessun writer incerto nuovo, stato quota/ledger/retry e permessi coerenti |
| Vercel | Nuovo caricamento/asset può fallire; sessioni già aperte possono ancora chiamare Supabase | Non trattare sito down come revoca accessi. RB-A se deploy, altrimenti provider; non disabilitare Deployment Protection | URL corretta con asset/import, login/reload/logout; backend integro indipendentemente dal frontend |
| Google OAuth | Nuovi login Google falliscono; email/sessioni esistenti possono funzionare se realmente configurate | Comunicare canale alternativo già provato, non creare account duplicati. Mai progettoLuigi, disattivazione confermaemail o bypass | Solo progetto rare-array-510414-d9; authorize→callbackstaging→stessaPreview→sessione/onboarding, nessun redirectProduction |
| Email/Auth SMTP | Nuovo login email/codici non arrivano o429; Google/sessioni esistenti possono funzionare | Distinguere cooldown, bounce e outage. Non fallback default SMTP per pilot, non nuovo invio continuo o copia link | Inbox controllata, sender, token single-use/expiry, redirect/sessione e rate limit; nessun contenuto nel log |
| Push provider/delivery | Notifiche non arrivate/tap fallito; core e chat restano utilizzabili in app | DeliveryOFF se autorizzato e necessario; non riattivare unknown alla cieca né usare email marketing. Comunicare che l'app resta consultabile solo se verificato | Subscription reale, check/delivery/revoca/logout/tap con deviceQA separata, outbox/prune, nessun doppio invio |

Modello di comunicazione **interno candidato, non inviato**: percorso interessato, fatto verificato e ora, alternativa realmente disponibile, owner e prossimo aggiornamento concordato. Niente “dati al sicuro”/“nessuna perdita” senza prova. Il recapito alternativo se Gmail/Google non funziona è ancora da approvare.

## RB-D — Storage / PHOTO

**Trigger:** upload/canonicalization/signing fallito, foto mancante, quota/review/cleanup incoerente. **Owner:** tecnico PHOTO autorizzato; escalation Federico.

1. Identificare fase mediante request ID e codici, mai URL firmata/foto/segreti nel ticket. Verificare ref, quota/admission, formato/limiti, current e copie referenziate. Non cambiare decoder/limiti per far passare input.
2. Preservare current durante replace; retry con stessa operation/request identity secondo contratto.409/503 delete significa pending; non ripetere con account nuovo o cancellare lease.
3. Se necessario e autorizzato usare pause/executionOFF PHOTO tramite meccanismo cutover esistente; non aggiornare smoke_epoch o bypassare canary. La pausa può bloccare nuovi delete: informare supporto e mantenere follow-up.
4. DB sano/bytes persi: serve backup Storage validato. DB restore senza bytes non risolve foto. Storage sano/DBperso: ricostruzione soltanto da manifest/ledger autorevoli; nome/percorso somigliante non basta. Nessun download/reupload di foto reali per un drill.
5. Review/unknown e oggetti non attribuiti preservati, riconciliazione esplicita con prova terminale. Mai età/assenza momentanea come autorizzazione al purge. Nessun oggetto rimosso da questo task.
6. Riapertura solo canary/nuovoepoch/gate e verifica current/varianti/ledger/quota. Cleanup e scheduler ultimi secondo PHOTO02, non attivati dalla retention generica. Eviction browser/CDN non istantanea, pixels già consegnati non richiamabili.

Aggiornamento 26 ottobre: 42 oggetti metadata, bucket privato, current/variant missing metadata0; nessun GET dei bytes. Sei oggetti referenziati da asset non sono attribuiti alla semplice proiezione ledger: preservare e riconciliare, non chiamarli orfani eliminabili. Backup bytes non verificato, versioning nativo S3 non supportato; nessun drill cloud eseguito. Manifest/receipt non ricostruiscono pixels. [Limiti e mitigazione da approvare](soma-backup-restore-vercel-rollback-2026-10-26.md).

## RB-E — Secret exposure / accesso compromesso

**Trigger:** screenshot/token/secret, accesso staff non autorizzato, OAuthredirect/client sospetti, login anomalo. **Owner:** cloud/account owner sano + tecnico, privacy escalation.

1. Registrare solo tipo/nome/ambiente/ora/superficie, mai il valore o screenshot non redatto; distinguere public anon/VAPIDpublic da private/service/dispatch. Rimuovere la condivisione se autorizzato senza distruggere evidenza necessaria.
2. Isolare l'accesso compromesso e contenere da account/dispositivo sano. Revoca ruolo app non revoca account cloud; rotazione service-role richiede analisi Edge/Vault/cron e keyset. Non leggere o ruotare credenziali Production in questo task.
3. Rotazione staging o Production solo con istruzione specifica per ambiente/secret: pausa consumer pertinente, genera nel secretmanager autorizzato, aggiorna soltanto consumer necessari, revoca vecchia versione, test vecchio rifiutato/nuovo valido e ripristino gate. Non usare token in argomenti CLI/chat/Git.
4. VAPIDprivate: coppia nuova coerente, publicbuild/subscription/devicebinding da rivalutare; dispatchsecret distinto. Presenza dei nomi non dimostra rotazione riuscita. Nessuna delivery attivata per questa verifica.
5. OAuth: prima leggere project ID esatto rare-array-510414-d9 e risorsa; Luigi STOP. Verificare audience/redirect/client/chiavi aggiunte; comunicare modifica/motivo/impatto prima di mutare GCP. Mai riutilizzare risorseLuigi o cambiare provider globalmente come workaround.
6. Valutare intervallo/dati/azioni accessibili ed evidenza effettiva; preservare solo metadata minimali in registro riservato, professionista per breach/notifiche/retention. Nessuna notifica legale automatica o accertamento finale dal software.
7. Verificare ruoli/sessioni/CI e grant derivati, consumer, audit e assenza credenziali tracciate. Reopen owner esplicito. Se credenziale ancora potenzialmente valida e owner non disponibile: restareBLOCKED, non dichiarare incidente chiuso.

## RB-F — Moderazione / safety escalation

Provisioning/recovery staff: seguire la [procedura Phase A](soma-ops-staff-provisioning-recovery-2026-10-24.md). Non regrantare un UUID compromesso presumendo che logout/refresh-revoke invalidi ogni access JWT AAL2 già emesso. Nessun provisioning umano completato dalla sola prova SQL locale.

1. Intake in canale già approvato e caso privato; safety urgente→owner immediato secondo copertura disponibile, non promessa24/7. Nessun accesso università/venue ai dati individuali.
2. Solo staff nominativo + MFA/AAL2 entra in coda; claim/revision prima dell'azione. Risolvere autore anonimo solo per quel caso e finalità safety, mai comunicarlo a reporter/peer.
3. Review minima contenuto on-demand; niente reader generale chat o copia permanente messaggi nel report. ChatMVP: segnalazione+blocco interlocutore/conversazione.
4. Warn/suspend/ban secondo permessi, audit reason/state/actor/date/reviewdue; escalation a ADMIN per azione riservata. Unsuspend non ripubblica vecchi contenuti. Ricorso manuale, non appealcenter nuovo.
5. Safetyhold esplicito e minimizzato se necessario: review ogni30giorni, keep/release/escalate manuale, nessun auto-release. Durata/base/massimo non decisi qui. Hold non abilita discovery o ripubblicazione.
6. Concludere registrando esito e responsabilità/prossima review; invii reali agli utenti richiedono autorizzazione operativa e copy approvata. Se nessuno staff disponibile, stop nuovi inviti secondo capacità reale, non aprire pilot fingendo copertura.

## RB-G — Richieste privacy / diritti

1. Classificare accesso/export/delete/revoca/correzione; ID/UTC/owner e verifica identità proporzionata tramite account/canale sicuro. Non chiedere password, OTP, documenti via email per routine e non inoltrare dump su casella non verificata.
2. Percorso automatico attuale: own RPC/pagination, JSON bounded10k/8MiB senza copia exportserver; restricted/revoked non perdono il diritto al percorso. Binaryfoto e contenuti terzi non automaticamente completi.
3. Usare matriceDI del dossier per categorie nuove/protette: DD, romantic, notificationdevice/outbox, providerlogs, messaggi ricevuti e metadata safety necessitano manual review/redazione. Non esporre hiddenauthor, token, chiavi o dati privati altrui. Spegnere raccolta non rende inesistenti i dati già conservati.
4. Delete: engine normale e verifica Auth/profilo/foto/copie/social/Analytics; lasciare receipts tecniche necessarie temporanee e safety solo hold esplicito. Se lease/pause/provider blocca, registrare pending e follow-up, niente purge diretto/bypass per completare ticket.
5. Revoca: UI/RPC esistente cancella preference, nuovi flussi dating bloccati, social/Match/chat esistenti secondo contratto. Non ripristinareALL. Correzione via normali controlli, non riscrivere attestazioni/sanction conSQL improvvisato.
6. Per esclusioni, tempi legali, identità dubbia, safety/diritti terzi, backup e dati non esportati coinvolgere il professionista. Il dossier non è una base per negare automaticamente la richiesta.
7. Consegna solo a destinatario verificato tramite canale approvato, esito/limiti documentati; minimizzare copie di lavoro e applicare retention approvata. Nessuna nuova durata o policy finale introdotta qui.

## RB-H — Kill switch / shutdown controllato

**Trigger:** aggravamento incidente o integrità non garantita. **Owner:** operatore del sistema e ambiente esplicitamente autorizzato. Solo i controlli realmente presenti possono essere usati; non confondere flag frontend con autorizzazione backend. Non esiste uno shutdown globale già verificato di tuttoSoma.

| Percorso | Controllo disponibile / limite |
|---|---|
| DD | discovery_enabled=false e verifica gate effettivo/policy: niente nuovi drop/letture autorizzateDD; non spegne ORA/chat |
| Notifications | enabled=false + delivery_enabled=false, verifica claim; richieste trasporto già in volo/OS richiedono controllo, niente resendunknown |
| Analytics | enabled=false, raccolta fail-open fermata; dati già conservati/diritti/purge separati |
| Observability | enabled=false; emailhardOFF resta; preservare evidenza minima già autorizzata, non creare nuovi logcontenuti |
| Retention Phase A | Solo STAGING: script pausa sotto; entrambi i gateFALSE + jobinattivo, batch corrente atomica. Non annulla purge già commesso |
| Privacy legacy | paused=true + suo cronOFF, non controlla PhaseA néPHOTO |
| PHOTO | cutoverpause/execute_off e scheduler configurato secondo autorizzazione; verifica in-flight/review, current preservata; non sostituire writerPHOTO01 |
| ORA / SPOTTED / romantic | Rispettivi gate server per percorsi nuovi; **non prova di revoca di tutti i reader/writer legacy o arresto globale**, servono inventario entrypoint/grants e verifica specifica prima di dichiarare contenuto |
| Account staff | REVOKED server-role e revoca session/accessi pertinenti, non solo nascondere pannello |
| membership_enabled/share_enabled/jobs_paused/UIflags | Non bastano per fermare backend; non usarli come kill globale. Match/chat non hanno un kill switch globale dimostrato |

Comando già disponibile, NON eseguito in questo task, **esclusivamente per pausa PhaseA staging**:

```sh
supabase db query --linked --project-ref zjinjtkekmaqtxsuyvho --file supabase/operations/retention-phase-a-staging-pause.sql --output json
```

Prima/dopo controllare stato e effetti. Non lanciare insieme tutte le pause per ottenere verde; alcune interrompono diritti/delete. Se API irraggiungibile, owner sano valuta contenimento provider senza promettere effetto raggiunto. Riapertura per singolo percorso a canary/gate, scheduler ultimi; Production richiede successiva autorizzazione esplicita.

## Fonti e limiti

Readiness/evidenze correnti nel documento principale. Skill Vercel Deployments & CI/CD consultata; documentazione ufficiale [Instant Rollback](https://vercel.com/docs/instant-rollback), [backup Supabase](https://supabase.com/docs/guides/platform/backups), [restore/clone Supabase](https://supabase.com/docs/guides/platform/clone-project). Le capacità documentate del provider non provano il piano/account reale né autorizzano spese. Runbook INCIDENT01A/PROVIDER01 più vecchi restano fonti storiche: non usare ciecamente lo script Production o assumere schema/release vecchi ancora compatibili.
