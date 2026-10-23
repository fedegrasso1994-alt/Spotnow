# SOMA — Dossier consolidato privacy/legal pre-pilot

**Baseline tecnica per revisione professionale — NON attestazione di conformità.**

Data: 23 ottobre 2026. Codice esaminato: `0d7a3b8a1c01822277a4de77815a0c79a0c04e10`, branch `codex/soma-schema-v2-staging`. Ambiente verificato: solo Supabase staging `zjinjtkekmaqtxsuyvho`. Nessuna consultazione o modifica Production, nessun merge main. Main rimane `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

Questo è il punto unico di ingresso per il professionista: inventario attuale, incertezze, conflitti storici, gap e sequenza di remediation. I contratti precedenti sono evidenze, non policy da sommare né testi da consegnare come definitivi agli utenti. Nessun campo, schema, runtime, consenso, testo legale o durata è modificato da questo audit. Nessun nuovo test con dati reali, account, download foto o purge.

## 1. Esito esecutivo e metodo

**GO alla revisione professionale con questo dossier; NO-GO all'apertura del pilot.** Le protezioni tecniche implementate non chiudono i gate giuridici, provider e operativi. Non emerge da questo audit una prova nuova di accesso abusivo; non è una certificazione né un nuovo penetration test.

Evidenze: lettura Source of Truth, codice/migration 001–054 (045 non applicata, 047 QoD effettiva), contratti/report per tutte le aree richieste; catalogo live read-only di 107 tabelle, 135 FK, 12 policy nei perimetri selezionati; controlli/configurazioni non personali. Campi esistenti non significano valori effettivamente popolati: le righe Auth, profili, messaggi e UGC non sono state lette. Piano cloud, accordi firmati, regione attuale, log provider e configurazioni console non verificati qui restano **UNKNOWN / EVIDENCE REQUIRED**. Non inferire la configurazione attuale da un riscontro dell'11ottobre.

Legenda stato: **A implementato**; **B configurato ma OFF** sul percorso realmente governato dal controllo; **C progettato/documentato**; **D rinviato/escluso**; **E sconosciuto/non dimostrato**. Una funzione può avere A per il codice e B per la raccolta. Legenda necessità: **P** essenziale al prodotto attuale; **S** essenziale safety/security/integrità; **O** utile operativamente; **OPT** opzionale; **R** candidato a riduzione/rimozione dopo decisione. Non sono basi giuridiche.

### Stato effettivo, senza confondere feature e flag

| Sistema | Stato attuale e limite |
|---|---|
| Auth/onboarding/AGE/consenso | A nello staging; Google/email e dichiarazione checkbox implementati. Testo richiesto dating-staging-v2 ancora placeholder. Setup SMTP pilot C; configurazione console Auth corrente E, non modificata |
| Profilo/foto | A: pipeline e autorizzazione v2. PHOTO admission OPEN; cleanup/scheduler PHOTO B. DONE produzione da report storico, non riesaminata live in questo audit |
| Membership | A: join/leave max3 server, max1 UI pilot, grace24 h iniziale, guard rejoin. `membership_enabled=false` è presente ma non è un gate in join_tribe: NON descrivere membership come OFF |
| ORA / Spotv2 | A; ora_enabled=true, spot_enabled=true. Max4 h ORA, no GPS, timestamp propri separati dai peer |
| DD | A motore/frontend; B discovery_enabled=false. Allocazione ordinaria disabilitata, finestre08–16/16–00 Rome, notte senza drop |
| SPOTTED social / romantic | A; comments_enabled=true, requests_enabled=true. Peer-anonimato, non anonimizzazione lato gestore |
| QoD | A implementazione; B system_posts_enabled=false. Editoriale manuale, niente AI; coda QA storica da riconciliare con review successive |
| Share | A RPC/frontend. `share_enabled=false` NON è il gate del resolver: usa spotted_ready/comments_enabled e autorizzazione contenuto. Resta un gap E2E email con contenuto attivo/reload, non un bug dimostrato |
| Match/chat | A: un solo sistema; esistenti restano dopo revoca dating, con controlli sicurezza/età |
| Notifications | A server/client; B generazione e delivery false. Trasporto OS reale D al device QA; routing intermittente non diagnosticato completamente nel report storico |
| Analytics | A; B enabled=false/test_only=true. Aggregati anonimi24 mesi C: tabella riservata, nessun writer automatico provato |
| Admin dashboard | A implementazione e collaudo sintetico con MFA; zero ruoli operativi attivi live. Disponibilità nella Preview attualmente aperta E: nessun deploy verificato in questo audit |
| Moderation | A server/UI/case review; provisioning persone, copertura, ricorsi e turni C/E |
| Observability | A; B enabled=false/test_only=true/purge_ready=false/email=false. Canary finale persistenza background BLOCKED nel report; trasporto email C, nessun provider attivato |
| Retention Phase A | A e scheduler ON: solo cron giornaliero03 UTC. Smoke manuale autenticato PASS; primo tick automatico non ancora osservato nel report di attivazione. Non copre tutta la retention prodotto |
| Retention legacy / PHOTO job | B: privacy legacy e due cron PHOTO inattivi; jobs_paused=true non spegne il distinto cron Phase A |
| Diritti | A subset automatico owner-only + percorso manuale C per categorie protette/non coperte. Completezza attuale da ampliare, non presumere dal GO RIGHTS storico |
| Cupido / future feature | D: non implementato, fuori pilot. Nessuna rubrica, KYC, biometria di riconoscimento o advertising SDK individuati nel perimetro codice esaminato |

## 2. Inventario dati e finalità

Le famiglie sotto coprono i dati applicativi; l'appendice A elenca tutti i campi e tipi del catalogo selezionato. Storage include bytes e metadati; Auth include dati gestiti dal provider che il modulo applicativo può non utilizzare. Destinatari trasversali: amministratori cloud con privilegi effettivi, provider/subprocessor e destinatari autorizzati. RLS non limita un amministratore DB/service-role compromesso.

Per tutte le righe, **D** significa cancellazione ordinaria account salvo evidenza safety esplicitamente separata e receipts tecniche necessarie; le copie provider/backup/device richiedono il percorso separato §7/§10. Export: **I** incluso automatico; **M** da procedura manuale/redazione; **X** secret/config non da consegnare in chiaro, non diniego generale di dati personali.

| ID / dati, tipi e fonte | Finalità / necessità | Accesso e conservazione | Delete / export / incertezza |
|---|---|---|---|
| DI01 Auth UUID,email,provider,identity JSON,date; signup/Google/email | Account, login P/S; claims aggiuntivi R | auth.users/identities; owner proiezione limitata, Auth/admin autorizzati. Vita account; TTL sessioni/log provider E | D via Auth delete. I account/email; M identità dettagliate. Phone colonna presente, nessun signup SMS dedotto; raw Google nome/avatar/claims duplicati da verificare con fixture futura |
| DI02 password hash,session/refresh/confirmation/recovery token,AAL,MFA,counter; Auth | Sicurezza S; solo meccanismi usati | auth.users/sessions/refresh_tokens/mfa_factors; nessuna lettura valori qui. PersistSession SDK nel browser. TTL provider E | D Auth e session cleanup da verificare provider; X token/password/MFAsecret, M attività sicurezza. Colonne ip/user_agent e audit ip_address esistono: divieto app Analytics non significa assenza IP provider |
| DI03 name text1–60,age int18–120,gender M/F,occupation text<=80; utente | Nome/foto P attuale; age/genere P regole attuali ma necessità/granularità da motivare; occupation OPT | profiles owner RLS; proiezione minima ai rapporti autorizzati. Vita profilo | D; I profile. Genere binario e valori preferenza sono assunzioni prodotto da far valutare, non sinonimo di orientamento |
| DI04 eligibility(status,declared_age nullable,method,statement_version,date,revision),age_events(opid,fingerprint,status,date) | Eligibility18+ S/P; no DOB, documento o verifica identità | Private, RPC propria/server gates; stato corrente e audit, purge storico DESIGN non attivo | D; I stato/storia minima, X fingerprint/nonce. Vecchia numeric attestation può mantenere età duplicata; checkbox corrente non inventa numero |
| DI05 preference M/F/ALL nullable; consent state/version/action/hash/date; challenge UUID10 min | Dating compatibilità P solo se consentito; prova consenso S | preference privata propria, server matching; nessuna preferenza/consenso peer. Vita stato, vecchi eventi/challenge §5 | Revoca cancella preference, non ALL; D; I preferenza/stato/storia, X challenge. Art9 e scope inferenze PROFESSIONAL VALIDATION REQUIRED |
| DI06 membership(user,venue,membership UUID,source),configuration anchor/revision,rejoin_not_before | Appartenenza/accesso P; anti-reset/cooldown S | Private; own API, stessa Tribe social autorizzato. Non directory completa. Anchor24 h non TTL; guard non prova visita | Leave elimina membership/invalida pending inviati in quella membership; D; I Tribe corrente, M configurazione/guard/source mancanti dall'export automatico. Nessun archivio join/leave distinto: alcuni riferimenti restano negli intent |
| DI07 checkins(user,Place,started/expires,presence UUID,manual/QR); venue catalog/address e QRcode | Presenza dichiarata P; attribuzione source O da giustificare | Una riga/account, max4 h, stesso Place non rinnova, cambio/exit rimuove. Own vede orari; peer solo presenza e profilo autorizzato, non timestamp. Nessun GPS API individuato | D; I checkin proprio ma source/presence_id non coperti dalla proiezione024. Scaduti esclusi UI ma purge legacy OFF; max24 h è DESIGN, non garanzia attiva |
| DI08 DD window/generation/lease,alloc(user,count,spots),exposure pair+membership/Tribe | Reciprocità, quota/no-refill P/S; rischio relazionale sensibile | Private; RPC my_daily_discovery proiezione propria; fairness/privacy controls. DD OFF, target fisico30 d Phase A | D/FK da appendice; exposure pair condivisa può essere rimossa con uno dei partecipanti, senza cancellare Match. M export DD non coperto; non consegnare grafo/coppie indiscriminatamente |
| DI09 DD account/day opportunities,exposures; pair_memory(last_exposed,purge_after) | Fairness/novelty P; non popolarità né dati demografici | Private,30 d target; aggregate per account restano pseudonimi. Coppie solo motore, non duplicate Analytics | D; M. Aggregati realmente anonimi non dimostrati da sola rimozione UUID |
| DI10 Spotv2 sender/recipient,origine/context,membership/presence/exposure,id,state,created/valid_until,Match; operations/quota | Interesse person-level/reciprocità/anti-replay P/S | Private; owner pending minimal, niente permesso profilo dal solo pending.30 d validità logica, quota Rome | D; I inviati v2/legacy in subset, M destinatari/incoming/operazioni/quote. Termine fisico terminali/receipts/quote non approvato: rischio ricostruzione Place via context_id |
| DI11 post/comment UUID,author UUID privato,body<=280,date,expiry,hidden/revision,removed_at | UGC P; author interno safety S | board_posts/comments. Membri eleggibili stessa Tribe vedono proiezione anonima; staff solo caso autorizzato.24 h ordinari, commenti seguono parent | D author, delete post/comment; I propri testi; M metadata tecnici. UGC libero può rivelare identità, salute, sessualità o terzi malgrado anonimato UI |
| DI12 likes/reactions(user,content,kind),technical quota/nonces/receipts | Interazioni P; anti-spam/anti-replay S | Private; soli aggregati/my state pubblici. TTL figli parent; ricevute/quota DESIGN/gap | D e cascade contenuto; I likes/reactions proprie. Nessuna quota SPOTTED3 post/dì; board_quota legacy non è raccolta nuova SPOTTED |
| DI13 QoD system text,Tribe,Rome day,parent; answer_claim(question,user,answer nullable) | Domanda manuale P; claim anti-refund S | Nessun autore sistema; risposte UGC normali. QoD OFF. Fine visibilità a chiusura/fine giorno | D risposte/claim; domanda editoriale senza account resta. I risposte/commenti propri; M claim. Purge fisico dedicato mancante: non retention indefinita autorizzata |
| DI14 romantic attempt(sender,operation,fingerprint,content,lease,state,purge_after),request(pair,context,date,status,Match),guard pair,quota | Proposta consensuale/neutralità/anti-inferenza P/S | Private; sender risposta neutra, recipient vede sender solo se deliverable. Pending7 d, guard30 d da decline/originalexpiry | D; M access/export richieste/attempt/guard/preferenza opt-in non coperti automaticamente. Opt-out invalida ricevute pending e revoca vista direzionale, non Match/chat |
| DI15 anonymous_blocks(blocker,hidden_author,date,opaque receipt); explicit blocks(pair,date) | Safety S | Tabelle distinte; anon block non rimuove contatti nominali. Nessuna identità autore all'utente | D; I blocchi propri/receipt anonima senza author; M altri dettagli. Linkability tramite gruppi piccoli/testo rimane rischio residuo |
| DI16 Match(pair,venue,date,first_message_at),messages(sender,match,body<=2000,date,client_nonce) | Comunicazione richiesta P/S | Solo partecipanti validi; servizio cloud tecnicamente elabora testo, non E2EE. Consenso revocato non elimina esistenti | D elimina Match/chat per cascade anche per partner; I Match e messaggi scritti, M ricevuti/conversazione redatta.90 d/12 mesi sono DESIGN, non policy approvata/attiva |
| DI17 Share(token opaco64hex,post,comment) | Routing P; nessun sender/click history nella mapping | Private, resolver membership+vita contenuto; link non dà accesso. Query nei log/history possibili; nessun TTL separato | Cascade parent/comment; I contenuto sottostante, M mapping non raccolta di chi condivide. Token non identitario in sé ma correlabile, non “dato anonimo” garantito |
| DI18 push binding(owner,endpoint,p256dh,auth_key,binding_key,active,expires/created),local device proof | Notifiche OPT; revoca/ownership S | Private, Edge/device proof; endpoint provider browser, max10/account,30 d. IndexedDB/local Storage per binding, nessun AuthJWT SW | Logout/revoca/delete invalidano/rimuovono; I automatico NON implementato, M inventario dispositivi non segreto, X chiavi. Browser permission non sostituisce consenso/basi da valutare |
| DI19 notification event(kind,canonical/target/owner,reference,date/expiry),delivery(binding,state,lease,retry,result) | Dedup/delivery S/O | Private; testo push generico cifrato, resolver rivede permesso; evento risolvibile24 h, trasporto5 min, prune7 d disponibile separato | D cascade; M export sicuro. Phase A non purga eventi outbox7 d: scheduling mancante prima delivery; unknown non ritentato alla cieca |
| DI20 Analytics event(owner,event/surface/channel/entry/source,dedupe,date),days,fairness | Misura pilot O, non servizio dating essenziale | OFF/test-only; enum chiusi, no body/Place/pair/IP.90 d target fisico Phase A. Active_day consultazione autenticata, no polling | D cascade; I analytics solo se sezione attivata frontend, M se raccolta poi spenta o dati non raggiungibili. Dedupe pseudonimo; base Analytics separata, non consenso dating |
| DI21 reserved anonymous_rollups(period,metric,value,reviewed/created),dashboard | Statistiche O | Nessun writer automatico;24 mesi solo vera anonimizzazione, valutazione assente. Dashboard ADMIN+AAL2,10 contributori,coarsening/soppressione | Nessuna promessa cancellazione contributi anonimi già irreversibili; attualmente non creati. M dati personali sottostanti. Dashboard non dimostra anonimato/DP |
| DI22 reports(profile/content,reporter,target,reason/details,state,assignee/claim/revision,date),suspensions | Safety S; details libero OPT/R da minimizzare | Private, staff RBAC+MFA/caso assegnato. Report non è copia permanente chat; corpo UGC consultabile on-demand | D ordinario salvo hold; I report propri subset e stato, M ricevuti/dettagli/terzi.180 d chiusi DESIGN, nessuna cancellazione automatica aperti |
| DI23 moderation actions/reviews(actor,target,reason,old/newstate,status,due/outcome,date),roles/events | Accountability safety S | Private, ruoli nominativi, AAL2; no general chat reader. Manuale30 d keep/release/escalate, no auto-release | FK delete può eliminare prima parte metadata; M accesso redatto, X strumenti/segreti. Note legacy libere R; durata massima da validare |
| DI24 safety_holds(case,category,target,actor,reason,date/review/release),evidence | Safety S solo hold esplicito | Separati; board_evidence può conservare testo UGC, safety_evidence profilo reason/status minimo. Non usati matching | Sopravvive D solo evidence esplicita, non intero profilo/chat/foto. M caso per caso;180 d released DESIGN, attivi richiedono review e durata massima giuridica E |
| DI25 ops_events(request UUID,operation/source/result/error class,duration,date),admission,incidents,jobs | Diagnosi O/S | OFF; nessun owner/device/URL/body/stack. Private ADMIN+MFA; correlation per richiesta non identità cross-session.14 d Phase A | Nessun legame user da cancellare per UUID; M se evento riferibile tramite altre fonti, X raw security materiale. Retention incidente corrente minimo protetto, log vecchi no |
| DI26 PHOTO input in RAM,canonical JPEG/detail/thumb,preview DB,manifest/hash/sourceformat/dimension/version | Foto P; validation/lifecycle S; source metadata O/S da motivare | Bucket privato, Edge processing, nessun originale nuovo persistente. Signer30s, reuse20s, objectcache60s. JPEG/PNG12MP,WebP6MP;8MiB/8192;PNG16bit/animated rifiutati | D lifecycle verificato prima successo; I metadata, M binary/varianti complete. Nessun face recognition; foto può comunque rivelare dati sensibili. Esposizione bytes già ricevuti non revocabile istantaneamente |
| DI27 PHOTO ledger/attempt/job/reservation/cleanup/cutover/audit/review/anomalies | Integrità/idempotenza/anti-replay S | Private; grace5 min vecchia, draft24 h,128MiB/max2draft. Receipts conclusi7 d, non record anonimi | Dopo D tombstone minimali senza bytes/contenuti; M pertinenti redatti, X lease/segreti. Unknown/review non purge per timeout; follow-up operativo obbligatorio, cleanup stage OFF |
| DI28 privacy_logs(category/code,date),retention_runs,PhaseA_runs | Diagnostica/audit purge O/S | Private; vecchi log7/30 d DESIGN; PhaseAruns14 d attivi. Opid,contatori,status,error enum,non utenti/contenuti | Receipts tecniche temporanee, M se riferibili. Non confondere tre sistemi di log/receipt o estendere90 d Analytics |
| DI29 support email,inbox/sent/trash,allegati manuali; founder/utenti | Supporto/privacy/ricorso S/O | Gmail workflow manuale, non backend SMTP. Accessi/MFA/retention mailbox E | Non cancellata dall'app; M richiesta manuale. Mai documenti identità via email per age attuale; evitare copie dati nel repo/ticket |
| DI30 browser state: session SDK,QR pending,install flag,Analytics hint,SW binding/seen,cache offline,history | Sessione/routing S/P; install O; telemetry hint O | local/session Storage/IndexedDB/RAM; SW cache solo offline.html, no API/protected navigation content. Browser/OS può trattenere pixel/history/notification | Logout invalida session/UI/binding; non equivale secure wipe disco, history o download. M dati device; X credenziali. E verifica device/browser e storage TTL del QR quando non usato |
| DI31 log provider/CDN/Auth/Edge/DB,cron/pg_net/Vault,backup/export operatori | Security/hosting/recovery S/O | Provider/config separati, possibili IP/UA/URL e richieste. Campi/TTL/region/admin E, backupDB≠Storage | M accesso/deletion provider; non coperti da purgeapp. No segreti nei report; retention log/queue cron non deducibile da14 d app |

### Challenge dei campi: nessuna cancellazione autorizzata

- **Da mantenere e motivare:** UUID/FK, server time validità, quote/nonce/fencing, autore interno safety, proof consenso e eligibility. La necessità tecnica non approva automaticamente la durata.
- **Da ridurre/giustificare prima del pilot:** professione/testo libero opzionale; età esatta esposta anziché fascia; genere binario/valori preferenza; source manual/QR; context_id Place conservato negli Spot oltre presenza; metadata input foto, claim Google duplicati, user-agent/IP Auth, note moderazione e riferimento caso liberi.
- **Legacy non equivale raccolta attiva:** last_checkin_at e sender_checkin restano colonne ma022 forza NULL; board_quota non usata dal nuovo spotted_create_post; interests è compatibilità legacy; photo_legacy/validated metadata dipendono lifecycle. Non chiamare “storico movimenti raccolto” una colonna null senza evidenza. Non rimuoverle qui.
- **Configurato/non usato:** share_enabled/membership_enabled non sono kill switch reali nei reader/writer citati; anonymous_rollups non ha writer; old moderators vs moderation_roles va inventariato come compatibilità, non accesso arbitrario presunto. Le colonne phone/SSO/WebAuthn di Auth non provano uso di quei flussi.
- **Rischio storico residuo:** intent con Place/context, membership snapshot, pair-memory e messaggi possono consentire inferenze anche senza un archivio last_visit. Occorrono finalità/retention/minimizzazione specifiche, non l'affermazione assoluta “nessuno storico ricostruibile”.

## 3. Candidate legal-basis matrix — nessuna base selezionata

Ogni riga richiede decisione del professionista e registro delle finalità. Art6 e condizioneArt9, quando applicabile, sono verifiche distinte. Dati relazionali/UGC possono rivelare categorie particolari anche senza un campo “orientamento”. Consenso esplicito dating implementato non autorizza automaticamente Analytics, marketing, safety, ogni inferenza o ogni copia provider. Riferimenti: [GDPR artt5–9,13–22,25,28,32–36,44ss](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/).

| Finalità | Candidato da valutare, non approvato | Domanda/condizione |
|---|---|---|
| Account/login/sessione/profilo minimo/comunicazione richiesta | Art6(1)(b); sicurezza distinta eventualmente6(1)(f) | Necessità di ogni campo, account soggetti esclusi, dati provider eccedenti |
| Compatibilità/DD/Spot/romantic/inferenze dating | BaseArt6 da scegliere + eventuale9(2)(a) | Scope esplicito, granularità, libertà/revoca e inferenze residue |
| Tribe/ORA/social/Share | 6(1)(b) candidato per funzione richiesta | Località e relazioni possono cambiare la valutazioneArt9; QR non è consenso universale |
| UGC e chat conservate dopo revoca dating | Base autonoma da validare | Perché restano, diritti terzi, dati particolari incidentalmente inseriti |
| Safety/report/ban/hold | 6(1)(f) o6(1)(c) solo se norma pertinente;Art9 separato | Non usare “safety” come eccezione generale; legalclaims9(2)(f) solo dove pertinente |
| Push opzionale | Consenso/servizio opzionale da qualificare | PermessoOS e marketing distinti; contenuto lockscreen/trasporto |
| Analytics/fairness/dashboard | 6(1)(a) oppure6(1)(f) previa valutazione, non scelto | Tracciamento terminale, dati sensibili/inferenze, alternativa e opt-out |
| Log/backup/anti-replay/prove consenso | Sicurezza/accountability da qualificare | Minimizzazione, accessi, durata ed effetti dopo delete |
| Richieste diritti/supporto | Base/obblighi da validare | Identificazione proporzionata, copie email e dati terzi |

Per local Storage/IndexedDB/sessione e Analytics non assumere esenzione solo perché first-party o senza advertising: sottoporre le operazioni terminali e la raccolta account-level alle [Linee guida Garante cookie e altri tracciamenti](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876). Nessun nuovo consenso Analytics è stato aggiunto; mantenere raccolta OFF fino alla decisione. Il catalogo eventi è più ampio dei soli conteggi aggregati e rimane pseudonimo.

## 4. Consent e age-assurance audit

### Consenso

PASS tecnico da sorgenti/test/evidenze: checkbox separata dalla dichiarazione18+, catalogo/versione/testo/hash, timestamp server, challenge10 min monouso/revision, retry idempotente, nuova versione richiede accettazione; revoca cancella preferenza, invalida challenge, nessun fallbackALL, nuovi flussi dating non usano preferenze senza consenso valido. Match/chat esistenti e appartenenza/social SPOTTED preservati secondo decisione founder. Nessun consenso/valore preferenza esposto ai peer.

Gap: testo attivo **placeholder**, non informativa completa; nessun record di presa visione versione Terms/Privacy individuato; non inventare che tale record sia sempre legalmente obbligatorio. Il gate iniziale richiede consenso prima di creare nuovo profilo, mentre un account esistente revocato può usare social: valutare libertà/scelta, informazione e percorso di rifiuto. Il testo breve “preferenze per profili compatibili/nuovi Spot e match” deve essere confrontato con inferenze DD, romantic, relazioni conservate, copie e destinatari. Non ampliare autonomamente lo scope della checkbox. Revoca non significa cancellazione di tutti i dati dating già generati, Analytics o conversazioni.

La documentazione di riferimento è [EDPB05/2020 sul consenso](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf): verifica professionale di libertà, informazione, specificità e modalità di revoca; nessuna equivalenza tra semplice presenza della checkbox e validità giuridica.

### Età

Stato server eligible/restricted/confirmation_required; checkbox adulta non genera un'età fittizia. Il profilo continua a raccogliere un numero18–120 per età mostrata/validazione; non DOB. Account precedenti non ottengono prova implicita dall'età già presente. Il vecchio attest_adult(17) restringe; il checkbox da solo è autodichiarazione, non verifica sostanziale. Trigger/server gates impediscono bypass della sola UI ma non una falsa dichiarazione del minore. Report underage/sospensione manuale disponibili, nienteKYC/documento/face-age-estimation. Valutare con professionista proporzionalità, rischio pilot universitario/non universitario, gestione sospetti e tempi operativi; non introdurre verifica documentale per deduzione. Sessioni non conformi sono bloccate dai gate server, mentre delete/rights restano separati.

## 5. Retention matrix: implementazione ≠ policy ≠ operatività

Le durate APPROVATE sono decisioni founder tecniche; la legal review resta separata. Nessun default DESIGN diventa approvato da questo audit. Cutoff eleggibilità e cancellazione effettiva al ciclo riuscito sono distinti: con un cron giornaliero il ritardo nominale può arrivare a circa24 h oltre il cutoff, più outage/backlog/hold. Non promettere un massimo fisico esatto di90/30/14 giorni finché questa distinzione e lo SLO non sono validati. Un read filter non elimina righe.

| Dati | Durata/regola | Executor e stato / gap |
|---|---|---|
| Auth/account/profilo/membership attuale | Vita finalità/account; nessun termine automatico inattività approvato | Delete esiste; inattività/profili abbandonati da decidere, no durata inventata |
| Sessioni/token/Authaudit/IP-UA | E provider/config | Non coperti Phase A; scadenza token non prova purge record/log |
| AGE/consent stato corrente | Vita account/finalità; storico superseded7 d DESIGN, ultimo preservato | Legacy executor OFF; challenge valido10 min, purge24 h dopo expiry DESIGN/OFF |
| Checkin ORA | Vita presenza max4 h; exit/cambio elimina; purge scaduti entro massimo24 h DESIGN | Legacy checkins executor OFF; nessun nuovo storico ma riga scaduta può restare |
| Tribe grace/rejoin guard | Grace24 h globale iniziale; cooldown prodotto, non retention | Cleanup guard superati opportunistico in join, non job globale; no nuovo timestampvisita |
| DD exposures/alloc/windows/pair/fairness | APPROVATA30 d, parent dopo figli; Spotref/hold/building protetti | Phase A ON staging; primo tick non osservato qui. Se referenza impedisce purge indefinitamente, serve risoluzione dipendenza senza perdere idempotenza |
| Spotv2 pending | Validità logica30 d | Nessun executor fisico terminali/operations/quote dedicato; policy mancante. Non applicare legacyinterests90 d a v2 |
| Legacy interests |90 d DESIGN non ricambiati | Executor OFF, non copre v2 |
| Match senza chat / chat inattiva |90 d /12 mesi DESIGN | Executor OFF, avviso chat non implementato; purge chat via Matchcascade, non selettivo. Report/hold proteggono |
| SPOTTED ordinari/commenti/likes/reactions/share | Visibile24 h, purge primo ciclo utile approvato salvo report/hold | Legacyexecutor board OFF; commenti/likes/share seguono parent. Quota/receipt7 d DESIGN, non tutte bounded |
| QoD question/answer/claim | Fine visibilità giorno Rome/chiusura; periodo fisico NON APPROVATO | Esplicitamente esclusi purgeordinario; richiede policy dedicata, non conservazione permanente |
| Romantic requests/guard/attempt/quota | Pending7 d; guard30 d da decline/originalexpiry; attempt purge_after7 d implementato ma separata approvazione fisica mancante | Nessun executor dedicato. Purge deve prima materializzare guard dalla scadenza originale, preservare neutralità e anti-replay |
| Notifiche binding / evento / trasporto | Binding30 d; riferimento24 h; TTLtrasporto5 min; outbox7 d da contratto | Phase A solo bindingstale e figli eleggibili; outbox7 d executor separato NON schedulato; delivery OFF |
| Analytics eventi/days/fairness | APPROVATA90 d fisici | Phase A ONstaging, raccolta OFF; nessun ampliamento ad altri dati |
| Anonymousrollups | APPROVATA24 mesi solo realmente anonimi | Nessun writer automatico, no purge rollup Phase A; prima del primo record provare anonimizzazione e scheduling coerente |
| OPS eventi/admission/job/runsPhaseA | APPROVATA14 d | Phase A ON; collector OFF. Incidente aperto alimentato conserva minimo stato corrente, non eventi storici; documentare eccezione |
| Vecchi privacylogs / retentionruns |7 d diagnostici,30dsecurity,7dreceipt DESIGN | Executorlegacy OFF, sistemi diversi daOPS14 d |
| Report conclusi / moderationaudit |180 d da chiusura DESIGN | Executor OFF, casi aperti/hold esclusi; cascades per account possono abbreviare, non garanzia di minimo180 d |
| Safetyhold/evidence/review | Review manuale30 d, nessun auto-release. Rilasciati180 d DESIGN; massimo hold attivo E | Necessaria review effettiva, escalation e limite professionale. No indefinite-by-default |
| Foto corrente / old / draft | Corrente vita profilo; oldgrace5 min; draft24 h, quota128MiB,max2draft | PHOTO frozen; admissionOPEN ma cleanup/scheduler OFF staging. DONEprod solo evidenza storica separata |
| PHOTO technicalreceipts concluse | APPROVATA7 d; unsettled/review non cancellabili per solaetà | Purge esiste; OFFstage rallenta erasefisico. Dopo delete non sono immagini né profilo, restano identificatori tecnici pseudonimi |
| Providerlogs/pg_net/cron/Vault/backup/email/device | E o proposta non approvata | Inventariare accesso/TTL/expiry/delete con provider. Non coperti workerapp |

## 6. Access/export/delete audit

### Access/export

`my_rights_page` owner-only,100 righe/pagina; collectRights10krecord/8MiB con errore esplicito se eccede; JSONvolatile, nessun archivioexportserver. Non snapshottransazionale; cambio owner/sessione interrompe. Restricted e consenso revocato non devono impedire il percorso. I messaggi ricevuti e dati terzi richiedono redazione/manuale, non un diniego giuridico automatico.

Copertura automatica attuale da024→026→034→042→050→052 e `src/user-rights.js`:

- I: accountbase,profile,age/history,consent/history,photometadata,checkinproprio,Tribe corrente,Spot inviati legacy/v2,Match,messaggi scritti,blocchi propri,report propri/stato moderazione; se moduli attivi: post/reactions/report/comment/like/anonblockreceipt; seAnalyticsfrontendattivo: eventi/days/fairness propri.
- M: Authidentity/consenti di provider nonbase, sessioni/audit nonsegreti, binary foto/varianti completi, membershipanchor/guard/source, DDalloc/exposure/fairness, romantic opt-in/inbox/attempt/guard/quota, notificationdevice/outbox, QoDclaims, tecnicireceipts, dati moderazione/safety, copie provider/mailbox/backup. Quote/nonce possono essere esclusi dalla UI per sicurezza ma dati personali pertinenti richiedono valutazione manuale.
- X: password/token/Authsecret/MFAsecret/VAPID/deviceproof/lease e credenziali, dettagli di altri utenti non autorizzati, identificatori dell'autore anonimo. Non copiare metadata security grezzi per “completezza”.

Gap concreto: il contrattoRIGHTS11ottobre diceva Analytics/push/Bacheca assenti; oggi non vale. Il wrapperSpotv2 è presente, quindi non segnalare erroneamente “export soloSpotlegacy”. Non ci sono wrapper DD/romantic/notification equivalenti. Le categorie UI dipendono da flag: spegnere raccolta Analytics o moduloboard può nascondere una categoria pur con dati conservati; mantenere percorso manuale e progettare accessibilità per dati già presenti senza riattivare raccolta. Binaryfoto metadati non equivalgono exportfilecompleto. Nessun nuovo testcloudaccount svolto da questo audit; i GO storici provano il perimetro dell'epoca.

### Delete e copie residue

Normale engine: Auth getUser dal bearer → owner derivato server → photo02_begin_account_deletion → barriera writer/lease → cleanupPhotoAccount → purge degli oggetti esatti con verifica metadataassenza → prepare_account_deletion/safetycapture → Auth delete e FKcascade → finish cleanup.409 su writer/lease non è deletecompleto; erroreintermedio richiede retry/recoverydurabile. PHOTO pause può restituire503: l'interfaccia non deve promettere cancellazione già avvenuta.

Dopo successo ordinario: Auth/profilo/foto/varianti, eligibility/consent, appartenenza/checkin, Spot/Match/chat, UGC/likes, binding/event/delivery e Analyticsaccount-level soggetti a FKcascades. La cancellazione di un partecipante può togliere conversazione anche all'altro: dichiararlo nel contratto utente. Safety esplicitamenteheld separata e receipts PHOTO necessarie sono eccezioni minimizzate, non permesso di conservare dati prodotto. Export prima del delete non recuperabile automaticamente dopo cancellazione.

Il catalogoFK è prova di struttura, non una nuova prova E2E di ogni tabella con tutte le combinazioni. Serve regression finale completa dopo futura integrazione/policy con record in ogni categoria nuova, delete restricted/revoked, hold/nonhold, failure/retry, zero originali/orfani, purge receipts oltre7 d e nessuna resurrezione dopo restore. Nessun account eliminato qui. Email supporto, backup immutabile, download, screenshot e cache HTTP/browser richiedono disclosure/processi separati; nessuna promessa di secureerase universale.

## 7. Anonimato, inferenze, profiling e automazione

**SPOTTED è anonimo verso i peer, attribuibile al gestore.** Author UUID interno e safetycase non sono anonimizzazione. Autore non esposto nei payload social/Share ordinari; staff risolve solo nel caso autorizzato. Likes solo aggregati, anonblock receipt non rivela autore; isolamento dal blocco profilo evita di far sparire relazioni nominali come oracolo d'identità. Romantic CTA uniforme, sender neutro anche se incompatibile/optout/Matchesistente, quota su tentativi validi: mantenere queste proprietà in ogni remediation.

Rischi residui: testo autoidentificante, stile, orari/crosspost/screenshot, comunità piccola, conoscenza esterna e ripetizioni; un linktoken può correlare lettori al contenuto in log esterni pur senza bypass accesso. Nessuna garanzia “impossibile ricostruire autore”. Moderation e UGC libero possono includere categorie sensibili/accuse; non trascriverle in diagnostica/GitHub. Una foto non è automaticamente biometria di identificazione; nessun motore biometrico trovato.

DD usa compatibilità→reciprocità→fairness→novelty→diversity→randomness; Spot/romantic applicano preferenze/relazioni; quote e block/sanction automatizzano accessi. Questa selezione richiede una valutazione di profilazione; non c'è AI/LLM, riconoscimento volto, marketingranking o popularityboosting nel codice esaminato. L'assenza di AI non esclude profilazione. Il professionista deve qualificare Art22 ed eventuale significatività/effetti, eDPIA/DPO/registro. Non affermare automaticamente che “nessun effetto legale” esenti tutto: i gate automatici età, consenso e sospensione incidono sull'accesso. Review umana di report/hold esiste; spiegazione delle scelte e contestazione da organizzare. Candidati normativi non sono conclusioni; vedi fonti §13.

## 8. UGC, moderazione e DSA readiness

Tecnico implementato: reportcontenuto/profilo, segnalazione+blocco interlocutore/conversazione; nessun singolomessage-report o lettorechat generico richiesto dal founder. StaffRBAC+MFA, claim/revision, consultazione minimaon-demand, hide/remove/warn/suspend/ban, auditstate e review30 d manuale. Sospensione nascondecontenuti, unsuspend non ripubblica. Ricorso manuale via canale approvato; nessun appealcenter inapp. Zero staff operativo attivo al riscontro.

**PROFESSIONAL VALIDATION REQUIRED:** classificazione hosting/onlineplatform e pubblico di Tribe, eventuali esenzioni micro/piccola impresa, notice-and-action per soggetti anche esterni, identificazione precisa contenuto/illiceità, conferma ricezione, motivazione/restrizioni, contatti/ricorso, trasparenza e gestione minacce/reati. La queue di report utente e il canale Gmail non dimostrano da soli copertura di questi processi. L'esclusione per piccole imprese non va estesa a ogni obbligo hosting. [DSA artt11–19,20 e seguenti](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng).

Da chiudere operativamente: nominativi/leastprivilege, MFArecovery, finestre/backupowner, triage urgenti, escalation, reviewhold effettiva, log decisioni e comunicazioni redatte, formazione senza dati personali nei toolsviluppo. Non dare automaticamente Supabase/GitHub/chatcomplete al sostituto. Conservazionehold/ricorsi ed eccezioni alla cancellazione richiedono durata e titolo approvati; nessun auto-release creato qui.

## 9. Provider, destinatari, copie e trasferimenti

Flussi effettivi: browser scarica asset statici Vercel; Auth email/Google passa da Supabase e dal provider di identità; dati prodotto browser→Supabase RPC/DB; foto browser→Edge→Storage privato→signedread; push futuro Edge→pushservicebrowser→OS, poi check/resolver Supabase; codice/evidenze sintetiche GitHub. Gmail gestisce richieste manuali. Nessun nuovo provider aggiunto da questo audit; nessun SDK advertising o provider Analytics esterno riscontrato. GoogleFonts selfhosted dal repository, GoogleOAuth distinto.

| Servizio | Dati/copiei e accesso | Regione/contratti/TTL da chiudere |
|---|---|---|
| Supabase DB/Auth/Edge/Storage/CDN | Database prodotto/sensibile, Auth, foto e metadati; Edgebuffer, log provider, backupDB separato. Admin/service-role non equivalgono RPCutente | Irlandaeu-west-1 era verificata11ottobre per produzione, NON regione attuale staging o ogni Edge/log/supporto. Piano attuale E; backupDBnoninclude bytes Storage. DPA/subprocessor/transfer e scope sensitive da confermare sul contratto effettivo |
| Vercel static hosting/CDN/build/Preview | Asset pubblici; metadata richiesteIP-UA-URL/protection/logdeploy potenziali. Non è progettato come DB/proxy UGC; flussoeffettivo completo va provato | Pro deciso prima pilot; upgrade/MFA/DataPreferencesoptout non verificati qui. Residency/log/support/subprocessor/DPA e durata deployments E |
| GoogleOAuth | Email/identity/claims e Authredirect, possibileGoogleaccountlogs | Solo clientSoma approvato progetto rare-array-510414-d9; nessun uso/modificaLuigi. Config/scope/accordo/claims realmente restituiti E senza nuova ispezioneGCP. Ruolo giuridico non presunto processor |
| Pushservices GoogleFCM/Mozilla/Apple | Endpoint/subscription/transportmetadata e payload cifrato opaco; deviceOSgenericcopy dopo check | Supportati dall'allowlist049; non prova di delivery attiva per tutti. Luoghi, TTLtrasporto/log, ruoli, accesso e accordi browser da verificare prima ON. Nessun nuovo servizio applicativo o SDKtracking |
| SMTPAuth default / futurocustom | Email destinatario/link Auth/deliverymetadata gestiti da Supabase | CustomSMTP non selezionato/configurato per il pilot secondo ultime evidenze. Non considerare default pronto o usare GmailSMTP senza autorizzazione. DNS/provider/DPA/log TTL/deliverability da chiudere |
| Gmailmanuale | Richieste diritti/safety/supporto, allegati/sent/trash, accessi umani | Consumer/Workspace/accordi/regioneMFArecovery/deleghe/retention E. Non processor/runtime backend automatico per il solo mailto |
| GitHub/Actions,build registries npm/Deno | Codice, artifact/logCI; repository pubblico da precedenteaudit; nessun dato reale deve esserci | Owner/MFA/branchprotection/token/artifact TTL e contratti E attuali; dependencyfetch non invia automaticamente dati prodotto. Secret scan di questo dossier non è audit completo history |
| Figma/Codex/toolsviluppo | Codice/design/evidenze sintetiche; rischio copie chat/screenshot se introdotti dati reali | Accordi/piano/training/retentionaccessi E. Non inviare real UGC, preferenze o credenziali. Nessun nuovo accesso account personale |
| Venue/università | QR/recruiting generale soltanto per decisione founder | Nessun accesso individuale/admin/lista/Match/chat/Tribeexport. Accordi reali e ruolo professionali; nome università non prova partnership |
| DNS/customdomain/monitoringextra | Nessun nuovo registrar/provider dedotto da vercel.app o schema | Inventario console/integrations/drains/webhook E; non assumere assenza universale dal solo repository |

**Blocco contrattuale da risolvere:** il [DPA pubblico Vercel, Schedule1§6](https://vercel.com/legal/dpa) vieta sensitive/special-category data nei CustomerData. Nessuna conclusione di violazione in questo audit: verificare contratto applicabile e definizione, routing di rete effettivo, query/referrer/log, supportattachments/build/preview copies. Hostingstatico non prova invio delle preferenze; dati sensibili su Vercel non vanno neppure presunti impossibili. Se il perimetro previsto non è compatibile, STOPpilot e valutazione professionale/provider prima di qualsiasi modifica tecnica.

Il [DPA Supabase corrente](https://supabase.com/legal/customer-resources/data-processing-addendum) contiene condizioni specifiche relative ai dati sensibili e istruzioni/regione; link pubblico non prova accettazione o adeguatezza perSoma. BackupDB e oggetti Storage sono separati anche nella [documentazione ufficiale](https://supabase.com/docs/guides/platform/backups). Nessun upgrade, accordo o residenza totaleSEE è dichiarato già ottenuto.

Checklist per ciascun destinatario: entità/servizi/piano→contratto/DPAversione e prova applicabilità→subprocessorpaesi/supporto→regioniDB/Edge/CDN/log/backup→meccanismo trasferimento/SCC/adequacy/TIA quando richiesto→accessi/MFA/revoca→TTL/log/cache/deletebackup→breachcommitments→evidenzafirmata/redatta. **Tutto PROFESSIONAL VALIDATION REQUIRED dove giuridico; MANUAL CHECK dove console/contratti non disponibili.** Nessuna conclusione che EUdatabase equivalga a nessun trasferimento.

## 10. Security/access e recovery

Punti supportati: tabelle privateRLS/revoke, propri profili owner-only; checkinown; Match/messages secondo can_use_match; bucketprofile-photos private=true, limite8388608 bytes e MIMEJPEG/PNG/WebP; StorageSELECT/INSERT diretti rifiutati da policyfalse; foto via graphsigner; nessun permesso da sola Tribe/pending Spot/UUID; nomatch/chatduplicati; nessun autore anonimo nelle normali proiezioni; RBAC/MFAcases; deleteowner derivato token; servicecredentials soloEdge; dati diagnostici conenum e correlazione perrequest. Sono prove di implementazione/test e struttura, non garanzia contro ogni combinazione di policy/endpoint.

Limiti: service-role/admin aggirano RLS e richiedono custodia/leastprivilege; un JWTdecode non è verifica firma (i percorsi service verificano autorizzazione server); vecchi signedURL/cache/pixel consegnati non ritirati istantaneamente; permessiCORS non sostituiscono auth; prove devicesharing/hardreload/offline/nativepush non complete; test locali non provano assenza leak nei logvendor. Non sono state lette o stampate credenziali, caselle email, dati personali o body UGC.

Backup/recovery: solo runbook/drilllocale dimostrati inINCIDENT01A, non restorecloudcompleto DB+Storage con RPO/RTOmisurati. Deletion/revoca/ban successivi a snapshot devono essere riapplicati prima di riaprire dopo restore; relativo registro minimo/expiry e isolamento cron/Vault/email restano design, non funzione già operativa. Non introdurre backuporiginalifoto né copiepermanenti. RPO24 h/RTO4 h sono candidati storici, non approvati/SLA. Perdita irreversibilepurge non ha rollbackSQLdati; pause ferma nuovebatch, non annulla delete già commesso.

## 11. Conflitti documentali e prevalenza

| Documento storico / affermazione | Lettura corretta attuale |
|---|---|
| Decision sheet06ottobre:18+numeric+statement da implementare |020/033: dichiarazionecheckboxserver, profiloetà resta numerico. NessunaDOB. Non riscrivere oggi la decisione né dichiarare ageverificationforte |
| AGE/CONSENTcontratto10ottobre:ORA90 min, Cupido/Bachecaassenti |032/SoT:ORA4 h; SPOTTED/QoD/Share implementati. Cupido restaassente. Nessuna deduzione “assenza tutti UGC” |
| RIGHTScontratto11ottobre esclude Analytics/push/Bacheca; Tribe senzaanchor | Nuovi wrapperboard/Spot/Analytics/anonblock esistono, altri DD/romantic/push/anchor richiedono mappingmanuale. GOstorico non coperturauniversale |
| Vecchi auditSEC/LOC/foto:photoURL/rawpaths o timestampcheckinpeer |036+signer e032 proiezioneminima aggiornano accessi. Storico issue risolta non nuova conferma degli stessi leak |
| PHOTO02stagingreport08ottobre:NO-GO/residui |DONEproduzione10ottobre e reviewclosure successivi superano quel gate storico. Stato stageoggiOPEN/cleanup OFF distinto, nessuna letturaprod qui |
| SoT§32/36:pairguard e optout ancoraTBD |§22 e043/founderfreeze già30 d e invalidazioneimmediata; NON riaprire decisioni. Validazionelegale separata resta |
| SoT/contratti:DDpurge nonattivo o scheduler tutti OFF |054 e job4PhaseAON solo staging dal23ottobre. Nessuna attivazione PHOTO/legacy. Primo tick resta da osservare |
| Analyticscontratto “non dashboard” /provider vecchio “nessun pushvendor” |051dashboard implementata;049prevede browserpushservices. Non equivale dashboardprivata operativa o pushdelivery ON |
| Observability053 incidenti14dperopened_at |054 conserva minimo incidente aperto recentementealimentato, non copia eventi;14 d diagnostic invariato. Collector/alert restano OFF |
| Share/QoD/Notificationsreport BLOCKED vs successivi task con PASSparziali | Separare backendtest PASS, providermechanics PASS, screenshot/fallback e deviceQA. Shareactiveemail/reload non provato inequivocabilmente; notificationtaprootcause unresolved. Nessun falso PASS globale o nuovo defectdedotto |
| Documenti precedenti “pilot piccolo/100 utenti/UE-SEE” | FounderdecisionItalia,italiano,2università/>200, no tettoinventato; SoT catalogopilot includeFitActive. Soglieops proposte per~1000 non nuova stima utenti approvata; carico operativo va confermato |
| Terms/Privacy/Cookie/Communitydefinitivi | Nessun corpus finale validato individuato nei fileversionati esaminati; esistono audit,runbook e placeholder. Eventuali testiesterni E, da acquisire al professionista, non inventati qui |

Questo dossier evidenzia i conflitti, non modifica le fonti storiche né il SoTprodotto. Per ogni futurolancio congelare matriceversioni/codice/config/date e correggere solo con taskdocumentale autorizzato le descrizioni pubbliche obsolete.

## 12. Gap unificati P0/P1/P2/P3

P0=blocker prima di utenti reali; non significa incidente attivo. P1=alto, gate per la funzione interessata; P2=medio, da chiudere/documentare nel releasecandidate; P3=basso/documentale. Se non si corregge, eventuale esclusione delperimetro richiede decisione founder/professionista, non spegnimento arbitrario qui.

| ID / severità | Gap / prova | Owner e condizione di chiusura |
|---|---|---|
| LP01 P0 | Basi/finalitàArt9,consenso placeholder,informative/Terms/Community nonfinali | Professionista+founder: decisioni scritte, testi approvati e piano tecnico; nessun uso utenti reali con placeholder |
| LP02 P0 | DPA/subprocessor/transfer e compatibilitàsensibili Vercel/Supabase/Google/push nonconclusi | Professionista+owner: accordi applicabili, dataroutingminimo provato, scopes e regioni/log/backup verificati |
| LP03 P0 | Retention prodotto incompleta:ORA/Spotv2/romantic/QoD/UGCchiusi/hold e copies | Founder+professionista: matriceapprovata per finalità; tecnico: executorsbounded/hold/cascade/retry+evidenza staging prima ON |
| LP04 P0 | Recoverycloud/DB+Storage/delete-afterrestore nonprovati; MFA/recovery/staffowner operativi noncompleti | Owner+tecnico: restoreisolato con sintetici, nessunaresurrezione, RPO/RTOapprovati, accessi/backupowner e prove revoca |
| LP05 P0 | RIGHTSattuale non copre nuovecategorie con processo end-to-end completo | Professionista+tecnico: automatizzato o manuale per ogniDI, redazione/identità/canale sicuro, prova delete con tutti i nuovi dati, niente dinieghi automatici generici |
| LP06 P0 | Notice/moderation/ricorsi/urgenti/holdreview nonoperativi; zero ruoli staffattivi | Professionista qualifica DSA; founder nomina staff e canali/turni; test ricezione/review/sanzioni/comunicazioni e audit |
| LP07 P0 | Adeguatezza18+,profilazione/DPIA/DPO e inferenzedating nonconcluse | Professionista: assessmentdocumentato, interventi strettamente necessari approvati prima coding; non più dati anagrafici perdefaut |
| LP08 P1 | Analytics non essenziale senza decisione base/terminaltracking; anonrollup senza prova | Restare OFF finché decisioni e retentionmonitorata; legalassessment+test optout ove scelto. Mai24 mesi per sempliceUUIDrimosso |
| LP09 P1 | OBS collectorbackgroundgate BLOCKED, emailhard OFF; nessun avvisoautomatico operativo | Taskdiagnosi esatto canary, poi emailtransport esplicitamente scelto/configurato e testdedup/recovery. Non “health=healthy” da zeroeventi |
| LP10 P1 | PhaseAON ma primotick03 UTC nonosservato, capacità/lag/pg_netcron TTL da presidiare | Verifica cronrun→HTTPbody→4receipt e backlog/lag; manualfollowup/pausa documentati. Nessun cambio schedule qui |
| LP11 P1 | Notifications device/subscriptiondelivery/tap e outbox7 d nonoperativi | DeviceQA reale, sottoprovider/permessi, jobdedicato e stato unknown gestito; delivery resta OFF |
| LP12 P1 | Shareactiveemail-content/reload e offline intermittente evidenza incompleta | Unico E2E controllato con fixtureattiva finofine; auth/member/nonmember/logout/cache; captureerrore prima patch se si riproduce |
| LP13 P1 | PHOTO cleanupstage OFF, vecchie receipts/review Storage non riclassificate qui | Usare lifecyclefrozen in taskseparato autorizzato, nessunpurge ad hoc. Non affermare globalzero-orphan dal conteggio42 |
| LP14 P1 | Provider manualactions aperte:Pro,MFA,recovery,optoutDataPreferences,customSMTP,mailbox | Owner: evidenzaredatta corrente, billing solo autorizzato, SMTP con normalAuthE2E e nessuntracciamentoemail nonapprovato |
| LP15 P2 | Campo/claim minimization e scarso inventario TTLdevice/authlogs | Tecnico/professionista classificano i candidatiR DI01/03/06/07/10/23/26/30/31; fixturefuture, nonleggere realecontenuto |
| LP16 P2 | Reservedflags non kill switch, documenti e deploymentstati discordanti | Mappaflag→enforcement→bundle prima release; non dichiarare incidentisicurezza dal soloflag OFF. Cambiare gate solo taskscopeapprovato |
| LP17 P2 | UI/exportlimiti, binaryfoto, errori429generici e stato pendingdelete | Procedure comprensibili, nessun falsoexportcompleto/deletesuccesso; UXsoltanto doporescopeapprovato |
| LP18 P3 | Documentazione storica e riferimentitemporali contraddittori | Linkquestodossier, evidence/versionindex, revisionecontrollata senza cancellare decisionistoriche |

## 13. Domande precise per il professionista

1. Chi è il titolare operativo prima della società? Confermare Federico/recapito e registri, accordivenueQRsenzaaccessoindividuale; quali ruoli effettivi e responsabilità?
2. Per ogniDI: quale baseArt6 e, dove necessario, quale condizioneArt9? Il consenso attuale copre preferenze, inferenze della selezione, romantic e mantenimento relazioni preesistenti? Quali finalità richiedono separazione?
3. La necessità di consenso all'ingresso del nuovoprofilo, pur preservando socialdoporevoca, è compatibile con la scelta libera prevista? Quale rifiutoconsapevole e quali funzionalità devono restare accessibili?
4. Checkbox18+ + etàprofilo + reportunderage/sospensione sono proporzionati per questo pilot? Serve assuranceulteriore senzaKYC/documenti? Quale prova minima per accountesistenti e sospetti?
5. DD e filtri relazionali costituiscono profilazione? Ricorre Art22 per alcun gate? È necessariaDPIA, DPO o consultazione? Quale spiegazione/review per utenti?
6. Approvare separatamente retention diORA, intent/receipts/quoteSpotv2, romanticrequest/attempt/guard, QoDsystem/answer/claim, UGCordinario/report e hold. Quanto lag è ammissibile tra cutoff e batchgiornaliero? Quali referenze protette impediscono30 d e come risolverle?
7. Quale titolo/duratamassima per hold attivi/rilasciati? Quale motivazione al richiedente e separazione evidence/ordinarydata? Revisione30 d non è duratafinale.
8. Quali categorie vanno nell'exportautomatico e quali in manualeredatto? Come trattare messaggiricevuti, richiesteromantic, anonymousblocks, notificationdevice, DD e log provider senza esporreterzi o segreti?
9. Per Analytics first-party account-level e terminalstorage serve consenso separato/optout? Quale test di anonimizzazione consente24 mesi? Soglia10dashboard e coarsening sono sufficienti per i rilasci previsti?
10. Qualificazione DSA e obblighiapplicabili: noticeancheesterno, contatti, motivazionirestrizioni, ricorsimanuali e trasparenza? Quali esenzioni sono effettivamente applicabili, con quale evidenza?
11. Vercel CustomerData/sensibili: il nostro flussostatico/URL/log è compatibile col contratto concretamente applicabile? Quali dati vietare tecnicamente/in supporto? Supabase e pushprovider accettano l'uso/documentazione previsti?
12. Quali regioni/trasferimenti/contratti e impegni breach perDB/Auth/Edge/Storage/CDN/log/backup/OAuth/browserpush/Gmail? Quali prove delpiano/accordo e accessiremoti?
13. Come comunicare delete con retry/receipt7 d/cache/download/backup e cancellazionemessaggi condivisi? Come riapplicare revoche/delete/ban dopo restore senza creare archivioeccedente?
14. Quali documenti e copyfinali, presa visione/consensi versionati e procedure diritti/incidenti devono precedere pilot? Eventuali informative sintetiche location/anonimato/share/push e Termscommunity separati?

Riferimenti ufficiali consultati23ottobre2026: [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/), [DSA](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng), [EDPBconsenso](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf), [Garantecookie](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876), [SupabaseDPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [VercelDPA](https://vercel.com/legal/dpa), [Supabasebackup](https://supabase.com/docs/guides/platform/backups). Non sono pareri individuali suSoma. La pagina EDPBageassurance cercata non era accessibile allo strumento: nessuna sua conclusione è usata come evidenza.

## 14. Remediation sequence proposta — NON implementata

1. **Freeze/evidence:** approvare questo inventario e snapshot; acquisire contratti/configmanuali, staff/owner, scope pilotItalia. Non cambiare basi/durate nei defaulttecnici.
2. **Legal/product decisions:** risposteQ01–14 con professionista; registro finalità/basi/Art9/DPIA/DSA/hold; approvare durate mancanti e criteri minimizzazione. PrimaLP01/02/07, poiLP03/05/06/08.
3. **Task tecnici indipendenti autorizzati:** RIGHTScoverageextension; retentionSpotv2/romantic/QoD/UGC con parentholds/anti-replay; providerlog/device/Authminimization; recoverydeletionregistry; niente refactor generale o nuovefeature. Annunciare schema/RPC impatto prima delle migration.
4. **Ops/manual:** Pro/MFA/recovery/SMTP/provideraccordi; staffdedicati e canali; restore cloudsinteticoDB+Storage; osservabilitàcollector+trasportoalert; verifica primo cronPhaseA; NotificationsdeviceQA o esplicitaesclusionepilot. PHOTOsemantics non riaperte.
5. **Copy finali:** solo dopo le decisioni, Privacy/Terms/Community/disclosureterminaltracking e location/Share/push, versioneconsensovalidata e pianoaccountesistenti. Non generati da questoaudit.
6. **Staging regression:** authenticatedrestricted/revokedrights; tuttecategorieexport; deleteconhold/nohold e failure/retry; prove purgefisico/boundary/cascade; assenza di leak autore/coppie; clientvecchi/reload/logout/cache; browser/deviceQA; nofixture e jobsoloautorizzati.
7. **Preflightrelease separato:** codice/migrations/env/flags/prod-diff/rolloutorder/rollback, approvazione legale e readiness operativa, nessun rollout implicito. Gateprodautorizzato distinto, scheduler per ultimi. Il pilot apre solo conP0chiusi eP1risolti o perimetroescluso esplicitamente approvato.

Documenti necessari al legale: questo dossier/evidence, bozze da validare diPrivacy/Terms/Community, data flow/registrotrattamenti, matriceconsensi, retention+safetyhold, manualdiritti, notice/moderation/ricorsi, providerDPA/transfers, incident/breachresponse, backuprestore e pianoageassurance. Non serve AIcopy per Cupido inesistente; rivalutare se featurefutureentrano.


## Appendice A — inventario fisico dei campi e tipi

Catalogo read-only osservato 2026-10-23T20:25:20.488131+00:00. Include tutte le 107 tabelle nei namespace public/spot_private e le sei tabelle Auth/due Storage selezionate; NON è un inventario esaustivo dei database interni dei provider. Le altre copie sono DI31/MANUAL CHECK. Valori, token e dati utente non letti. SELECT indica il grant SQL del ruolo, non il superamento della RLS né accesso dal namespace API. Colonne secret/token riportate solo come NOMI, mai esportabili come credenziali. Per fonte/finalità/accesso applicativo/retention/delete/export usare le famiglie DI01–31; i controlli senza dati personali sono configurazioni operative, non categorie di utenti aggiuntive.

### `auth.audit_log_entries`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `instance_id` (uuid nullable), `id` (uuid NOT NULL), `payload` (json nullable), `created_at` (timestamp with time zone nullable), `ip_address` (character varying(64) NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `auth.identities`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `provider_id` (text NOT NULL), `user_id` (uuid NOT NULL), `identity_data` (jsonb NOT NULL), `provider` (text NOT NULL), `last_sign_in_at` (timestamp with time zone nullable), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `email` (text nullable), `id` (uuid NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `auth.mfa_factors`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `friendly_name` (text nullable), `factor_type` (auth.factor_type NOT NULL), `status` (auth.factor_status NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `secret` (text nullable), `phone` (text nullable), `last_challenged_at` (timestamp with time zone nullable), `web_authn_credential` (jsonb nullable), `web_authn_aaguid` (uuid nullable), `last_webauthn_challenge_data` (jsonb nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `auth.refresh_tokens`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `instance_id` (uuid nullable), `id` (bigint NOT NULL), `token` (character varying(255) nullable), `user_id` (character varying(255) nullable), `revoked` (boolean nullable), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `parent` (character varying(255) nullable), `session_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `auth.sessions`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `factor_id` (uuid nullable), `aal` (auth.aal_level nullable), `not_after` (timestamp with time zone nullable), `refreshed_at` (timestamp without time zone nullable), `user_agent` (text nullable), `ip` (inet nullable), `tag` (text nullable), `oauth_client_id` (uuid nullable), `refresh_token_hmac_key` (text nullable), `refresh_token_counter` (bigint nullable), `scopes` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `auth.users`

Famiglia inventario: **DI01–02** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `instance_id` (uuid nullable), `id` (uuid NOT NULL), `aud` (character varying(255) nullable), `role` (character varying(255) nullable), `email` (character varying(255) nullable), `encrypted_password` (character varying(255) nullable), `email_confirmed_at` (timestamp with time zone nullable), `invited_at` (timestamp with time zone nullable), `confirmation_token` (character varying(255) nullable), `confirmation_sent_at` (timestamp with time zone nullable), `recovery_token` (character varying(255) nullable), `recovery_sent_at` (timestamp with time zone nullable), `email_change_token_new` (character varying(255) nullable), `email_change` (character varying(255) nullable), `email_change_sent_at` (timestamp with time zone nullable), `last_sign_in_at` (timestamp with time zone nullable), `raw_app_meta_data` (jsonb nullable), `raw_user_meta_data` (jsonb nullable), `is_super_admin` (boolean nullable), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `phone` (text nullable), `phone_confirmed_at` (timestamp with time zone nullable), `phone_change` (text nullable), `phone_change_token` (character varying(255) nullable), `phone_change_sent_at` (timestamp with time zone nullable), `confirmed_at` (timestamp with time zone nullable), `email_change_token_current` (character varying(255) nullable), `email_change_confirm_status` (smallint nullable), `banned_until` (timestamp with time zone nullable), `reauthentication_token` (character varying(255) nullable), `reauthentication_sent_at` (timestamp with time zone nullable), `is_sso_user` (boolean NOT NULL), `deleted_at` (timestamp with time zone nullable), `is_anonymous` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `public.blocks`

Famiglia inventario: **DI15** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `blocker_id` (uuid NOT NULL), `blocked_id` (uuid NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: True.

### `public.checkins`

Famiglia inventario: **DI07** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `checked_in_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `presence_id` (uuid nullable), `presence_source` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: True.

### `public.matches`

Famiglia inventario: **DI16** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `user_a` (uuid NOT NULL), `user_b` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `created_at` (timestamp with time zone NOT NULL), `first_message_at` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: True.

### `public.messages`

Famiglia inventario: **DI16** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `match_id` (uuid NOT NULL), `sender_id` (uuid NOT NULL), `body` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `client_nonce` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: True.

### `public.profiles`

Famiglia inventario: **DI03** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `name` (text NOT NULL), `age` (integer NOT NULL), `gender` (text NOT NULL), `preference` (text nullable), `photo_path` (text NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `occupation` (text NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: True.

### `public.venues`

Famiglia inventario: **DI07** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `name` (text NOT NULL), `address` (text NOT NULL), `active` (boolean NOT NULL), `ora_enabled` (boolean nullable), `linked_tribe_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: True.

### `spot_private.account_deletions`

Famiglia inventario: **DI27 / delete** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `started_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.account_eligibility`

Famiglia inventario: **DI04** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `status` (text NOT NULL), `declared_age` (integer nullable), `statement_version` (text NOT NULL), `method` (text NOT NULL), `attested_at` (timestamp with time zone nullable), `revision` (bigint NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.account_onboarding`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `completed_at` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.age_events`

Famiglia inventario: **DI04** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `operation_id` (uuid NOT NULL), `request_fingerprint` (text NOT NULL), `status` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_admission`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_anonymous_rollups`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `period` (date NOT NULL), `metric` (text NOT NULL), `value` (bigint NOT NULL), `reviewed_at` (timestamp with time zone NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_control`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `enabled` (boolean NOT NULL), `test_only` (boolean NOT NULL), `dropped` (bigint NOT NULL), `installed_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_days`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `day` (date NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_events`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `event` (text NOT NULL), `surface` (text NOT NULL), `channel` (text NOT NULL), `entry` (text NOT NULL), `source` (text NOT NULL), `dedupe` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.analytics_fairness`

Famiglia inventario: **DI20–21** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `day` (date NOT NULL), `slot` (text NOT NULL), `opportunities` (integer NOT NULL), `assignments` (integer NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.anonymous_blocks`

Famiglia inventario: **DI15** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `blocker_id` (uuid NOT NULL), `author_id` (uuid NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_audit`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `actor_id` (uuid nullable), `report_id` (uuid nullable), `action` (text NOT NULL), `operation_id` (uuid nullable), `fingerprint` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `content_kind` (text nullable), `comment_id` (uuid nullable), `romantic_request_id` (uuid nullable), `target_type` (text nullable), `target_internal_id` (uuid nullable), `reason_code` (text nullable), `previous_state` (jsonb nullable), `new_state` (jsonb nullable), `current_status` (text nullable), `review_due_at` (timestamp with time zone nullable), `review_outcome` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_comment_quota`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `bucket_start` (timestamp with time zone NOT NULL), `used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_comments`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `post_id` (uuid NOT NULL), `author_id` (uuid NOT NULL), `body` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `hidden` (boolean NOT NULL), `removed_at` (timestamp with time zone nullable), `revision` (bigint NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_evidence`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `hold_id` (uuid NOT NULL), `body` (text NOT NULL), `reason` (text NOT NULL), `archived_at` (timestamp with time zone NOT NULL), `content_kind` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_likes`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `post_id` (uuid nullable), `comment_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_posts`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `author_id` (uuid nullable), `body` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `hidden` (boolean NOT NULL), `revision` (bigint NOT NULL), `post_kind` (text nullable), `editorial_key` (text nullable), `question_day` (date nullable), `parent_qod_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_preferences`

Famiglia inventario: **DI14** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `receive_romantic_requests` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_quota`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `day` (date NOT NULL), `used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_reactions`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `post_id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `kind` (text NOT NULL), `comment_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_receipts`

Famiglia inventario: **DI11–12** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `operation_id` (uuid NOT NULL), `action` (text NOT NULL), `fingerprint` (text NOT NULL), `result_id` (uuid nullable), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_reports`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `post_id` (uuid nullable), `reporter_id` (uuid nullable), `reason` (text NOT NULL), `state` (text NOT NULL), `revision` (bigint NOT NULL), `assigned_to` (uuid nullable), `claim_until` (timestamp with time zone nullable), `created_at` (timestamp with time zone NOT NULL), `closed_at` (timestamp with time zone nullable), `comment_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_request_attempts`

Famiglia inventario: **DI14** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `sender_id` (uuid NOT NULL), `operation_id` (uuid NOT NULL), `fingerprint` (text NOT NULL), `origin_post_id` (uuid nullable), `origin_comment_id` (uuid nullable), `created_at` (timestamp with time zone NOT NULL), `state` (text NOT NULL), `claim_token` (uuid nullable), `lease_until` (timestamp with time zone nullable), `attempts` (integer NOT NULL), `purge_after` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_request_pair_guards`

Famiglia inventario: **DI14** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_a` (uuid NOT NULL), `user_b` (uuid NOT NULL), `retry_not_before` (timestamp with time zone NOT NULL), `purge_after` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_request_quota`

Famiglia inventario: **DI14** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `day` (date NOT NULL), `used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.board_romantic_requests`

Famiglia inventario: **DI14** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `attempt_id` (uuid nullable), `sender_id` (uuid NOT NULL), `recipient_id` (uuid NOT NULL), `venue_id` (uuid nullable), `origin_kind` (text NOT NULL), `origin_post_id` (uuid nullable), `origin_comment_id` (uuid nullable), `created_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `status` (text NOT NULL), `resolved_at` (timestamp with time zone nullable), `purge_after` (timestamp with time zone NOT NULL), `declined_at` (timestamp with time zone nullable), `match_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.consent_challenges`

Famiglia inventario: **DI05** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `token` (uuid NOT NULL), `user_id` (uuid nullable), `version` (text nullable), `revision` (bigint NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `used` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.consent_events`

Famiglia inventario: **DI05** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `operation_id` (uuid NOT NULL), `action` (text NOT NULL), `version` (text nullable), `text_hash` (text nullable), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.consent_state`

Famiglia inventario: **DI05** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `status` (text NOT NULL), `version` (text nullable), `revision` (bigint NOT NULL), `changed_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.consent_versions`

Famiglia inventario: **DI05** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `version` (text NOT NULL), `purpose` (text NOT NULL), `text_content` (text NOT NULL), `text_hash` (text NOT NULL), `status` (text NOT NULL), `required` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.dd_admission_accounts`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `admitted` (boolean NOT NULL), `reason` (text NOT NULL), `changed_at` (timestamp with time zone NOT NULL), `changed_by` (text NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_allocations`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `window_id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `exposure_count` (integer NOT NULL), `spots_used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_exposures`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `window_id` (uuid NOT NULL), `user_a` (uuid NOT NULL), `user_b` (uuid NOT NULL), `tribe_id` (uuid NOT NULL), `membership_a` (uuid NOT NULL), `membership_b` (uuid NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_fairness_buckets`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `bucket_date` (date NOT NULL), `opportunities` (integer NOT NULL), `exposures` (integer NOT NULL), `purge_after` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_pair_memory`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_a` (uuid NOT NULL), `user_b` (uuid NOT NULL), `last_exposed_at` (timestamp with time zone NOT NULL), `purge_after` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_policy`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `version` (bigint NOT NULL), `enabled` (boolean NOT NULL), `paused` (boolean NOT NULL), `timezone` (text NOT NULL), `morning_start` (time without time zone nullable), `afternoon_start` (time without time zone nullable), `nightly_end` (time without time zone nullable), `recurrence_floor` (interval NOT NULL), `recurrence_target` (interval NOT NULL), `exposure_retention` (interval nullable), `fairness_retention` (interval nullable), `pair_memory_retention` (interval nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.discovery_windows`

Famiglia inventario: **DI08–09** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `local_date` (date NOT NULL), `slot` (text NOT NULL), `policy_version` (bigint NOT NULL), `starts_at` (timestamp with time zone NOT NULL), `ends_at` (timestamp with time zone NOT NULL), `state` (text NOT NULL), `generation_id` (uuid nullable), `lease_until` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.interests`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `sender_id` (uuid NOT NULL), `recipient_id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `sender_checkin` (timestamp with time zone nullable), `created_at` (timestamp with time zone NOT NULL), `interest_id` (uuid nullable), `origin_kind` (text nullable), `origin_membership_id` (uuid nullable), `origin_presence_id` (uuid nullable), `origin_window_id` (uuid nullable), `logical_status` (text nullable), `invalidated_at` (timestamp with time zone nullable), `invalidation_reason` (text nullable), `operation_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.moderation_audit`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `actor_id` (uuid NOT NULL), `report_id` (uuid nullable), `action` (text NOT NULL), `note` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `operation_id` (uuid nullable), `target_id` (uuid nullable), `reason_code` (text nullable), `previous_state` (jsonb nullable), `new_state` (jsonb nullable), `request` (jsonb nullable), `target_type` (text nullable), `current_status` (text nullable), `review_due_at` (timestamp with time zone nullable), `review_outcome` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.moderation_reviews`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation_id` (uuid NOT NULL), `hold_id` (uuid nullable), `board_action_id` (uuid nullable), `profile_action_id` (uuid nullable), `actor_id` (uuid nullable), `outcome` (text NOT NULL), `reason_code` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.moderation_role_events`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation_id` (uuid NOT NULL), `actor_id` (uuid nullable), `target_id` (uuid nullable), `previous_role` (text nullable), `new_role` (text nullable), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.moderation_roles`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `role` (text NOT NULL), `active` (boolean NOT NULL), `granted_by` (uuid nullable), `changed_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.moderators`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.notification_control`

Famiglia inventario: **DI18–19** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `enabled` (boolean NOT NULL), `delivery_enabled` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.notification_deliveries`

Famiglia inventario: **DI18–19** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `event_id` (uuid NOT NULL), `binding_id` (uuid NOT NULL), `state` (text NOT NULL), `lease` (uuid nullable), `attempts` (integer NOT NULL), `next_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `result` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.notification_events`

Famiglia inventario: **DI18–19** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `kind` (text NOT NULL), `canonical_id` (uuid NOT NULL), `owner_id` (uuid NOT NULL), `target_id` (uuid NOT NULL), `reference` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_admission`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `request_id` (uuid NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_control`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `enabled` (boolean NOT NULL), `test_only` (boolean NOT NULL), `email_enabled` (boolean NOT NULL), `retention` (interval NOT NULL), `dropped` (bigint NOT NULL), `purge_ready` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_events`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (bigint NOT NULL), `request_id` (uuid NOT NULL), `operation` (text NOT NULL), `source` (text NOT NULL), `result` (text NOT NULL), `error_class` (text nullable), `duration_ms` (integer NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_incidents`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `operation` (text NOT NULL), `source` (text NOT NULL), `rule` (text NOT NULL), `state` (text NOT NULL), `opened_at` (timestamp with time zone NOT NULL), `last_failure_at` (timestamp with time zone NOT NULL), `last_success_at` (timestamp with time zone nullable), `occurrences` (integer NOT NULL), `resolved_at` (timestamp with time zone nullable), `email_state` (text NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_job_policy`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation` (text NOT NULL), `expected_interval` (interval nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ops_jobs`

Famiglia inventario: **DI25** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation` (text NOT NULL), `last_success_at` (timestamp with time zone nullable), `last_failure_at` (timestamp with time zone nullable), `failure_class` (text nullable), `last_duration_ms` (integer nullable), `consecutive_failures` (integer NOT NULL), `updated_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ora_spot_daily_quota`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `local_date` (date NOT NULL), `used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ora_spot_place_quota`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `place_id` (uuid NOT NULL), `local_date` (date NOT NULL), `used` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.ora_spot_policy`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `enabled` (boolean NOT NULL), `timezone` (text NOT NULL), `daily_limit` (integer NOT NULL), `place_daily_limit` (integer NOT NULL), `quota_retention` (interval nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_assets`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `photo_path` (text NOT NULL), `user_id` (uuid NOT NULL), `preview` (text NOT NULL), `thumbnail_path` (text nullable), `updated_at` (timestamp with time zone NOT NULL), `detail_path` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_cleanup_accounts`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `state` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `completed_at` (timestamp with time zone nullable), `error_code` (text nullable), `claim_token` (uuid nullable), `claim_until` (timestamp with time zone nullable), `retries` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_cutover_attempts`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `path` (text NOT NULL), `user_id` (uuid NOT NULL), `lease` (uuid nullable), `protocol` (text NOT NULL), `writer` (text NOT NULL), `manifest` (jsonb nullable), `evidence` (text nullable), `created_at` (timestamp with time zone NOT NULL), `completed_at` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_cutover_audit`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `action` (text NOT NULL), `owner_id` (uuid nullable), `path` (text nullable), `previous_path` (text nullable), `operator_id` (text nullable), `evidence_ref` (text nullable), `epoch` (bigint NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_cutover_control`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `phase` (text NOT NULL), `epoch` (bigint NOT NULL), `canary_users` (uuid[] NOT NULL), `execute_enabled` (boolean NOT NULL), `scheduler_enabled` (boolean NOT NULL), `cleanup_all` (boolean NOT NULL), `smoke_epoch` (bigint nullable), `release_sha` (text nullable), `changed_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_cutover_deletions`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `completed` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_legacy`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `photo_path` (text NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_lifecycle_anomalies`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `path` (text NOT NULL), `code` (text NOT NULL), `first_seen` (timestamp with time zone NOT NULL), `resolved_at` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_lifecycle_sets`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `photo_path` (text NOT NULL), `user_id` (uuid NOT NULL), `request_id` (uuid nullable), `lease_token` (uuid nullable), `state` (text NOT NULL), `writer` (text NOT NULL), `reserved_bytes` (bigint NOT NULL), `created_at` (timestamp with time zone NOT NULL), `not_before` (timestamp with time zone nullable), `completed_at` (timestamp with time zone nullable), `claim_token` (uuid nullable), `claim_until` (timestamp with time zone nullable), `retries` (integer NOT NULL), `error_code` (text nullable), `evidence` (text nullable), `manifest` (jsonb nullable), `last_attempt_at` (timestamp with time zone nullable), `review_reason` (text nullable), `review_since` (timestamp with time zone nullable), `review_operator` (text nullable), `review_evidence` (text nullable), `review_quota_exempt` (boolean NOT NULL), `reconcile_attempts` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_review_audit`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation_id` (uuid NOT NULL), `path` (text NOT NULL), `lease` (uuid nullable), `action` (text NOT NULL), `payload` (jsonb NOT NULL), `actor` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_upload_accounts`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `starts` (timestamp with time zone[] NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.photo_upload_jobs`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `request_id` (uuid NOT NULL), `input_sha` (text NOT NULL), `photo_path` (text NOT NULL), `lease_token` (uuid NOT NULL), `lease_until` (timestamp with time zone NOT NULL), `status` (text NOT NULL), `attempts` (integer NOT NULL), `legacy_path` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.privacy_environment`

Famiglia inventario: **DI05** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `environment` (text NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.privacy_logs`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `category` (text NOT NULL), `code` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.push_bindings`

Famiglia inventario: **DI18–19** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `owner_id` (uuid NOT NULL), `endpoint` (text NOT NULL), `p256dh` (text NOT NULL), `auth_key` (text NOT NULL), `binding_key` (text NOT NULL), `active` (boolean NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.qod_answer_claims`

Famiglia inventario: **DI13** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `question_id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `answer_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.reports`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `reporter_id` (uuid NOT NULL), `target_id` (uuid NOT NULL), `reason` (text NOT NULL), `details` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `status` (text NOT NULL), `reviewed_at` (timestamp with time zone nullable), `client_nonce` (uuid nullable), `closed_at` (timestamp with time zone nullable), `queue_state` (text NOT NULL), `revision` (bigint NOT NULL), `assigned_to` (uuid nullable), `claim_until` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.retention_control`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `paused` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.retention_phase_a_control`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `manual_enabled` (boolean NOT NULL), `scheduler_enabled` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.retention_phase_a_runs`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation_id` (uuid NOT NULL), `path` (text NOT NULL), `dry_run` (boolean NOT NULL), `batch_limit` (integer NOT NULL), `started_at` (timestamp with time zone NOT NULL), `finished_at` (timestamp with time zone NOT NULL), `status` (text NOT NULL), `eligible` (integer NOT NULL), `deleted` (integer NOT NULL), `protected` (integer NOT NULL), `skipped` (integer NOT NULL), `error_code` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.retention_policies`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `category` (text NOT NULL), `duration` (interval NOT NULL), `enabled` (boolean NOT NULL), `version` (bigint NOT NULL), `validation` (text NOT NULL), `batch_size` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.retention_runs`

Famiglia inventario: **DI28** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `operation_id` (uuid NOT NULL), `category` (text NOT NULL), `policy_version` (bigint NOT NULL), `dry_run` (boolean NOT NULL), `candidates` (integer NOT NULL), `purged` (integer NOT NULL), `completed_at` (timestamp with time zone NOT NULL), `moderation_counts` (jsonb NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.safety_evidence`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `hold_id` (uuid NOT NULL), `report_reason` (text NOT NULL), `report_status` (text NOT NULL), `archived_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.safety_hold_audit`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `hold_id` (uuid NOT NULL), `request_fingerprint` (text NOT NULL), `operation_id` (uuid NOT NULL), `action` (text NOT NULL), `actor_ref` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.safety_holds`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `category` (text NOT NULL), `target` (text NOT NULL), `case_reference` (text NOT NULL), `reason_code` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `review_at` (timestamp with time zone NOT NULL), `released_at` (timestamp with time zone nullable), `actor_id` (uuid nullable), `current_status` (text nullable), `review_due_at` (timestamp with time zone nullable), `review_outcome` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.soma_v2_control`

Famiglia inventario: **DI06/08–09 / configurazione** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `membership_enabled` (boolean NOT NULL), `ora_enabled` (boolean NOT NULL), `spot_enabled` (boolean NOT NULL), `discovery_enabled` (boolean NOT NULL), `comments_enabled` (boolean NOT NULL), `requests_enabled` (boolean NOT NULL), `system_posts_enabled` (boolean NOT NULL), `share_enabled` (boolean NOT NULL), `jobs_paused` (boolean NOT NULL), `dd_controlled_admission` (boolean NOT NULL), `dd_admission_changed_at` (timestamp with time zone nullable), `dd_admission_changed_by` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.spot_v2_fence`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `revision` (bigint NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.spot_v2_intents`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `sender_id` (uuid NOT NULL), `recipient_id` (uuid NOT NULL), `origin_kind` (text NOT NULL), `context_id` (uuid nullable), `presence_id` (uuid nullable), `membership_id` (uuid nullable), `exposure_id` (uuid nullable), `created_at` (timestamp with time zone NOT NULL), `valid_until` (timestamp with time zone NOT NULL), `state` (text NOT NULL), `match_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.spot_v2_operations`

Famiglia inventario: **DI10** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `sender_id` (uuid NOT NULL), `operation_id` (uuid NOT NULL), `recipient_id` (uuid NOT NULL), `origin_kind` (text NOT NULL), `exposure_id` (uuid nullable), `intent_id` (uuid nullable), `result` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.spotted_share_refs`

Famiglia inventario: **DI17** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `token` (text NOT NULL), `post_id` (uuid NOT NULL), `comment_id` (uuid nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.suspensions`

Famiglia inventario: **DI22–24** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `reason` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `revoked_at` (timestamp with time zone nullable), `kind` (text NOT NULL), `until_at` (timestamp with time zone nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.tribe_account_state`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `configuration_state` (text NOT NULL), `configuration_started_at` (timestamp with time zone nullable), `revision` (bigint NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.tribe_catalog`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `active` (boolean NOT NULL), `joinable` (boolean NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.tribe_memberships`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `venue_id` (uuid NOT NULL), `last_checkin_at` (timestamp with time zone nullable), `membership_id` (uuid nullable), `membership_source` (text nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.tribe_rejoin_guards`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `user_id` (uuid NOT NULL), `tribe_id` (uuid NOT NULL), `rejoin_not_before` (timestamp with time zone NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.tribe_settings`

Famiglia inventario: **DI06** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `singleton` (boolean NOT NULL), `activity_window` (interval nullable).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.validated_photos`

Famiglia inventario: **DI26–27** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `photo_path` (text NOT NULL), `user_id` (uuid NOT NULL), `preview` (text NOT NULL), `canonical_sha` (text NOT NULL), `canonical_bytes` (integer NOT NULL), `source_format` (text NOT NULL), `source_width` (integer NOT NULL), `source_height` (integer NOT NULL), `normalizer_version` (integer NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `spot_private.venue_codes`

Famiglia inventario: **DI07** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `venue_id` (uuid NOT NULL), `qr_token` (uuid NOT NULL).

RLS: True; grant SELECT anon: False; authenticated: False.

### `storage.buckets`

Famiglia inventario: **DI26–27 / DI31** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (text NOT NULL), `name` (text NOT NULL), `owner` (uuid nullable), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `public` (boolean nullable), `avif_autodetection` (boolean nullable), `file_size_limit` (bigint nullable), `allowed_mime_types` (text[] nullable), `owner_id` (text nullable), `type` (storage.buckettype NOT NULL), `versioning_status` (text NOT NULL), `lifecycle_configuration` (jsonb nullable), `lifecycle_configuration_generation` (uuid nullable).

RLS: True; grant SELECT anon: True; authenticated: True.

### `storage.objects`

Famiglia inventario: **DI26–27 / DI31** (finalità/accesso/retention/delete/export nella matrice §2).

Campi: `id` (uuid NOT NULL), `bucket_id` (text nullable), `name` (text nullable), `owner` (uuid nullable), `created_at` (timestamp with time zone nullable), `updated_at` (timestamp with time zone nullable), `last_accessed_at` (timestamp with time zone nullable), `metadata` (jsonb nullable), `path_tokens` (text[] nullable), `version` (text nullable), `owner_id` (text nullable), `user_metadata` (jsonb nullable), `archived_at` (timestamp with time zone nullable), `is_delete_marker` (boolean NOT NULL), `is_versioned` (boolean NOT NULL).

RLS: True; grant SELECT anon: True; authenticated: True.


## Appendice B — evidence index e riproducibilità

E01: [catalogo schema/FK/RLS](evidence/final-privacy-audit/catalog.json), sola struttura,107tabelle/135FK/12policy; E02: [configurazioni staging](evidence/final-privacy-audit/state.json), solo flag/policy/bucket/conteggio ruoli/versioni consenso; E03: [verifiche e integrità repository](evidence/final-privacy-audit/verification.json). Le query di acquisizione sono versionate come evidenza read-only. Nessun valore di credenziali o contenuto utente presente.

Fonti di implementazione: `supabase/migrations/`001–054, in particolare020–024/026–044/046–054;032ORA,033checkbox,034Spot,036autorizzazioni,037–041DD,042social,043romantic,047QoD,048Share,049Notifications,050Analytics,051Dashboard,052Moderation,053OPS,054PhaseA. Vedere anche `src/privacy-phase1.js`, `src/user-rights.js`, `src/supabase-client.js`, `src/analytics.js`, `src/notifications.js`, `src/live.js`, `public/sw.js`, `public/notification-runtime.js`, `supabase/functions/delete-account/index.ts`, `_shared/photo-lifecycle.js`, `_shared/retention-phase-a.js`, `operations/index.ts`. Nomi file non equivalgono deploy corrente di ogni Preview.

- E04: [SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md](SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md).
- E05: [soma-pre-pilot-decision-sheet-2026-10-06.md](soma-pre-pilot-decision-sheet-2026-10-06.md).
- E06: [soma-age-consent-retention-contract-2026-10-10.md](soma-age-consent-retention-contract-2026-10-10.md).
- E07: [soma-age-consent-retention-staging-report-2026-10-10.md](soma-age-consent-retention-staging-report-2026-10-10.md).
- E08: [soma-profile-photo-authorization-v2-contract-2026-10-18.md](soma-profile-photo-authorization-v2-contract-2026-10-18.md).
- E09: [soma-profile-photo-authorization-v2-report-2026-10-18.md](soma-profile-photo-authorization-v2-report-2026-10-18.md).
- E10: [soma-photo01-production-rollout-2026-10-07.md](soma-photo01-production-rollout-2026-10-07.md).
- E11: [soma-photo01-oversize-production-verification-2026-10-07.md](soma-photo01-oversize-production-verification-2026-10-07.md).
- E12: [soma-photo02-operational-done-2026-10-10.md](soma-photo02-operational-done-2026-10-10.md).
- E13: [soma-daily-discovery-contract-2026-10-19.md](soma-daily-discovery-contract-2026-10-19.md).
- E14: [soma-dd-policy-contract-2026-10-19.md](soma-dd-policy-contract-2026-10-19.md).
- E15: [soma-daily-discovery-report-2026-10-19.md](soma-daily-discovery-report-2026-10-19.md).
- E16: [soma-spot-v2-contract-2026-10-18.md](soma-spot-v2-contract-2026-10-18.md).
- E17: [soma-spotted-qod-contract.md](soma-spotted-qod-contract.md).
- E18: [soma-spotted-qod-resume-report-2026-10-21.md](soma-spotted-qod-resume-report-2026-10-21.md).
- E19: [soma-spotted-share-contract.md](soma-spotted-share-contract.md).
- E20: [soma-spotted-share-final-auth-gate-2026-10-22.md](soma-spotted-share-final-auth-gate-2026-10-22.md).
- E21: [soma-notifications-mvp-contract-2026-10-22.md](soma-notifications-mvp-contract-2026-10-22.md).
- E22: [soma-notification-tap-investigation-2026-10-22.md](soma-notification-tap-investigation-2026-10-22.md).
- E23: [soma-analytics-mvp-contract-2026-10-22.md](soma-analytics-mvp-contract-2026-10-22.md).
- E24: [soma-admin-dashboard-contract-2026-10-23.md](soma-admin-dashboard-contract-2026-10-23.md).
- E25: [soma-admin-dashboard-staging-report-2026-10-23.md](soma-admin-dashboard-staging-report-2026-10-23.md).
- E26: [soma-moderation-finalization-contract-2026-10-23.md](soma-moderation-finalization-contract-2026-10-23.md).
- E27: [soma-moderation-finalization-staging-report-2026-10-23.md](soma-moderation-finalization-staging-report-2026-10-23.md).
- E28: [soma-observability-mvp-contract-2026-10-23.md](soma-observability-mvp-contract-2026-10-23.md).
- E29: [soma-observability-mvp-staging-report-2026-10-23.md](soma-observability-mvp-staging-report-2026-10-23.md).
- E30: [soma-retention-operational-audit-2026-10-23.md](soma-retention-operational-audit-2026-10-23.md).
- E31: [soma-retention-phase-a-contract-2026-10-23.md](soma-retention-phase-a-contract-2026-10-23.md).
- E32: [soma-retention-phase-a-scheduler-staging-2026-10-23.md](soma-retention-phase-a-scheduler-staging-2026-10-23.md).
- E33: [soma-dd-notifications-flake-investigation-2026-10-23.md](soma-dd-notifications-flake-investigation-2026-10-23.md).
- E34: [soma-rights01-contract-2026-10-11.md](soma-rights01-contract-2026-10-11.md).
- E35: [soma-rights01-staging-report-2026-10-11.md](soma-rights01-staging-report-2026-10-11.md).
- E36: [soma-provider01-remediation-2026-10-11.md](soma-provider01-remediation-2026-10-11.md).
- E37: [soma-provider01-manual-checklist-2026-10-11.md](soma-provider01-manual-checklist-2026-10-11.md).
- E38: [soma-provider01-backup-restore-runbook-2026-10-11.md](soma-provider01-backup-restore-runbook-2026-10-11.md).
- E39: [soma-provider01-smtp-runbook-2026-10-11.md](soma-provider01-smtp-runbook-2026-10-11.md).
- E40: [soma-incident01a-drill-report-2026-10-11.md](soma-incident01a-drill-report-2026-10-11.md).

Report storici contengono i loro gate originali: usare §11 per la prevalenza temporale. Test/evidenze storici non vengono presentati come appena rieseguiti. Il dataset catalogato non prova che ogni campo sia valorizzato né che tutti i log/copie esterni siano censiti: quelle lacune sono marcateE/Manual Check.

Verifica corrente documentale: suite completa776/776PASS, buildPASS, typecheckPASS; nessuno skip/cancel. Nessun test cloud mutativo o nuovo login/fixture, nessun tick/purge manuale in questo task. Snapshot evidenze e gitdiff confermano che gli unici file nuovi sono questo dossier e relativa evidenza documentale. Nessuna patch runtime/schema, nessuna modifica ai testi mostrati agli utenti.

**Gate: GO alla revisione professionale; NO-GO al pilot fino alla chiusura deiP0 e dei gate operativi/funzionali applicabili. Nessuna remediation implementata. STOP.**
