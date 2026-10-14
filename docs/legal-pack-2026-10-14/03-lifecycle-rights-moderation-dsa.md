# Consolidamento retention / RIGHTS / moderation e checklist DSA

14 ottobre 2026 · **LEGAL VALIDATION PENDING** · audit only. [Data map/threat model](01-bacheca-privacy-safety.md), [decisioni professionali](02-final-legal-decision-pack.md), migration 023–026. Durata prodotto, eleggibilità al purge e periodo legale sono concetti diversi.

## Retention effettiva Bacheca

| Dato | Stato attuale candidato / trigger | Eccezione / rischio | Decisione richiesta |
|---|---|---|---|
| Post pubblico | Filtro server fino expires_at=creazione +24 h, mai rinnovato da retry; hidden/sanzioni anticipano esclusione | Copie già ricevute/DOM non revocabili; mountBoard non ha timer autonomo; future read sempre filtrate | Disclosure e aspettativa schermo aperto; eventuale hardening refresh/timer separato |
| Post server scaduto | board_posts, primo ciclo utile dopo expiry, senza ulteriore attesa; duration 1 s placeholder di vincolo DB non ritardo effettivo | Policy OFF/retention paused staging; job non attivato da dossier. Outage/open report/hold può rinviare | Owner/frequenza/SLO backlog; durata legale non presunta 24 h per tutte le copie |
| Reactions | Row unica user/post; change/remove; cascade parent o account | Rimangono finché parent protetto esiste | Proporzionalità del mantenimento insieme al caso, senza roster peer |
| Report open/under_review | Protegge post scaduto da purge | Nessuna chiusura automatica o max TTL; rischia permanenza senza review | Owner, riesame, criteri chiusura, eventuale hold esplicito al posto di open indefinito |
| Report closed | board_reports: 180 d candidato da closed_at, se non held | **Massimo candidato, non minimo**: può sparire subito con parent purge o account delete | Serve registro decisione minimo più durevole per motivazioni/ricorsi? Non allungare tutta la UGC automaticamente |
| board_audit | Action/op/fingerprint/actor/report/time; FK cascade report/actor | Non include testo, snapshot previous/new o motivazione completa; non sopravvive sempre al delete | Sufficienza accountability/redress; se serve estendere, task minimo separato |
| Evidence held | Capture body≤280/reason/archived/hold al delete; non copia automatica per tutti i report | Non contiene author_id ma contenuto/hold correlabile; hold attivo senza expiry automatico | Finalità/condizione, reviewer, durata massima/riesame, release esplicita e accessi; mai discovery |
| Hold rilasciato + evidence/audit | released_safety_metadata 180 d candidato da release; cascade evidence e hold audit secondo 023 | Nessun purge mentre hold attivo; pausa/outage differisce; revisione professionale richiesta | Parametro definitivo ed esclusioni motivate, nessuna nuova durata legale scelta |
| board_receipts | board_metadata 7 d candidato da created_at; user cascade. Create fingerprint hash testo +venue | Hash non anonimizzazione; finestra nonce accoppiata alla durata | Necessità 7 d, minimizzazione e test se si cambia durata |
| board_quota | 7 d candidato, cutoff giorno Europe/Rome; user/venue cascade | Non conta presenza; day +venue è comunque dato riferibile all'utente | Trattamento anti-abuso e tempi minimi necessari |
| retention_runs | technical_receipts 7 d candidato, aggregati senza UGC/UID | Conserva esito/policy/op/time, non autore; policy version avanza con config | Evidenza minima e logging di fallimenti senza contenuti |
| Log/network/provider, backup, screenshot/export | Non governati dal solo purge 026 | TTL/copie/regioni non ancora verificati; delete non cancella snapshot immutabili immediatamente | Inventario provider/backup e disclosure, reapply deletion prima restore |

Tutte le durate di legal policy: **LEGAL VALIDATION PENDING**. Nessun “24 h garantite di cancellazione fisica ovunque”. Ogni sospensione di purge deve avere caso, reviewer, review_at e motivazione; review_at è controllo operativo, non autorizzazione al purge cieco. Parametri cambiano soltanto con approvazione e test, inclusa compatibilità nonce/receipt e quota. Il wrapper board non usa batch_size per limitare tutti i loop: hardening/carico da valutare prima del pilot.

## Retention core: proposta e stato separati

| Categoria | Default design staging | In produzione/main documentato | Gate |
|---|---|---|---|
| Check-in | Purge scaduti al ciclo utile, obiettivo massimo 24 h dopo scadenza, senza storico; live 90 min | Scadenza live 90 min; riga propria può restare fino rinnovo/delete | Config e SLO da validare, safety hold separato se giustificato |
| Spot non ricambiati |90 giorni, esclusi reciproci/match/hold | Nessun TTL generalizzato del candidato attivo | Approvazione parametri e rollout |
| Match senza chat |90 giorni, esclusi hold/report necessari | Persistenti salvo delete | Avvisi/aspettativa utente da validare |
| Chat inattive |12 mesi calendario dall'ultimo messaggio, purge match +chat se eleggibili | Nessun purge inattività attivo del candidato | Preavviso è proposta, **non implementato**; protezione casi/hold |
| Report profilo conclusi |180 giorni, guard report/hold/sanzioni, audit standalone distinto | Modello precedente senza tutta la retention 023/025 | Closed non dedotto da semplice reviewed, policy da validare |
| Diagnostica / security app |7 giorni /30 giorni design | Diagnostica RAM 30 eventi, provider log separati | Non promettere TTL vendor identico |
| PHOTO | Current; retired 5 min, draft 24 h, receipts concluse 7 d; review incerti senza purge solo età | PHOTO-01/02 DONE operativa | Non riaprire; validazione disclosure, copertura backup separata |
| Tribe | Membership persistente fino delete, nessun last_visit/visite dopo 022 | Ultimo timestamp interno legacy da 022 non ancora rollato | Necessità/proporzionalità membership e diritti granulari professionista |

## Access/export/delete Bacheca

| Operazione | Copertura verificata | Esclusione / percorso manuale da validare |
|---|---|---|
| Access ai propri post | my_rights_page board_posts: id, text, venue_id, created_at, expires_at, inclusi hidden/scaduti ancora conservati | Nessun recupero del contenuto già purgato; no contenuti peer |
| Own reactions | board_reactions: post_id, kind | Nessun roster; dati personali tecnici correlabili trattati su richiesta manuale |
| Own reports | board_reports: id, reason, state, created_at | Non include automaticamente post_id/testo/report ricevuti/claim/audit/identità altrui; non è diniego legale generale |
| Export |18 categorie opt-in contro baseline 15; owner per pagina, 100/page, 10 k rows/8 MiB fail esplicito; non snapshot transazionale | Binary foto complete, messaggi ricevuti, log/provider, ruoli/azioni/evidence personali: inventario RIGHTS I/E/V e procedura manuale, non esclusioni assolute |
| Autore anonimo altrui | Non incluso in feed/RIGHTS/reactions; reveal solo staff case | Il professionista decide conflitti accesso/terzi/safety, nessuna disclosure automatica del reporter |
| Delete proprio post | Owner-only anche restricted/revoked; idempotente; elimina parent/figli ordinari; non rimborsa quota | Hold esplicito può catturare minima evidence privata; operatore non può promettere erase copie già lette |
| Delete account | Auth/profile e board ordinary cascade; prepare capture held; normale lifecycle PHOTO e retry, vecchio JWT denied | Technical receipts PHOTO 7 d previste; held evidence e copie vendor/backup trattate separatamente, mai account utilizzabile |
| Anti-resurrezione | Receipt exact replay, nonce vecchio/futuro/invalid rejected, post purgato non ricreato; retry delete innocuo | Restore cloud con reapply deletion ancora non collaudato: blocker recovery |

Diritti, segnalazioni e assistenza non devono dipendere dal consenso dating attivo. Own delete non richiede eligibility Bacheca; staff non può usare il pannello per vedere preferenze/chat/location non necessarie. Match e chat esistenti non vengono cancellati dalla revoca; account delete comporta cascade relazione anche per l'altro partecipante. Non confondere revoca dating, delete post, sanzione e delete account.

## Moderazione: flusso e capability realmente implementati

1. Utente eligible della Tribe segnala un post ancora visibile. Reason codes: `harassment`, `fake_profile`, `underage`, `inappropriate`, `other`; niente dettagli liberi duplicati nella tabella board_reports, reference al post originale. La UI conferma invio, non emette una decisione legale.
2. MODERATOR/ADMIN personali e MFA verificata/AAL2 accedono alla queue keyset; non ricevono reporter o author automaticamente. Claim 15 min/revision protegge azioni concorrenti. Chi ha claim valido può resolve_author del caso, accesso auditato. Ruoli e fattore ricontrollati anche con JWT esistente.
3. Azioni board: claim/review/dismiss/**hide**/warn/suspend/ban/resolve_author. “Remove” nel prodotto è ** hide**, non cancellazione fisica immediata; niente restore post nel MVP. MODERATOR può warn/suspend, ban ADMIN-only. Note/azioni non danno accesso automatico a chat complete, consensi o location.
4. Suspension nasconde permanentemente i post già esistenti e blocca nuove operazioni; expiry/release account non li ripubblica. Ban senza scadenza fino release autorizzata. Release amministrativa della restrizione è disponibile; non è un sistema completo di ricorso UGC con motivazioni e comunicazioni.
5. Audit board contiene reference/actor/action/op/fingerprint/time; warning usa anche audit moderation esistente. Non copia automaticamente testo/author in audit. Non esiste prova di notifica motivata completa a autore e segnalante per tutte le decisioni. Il professionista deve valutare durata/completezza di decision records che oggi cascandano.
6. Escalation safety: owner Federico + sostituto da nominare; urgenze concrete, minori, doxxing, minacce o contenuti potenzialmente illegali richiedono triage umano e percorso esterno con professionista. Non scaricare/inoltrare media illegali, non chiedere documenti dei minori per email. Conservazione minima solo hold esplicito e accesso ristretto, non cronologia chat/foto a tappeto.

Appeal già supportato tecnicamente: ADMIN release/reopen nel core e release restrizione; non auto-ripubblicazione post. Appeal pubblico, tracking, decisione motivata, tempi/canali e reviewer distinto sono procedure **da completare**, non funzionalità implementate da questo dossier.

## DSA / UGC — checklist da far qualificare al professionista

La [Commissione europea](https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers) descrive reporting, trasparenza delle decisioni e rimedi con obblighi differenziati per servizio/dimensione. Non assumiamo la qualificazione giuridica di Soma, la natura pubblica della Tribe o esenzioni soltanto perché il pilot è piccolo. Il testo DSA EUR-Lex è il riferimento da verificare; accesso automatizzato al testo integrale bloccato in questo task, nessuna interpretazione puntuale basata su una versione draft 2020.

| Check | Capacità disponibile / gap | Domanda e prova di chiusura |
|---|---|---|
| DSA-01 Qualificazione | Tribe persistente, potenzialmente >200, peer UGC + dating | Hosting/platform/disseminazione al pubblico? Quali regole/esenzioni applicabili all'operatore concreto? Parere scritto |
| DSA-02 Contact | Casella founder approvata, operatività da provare | Quali contatti utenti/autorità e informazioni vanno pubblicati? Accessibilità senza account e fallback testati |
| DSA-03 Notice | Report in-app richiede membership/eligibility e post non scaduto; cinque reason codes | Serve canale anche terzi/restricted e quali campi per segnalazione sufficientemente precisa? Non dire “form completo DSA” |
| DSA-04 Acknowledgement/outcome | Solo messaggio invio; rights status proprio, nessuna consegna caso completa provata | Ricevuta/decisione al segnalante, motivazione all'autore e delivery sicuro richiesti? Template e test futuri |
| DSA-05 Decision reasons | Hide/warn/suspend/ban auditati, avvisi core minimali | Quale motivazione/rule/evidence/ref/ambito/durata/rimedi comunicare senza reporter? Task dedicato se necessario |
| DSA-06 Policy | Community/Terms solo draft del pack | Regole comprensibili, applicazione coerente, restrizioni e limiti; versione/accettazione/delivery da validare |
| DSA-07 Appeal | Release/reopen staff, nessun workflow pubblico completo | Percorso, indipendenza reviewer, eventuali rimedi esterni e tempi applicabili? Non inventare esenzioni |
| DSA-08 Grave illegal | Triage ed escalation non ancora provati | Condizioni di escalation ad autorità e conservazione minima? Canali/contatti/formazione e tabletop senza invii reali |
| DSA-09 Records/transparency | Queue/audit non report trasparenza; parent purge può eliminare decisione | Servono record/report/trasmissioni e con quale retention? Non attivare database pubblico o export PII automaticamente |
| DSA-10 Automated decisions | Nessuna AI di moderation; filtri eligibility/quota/expiry deterministici | Come spiegare automazioni e intervento umano, evitando di promettere controllo umano su ogni post? |

Checklist non equivale a conclusione di applicabilità o adempimento. Se la review richiede nuovi campi, canali o conservazioni, prima design e task indipendente con test di minimizzazione; nessuna modifica in questo task.
