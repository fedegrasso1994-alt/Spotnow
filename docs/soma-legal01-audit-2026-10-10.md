# Soma — LEGAL-01 / PRIVACY-BY-DESIGN: audit prima del pilot

10 ottobre 2026. **Fase audit completata; LEGAL-01 non ancora pilot-ready.**
**NO-GO privacy/operatività al pilot** finché i blocker sotto non hanno evidenza
_di chiusura_. PHOTO-01/02 DONE restano chiuse: non sono riaperte da questo audit.
Non risultano prove di una violazione già avvenuta.

Analisi tecnica e pacchetto decisionale, non parere legale definitivo, Privacy
Policy, Terms o Cookie Policy. Nessuna implementazione, migration, deploy,
modifica DB/RLS/dati/UI/UX o nuova funzionalità. Bacheca non iniziata.

## Perimetro e metodo

Baseline main/GitHub `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`, pulita e
sincronizzata all'inizio. Documenti isolati nel branch `codex/legal01-audit`.
Letti AGENTS, audit5–6ottobre, decision sheet, PHOTO-01/02 e sorgenti attuali,
policy/RPC/grants finali migrations001–019 e bootstrap/cutover/scheduler.

Fonti tecniche di questo audit:
- [data map completa](soma-legal01-data-map-2026-10-10.md);
- [evidenze JSON](soma-legal01-audit-evidence-2026-10-10.json);
- [query read-only riproducibile](soma-legal01-readonly-catalog-2026-10-10.sql);
- [chiusura operativa PHOTO-02](soma-photo02-operational-done-2026-10-10.md);
- [decisioni founder già approvate](soma-pre-pilot-decision-sheet-2026-10-06.md).

Live produzione: transazione `BEGIN READ ONLY`/`ROLLBACK`, solo catalogo,
policy, definizioni RPC, vincoli e conteggi; nessun contenuto personale, foto,
chat, preferenza individuale, credenziale o log payload utente letto. Non si
invocano scan/purge/collector, che scriverebbero metadata. Query editor privata
può conservare il testo diagnostico, non è una migration.

HTML/header home200 verificati: titoloSoma, font Google remoti, nessun link
pubblico privacy/terms nell'HTML. Nessun Set-Cookie nella singola risposta;
non certifica tutti i cookie/provider/browser. Suite **235/235 PASS**, build e
typecheck PASS. Test inclusi: discovery/privacy-preference, blocchi/sospensioni,
chat e delete, PHOTO-01/02/cutover/review. Nessun nuovo test runtime per il solo
report. Nessun test distruttivo, account nuovo, invio email/push o carico cloud.

Riscontro live: **28 tabelle applicative (6 pubbliche/22 private), tutte RLS**;
nessuna SELECT diretta privata per anon/authenticated; 98 funzioni censite nelle
schema app, unico entrypoint anon `venue_preview`. Profiles SELECT self-only;
checkins SELECT own-only; Storage INSERT client false; discovery/nulls LOC-01,
vincolo90min e age18–120 confermati. Un account/profilo, tre oggetti foto,
zero legacy. Un check-in scaduto e membership persistente; activity_window NULL.
Controllo PHOTO-02 OPEN, execute/scheduler ON: nessun flag cambiato dal task.

**Limiti:** non è un pentest completo o revisione di ogni configurazione cloud.
Accettazione/applicabilità contratti, accessi/MFA, mailbox, SMTP, retention dei
log/backups, restore e eventuali dashboard analytics non verificati. Le prove
cloud PHOTO-02 precedenti rimangono datate e distinte dai test di oggi.

### Premesse founder da preservare

Pilot Italia soltanto, italiano, **2 università, >200 registrati**, senza
inventare un tetto maggiore preciso. Federico Grasso persona fisica indicata,
Soma brand, somadatingapp@gmail.com casella unica SUPPORTO/PRIVACY/SAFETY/RICORSO.
Federico +1sostituto con account personali/least privilege, senza accesso
automatico a cloud/chat complete. Venue QR/recruiting generale, nessun dato
individuale/admin/moderazione. OPTION B18+ approvata: età numerica + dichiarazione
esplicita + report underage/sospensione, nessun KYC/documento/email documenti.
Legal review rinviata durante hardening ma richiesta prima utenti reali.
Nessuna di queste decisioni founder è una validazione giuridica.

## A. Data map e minimizzazione

La [data map](soma-legal01-data-map-2026-10-10.md) indica per ogni famiglia
raccolta, necessità, archiviazione, lettori, durata e cancellazione, incluse
Auth/provider, profile/dating, foto/preview/ledger, venue/QR/checkins/Tribe,
Spot/match/chat, safety, mailbox, log, storage browser e copie esterne.

Minimizzazione già presente: niente GPS/rubrica/data nascita/KYC/riconoscimento
facciale, video scanner non salvato; peer non ricevono preference o precise
presenze; raw foto non persistito, JPEG canonicali senza trasferimento EXIF
originale; preview e tre varianti intenzionali; diagnostica locale senza testo
utente; service worker non cachea profili/chat/Auth. Nessun analytics marketing,
push o API AI implementati nel codice corrente.

Dati da riesaminare prima del pilot:
1. **Check-in scaduto:** timestamp esatto residuo pur senza utilità Ora; la
   presenza90min non è una retention90min. Una riga per utente, non storico
   completo append-only, ma resta l'ultima presenza.
2. **last_checkin_at:** un ultimo timestamp per utente/venue, aggiornato a ogni
   visita, senza TTL; oggi activity_windowNULL non lo richiede per scadenza
   membership. Il filtro tecnico contiene il ramo futuro con finestra: una
   rimozione/granularizzazione richiederà valutazione e contratto compatibile.
3. **Interests.sender_checkin:** `send_spot` lo valorizza con now(); con Tribe
   non è necessario al reciproco basato sulle coppie/venue. Duplica il momento
   invio di created_at. Inventariare dipendenze legacy prima di minimizzare.
4. **Profilo/relazioni/chat inattivi:** nessun lifecycle approvato o TTL; non
   affermare che tutto ciò sia sempre necessario finché account non cancellato.
5. **Metadati OAuth non utilizzati:** nome/avatar del provider possono duplicare
   il profilo fornito dall'utente; verificare claim/scope necessari senza
   rompere Auth. Nessuna lettura di valori reali in questo audit.
6. **Preview DB duplicata** validated_photos/photo_assets: copia utile al
   contratto di verifica/render; valutarne la necessità in futuro, LOW, nessun
   requisito di refactor o riapertura PHOTO-01/02.
7. **QR draft senza TTL, URL/query/history**, conteggi piccoli e log provider:
   minimizzare dati/tempi effettivi; non trasformare diagnostica in diario luoghi.
8. **Foto ledger/UID/hash/path** sono dati tecnici ancora collegabili alla
   persona; purged non significa anonimo. Quarantena review è sicurezza, non
   autorizzazione a dimenticare per sempre il caso.

Necessità tecnica ≠ base giuridica selezionata. Le fotografie normali non
implicano automaticamente un sistema biometrico. Genere/preferenza, relazioni,
chat e combinazioni con venue possono rivelare aspetti intimi: serve valutazione
specifica delle condizioni applicabili. [EDPB: trattamento lecito](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en).

## B. Confini di accesso e gap privacy/security

### Location, Ora e Tribe

- **Precisione:** luogo identificabile per ID/nome/indirizzo e QR; nessun GPS,
  latitudine/longitudine, traiettoria o distanza del telefono. Il luogo preciso
  resta un dato di presenza anche senza coordinate.
- **Ora:** proprio check-in attivo, stessa venue; server esclude peer scaduti
  dopo90min. Discovery restituisce Qui ora e timestamp legacy null. Il proprio
  check-in conserva dati necessari. **LOC-01 chiuso**, anche RPC legacy.
- **Tribe:** membership condivisa permette discovery fuori90min; frontend
  distingue live=true (Ora) e live=false (offline nello stesso luogo). Non è
  una lista pubblica Internet; QR statico condivisibile consente comunque a
  persone remote di entrare nella community. Non è prova robusta presenza fisica.
- **Movimenti:** DB conserva ultima presenza per utente e ultimo check-in per
  venue; non tutte le visite. Polling/crawl autorizzato può però ricostruire
  intervalli di presenza o dedurre assenze. Blocchi e precisione null riducono,
  non eliminano, rischio stalking/inferenza.
- **Aggregati:** venue_preview è anon con QR e restituisce conteggi esatti;
  my_tribes conteggia anche persone non visibili per preferenze/blocchi. UI lo
  dichiara. Con gruppi piccoli o polling differenziale può rivelare indirettamente
  presenze; non dichiarare anonimi i conteggi per il solo fatto di non avere UID.
- **Nessuna API destinata alle università** per utenti/preferences/chat/report.
  Un responsabile venue che crea normale profilo ottiene solo i normali confini.

### Profilo/discovery, Spot e match

**SEC-01 chiuso:** tabella profili self-only, proiezioni peer whitelist, nessuna
preference nei contratti pubblici/legacy. Gender/name/age/occupation/photo sono
campi prodotto visibili, non il record completo con updated_at/private fields.
Il filtro usa preferenza del chiamante: non promettere una compatibilità
reciproca o inferire che il target abbia selezionato un genere.

Blocchi sono bidirezionali nell'autorizzazione discovery/match/foto; sospesi e
account in cancellazione sono esclusi. Report senza `also_block` **non** nasconde
il target finché non interviene una decisione: scelta corrente, non report=ban.
Le RPC e la RLS proteggono il dato alla richiesta; schede/pixel già ricevuti e
URL firmati non sono revocabili retroattivamente. Cache/RAM reset locali non
cancellano screenshot o copie del destinatario.

Spot table privata, utente vede proprio interest_sent; reciproco genera match.
Niente TTL90min del match attuale: migration007 ha reso relazione persistente.
Bloccare non elimina relazioni o testi dal DB. Nessun ritiro Spot/lasciaTribe
UI introdotto: le richieste di diritti vanno comunque gestite e validate.

### Chat/UGC e moderation

RLS messages/matches + can_use_match richiedono partecipante autenticato,
non bloccato/sospeso/in delete; send_message applica lo stesso confine e nonce
idempotente. Nessun accesso messaggi agli estranei via query diretta nei test.
Testo reso con textContent, lunghezza1–2000. Nessun modello AI o analytics sui
messaggi. Trasporto HTTPS non equivale a E2EE: owner/service role/provider nei
loro ruoli possono accedere, admin UI non offre lettura globale chat.

Chat/UGC senza TTL, no delete singolo messaggio/unmatch/export self-service;
bozze solo RAM, reset sessione. Report profilo/chat invia target/reason/details,
non message_id o snapshot messaggio. Il moderatore non ha una timeline/evidenza
conservata per il caso: non promettere revisione di un messaggio specifico che
non è identificato. Richieste email possono aggiungere copie non governate.

Coda MOD limita ultimi100 report, nessuna paginazione/filtro pending completo,
refresh manuale; con2università/>200 può perdere visibilità dei casi vecchi.
Azioni review/dismiss/suspend/revoke auditate; non c'è processo ricorso validato,
alert operativo, nominativo/orari/formazione sostituto verificati. Delete può
rimuovere accuse/audit: scelta da risolvere prima di promettere conservazione
prove. Niente copie preventive delle chat o richiesta documenti via email.

### Gap classificati

BLOCKER è gate di apertura proposto in questo audit, non affermazione che ogni
riga abbia un obbligo legale autonomo. HIGH/MEDIUM/LOW misurano rischio/scopo;
un HIGH diventa gate quando la mitigazione è necessaria nel pilot scelto.

| ID | Priorità | Finding / evidenza | Condizione di chiusura |
|---|---|---|---|
| L01-01 | BLOCKER | Nessuna informazione pubblica/versionata o contatto privacy nell'app; nessuna prova separata per dati dating/Terms | Legal review finalità/art6/art9/ruoli, documenti pubblicati prima raccolta e flussi/prove/ritiro ove richiesti |
| L01-02 | BLOCKER | OPTION B approvata ma dichiarazione18+ assente, age18 è autodichiarabile; Auth prima profilo | Implementazione futura/prova B e valutazione professionale della sufficienza/proporzionalità; niente KYC/email documenti |
| L01-03 | BLOCKER | Nessuna matrice retention social/location/safety/provider approvata | Approvazione criteri e owner + lifecycle operativo verificato per dati non più necessari |
| L01-04 | BLOCKER | Nessun export/access/withdrawal workflow pronto; email non esposta/provata | Procedura identità/scadenze/consegna protetta/terzi collaudata; self-service non obbligato automaticamente |
| L01-05 | BLOCKER | Moderazione/ricorsi/evidenze non operativi alla scala scelta; coda100 | Sostituto/accessi/copertura/mailbox e coda interamente consultabile, prove underage/triage/ricorso/delete |
| L01-06 | BLOCKER | DPA applicabili, trasferimenti/accessi/backup/restore/incidente non documentati e provati | Provider checklist/accordi, inventario autorizzati, screening DPIA e decisioni professionali, incident drill/restore senza resurrezione dati |
| L01-07 | HIGH | Timestamp check-in scaduto e last_checkin_at per venue senza TTL/granularità motivata | Necessità distinta da membership, minimizzazione/purge staging dopo approvazione, invarianti90min/Tribe preservati |
| L01-08 | HIGH | Report/audit cancellati con reporter/target/actor; nessuna evidenza messaggio case-scoped | Scelta conservazione minima motivata e procedure safe; eventuale disaccoppiamento schema approvato, non conservare tutto |
| L01-09 | HIGH | QR statico condivisibile/crawl autorizzato senza limiti discovery/social provati | Modello minaccia e throttling/abuso proporzionati, comunicazione limiti presenza, test blocking e scraping; non attivare GPS |
| L01-10 | HIGH | Log/provider/URL QR e restore fuori workflow delete | Inventario copie con scadenze/accessi/redaction, conservazione motivata e tombstone/reapply verificati |
| L01-11 | MEDIUM | Google Fonts già al primo caricamento, fornitore remoto non necessario | Self-host stessi font/licenze senza redesign in task separato, oppure scelta/disclosure validata |
| L01-12 | MEDIUM | Aggregati esatti piccoli e counts non filtrati per blocco/preferenza | Riesame inferenze: threshold/coarsening o alternativa da founder/legal; non cambiare counts ora |
| L01-13 | MEDIUM | Draft QR senza TTL, signed/HTTP/RAM copie non revocabili, dispositivo condiviso | TTL draft/logout e disclosure copie; non promettere erase pixel istantaneo; test session switch |
| L01-14 | MEDIUM | CSP solo frame/object/base, non script-src; sessione persistente locale | Hardening compatibile/test inlinehandler prima futuro deploy; non descrivere policy attuale come prevenzione XSS completa |
| L01-15 | LOW | Preview duplicata DB; metadati tecnici necessari ma da minimizzare | Riesame documentato; no refactor necessario prima pilot se necessità/lifecycle confermati |
| L01-16 | LOW | Doc storici descrivono ancora foto originali/purge assenti e vecchie falle | Usare questo audit aggiornato; preservare storia, non trattare SEC/LOC/PHOTO chiusi come ancora aperti |

Non sono stati trovati nuovi bypass RLS confermati che riaprano SEC-01/LOC-01 o
PHOTO-01/02. Test/catalogo non certificano assenza di ogni vulnerabilità.
Notifiche ad app chiusa restano **non implementate** (SW solo offline); requisito
founder storico prima lancio va gestito come blocco prodotto separato, con
privacy-specific push gate, non fingere che siano già attive.

## C. Retention attuale vs proposta

**Tutte le durate nuove sotto sono proposte tecniche da founder + legal review,
non limiti imposti dalla legge, non nuove decisioni approvate.** Per ogni riga
servono evento iniziale, copie, eccezioni, job/owner, idempotenza e test. Non usare
90min come TTL di match/Tribe e non cambiare PHOTO-01/02 in questa fase.

| Categoria | Attuale | Proposta candidata e trade-off |
|---|---|---|
| Check-in attivo | Visibilità90min server | Conservare esattamente90min; nessun cambiamento prodotto |
| Check-in scaduto | Ultima riga indefinita | Purge dopo scadenza, eventualmente buffer massimo24h solo se necessità diagnosi approvata; niente storico visite aggiunto |
| Tribe membership | Persistente fino delete, finestraNULL | Preservare membership finché account attivo per scelta community; riesame con inattività account12mesi, senza introdurre lasciaTribe UI automaticamente |
| last_checkin_at per venue | Ultimo timestamp preciso indefinito | Separare dalla relazione; rimuovere precisione dopo24h o conservare solo granularità necessaria se review approva uso attività. Nessun nuovo TTL membership implicito |
| Spot non reciproco | Indefinito; no ritiro | Candidato90giorni dall'invio, poi purge se non reciprocato/non caso safety; implica possibilmente reset interest_sent/reinvio: richiede decisione prodotto esplicita, non approvata |
| Match senza chat | Indefinito | Candidato90giorni senza interazione, previo avviso/decisione prodotto; non equiparare a match90min |
| Match con chat / messaggi | Indefinito, cascade delete partecipante | Mentre conversazione utile; candidato12mesi inattività + avviso30giorni prima purge; definire attività, accesso ai vecchi messaggi, effetti su entrambi ed evidenze |
| Blocchi | Fino rimozione API/delete | Mantenere tutela per vita dell'account o risoluzione della richiesta; niente scadenza che riabiliti contatti indesiderati |
| Report/casi/moderation audit | Nessun TTL; delete può eliminarli subito | Caso aperto fino decisione, poi candidato180giorni per ricorso; casi gravi hold minimo, accessi ristretti e riesame, durata da professionista; niente retention indiscriminata |
| Sospensione | Fino revoke/delete; nessun purge revoked | Per decisione attiva; note/audit dopo revoca seguono caso e180giorni proposti, non lista permanente di accuse |
| Auth senza profilo | Nessun TTL | Candidato7giorni da creazione/inattività per abbandoni; non cancellare account in onboarding attivo; distinguere utenti legacy anonimi |
| Account/profilo inattivo | Nessun TTL | Riesame12mesi, avviso30giorni e scelta founder su disattivazione/purge; non inviare avvisi ora, non inferire attività solo da update profilo |
| Delete account | Dati applicativi al workflow riuscito; foto cleanup retry-safe | Erasure operativo senza ritardo artificiale; errori in coda con owner/riconciliazione, disclosure partner e copie provider |
| Foto correnti/vecchie/draft | PHOTO-02: corrente fino replace/delete; grace5min/draft24h | **Invariato, founder già approvato**; nessuna modifica decoder/contratto |
| Metadata foto conclusi | PHOTO-02:7d, unknown/review non auto-purge | **Invariato**; revisione umana review entro obiettivo interno7d proposto, non scadenza autorizzante purge; escalation se irrisolto |
| Log app/Edge diagnostici | Locale30eventi RAM; provider non verificato | Candidato7d diagnostica minima,30d eventi sicurezza giustificati; no corpi foto/chat/token; compatibilità provider da verificare |
| Cron/run history/pg_net | Nessun purge app dimostrato per cron; provider pg_net proprio lifecycle | Candidato7d summary tecnici,30d soli incidenti motivati. Usare config/job limitato se necessario, non assumere TTL provider |
| Inbox diritti/assistenza | Non definita | Chiusura caso + candidato180d evidenza minima, eliminare allegati superflui subito; separare richieste safety/legal hold |
| Backup/copied data | Non verificato | Candidato ciclo massimo30d se approvato e tecnicamente disponibile, restore deve riapplicare erasure; Storage bytes recuperabili separatamente |
| Browser draft/flag | QR draft/flag senza TTL | Candidato draft24h con owner/scopo, eliminazione agli eventi; flag installazione può restare minimale non identificante, da disclosure strumenti |
| Cupido | Non implementato | Vedere sezione futura; nessun TTL applicato a dati inesistenti |

Le proposte comportano possibili modifiche di logica: **non** sono implementate,
né autorizzate dal solo audit. Le scelte founder già chiuse (nessun ritiro Spot,
nessun lasciaTribe iniziale) rimangono tali; la gestione dei diritti e una futura
retention richiedono compatibilità esplicita, non introduzione automatica UI.

## D. Cancellazione, accesso, export e consensi

### Account deletion attuale

1. JWT validato, UID del chiamante; begin_account_deletion/PHOTO02 barrier marca
   l'account non disponibile e attende/riconcilia writer. Non usa timeout come
   prova di assenza effetti Storage.
2. PHOTO-02 rimuove tutti i file sotto UID e copie/varianti, prepara cancellazione
   safety, poi Auth delete; retry e queue protetti. Conferma successo solo dopo
   assenza Auth/Storage e rilascio riserve.
3. Cascade elimina profilo/checkins/Tribe/interessi/blocchi/match/messages,
   inclusi i messaggi del partner nello stesso match, photo assets/validated/jobs.
4. prepare_account_deletion elimina report in cui è reporter/target, audit sui
   casi coinvolti o sull'attore, sospensione e ruolo moderatore. **Non** è una
   conservazione anonimizzata: è cancellazione; rischio perdita prove/ricorso.
5. Restano fino purge metadata foto conclusi UID/path/audit/queue7d; review non
   risolti preservati manualmente. Log Auth/provider/cron, email, backup,
   browser history e copie altri utenti non sono purgati dal solo endpoint.

Nessun record applicativo di anonimizzazione generale presente. I metadata
pseudonimi non vanno chiamati anonimi. PHOTO-02 non ha risolto la decisione legale
su report/chat/backup, soltanto lifecycle sicuro foto e delete riuscito.

### Access/export

Presente UI proprie informazioni profilo/modifica, Ora/Tribe, match/chat,
logout e delete/retry. API propria può leggere profilo completo/check-in/blocchi;
non è portale che elenca ogni dato Auth/safety/log/dating del titolare.
Assenti export self-service/RPC download, registro richieste, verifica identità,
consegna protetta e prova di chiusura. Si può partire da procedura manuale
**collaudata**, senza obbligare un nuovo portale. Accesso e portabilità non sono
identici: valutare dati pertinenti, basi applicabili e diritti di terzi,
redazione chat/report e identità destinatario prima di ogni consegna.
[EDPB: diritto di accesso](https://www.edpb.europa.eu/documents/guideline/guidelines-012022-on-data-subject-rights-right-of-access_en).

### Mappa tecnica consensi / finalità

| Trattamento | Necessità tecnica / stato | Decisione e requisiti futuri |
|---|---|---|
| Auth, sessione, profilo minimo, check-in volontario | Necessari al servizio scelto | Validare base/finalità e minimizzazione; non etichettare automaticamente tutto art6 contratto |
| Preferenza/genere, Spot/match/venue e inferenze intimità | Necessari al prodotto dating, potenziali categorie particolari | LEGAL REVIEW REQUIRED art6 + condizione art9 separata. Se consenso esplicito applicabile, flusso specifico/versione/prova/ritiro prima trattamento; login non equivale a tale consenso |
| Chat/UGC sensibile e safety | Testi di utenti/terzi, accuse | Valutazione separata, accessi mirati, no "consento tutto" come condizione per tutela; niente training/marketing sui testi |
| Terms/18+ | Nessun gate Terms/version record; età numerica presente | Accettazione contratto, informativa, eventuale consenso GDPR e dichiarazione18+ sono atti diversi |
| Fotocamera | Permesso per scanner | Non prova presenza, consenso dating o accettazione policy; video non persistito |
| Marketing/analytics non necessari | Non presenti | Nessun consenso fittizio raccolto ora. Introdurli solo con review separata e opt-in/ritiro se applicabile |
| Push futuro | Non implementato | Permesso browser + finalità/distinzione messaggi/marketing; subscription privata e delete/logout, payload generico senza testo lockscreen; native permission non consenso generale |
| Cupido futuro | Due accettazioni prodotto + delega wingman previste | Accettazioni/proposta ≠ automaticamente consenso GDPR; progettare destinatari/prova/revoca e minimizzazione prima sviluppo |

Nessuna base giuridica scelta in questo audit. Se si usa consenso, revoca deve
avere effetto tecnico futuro specifico: interrompere finalità, discovery/delega/
subscription pertinenti, trattare dati già raccolti secondo decisione convalidata;
non equiparare sempre a delete intero account e non annullare obblighi di tutela.
Evidenza minima candidata: UID/finalità/versione/azione/time, senza IP/device
fingerprint superflui. [EDPB: consenso](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en).

### 18+ e strumenti su dispositivo

CHECK DB e validazione18–120 fermano17 numerico, non chi mente18. Età non si
aggiorna automaticamente; Auth può nascere prima del profilo. Google login non
verifica età Soma. Implementare B approvata solo in task futuro, verificando
momento raccolta e prova, triage underage e sospensione. Nessun KYC/documenti
aggiunti. Sufficienza legale non convalidata. [EDPB age assurance](https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-12025-age-assurance_en).

Sessioni, QR draft, flag PWA/localStorage, history, SW e font devono essere
inventariati nella disclosure strumenti, oltre ai cookie. Non emerge un banner
standard automaticamente necessario: dipende dall'uso effettivo, incluso ciò
che eventuali dashboard provider abilitano. Nessun banner implementato.
[Linee guida Garante](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).

## E. Modifiche tecniche necessarie, da autorizzare separatamente

Nessun refactor dei grandi file è prerequisito. Moduli dedicati per consent,
rights/export, retention, moderation-cases; usare gli helper esistenti.

| Task futuro | Impatto potenziale schema/RLS/API | Verifica prima produzione |
|---|---|---|
| Informativa/contatto/versione Terms e 18+ B | UI minima e possibile registro versioni/prove privato; gate server ove richiesto | Default non selezionato, gating prima raccolta pertinente, modifica profilo non bypass, versioni/revoca separata |
| Consensi specifici se review li richiede | Nuovo modulo/registro privato, API own-only e check lato server; nessun campo peer | Purpose/withdrawal/test account senza approvazione/versione; nessun bypass API |
| Retention checkins/social | Scheduler mirati, indici/proiezioni eventualmente necessari; stessa logica90min | Race check-in/purge, Tribe invariata, Spot/reinvio e match/chat secondo decisione approvata |
| Minimizzazione last_checkin/Spot stamp | Possibili migration/helper branch activity-window legacy | Regressioni discovery/reciproco/paginazione/caching; spiegare prima contratto nuovo |
| Moderation queue completa/evidenza per caso | RPC pagination + eventuale case/message reference, accesso MOD limitato | Coda>100, ruolo/caller, report retry/blocco, minorenne simulato, ricorso, delete e legal hold selettivo |
| Rights/access/export sicuro | Inizio manuale; poi modulo service-authorized/own-only, senza export arbitrario | Identità, redazione terzi, audit consegna, TTL file, retry/delete concorrente |
| Provider/log/backups/incidenti | Config/accordi e strumenti di osservabilità, possibile job purge distinto | Restore DB+Storage sintetico, reapply erase, nessun contenuto in log, accessi/alert/recovery |
| QR/anti-crawl/social throttling | Rate-limit server/RPC a scopo, nessun GPS | Abuse vs normale UX, distributed retry, no accesso prima gate, outputcounts se approvato |
| Font locali/CSP/browser draft | Stessi font/design, configurazione/header/modulo storage | Screenshot regressioni, OAuth/scanner/inlinehandler compatibili, nessuna telemetria nuova |
| Push prima lancio se requisito ancora vincolante | Nuove subscription/queue/functions/SW, consensi e revoca | Multi-device, blocco/delete/logout, idempotenza, no testo lockscreen; task prodotto distinto |

**Avviso:** lo schema può cambiare in questi task, ma non cambia qui. Nuove
migration/RLS/API devono essere presentate e approvate prima implementazione,
con compatibilità legacy e collaudo staging. Retention nuova non si aggiunge al
collector foto esistente senza separare scopo e invarianti PHOTO-02.

## F. Documenti e prove necessari prima del pilot

Non redatti come testi legali definitivi in questa fase.

| Documento / deliverable | Contenuto concreto e owner |
|---|---|
| Privacy Policy italiana | Federico/contatto, finalità/dati/basi convalidate, destinatari/trasferimenti, retention/copie, diritti/reclamo, 18+, visibilità e dati intimi; professionista + founder |
| Terms of Service | Eligibility18+, servizio/place/QR, account, UGC/condotta, sospensioni/ricorsi/delete e effetti su chat, limiti presence; review legale, versioni/accettazione |
| Community Guidelines | Molestie/minori/falsi profili/contenuti vietati, segnalazioni/blocchi e limiti, no promessa moderazione24/7; perimetro futuro wingman distinto |
| Cookie/Tracking/Storage disclosure | Sessione/localStorage/PWA/QR draft/font/providers, analytics assenti verificati e eventuali strumenti provider; banner solo se classificazione lo richiede |
| Location/Tribe disclosure prima check-in | QR non GPS/non prova fisica, Ora90min vs membership persistente, chi vede profilo, nome venue e conteggi; può stare a strati nella policy/flusso, non necessariamente nuova pagina autonoma |
| Registro trattamenti/data map/provider checklist | Matrice finalità/necessità/accessi/copie, accordi Supabase/Vercel/Google/email, trasferimenti/versioni applicabili; niente dati reali in GitHub |
| Retention/purge policy interna | Durate/trigger/hold/owner per dato/copia, foto invarianti, restore e proof deletion |
| Safety/moderation/ricorso e autorizzazioni | Owner+sostituto, accessi personali/formazione/revoca, triage/tempi realistici, evidenze minime, gestione underage/casi urgenti |
| Procedura diritti | Identità, registro/scadenze legali applicabili, access/export/rectify/withdraw/erase, redazione terzi/consegna protetta/prova |
| Incident response + backup/restore | Contenimento server, contatti/responsabilità, breach assessment/notifiche da professionista, simulazione e recovery/reapply erasure |
| Screening DPIA e ruoli ulteriori | Valutazione professionale sul contesto dating/luoghi/scala/inferenze/minori; non dichiarare automaticamente DPIA/DPO necessari o esclusi; analisi UGC/DSA se applicabile |
| Accordi università/venue | QR/recruiting, nessun dato individuale/admin/moderazione; ruoli determinati sui compiti effettivi |
| AI disclosure | Solo se futura AI introdotta, modello/provider/finalità/input/retention/training e qualificazione/applicabilità da review. Cupido descritto non comporta di per sé AI |

DPA pubblici non provano da soli gli accordi/configurazioni applicabili al tuo
account. Supabase documenta che regione primaria non esaurisce log/Edge/copied
systems e trasferimenti: verificare tutto il percorso, non promettere SEE-only
sulla sola vecchia evidenza Irlanda. [Supabase residenza e responsabilità](https://supabase.com/docs/guides/security/gdpr-compliance).
[DPA Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum),
[subfornitori](https://supabase.com/legal/customer-resources/subprocessor-list),
[DPA Vercel](https://vercel.com/legal/dpa) da pacchetto professionale. Il testo
Supabase pubblico consultato disciplina anche Covered/Sensitive Data: verificare
versione/applicabilità e condizioni per i dati dating; non presumerle soddisfatte.
Il backup DB non ripristina automaticamente i bytes Storage.
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

La policy Google richiede disclosure accurata sul trattamento dei dati del suo
servizio; verificare policy URL/branding/scopes OAuth prima pubblicizzazione.
[Google API User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

## G. Decisioni founder richieste

**Già approvate, non richieste nuovamente:** Italia/italiano,2università/>200,
Federico/casella unica, sostituto/least privilege, niente dati individuali alle
venue, 18+ B senzaKYC, legal review prima utenti reali, PHOTO-02 grace/draft/quota/
cache/7d e review non purgata per timeout.

**Ancora da decidere/completare (risposte con ID, non autorizzazione implicita al codice):**

| ID | Punto | Proposta e decisione richiesta |
|---|---|---|
| F-L01 | Professionista e calendario | Individuare privacy/tech counsel, consegnare audit/data map/decisioni/provider/retention/safety/rights/incident; review prima pilot, non fine progetto |
| F-L02 | Retention nuove della tabella C | Accettare/modificare ogni criterio candidato e trade-off su Spot/reinvio, match/chat, account inattivi; professionista convalida condizioni/eccezioni |
| F-L03 | last_checkin/precisione | Confermare uso necessario di timestamp attività o solo membership; niente promesse nuova funzione attività non sviluppata |
| F-L04 | Evidenze e delete | Scegliere conservazione minima case-scoped dopo cancellazione e ricorsi, oppure perdita deliberata compatibile con review; no copia completa chat automatica |
| F-L05 | Safety owner/sostituto | Nome, finestre realistiche, priorità/tempi/stop/escalation e strumenti; mailbox MFA/recovery/label/test ricezione, nessun24/7 presunto |
| F-L06 | Diritti: manuale verificato o self-service | Consiglio iniziale procedura manuale sicura completa; nominare chi consegna/controlla scadenze, non mandare CSV con tutti i dati del partner |
| F-L07 | Provider/accessi/recupero | Inventario autorizzati/DPA/regions/logs; obiettivi RPO/RTO e budget operativo realistici da definire, nessuna garanzia zeroincidenti |
| F-L08 | Conteggi/QR/browser/font | Decidere accettazione rischio o mitigazioni; self-host font consigliato preservando visual. Nessun intervento automatico ora |
| F-L09 | Notifiche lancio | Confermare requisito storico indispensabile e pianificare task separato: oggi non presenti; default payload generico proposto |
| F-L10 | Cupido futuro | Specificare scope delega/durata/revoca/TTL/rate/evidenze e politiche, solo prima dello sviluppo/lancio Cupido. Non blocca pilot senza Cupido |

Non chiediamo al founder di scegliere da solo art6/art9, DPIA/DPO o sufficienti
misure legali minori: sono conclusioni del professionista sul prodotto reale.

## Cupido futuro — implicazioni separate, nessuna implementazione

Conferma founder10ottobre: **non implementato in main né branch rilevanti**.
Modello ricevuto: utente autorizza amico identificato; wingman propone target;
utente principale accetta richiesta cieca “X vuole farti conoscere qualcuno”;
solo allora target vede wingman e persona proposta; chat solo dopo accettazione
target; rifiuto senza notifica, wingman escluso chat, niente match senza target.
Nessun dato Cupido attuale inventariato come raccolto; nessuna AI implicita.

| Rischio/gate prima di Cupido | Progettazione richiesta |
|---|---|
| Delega/identità | User→wingman esplicita, scope venue/destinatari/azioni, TTL e revoca; autorizzazione server non semplice checkbox client; no rubrica obbligatoria |
| Disclosure target | Selezione wingman non amplia l'accesso a profili altrimenti vietati; decidere discovery dell'utente proposto/target, non rivelare preferenze/private memberships |
| Accettazione cieca | Spiegare che accettare autorizza presentazione del proprio profilo a persona non ancora identificata; definire limiti e annullamento prima inoltro; trasparenza da legal review |
| Due accettazioni | Stati separati proposto→principal_accepted→target_accepted; nessuna chat/match prima entrambe; check blocco/sospensione/delete/delega revocata al momento di transizione |
| Rifiuto riservato | Nessuna notifica/risposta RPC/webhook/status leggibile che distingua rejected da pending/expired al principal/wingman; eventuali inferenze via assenza risposta non eliminabili totalmente |
| Anti-abuso/minori | Limiti per wingman/target/periodo, no nuove proposte per aggirare blocchi, report proposta/wingman e delega revocabile; moderazione case-scoped |
| Chat separata | Partecipanti solo principal/target, wingman non ottiene messages/match metadata oltre conferma prodotto minimale decisa; niente persistenza contenuti in proposta |
| Record e retention | ID attori/delega/stati/accettazioni/times minimi; candidato pending7giorni e conclusi30giorni solo proposta futura da convalidare; safety hold dedicato e delete/revoke retry-safe |
| Concorrenza | Accept/rifiuto/revoke/delete concorrenti con CAS/lock, idempotenza, no doppia chat/match, invio dopo consenso valido |

Gate HIGH **solo prima dell'introduzione Cupido**, non finding runtime attuale.
Accept prodotto/delega non equivalgono a scelta automatica della base GDPR.
Nessun match target creato automaticamente e nessun wingman anonimo ammessi
secondo modello founder. Bacheca rimane completamente fuori scope.

## H. Roadmap LEGAL-01 fino a pilot-ready

| Fase | Deliverable / owner | Gate per avanzare |
|---|---|---|
| 0 — audit (questo task) | Data map, evidenze, gap/priorità, retention candidate, Cupido separato | Completata; nessuna correzione implementata |
| 1 — decisioni/pacchetto professionale | Founder completa F-L01..08; professionista finalità/basi/condizioni/ruoli/18+/screening e accordi | Decisioni annotate, legal questions con esito, nessuna policy costruita su fatti inventati |
| 2 — piano tecnico dettagliato | Moduli consent/18+/rights/retention/moderation e provider runbook; una modifica per task | Ogni eventuale schema/RLS/API comunicato prima, staging/compatibilità/rollback previsti |
| 3 — implementazione staging | Solo task autorizzati, fixture sintetiche; test positivi/avversariali/race | Migrations/versioni/prove, access boundaries, withdrawal/expiry/deletion/queue>100 e failure/retry PASS; foto/90min/Tribe/social non regressi |
| 4 — testi professionali e flussi informativi | Policy/Terms/guidelines/disclosure approvati e versionati, contatto operativo | Informazione prima raccolta pertinente, prove/ritiro ove richiesti, scopeprovider documentato |
| 5 — operational readiness | Nominativi/MFA/coda/inbox/diritti/incident/restore testati; push separato se gate prodotto | Simulazione richiesta dati, minore, abuso/ricorso/delete/restore e stop con evidenze, niente account reali coinvolti |
| 6 — preflight/rollout/pilot GO | Review finale tecnica+founder+professionista; release/checklist versionate | Tutti BLOCKER chiusi, HIGH mitigati o rischio residuo motivato compatibile con review; rollout autorizzato e gate live, monitoraggio scala2università/>200 |

Possono attendere: refactor grandi file, portale diritti avanzato se procedura
manuale sufficiente/provata, AI/Cupido/Bacheca futuri, analytics marketing,
KYC non scelto. Non possono essere sostituiti dai235test: informazione corretta,
condizioni trattamento dating, 18+ approvato/valutato, retention necessaria,
capacità diritti/safety, provider e recupero. Nessun GO pilot derivato dal solo
GO foto o dal solo funzionamento dell'app.

**Esito:** audit LEGAL-01 completato, roadmap pronta per decisioni e review.
**NO-GO al pilot allo stato documentato; GO alla fase decisionale/tecnica
successiva**, da autorizzare separatamente. Nessun requisito Cupido attribuito
alla release corrente. File di questo task solo in docs; nessun refactor,
nuova migrazione o comportamento app modificato.
