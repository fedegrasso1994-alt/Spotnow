# Soma — Pre-pilot legal / operational decision sheet

Data: 6 ottobre 2026. Perimetro: **solo PRIV-01, SAFE-01, OPS-01**. Documento interno di decisione; non è un'informativa, Terms o Cookie Policy e non approva basi giuridiche, retention o conformità.

## A. Executive Summary

Soma ha strumenti tecnici utili — check-in server di 90 minuti, blocco, segnalazione, sospensione e cancellazione account — ma questi non sostituiscono decisioni su dati dating, minori e gestione operativa. **SEC-01 e LOC-01 sono già corretti, con migrations 014 e 015 applicate/versionate**: preference privata; discovery Ora senza timestamp precisi degli altri. I passaggi dell'audit che descrivono quei difetti rappresentano lo stato precedente, non un nuovo finding di questo task.

**Decisioni founder definitive — DECISIONE FOUNDER APPROVATA:**

- **Scala:** 2 università, oltre 200 utenti registrati; crescita progressiva, senza assumere un limite di 100 utenti. Architettura operativa e safety da dimensionare fin dall’inizio per questa scala. Nessun tetto massimo preciso approvato oltre “>200”.
- **Paese e lingua:** primo pilot reale **Italia soltanto**, lingua operativa iniziale **italiano**. Nessun altro paese UE/SEE incluso nel primo pilot.
- **18+: OPTION B APPROVATA DAL FOUNDER** — età numerica >=18, dichiarazione esplicita “Dichiaro di avere almeno 18 anni”, report underage e sospensione manuale. Nessun KYC/documento e nessun invio documenti via email; age assurance più forte da rivalutare in futuro. **LEGAL REVIEW REQUIRED**; sufficienza legale non convalidata, dichiarazione aggiuntiva non implementata.
- **Supporto:** casella unica **somadatingapp@gmail.com** per SUPPORTO, PRIVACY, SAFETY, RICORSO; MFA obbligatoria, recovery configurato, accesso ristretto, categorie/label separate e test ricezione prima del pilot. Configurazione e prova **DA COMPLETARE**.
- **Moderazione:** Federico owner principale + **1 sostituto autorizzato**, account personali mai condivisi e least privilege. Accesso solo agli strumenti necessari, nessun accesso automatico a Supabase/GitHub/Vercel o chat complete; privilegi maggiori solo se tecnicamente necessari e revoca documentata. Persona, nome, finestre, formazione e accessi **DA COMPLETARE**; nessuna copertura continua garantita.
- **Università/venue:** esposizione/distribuzione QR e recruiting generale consentiti; nessun dato individuale, lista utenti, preferenza, match, chat, report o Tribe individuale ricevuto. Nessun admin o moderazione account Soma; nessun export/screenshot/dato individuale condiviso. Ruolo effettivo **LEGAL REVIEW REQUIRED** in base agli accordi reali.
- **Legal review:** non ora durante il technical hardening; **prima dell’apertura a utenti reali**. Professionista privacy/tech **DA INDIVIDUARE**; pacchetto indicato in D-12. Nessuna validazione ricevuta.
- Identità già indicata: **Federico Grasso**, brand **Soma**, recapito **somadatingapp@gmail.com**. Questa conferma non sostituisce la validazione del ruolo legale.

La crescita progressiva organizza gli ingressi, senza ridimensionare il piano a 100 utenti o a una sola venue. Copertura, coda completa, escalation e recupero devono essere pianificati per 2 università e >200 registrati; simultaneità e volume casi rimangono da stimare. Le decisioni founder sono approvate; attività operative e verifiche legali rimangono distinte. L’apertura reale resta subordinata ai blocker sotto.

**Come usare la scheda:** per le scelte approvate completare le attività indicate senza riaprire la decisione; per le scelte ancora aperte rispondere usando ID + opzione. “DECISIONE FOUNDER APPROVATA” non significa implementazione effettuata, procedura provata o validazione legale. Nessuna decisione autorizza implementazioni in questo task.

Fonti: [audit completo](soma-privacy-security-audit-2026-10-06.md), [regole repository](../AGENTS.md), codice corrente e migrations 001–015. Conferme mirate: `src/domain.js`, `src/backend.js`, `src/report-prompt.js`, `src/admin.js`, `src/live.js`, `src/live-social.js`, `src/supabase-client.js`, `index.html`, `supabase/functions/delete-account/index.ts`, contratti SQL. Le configurazioni provider non sono state ricontrollate nei dashboard in questo task: i riscontri del 5–6 ottobre restano datati, non garanzie attuali.

Quadro da far applicare al professionista: finalità e condizioni del trattamento, informazione, diritti, accordi con fornitori, trasferimenti, incidenti ed eventuale valutazione d'impatto. Nessuna conclusione automatica sulla base giuridica o sull'obbligo di DPIA. Riferimento ufficiale: [GDPR, testo EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng).

## B. Founder Decisions — BLOCKER PILOT

`BLOCKER PILOT` significa che manca una scelta o una capacità necessaria per raccomandare l'apertura in questo perimetro; non indica che ogni voce corrisponda a uno specifico obbligo di legge.

| ID | Decisione da chiudere | Evidenza richiesta per considerarla chiusa |
|---|---|---|
| F-01 | **DECISIONE FOUNDER APPROVATA:** 2 università, >200 registrati, crescita progressiva; Federico + 1 sostituto | **DA COMPLETARE:** sostituto, finestre, formazione, accessi e capacità safety per la scala approvata; stop nuove adesioni verificato |
| G-01 / G-02 | Identità da convalidare; **DECISIONE FOUNDER APPROVATA:** least privilege e perimetro università/venue | **DA COMPLETARE:** inventario accessi e revoche; LEGAL REVIEW REQUIRED su ruoli/accordi e identità |
| D-01–D-12 | Dati dating ancora da valutare; **DECISIONE FOUNDER APPROVATA:** Italia-only, italiano, review dopo hardening e prima degli utenti reali | Professionista e pacchetto **DA COMPLETARE**; LEGAL REVIEW REQUIRED; successivi testi/flussi da realizzare separatamente |
| E-01 | **OPTION B APPROVATA DAL FOUNDER**; nessun KYC/documento | Dichiarazione esplicita e prova del flusso **DA COMPLETARE** in futuro; escalation da provare; LEGAL REVIEW REQUIRED |
| F-02 / F-03 | Triage da definire; **DECISIONE FOUNDER APPROVATA:** casella unica con requisiti di sicurezza | MFA/recovery/label/accessi/test **DA COMPLETARE**; prove triage, sospensione e ricorso con account di test |
| H-01 | Retention e cancellazione/evidenze | Matrice approvata, proprietario per ogni lifecycle, conflitti risolti e gap tecnici assegnati |
| I-01 | Diritti gestibili davvero | Procedura manuale, identità, consegna protetta, responsabile e calendario validati |
| J-01 | Incidenti e recupero | Owner, contatti, contenimento server e disponibilità di copie/restore verificati |
| K-01 | Provider e trasferimenti | Accordi applicabili/configurazioni raccolti; punti incerti sottoposti a review |

Le sette decisioni founder riportate in A sono approvate. Una riga rimane aperta quando mancano operatività, implementazione futura o validazione legale: nomina, accessi e prove restano DA COMPLETARE. La legal review è rinviata durante il technical hardening, ma rimane un blocker prima degli utenti reali. Gli eventuali task tecnici successivi sono da autorizzare e collaudare uno per volta.

## C. Founder Decisions — BEFORE PILOT

| ID | Scelta operativa | Criterio di chiusura |
|---|---|---|
| C-01 | Registro casi e riconciliazione coda | Metodo protetto scelto; nessun caso perso oltre le prime 100 segnalazioni |
| C-02 | **DECISIONE FOUNDER APPROVATA:** crescita progressiva per 2 università e >200 registrati | Checkpoint, data, segnali di sovraccarico e criterio di stop **DA COMPLETARE**; nessun limite assunto di 100 utenti |
| C-03 | Prove end-to-end manuali | Contatto, richiesta dati, minorenne simulato, sospensione, ricorso, cancellazione e incidente simulati senza dati reali |

### C-01 — Scegliere un registro minimo dei casi

DECISION: Scegliere un registro minimo dei casi. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Email e dashboard possono perdere il seguito di un caso.  
CURRENT STATE: Admin mostra al massimo 100 report recenti; refresh manuale. Audit azioni presente, ma non equivale a un registro completo delle richieste email.  
OPTIONS: Registro protetto con ID, categoria, priorità, owner, stato e prossima azione; oppure processo documentato con cartelle email e riconciliazione.  
RECOMMENDED PRODUCT/TECH OPTION: Registro minimo ad accesso ristretto, senza copiare chat/foto; verificare che la coda sia interamente consultabile alla scala scelta. Niente fogli pubblici o dati reali su GitHub.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BEFORE PILOT  

### C-02 — Definire checkpoint e stop del pilot

DECISION: Definire checkpoint e stop del pilot. **DECISIONE FOUNDER APPROVATA:** 2 università, >200 registrati, crescita progressiva senza limite assunto di 100 utenti. Checkpoint e criteri operativi **DA COMPLETARE**.  
WHY IT MATTERS: La capacità reale emerge solo durante l’apertura.  
CURRENT STATE: Perimetro founder approvato; nessun tetto massimo preciso oltre “>200”. Simultaneità prevista, carico segnalazioni, calendario e stop non ancora definiti o verificati.  
OPTIONS: Crescita progressiva approvata. Da definire: frequenza dei riesami, segnali di sovraccarico e condizioni di stop, senza ridurre la scala pianificata.  
RECOMMENDED PRODUCT/TECH OPTION: Pianificare copertura, coda ed escalation per 2 università e >200 registrati fin dall’inizio. Aumentare gli ingressi solo se non ci sono urgenti non assegnati, arretrati oltre i target interni o incidenti aperti; verificare in futuro come fermare nuove adesioni se manca copertura.  
LEGAL REVIEW REQUIRED: NO  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BEFORE PILOT  

### C-03 — Provare le procedure prima dei dati reali

DECISION: Provare le procedure prima dei dati reali. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Una procedura scritta può non essere eseguibile con gli accessi disponibili.  
CURRENT STATE: Suite tecnica presente; questo task non ha provato inbox, provider o procedure umane in produzione.  
OPTIONS: Simulazione con account di test autorizzati; oppure apertura senza prova.  
RECOMMENDED PRODUCT/TECH OPTION: Simulazione con esito e owner registrati; niente segnalazioni false a persone reali. Separare test app da verifica operativa.  
LEGAL REVIEW REQUIRED: NO  
CODE CHANGE REQUIRED: NO  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BEFORE PILOT  

## D. PRIV-01 Decision Sheet

Per tutte le aree: il professionista deve valutare finalità, necessità, destinatari, condizioni applicabili e informazione. Se esistono più alternative legali: **LEGAL REVIEW REQUIRED**, senza selezionarne una qui. `MAYBE` significa che la decisione può richiedere codice/UI in un task futuro; nessun intervento avviene ora.

### D-01 — Gender

DECISION: Gender. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Il genere è visibile e combinabile con preferenze e interazioni.  
CURRENT STATE: Campo M/F nel profilo e filtri esistenti.  
OPTIONS: Confermare uso dating attuale; oppure ridefinire campo/visibilità in task separato.  
RECOMMENDED PRODUCT/TECH OPTION: Limitare al flusso attuale, senza nuovi attributi o usi commerciali. Avvocato: necessità e classificazione anche nel contesto delle inferenze.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-02 — Preference

DECISION: Preference. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: La scelta dei destinatari può rivelare aspetti della vita privata.  
CURRENT STATE: M/F/ALL usata dal server; SEC-01 ne impedisce la lettura nel profilo di altri. Il proprio profilo la conserva.  
OPTIONS: Uso esclusivo per compatibilità; oppure finalità ulteriori da valutare separatamente.  
RECOMMENDED PRODUCT/TECH OPTION: Confermare uso esclusivo per discovery/matching; nessuna pubblicazione o statistiche personali. Avvocato: condizioni del trattamento e informazione specifica.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-03 — Spot

DECISION: Spot. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Un interesse identifica persone, luogo e momento dell’interazione.  
CURRENT STATE: Interessi persistenti nel DB; nessuna UI di ritiro richiesta dal prodotto. Blocco limita interazione, non cancella automaticamente lo Spot.  
OPTIONS: Confermare esperienza attuale con diritti manuali valutati; oppure futura revoca/modifica lifecycle.  
RECOMMENDED PRODUCT/TECH OPTION: Descrivere destinatari e persistenza prima dell’uso; non promettere cancellazione al blocco. Avvocato: diritti pertinenti e compatibilità della mancata revoca UI.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-04 — Match

DECISION: Match. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Relazione reciproca e venue possono rivelare informazioni personali.  
CURRENT STATE: Relazione persistente; eliminare un account elimina le relazioni coinvolte.  
OPTIONS: Conservazione legata al servizio e criteri di inattività da scegliere; oppure modifica successiva.  
RECOMMENDED PRODUCT/TECH OPTION: Non usare i match per altri scopi. Avvocato: condizioni, destinatari e gestione della cancellazione con effetti sull’altra persona.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-05 — Chat

DECISION: Chat. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Testo libero può contenere dati intimi e informazioni di terzi.  
CURRENT STATE: Messaggi nel DB senza TTL; nessun export self-service o report collegato a un singolo messaggio. Non risultano cifrati end-to-end.  
OPTIONS: Confermare chat con conservazione definita; oppure limitare funzionalità dopo review.  
RECOMMENDED PRODUCT/TECH OPTION: Niente analisi pubblicitaria o profilazione dei testi; accesso amministrativo solo motivato e autorizzato. Avvocato: contenuti sensibili, limiti lettura, diritti di entrambe le parti e prove abuso.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-06 — Tribe membership

DECISION: Tribe membership. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Essere in una Tribe rivela associazione a un luogo anche fuori Ora.  
CURRENT STATE: Membership per utente/venue dopo check-in; activity_window NULL, nessuna scadenza automatica; nessun pulsante lascia Tribe.  
OPTIONS: Confermare persistenza con criteri approvati; oppure futuro lifecycle diverso.  
RECOMMENDED PRODUCT/TECH OPTION: Spiegare che 90 minuti non cancellano l’appartenenza. Conservare la scelta prodotto come proposta da validare, non eccezione ai diritti. Avvocato: necessità, durata e richieste individuali.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-07 — Venue frequentate

DECISION: Venue frequentate. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: L’elenco di appartenenze può costruire un quadro della vita privata.  
CURRENT STATE: Associazioni DB e liste Tribe; assenza GPS. QR condivisibile: non prova incontrovertibile di presenza fisica.  
OPTIONS: Solo comunità/discovery; oppure eventuali analisi future separate.  
RECOMMENDED PRODUCT/TECH OPTION: Nessun dossier delle visite e nessuna consegna di profili alla venue. Avvocato: informazione sulla visibilità e rischi del collegamento fra luoghi.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-08 — Check-in

DECISION: Check-in. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: La presenza attuale è un dato di luogo, anche senza geolocalizzazione.  
CURRENT STATE: Server conserva checked_in_at/expires_at; filtro Ora 90 minuti. LOC-01: altri non ricevono timestamp precisi; proprio flusso li mantiene. Righe scadute persistono.  
OPTIONS: Confermare Ora attuale e decidere separatamente lifecycle righe; oppure futura minimizzazione interna.  
RECOMMENDED PRODUCT/TECH OPTION: Preservare timer e contratto corretto. Avvocato: finalità/trasparenza e durata del dato interno. Non confondere fine visibilità con cancellazione.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-09 — Foto

DECISION: Foto. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Immagine e metadati possono identificare e rivelare informazioni personali.  
CURRENT STATE: Foto obbligatoria; originale e varianti in bucket privato, URL firmati brevi. Nessuna garanzia completa di rimozione EXIF o purge vecchie foto.  
OPTIONS: Confermare foto obbligatoria con lifecycle definito; oppure futura revisione requisiti.  
RECOMMENDED PRODUCT/TECH OPTION: Niente riconoscimento facciale/KYC; valutare metadati e vecchie copie in task dedicato dopo decisione. Avvocato: finalità, visibilità e contenuti; una normale foto non implica automaticamente biometria.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-10 — Report e safety

DECISION: Report e safety. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Segnalazioni possono includere accuse, dati sensibili e dati di terzi.  
CURRENT STATE: Categorie e dettagli fino a 1.000 caratteri; accesso moderatori; nessuna durata definita. Cancellazione account può eliminare report/audit coinvolti.  
OPTIONS: Solo evidenza minima; oppure conservazione separata motivata dopo review.  
RECOMMENDED PRODUCT/TECH OPTION: Limitare testo ed evidenze al caso; evitare lettura indiscriminata delle chat e invio documenti. Avvocato: condizioni, accessi, tutela segnalante, conservazione e ricorso.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-11 — Inferenze su orientamento o vita privata

DECISION: Inferenze su orientamento o vita privata. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: La combinazione è rilevante anche senza un campo esplicito di orientamento.  
CURRENT STATE: Nessun motore inferenziale trovato; genere/preference/interessi/match/chat/venue consentono comunque deduzioni.  
OPTIONS: Escludere inferenze ulteriori; oppure qualsiasi nuovo uso con analisi separata.  
RECOMMENDED PRODUCT/TECH OPTION: Escludere segmentazioni e classificazioni ulteriori. Avvocato: valutare dati e inferenze insieme, ed eventuale DPIA rispetto alla scala reale; non assumere che dato privato equivalga a rischio nullo.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### D-12 — Chiudere le premesse prima di scrivere informative e flussi

DECISION: Chiudere le premesse prima di scrivere informative e flussi. **DECISIONE FOUNDER APPROVATA:** Italia soltanto, italiano; legal review professionale non durante il technical hardening, ma prima degli utenti reali. Professionista, pacchetto completo e successivi testi/flussi **DA COMPLETARE**; LEGAL REVIEW REQUIRED.  
WHY IT MATTERS: Testi generici o un consenso unico non rappresenterebbero Soma.  
CURRENT STATE: Nessuna informativa/Terms/Cookie Policy completa o registro di consensi implementati; note UI non li sostituiscono. Founder approva il perimetro e il momento della review, non basi giuridiche, retention o sufficienza legale. Professionista privacy/tech ancora da individuare.  
OPTIONS: Scelte paese/lingua e momento della review chiuse. Restano da individuare il professionista e completare le decisioni/evidenze del pacchetto; apertura reale solo dopo review e chiusura dei blocker.  
RECOMMENDED PRODUCT/TECH OPTION: Durante il technical hardening preparare il pacchetto indicato sotto. Prima degli utenti reali ottenere la validazione e poi completare testi e flussi richiesti in task distinti. Nessun testo legale generato ora, nessuna base giuridica scelta; non assumere che accettare Terms autorizzi tutti i trattamenti.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

**Momento e pacchetto della legal review — DECISIONE FOUNDER APPROVATA:** review professionale dopo il technical hardening e prima dell’apertura a utenti reali. Professionista privacy/tech ancora da individuare. Il pacchetto comprenderà almeno:

- privacy/security audit;
- decision sheet aggiornata;
- data map;
- provider checklist;
- retention proposal, chiaramente distinta da retention approvata;
- strategia 18+;
- safety/moderation procedure;
- user rights procedure;
- incident response.

Raccolta, completezza e consegna del pacchetto **DA COMPLETARE**. I materiali esistenti o proposti non diventano validati per il solo inserimento nel pacchetto.

Premesse da consegnare al professionista, ognuna con owner e scelta registrata:

| Premessa | Decisione/evidenza necessaria |
|---|---|
| Identità e contatti | G-01: Federico Grasso; F-03 casella unica approvata, operatività DA COMPLETARE; ulteriori elementi da validare, senza inventare sede/società |
| Perimetro e lingua | DECISIONE FOUNDER APPROVATA: 2 università, >200 registrati, Italia soltanto, italiano; nessun altro paese UE/SEE nel primo pilot |
| Finalità | D-01–D-11: discovery locale, community, match/chat, autenticazione, safety; nessun nuovo uso implicito |
| Necessità dei dati | Campi obbligatori/optional e destinatari per ciascuno; distinguere email Auth dal profilo pubblico |
| Dati dating/inferenze | Classificazione e condizioni applicabili: LEGAL REVIEW REQUIRED |
| Provider/accessi | K-01 e G-02: servizi, contratti applicabili, team e flussi reali |
| Retention | H-01: criteri approvati e comportamento tecnico realmente attuato, incluse copie |
| Diritti/safety | I-01/F-02: canali, responsabili, verifiche identità ed escalation |
| Trasferimenti | K: regioni e percorsi anche per log/supporto/subfornitori; non solo database |
| Consensi/accettazioni | Quali richiesti, quando, granularità, prova, versione e conseguenze del ritiro: da validare |
| Memoria dispositivo/font | Sessione, QR draft, installazione, font remoti: inventario prima di decidere eventuali avvisi/controlli |

| Eventuale richiesta all’utente | Necessaria tecnicamente oggi? | Probabile esigenza legale da valutare | LEGAL REVIEW REQUIRED | Informazione/contratto/altra soluzione possono sostituirla? |
|---|---|---|---|---|
| Consenso per dati dating/categorie particolari | No: il codice oggi funziona senza registro | Possibile esigenza specifica, da valutare sui dati e finalità reali | YES | NON DECISO; non scegliere alternativa qui |
| Accettazione Terms | Nessun gate attuale; eventuale prova è lavoro futuro | Definire condizioni del servizio e metodo di accettazione; non chiamarlo consenso GDPR generale | YES | NON DECISO; informativa e accordo sono scelte distinte |
| Conferma 18+ | Età numerica già necessaria; dichiarazione aggiuntiva non ancora implementata | OPTION B APPROVATA DAL FOUNDER: “Dichiaro di avere almeno 18 anni”; non prova età reale | YES | Scelta prodotto approvata; condizioni/efficacia legale da validare, nessuna alternativa legale scelta |
| Trattamento safety/report | Report funziona senza consenso specifico | Valutare separatamente finalità, evidenze e accessi | YES | NON DECISO; evitare di condizionare la tutela a “consento tutto” |
| Sessione/localStorage/font | Sessione/draft servono a flussi specifici; font è richiesta esterna | Classificare strumenti reali; nessun banner genericamente approvato | YES | NON DECISO; valutare informazione e eventuali controlli |

Se sono necessari consensi/prove: decidere ID finalità, versione del testo, data di accettazione, identità, accessibilità del ritiro ed effetti sul servizio; raccogliere solo evidenza proporzionata. Non implementare il registro ora. Per strumenti su dispositivo, riferimento per la review: [linee guida Garante su cookie e tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876). Non si deduce da questa fonte che Soma debba mostrare un banner standard.

## E. 18+ / Minors Decision Sheet

Stato verificato: età intera 18–120, validazione client/backend e CHECK DB. È autodichiarata e modificabile, senza data di nascita/verifica documentale. Un account Auth può esistere prima di completare il profilo; quindi il gate del profilo non prova che nessun dato sia raccolto prima della verifica 18+. Google OAuth non costituisce age assurance di Soma.

| Opzione | Efficacia | Privacy | Frizione | Complessità / costo | Rischio residuo | Valutazione per 2 università e >200 registrati | Review |
|---|---|---|---|---|---|---|---|
| A: età autodichiarata + Terms + report underage + sospensione | Filtra errori/dichiarazioni oneste, non falsi | Pochi dati aggiuntivi | Bassa | Bassa; lavoro umano ricorrente | Minore può mentire e restare fino al triage | Non scelta dal founder; non dimensionare safety come pilot ridotto | LEGAL REVIEW REQUIRED |
| B: età numerica >=18 + “Dichiaro di avere almeno 18 anni” + report underage + sospensione manuale | Aggiunge chiarezza, non verifica indipendente | Minimo incremento; prova da definire | Un passaggio breve | Bassa; flusso/versionamento futuri | Simile ad A contro dichiarazioni false | OPTION B APPROVATA DAL FOUNDER; capacità safety per scala approvata, sufficienza legale non convalidata | LEGAL REVIEW REQUIRED |
| C: age assurance più forte | Dipende dal metodo, tassi di errore e anti-elusione | Variabile; preferire solo esito di soglia | Media/variabile | Media-alta; costo da preventivare | Falsi positivi/negativi, esclusioni, elusione | Valutare rischio effettivo, accessibilità e disponibilità; scala maggiore richiede riesame | LEGAL REVIEW REQUIRED |
| D: KYC/documenti | Potenzialmente più forte se autenticità e titolare verificati | Elevato se si raccolgono copie/identità | Alta | Alta; gestione sicurezza e contestazioni | Documenti prestati/falsi; rischio leak | Non scelta dal founder; nessun KYC/documento nel piano approvato | LEGAL REVIEW REQUIRED |

Sono stime comparative di prodotto, non percentuali di accuratezza né preventivi. OPTION B è la scelta founder approvata. C è da rivalutare in futuro; D non è previsto: nessun KYC/documento, nessun invio documenti via email. La tabella confronta opzioni, non approva Terms o misure alternative e non attesta sufficienza legale. La review dell'age assurance dovrà esaminare proporzionalità e minimizzazione, usando anche lo [Statement EDPB 1/2025](https://www.edpb.europa.eu/documents/statement/statement-12025-on-age-assurance_en).

### E-01 — Scegliere il metodo 18+ per il perimetro effettivo

DECISION: Scegliere il metodo 18+ per il perimetro effettivo. **OPTION B APPROVATA DAL FOUNDER — DECISIONE FOUNDER APPROVATA**. Dichiarazione aggiuntiva e collaudo **DA COMPLETARE** in task futuri; LEGAL REVIEW REQUIRED.  
WHY IT MATTERS: A/B non impediscono a un minorenne di mentire.  
CURRENT STATE: Autodichiarazione numerica e report/sospensione presenti; nessuna verifica indipendente. La dichiarazione “Dichiaro di avere almeno 18 anni” non è implementata. Pianificazione: 2 università e >200 utenti registrati.  
OPTIONS: Scelta chiusa: OPTION B, età numerica >=18 + “Dichiaro di avere almeno 18 anni” + report underage + sospensione manuale. Nessun KYC/documento, nessun invio documenti via email. Age assurance più forte da rivalutare in futuro.  
RECOMMENDED PRODUCT/TECH OPTION: Registrare B come requisito futuro e dimensionare triage/sospensione per 2 università e >200 registrati. Implementazione e prove in task separati; mantenere LEGAL REVIEW REQUIRED prima degli utenti reali. La scelta non costituisce validazione di sufficienza legale.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: YES — in un task futuro per la dichiarazione aggiuntiva; nessuna implementazione ora  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

## F. Safety & Moderation Procedure

### F-01 — Dimensionare copertura per 2 università e oltre 200 utenti registrati

DECISION: Dimensionare copertura per 2 università e >200 utenti registrati, con crescita progressiva senza limite assunto di 100 utenti. **DECISIONE FOUNDER APPROVATA:** Federico owner principale + 1 sostituto autorizzato. Persona, nome, finestre, formazione e accessi **DA COMPLETARE**.  
WHY IT MATTERS: Casi urgenti possono arrivare tra due controlli; operatività e safety devono essere dimensionate per la scala approvata, non per un pilot ridotto.  
CURRENT STATE: Federico controlla solo in alcuni momenti. Owner e un sostituto sono approvati come modello; la persona e la copertura non sono ancora operative. Nessuna copertura continua garantita, nessun tetto massimo preciso approvato oltre “>200”.  
OPTIONS: Scelte chiuse: 2 università, >200 registrati, crescita progressiva; Federico + 1 sostituto. Da completare persona, orari, formazione, assegnazione casi, accessi minimi e stop.  
RECOMMENDED PRODUCT/TECH OPTION: Preparare coda completa, triage ed escalation per la scala approvata. Account personali mai condivisi, least privilege, strumenti solo necessari, nessun accesso automatico a Supabase/GitHub/Vercel/chat complete; privilegi maggiori solo se tecnicamente necessari e revoca documentata. Stop nuove adesioni non protegge da solo gli utenti già presenti: per incidenti gravi serve contenimento server.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### F-02 — Approvare triage, sospensione cautelativa e ricorso

DECISION: Approvare triage, sospensione cautelativa e ricorso. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Il solo pulsante report non assicura intervento o riesame.  
CURRENT STATE: Report profilo: harassment/fake_profile/underage/inappropriate/other; blocco suggerito e opzionale. Admin: review/dismiss/suspend/revoke, nota per sospensione; refresh manuale.  
OPTIONS: Gestione manuale documentata con priorità e secondo referente; futura automazione solo se necessaria.  
RECOMMENDED PRODUCT/TECH OPTION: Usare gli strumenti esistenti, definire chi decide e come riesamina, collegare ogni azione a ID caso. Verificare che coda completa e contatto urgente siano raggiungibili. Non promettere rimozione contenuti singoli che l’admin non offre.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

**Target proposti, non approvati:** durante le finestre di copertura, triage urgente entro 1 ora dalla ricezione; ordinario entro la finestra successiva, con obiettivo 24 ore; presa in carico privacy entro 2 giorni lavorativi. Fuori copertura, urgente alla prima finestra disponibile: questo lascia un rischio esplicito e non costituisce servizio continuo. Prima del pilot scegliere finestre/sostituto e target realmente sostenibili. Non sono termini legali né garanzie pubbliche; scadenze applicabili e comunicazioni le valida il professionista.

| Caso | Ingresso oggi / capacità admin | Gap | Procedura minima proposta | Target interno / review / tecnica |
|---|---|---|---|---|
| Sospetto minorenne | Report underage; sospensione account | Nessuna verifica età reale/escalation definita | Priorità urgente; valutare segnalazione minima; cautela secondo criteri concordati; spiegare ricorso e metodo ammesso per riesame. Non chiedere ID di default | Urgente; LEGAL REVIEW REQUIRED; procedura + possibile adeguamento E-01 |
| Molestie | Report harassment e blocco; sospensione | Niente report legato al messaggio | Bloccare contatto, raccogliere ID conversazione/messaggio e breve contesto solo se necessario; valutare reiterazione e sanzione | Ordinario, urgente se rischio concreto; review; collegamento messaggio futura feature MAYBE |
| Minacce | Other/dettagli; sospensione | Nessun percorso urgente dedicato/alert garantito | Triage urgente, limitare contatto, preservare evidenza minima autorizzata, escalation a referente. Non lasciare la persona in attesa dell’email per un pericolo immediato | Urgente; review; canale esposto e copertura da organizzare, tecnica MAYBE |
| Impersonazione/fake | Fake_profile; sospensione | Verifica/ricorso non definiti | Controllare incongruenze e informazioni strettamente pertinenti; cautela; riesame. Nessuna ricerca invasiva/social scraping o documento automatico | Ordinario; urgente se danno imminente; review; principalmente procedura |
| Sessuale/inappropriato | Inappropriate; sospensione | Niente rimozione granulare foto/messaggio admin | Ridurre esposizione tramite strumenti disponibili; distinguere abuso/non consensuale/sospetto minore; usare ID, non copie diffuse | Ordinario o urgente secondo rischio; review; rimozione selettiva possibile task futuro |
| Cancellazione richiesta | Self-service e futura inbox; admin non equivale a delete per conto | Caso fallito non seguito da worker automatico | Confermare identità proporzionata; guidare self-service o operazione autorizzata; seguire errore fino a chiusura, verificare foto/Auth/relazioni | Privacy; review scadenze/evidenze; procedura ora, recupero tecnico MAYBE |
| Emergenza/safety serio | Other e inbox solo se resa operativa; sospensione | Nessuna assistenza continua | Segnalare che inbox/app non è canale di emergenza; per pericolo immediato ricorrere ai servizi di emergenza locali; contenere in app e attivare J senza promettere soccorso | Urgente quando coperto; review; comunicazione/canale futuri MAYBE |

Non richiedere invio di immagini sessuali sospette di minori o documenti nella casella. Per evidenze delicate usare riferimenti interni e coinvolgere il professionista sul metodo corretto; niente download/esportazioni preventive di tutte le chat. Cancellazione può rimuovere report/audit: H deve risolvere il conflitto prima di promettere conservazione delle prove.

### F-03 — Rendere operativa una sola casella per supporto, privacy, safety e ricorsi

DECISION: Rendere operativa una sola casella per supporto, privacy, safety e ricorsi. **DECISIONE FOUNDER APPROVATA:** somadatingapp@gmail.com, con MFA obbligatoria, recovery configurato, accesso ristretto e label separate. MFA/recovery/accessi/label/test ricezione **DA COMPLETARE**.  
WHY IT MATTERS: Gli utenti devono poter segnalare anche quando non riescono ad accedere.  
CURRENT STATE: Casella unica e requisiti approvati; configurazione MFA/recovery, accessi e label non verificati, test ricezione non eseguito. Contatto non esposto come canale completo nell’app.  
OPTIONS: Scelta iniziale chiusa: casella unica somadatingapp@gmail.com per SUPPORTO, PRIVACY, SAFETY, RICORSO; non sono approvate nuove caselle o provider.  
RECOMMENDED PRODUCT/TECH OPTION: Prima del pilot completare MFA obbligatoria, recovery, accesso ristretto, categorie/label SUPPORTO/PRIVACY/SAFETY/RICORSO e test ricezione. Registrare esito e collegamento a C-01; esposizione del contatto in futuro task. Vantaggio: gestione semplice; limiti: singolo punto di guasto, email non è alert urgente e può contenere dati di terzi.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

## G. Controller / Roles Decision Sheet

### G-01 — Convalidare Federico Grasso come identità legale e Soma come brand

DECISION: Convalidare Federico Grasso come identità legale e Soma come brand. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Un brand non sostituisce il soggetto che assume decisioni e risponde alle richieste.  
CURRENT STATE: Nome ed email confermati; nessuna società prevista inizialmente.  
OPTIONS: Federico Grasso nella configurazione attuale; eventuale futura società con transizione separata.  
RECOMMENDED PRODUCT/TECH OPTION: Portare al professionista l’identità confermata e la mappa di chi decide finalità/mezzi. Validare capacità/elementi di contatto necessari prima dei testi. Non inventare sede, partita IVA o DPO. Nome/email non sono da richiedere nuovamente.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

### G-02 — Registrare persone autorizzate e verificare ruolo della venue

DECISION: Registrare persone autorizzate e verificare ruolo di università/venue. **DECISIONE FOUNDER APPROVATA:** Federico + 1 sostituto, account personali e least privilege; QR/recruiting generale senza dati individuali per università/venue. Inventario accessi, persona sostituta e revoche **DA COMPLETARE**; ruolo legale LEGAL REVIEW REQUIRED.  
WHY IT MATTERS: Account cloud e moderatori possono accedere a dati più ampi della UI.  
CURRENT STATE: Perimetro founder approvato: università/venue possono esporre/distribuire QR e supportare recruiting generale. Non ricevono dati individuali, liste utenti, preferenze, match, chat, report o Tribe individuali; nessun admin, moderazione account, export o screenshot condiviso. Membri cloud, recovery e MFA non ricontrollati; principio approvato non equivale ad accessi già configurati.  
OPTIONS: Scelte chiuse: Federico owner + 1 sostituto con accesso solo agli strumenti necessari; università/venue senza privilegi o dati individuali. Restano da inventariare gli accessi reali e verificare gli accordi.  
RECOMMENDED PRODUCT/TECH OPTION: Inventario nominativo piattaforma/privilegio/scopo/revoca/recovery. Account personali, mai condivisi; least privilege; nessun accesso automatico del sostituto a Supabase/GitHub/Vercel/chat complete, privilegi maggiori solo se tecnicamente necessari e revoca documentata. Nessun accesso admin o dato individuale alla venue. Ruolo effettivo da legal review sugli accordi reali; l’owner incidenti J-01 non è automaticamente il sostituto moderazione.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: NO  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

Ruolo effettivo di università/venue: **LEGAL REVIEW REQUIRED** in base agli accordi reali. Il recruiting generale e la distribuzione QR sono approvati; nessun accesso individuale o ruolo di moderazione. Da chiarire negli accordi: chi decide obiettivi/destinatari, come avviene il recruiting generale, eventuali raccolte autonome di contatti, incentivi e ulteriori compiti. Non presumere titolare, responsabile o contitolarità sulla sola esposizione/distribuzione QR. Il divieto di dati individuali comprende liste utenti, preferenze, match, chat, report, Tribe individuali, email, screenshot, esportazioni e supporto; nessun admin o moderazione account Soma. Un gestore che usa l’app come normale utente resta soggetto ai normali flussi, non acquisisce privilegi aziendali.

## H. Retention Decision Matrix

Stato tecnico distinto da retention approvata. Ogni riga sotto richiede **NEEDS LEGAL DECISION** per durata/criterio finale, incluse eccezioni e copie. Nessuna durata nuova viene adottata. I 90 minuti sono visibilità Ora; i 30 secondi sono validità di un URL, non cancellazione foto.

### H-01 — Approvare finalità e criteri di conservazione per categoria

DECISION: Approvare finalità e criteri di conservazione per categoria. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Oggi molti dati restano fino alla cancellazione account, senza un lifecycle complessivo.  
CURRENT STATE: Comportamenti diversi per righe, storage, browser, log e copie. Cancellazione elimina anche relazioni e contenuti che riguardano altri.  
OPTIONS: Criteri basati su servizio/necessità/eventi più soglie convalidate; conservazione indistinta senza decisione.  
RECOMMENDED PRODUCT/TECH OPTION: Compilare la matrice, assegnare owner e trattamento delle eccezioni; poi progettare eventuali purge separati. Non dichiarare retroattivamente approvati i comportamenti attuali.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

| Dato / perché resta oggi | Retention tecnica attuale | Troppo lungo / troppo breve | Criterio candidato, impatto prodotto e futuro task |
|---|---|---|---|
| Profilo / identità pubblica | Nessun TTL; fino delete Auth/cascade | Esposizione inattivi / perdita identità e relazioni | Vita del servizio + inattività da decidere; avviso/chiusura futura. NEEDS LEGAL DECISION |
| Account Auth / continuità accesso | Nessun TTL account; token/sessione non sono durata account | Identificativi persistenti / impossibilità rientro | Allineare al lifecycle account, separare revoca sessione; job futuro se approvato. NEEDS LEGAL DECISION |
| Check-in attivo / Ora | Server +90 min per visibilità; riga resta | Maggiore tracciabilità / timer errato | Preservare esattamente 90 min; decidere retention riga distinta. Nessuna modifica timer. NEEDS LEGAL DECISION |
| Check-in scaduto / ultima riga | Nessun cleanup; sovrascrittura al nuovo check-in o delete | Presenza storica inutile / diagnosi limitata | Cancellazione/minimizzazione dopo uso strettamente motivato, senza numero arbitrario; purge futuro fuori task. NEEDS LEGAL DECISION |
| Tribe membership / community | Una riga utente/venue, activity_window NULL | Storico luoghi permanente / rottura community | Decidere persistenza, inattività ed effetti sui diritti; non cambiare membership qui. NEEDS LEGAL DECISION |
| last_checkin_at / attività per venue | Ultimo timestamp per membership; aggiornato al check-in, senza TTL | Precisione luoghi superflua / futura attività non disponibile | Valutare necessità separata dalla membership e granularità; eventuale minimizzazione futura. NEEDS LEGAL DECISION |
| Spot / interesse | Nessun TTL; blocco non elimina; delete coinvolto elimina | Traccia relazioni / mancato reciproco | Criterio legato a utilità e diritti da approvare; nessuna revoca UI ora. NEEDS LEGAL DECISION |
| Match / relazione | Nessun TTL; cascade alla cancellazione coinvolta | Relazioni inattive / perdita chat | Separare relazione da eventuale evidenza necessaria; lifecycle futuro. NEEDS LEGAL DECISION |
| Chat / conversazione | Nessun TTL; eliminare uno dei partecipanti elimina conversazione/messaggi | Dati intimi persistenti / perdita cronologia e prove | Decidere inattività, effetti su partner, richieste e safety; nessuna durata approvata. NEEDS LEGAL DECISION |
| Block / tutela | Persistente fino cancellazione relazione/account; no UI unblock | Grafo sociale persistente / ricontatto indesiderato | Legare alla tutela finché utile, con riesame e diritti; non equiparare a cancellazione match. NEEDS LEGAL DECISION |
| Report / gestione caso | Nessun TTL; può sparire se reporter/target cancellato | Accuse/evidenze persistenti / impossibilità riesame | Stato caso + necessità motivata/contestazione; risolvere cascade prima di promettere prove. NEEDS LEGAL DECISION |
| Moderation audit / traccia azioni | Nessun TTL; eliminazione casi coinvolti può rimuoverlo | Dossier sanzioni / nessuna responsabilizzazione | Evidenza minima separata solo se convalidata; accessi e purge futuri. NEEDS LEGAL DECISION |
| Foto correnti / profilo | Originale e varianti fino purge/delete; URL firmato 30s, cache variant 3600s | Esposizione/copied metadata / foto mancanti | Legare a foto corrente e autorizzazione; riesaminare metadati/copie. TTL URL non è retention. NEEDS LEGAL DECISION |
| Foto vecchie/orfane / upload/cambio | Nessun TTL/purge automatico completo | Accumulo identificativo / rimozione foto ancora referenziata | Dopo verifica assenza riferimenti e upload in corso; sicurezza concorrente da testare in futuro. NEEDS LEGAL DECISION |
| Account deletion marker / quarantena e retry | Segue workflow; nessun recupero automatico dei casi falliti | Marker/account bloccato / riapparizione dati durante delete | Fino completamento verificato o caso di errore assegnato; criterio retry/chiusura futuro. NEEDS LEGAL DECISION |
| Log / diagnosi e sicurezza | Log cloud: durata non verificata; diagnostica locale max 30 eventi in RAM | URL/identificativi inutili / incidenti non ricostruibili | Inventariare categorie reali e accessi; minimizzare payload, durata per scopo da approvare. NEEDS LEGAL DECISION |
| Backup / recupero | Free storico senza backup progetto; copie/config correnti non verificate | Reintroduzione dati eliminati / perdita irreversibile | RPO/RTO e lifecycle copie, cancellazioni riapplicate al restore; DB backup non include necessariamente byte Storage. NEEDS LEGAL DECISION |
| QR draft/localStorage / recupero ingresso | spot-onboarding-venue-v1 senza TTL; pulizia a eventi del flusso. pending QR in sessionStorage | Token venue persistente / onboarding interrotto | Scadenza/chiusura legata al draft e limiti recupero da decidere; non usare come check-in automatico. NEEDS LEGAL DECISION |
| Sessione/flag installazione / continuità UX | SDK persiste sessione; flag locale installazione senza TTL; SW non conserva chat/foto per offline | Persistenza dispositivo condiviso / nuovo login o prompt ripetuti | Distinguere logout/accountdelete/sessione; criteri dispositivo da convalidare, non retention Auth. NEEDS LEGAL DECISION |

Per ogni criterio da approvare: evento iniziale/finale, durata ove necessaria, eccezioni motivate, copie interessate, responsabile e prova di cancellazione. Non accettare “indefinito perché utile” come decisione implicita. Eventuali conservazioni per controversie sono da valutare, non un diritto automatico a tenere tutto.

## I. User Rights Procedure

### I-01 — Rendere eseguibili le richieste senza export self-service

DECISION: Rendere eseguibili le richieste senza export self-service. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Il tasto elimina account non copre ogni richiesta.  
CURRENT STATE: Modifica profilo e cancellazione account presenti; niente export, leave Tribe o revoca Spot UI.  
OPTIONS: Procedura manuale con verifica proporzionata e consegna protetta; feature self-service più avanti.  
RECOMMENDED PRODUCT/TECH OPTION: Canale unico, ID caso, verifica identità senza password/token/documento di default, ricerca per ID interno e controllo destinatario. Scadenze e condizioni da validare; non inviare copie con dati di terzi senza riesame.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

| Richiesta | Oggi | Manuale prima del pilot | Feature futura / cosa può aspettare |
|---|---|---|---|
| Accesso | Profilo proprio parziale | Inventario categorie/scopi/destinatari; ricerca limitata; verifica identità e risposta convalidata | Dashboard richieste può aspettare; procedura no |
| Correzione | Editing propri campi | Guidare editing; correggere errore dimostrato con operazione autorizzata e traccia minima | Wizard dedicato può aspettare |
| Cancellazione | Conferma UI + Edge workflow | Verificare esito Auth, foto e relazioni; assegnare retry/errori; distinguere backup/log/provider | Automazione recupero può essere necessaria se procedura fallisce; non presumere che possa aspettare |
| Opposizione/ritiro ove pertinente | Nessun flusso specifico; nessun registro consensi | Legal review su applicabilità/effetti; eseguire decisione proporzionata senza obbligare a cancellare tutto come unica risposta | Flussi dedicati secondo decisione; non bypassare diritti con “non c’è pulsante” |
| Copia dati | Nessun export self-service | Preparare copia solo autorizzata, controllare terzi e segnalanti, consegna protetta con accesso limitato | Export self-service può aspettare; capacità manuale verificata no |
| Moderazione/blocco/ricorso | Blocca, report, sospensione/revoca admin | Riesame motivato, tutela identità segnalante, risposta; non sbloccare automaticamente un blocco impostato da un altro | Portale ricorsi può aspettare |

Registro minimo: ID, contatto verificato, tipo, ricezione, responsabile, termine convalidato, stato/esito. Prima del pilot provare una copia e una cancellazione con account di test; evitare dump completi DB inviati per email. La cancellazione attuale può eliminare anche i messaggi dell'altro partecipante; decide la review come spiegarlo e gestire eventuali evidenze, non questo documento.

## J. Incident Response Minimum Plan

### J-01 — Scegliere owner, contenimento e recupero per incidenti

DECISION: Scegliere owner, contenimento e recupero per incidenti. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Un bug di accesso o una perdita dati richiede azioni fuori dalla UI.  
CURRENT STATE: Federico è referente e ha scelto di avere un sostituto; assegnazione del ruolo incidenti, piano cloud e restore produttivo non sono verificati qui.  
OPTIONS: Owner + sostituto e contatti provider/professionista; ingresso graduale fino a prove operative.  
RECOMMENDED PRODUCT/TECH OPTION: Sequenza qui sotto, esercitazione con dati sintetici, accessi di recovery protetti. Decidere perdita massima tollerabile e tempo di ripristino realistici: non promettere “mai incidenti/mai perdita”.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: MAYBE  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

Ordine proposto: (1) Federico o sostituto autorizzato registra ricezione e valuta se fermare accessi; (2) contiene la funzione/credenziale coinvolta lato server, preservando evidenza minima quando compatibile con urgenza; (3) verifica ambito, utenti/dati coinvolti e timeline; (4) contatta provider e professionista tramite recapiti già verificati; (5) corregge con test e autorizzazione mirata; (6) verifica ripristino, segue comunicazioni decise con il professionista e documenta cause/azioni. Non aspettare una raccolta perfetta dei log per contenere un’esposizione attiva.

| Scenario | Contenimento / quando fermare | Evidenza minima / seguito |
|---|---|---|
| Accesso non autorizzato | Revocare accesso/sessioni pertinenti, chiudere percorso compromesso; stop se ambito ignoto o esposizione in corso | ID richieste, orari, actor/ruoli, codice/versione, log pertinenti; review rischio e comunicazioni |
| Admin compromesso | Recovery da account sicuro; revocare ruolo/sessioni, ruotare segreti realmente compromessi; sospendere operazioni privilegiate | Azioni audit/config/team, accessi e timeline; verificare persistenza/accessi aggiunti; review |
| Leak foto/chat | Bloccare endpoint/permessi coinvolti, limitare URL e copie controllabili; stop funzione se leak continua | Identificativi oggetti/messaggi e richiesta che prova l’accesso, non dump contenuti; review; URL scaduto non cancella copie già scaricate |
| Bug RLS | Negare percorso vulnerabile lato server e testare caller reale | Policy/grants/RPC/versione, casi minimi; non rollback a schema precedente a SEC-01/LOC-01; riapertura dopo verifica |
| Delete fallita | Tenere quarantena, assegnare retry e verifica; fermare delete se rischio coinvolge altri account | ID caso, step/codice errore, oggetti residui e stato Auth; non riattivare profilo a caso; review effetti diritti |
| Perdita dati | Fermare scritture se aggravano danno; stimare ambito e copie, restore controllato | Versioni, snapshot disponibili, timeline; verificare DB + Storage e riapplicare cancellazioni/sospensioni prima di riaprire |
| QR online | Verificare ingressi/abuso; disattivare token compromesso con capacità esistente verificata; nuova distribuzione solo se autorizzata | Token ID/venue e URL origine senza propagare segreto; QR copiato non è automaticamente data breach; review se accessi/esposizione dati |

Se non è isolabile il percorso e l’esposizione continua, fermare temporaneamente il servizio dati. Togliere la pagina Vercel da sola non impedisce chiamate dirette alle API. Preservare solo evidenze pertinenti ad accesso ristretto: timeline, ID, versioni, hash, eventi e codici errore; nessun bearer token, password, dump completo foto/chat nei ticket. Il professionista valuta qualificazione dell'incidente, eventuali destinatari, contenuto e termini di notifiche/comunicazioni: nessun obbligo normativo definitivo stabilito qui.

## K. Provider / DPA Checklist

### K-01 — Verificare accordi e configurazioni dei provider reali

DECISION: Verificare accordi e configurazioni dei provider reali. **Stato: DA DECIDERE**, salvo conferme esplicite indicate sotto.  
WHY IT MATTERS: Regione del DB non descrive supporto, log, subfornitori o trasferimenti.  
CURRENT STATE: Provider individuati sotto; configurazioni live e contratti applicabili non verificati in questo task.  
OPTIONS: Raccogliere evidenze account/accordi attuali; ridurre flussi opzionali se motivato in task separato.  
RECOMMENDED PRODUCT/TECH OPTION: Owner Federico: compilare checklist con data/evidenza e portare dubbi al professionista. Nessun nuovo provider scelto; nessuna dichiarazione compliant.  
LEGAL REVIEW REQUIRED: YES  
CODE CHANGE REQUIRED: NO  
DOCUMENTATION REQUIRED: YES  
PRIORITY: BLOCKER PILOT  

Legenda **NV = NOT VERIFIABLE — MANUAL CHECK REQUIRED**. In tabella le informazioni storiche non risolvono NV. Per ogni provider annotare account/piano, entità contrattuale, servizio effettivo, accordo/versione applicabile, data e owner della verifica.

| Provider / flusso trovato | DPA / ruoli | Regione dati | Subprocessor list | Trasferimenti extra SEE | Sicurezza/MFA | Retention/log | Accesso team |
|---|---|---|---|---|---|---|---|
| Supabase: Auth, DB, Storage, Edge | DPA pubblico; applicabilità/accettazione account NV | Storico progetto Irlanda eu-west-1; tutti i flussi NV | Lista pubblica da esaminare per servizi usati; selezione effettiva NV | Contratti, log/supporto/Edge/backup NV | MFA/recovery/service-role custodia NV | Impostazioni Auth/log/backup/purge NV | Membri/org/ruoli attuali NV |
| Vercel: sito e metadati richieste | DPA pubblico; accordo account NV | CDN e percorsi richieste NV; build iad1 non prova residenza dati utente | Lista/versione applicabile NV | Cache/log/supporto/accordi NV | MFA/recovery/token deploy NV | Request/build logs, URL QR, cache NV | Team/progetti/token CI NV |
| Google OAuth: identità/login | Ruoli/termini servizio da validare; non presumere stesso DPA degli altri | Percorsi identità/supporto NV | Elenco pertinente al servizio NV | Accordi e percorsi NV | Account Cloud, owner client, MFA/recovery NV | Scopes effettivi, dati Auth derivati e log NV | Collaboratori progetto/client NV |
| Google Fonts: richieste remote prima del login | Termini/ruoli pertinenti NV; non è automaticamente analytics | Request IP/metadati, percorsi NV | Pertinenza/elenco NV | Percorsi/termini NV | Controllo dominio/config in repo; account dedicato non rilevato | Retention lato provider NV | Nessun team dedicato rilevato; controllo repo da verificare |
| Email: Auth + supporto Gmail | Sender Auth attuale da confermare; custom SMTP non identificato. Casella somadatingapp@gmail.com: piano/accordo/ruoli NV | Consegna, casella, allegati NV | Fornitori realmente coinvolti NV | Flusso email/supporto NV | MFA, recovery, dispositivi e deleghe casella NV | Inbox/cestino/allegati/log Auth NV | Deleghe/inoltri/member NV |
| GitHub: sviluppo/CI | Termini/DPA ove applicabile al piano NV | Repo/Actions/supporto NV | Lista pertinente al piano NV | Hosting/log/artifacts NV | MFA, PAT/SSH, recovery NV | Logs/artifacts/commit e dati accidentalmente inclusi NV | Collaboratori/app/Actions permissions NV |

GitHub non è il backend di foto/chat del normale flusso. Evitare copie di dati pilot in issue, screenshot, fixture o artifact. Email di supporto non equivale a mittente Auth e non cambia automaticamente l’email supporto del client Google; verificare coerenza in un task successivo. Non inventare un fornitore SMTP.

Materiali pubblici verificati: [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum) e [lista subfornitori Supabase](https://supabase.com/legal/customer-resources/subprocessor-list); [Vercel DPA](https://vercel.com/legal/dpa). La disponibilità di questi testi non dimostra che siano applicabili/accettati per i tuoi account né che tutta l'elaborazione avvenga nel SEE.

Google richiede informazioni accurate sull'uso dei dati e, per un'app resa pubblica, una Privacy Policy accessibile con URL nella configurazione OAuth: verificare questo prerequisito dopo aver chiuso le decisioni, senza generare testi ora. Fonte: [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy). Non applicare automaticamente regole Workspace/API sensibili al solo login base.

## L. Questions For Federico

Le decisioni founder definitive in A sostituiscono le precedenti ipotesi su scala, paesi, 18+ e ruoli. Non vengono richieste di nuovo: la tabella distingue scelte APPROVATE e dettagli DA COMPLETARE. Puoi affrontare una riga per volta.

| ID / decisione collegata | Domanda che cambia il piano | Opzioni di risposta |
|---|---|---|
| Q-01 / F-01 | **DECISIONE FOUNDER APPROVATA:** Federico + 1 sostituto autorizzato. Persona e finestre DA COMPLETARE | Nome/ruolo, disponibilità, formazione, account personale e accessi minimi; nessun accesso cloud/chat automatico |
| Q-02 / D-12 | **DECISIONE FOUNDER APPROVATA:** Italia soltanto; italiano | Nessuna scelta paese/lingua residua. Nessun altro paese UE/SEE nel primo pilot; validazione/testi/flussi DA COMPLETARE |
| Q-03 / D-12 | **DECISIONE FOUNDER APPROVATA:** review non durante hardening, ma prima degli utenti reali | Professionista privacy/tech e pacchetto D-12 DA COMPLETARE; nessun esito legale approvato |
| Q-04 / F-01 | **DECISIONE FOUNDER APPROVATA:** 2 università, >200 utenti registrati, crescita progressiva senza limite assunto di 100 utenti | Nessun tetto massimo preciso approvato oltre “>200”. Da stimare utenti simultanei e volume casi per dimensionare operatività/safety |
| Q-05 / C-02 | Quando vuoi aprire e quando riesaminare il pilot? | Data + durata prevista; oppure nessuna data finché blocker non chiusi |
| Q-06 / F-01 | In quali finestre controlli davvero inbox e coda? | Mattina/sera / altre finestre specifiche; indicare anche giorni senza copertura |
| Q-07 / F-03 | **DECISIONE FOUNDER APPROVATA:** casella unica somadatingapp@gmail.com | MFA obbligatoria, recovery, accesso ristretto, label SUPPORTO/PRIVACY/SAFETY/RICORSO e test ricezione DA COMPLETARE |
| Q-08 / G-02 | **DECISIONE FOUNDER APPROVATA:** account personali, least privilege e revoca documentata; quali accessi reali sono presenti? | Inventario DA COMPLETARE; nessun account condiviso né accesso automatico del sostituto a Supabase/GitHub/Vercel/chat complete |
| Q-09 / H-01 | Quale comportamento vuoi per chat e relazioni inattive? | Legate alla permanenza del servizio con criterio da validare / scadenza per inattività da definire / da discutere con professionista |
| Q-10 / J-01 | Quanto puoi investire in recupero dati e copertura? | Indicare budget mensile indicativo; selezionare priorità backup/restore e moderazione, non promessa di rischio zero |
| Q-11 / J-01 | Quale interruzione/perdita dati è tollerabile per progettare recupero? | Obiettivo ore/minimi dati da quantificare con costi / sospendere apertura finché piano non concordato. “Mai” non è una garanzia implementabile |
| Q-12 / G-02 | **DECISIONE FOUNDER APPROVATA:** QR e recruiting generale, nessun dato individuale/admin/moderazione. Quali accordi reali regolano questi compiti? | Accordi e modalità recruiting DA COMPLETARE; ruolo legale LEGAL REVIEW REQUIRED; nessun export/screenshot/dato individuale |

E-01 OPTION B è approvata come scelta founder; le valutazioni legali D/E/H restano aperte. Il technical hardening può proseguire senza review professionale adesso; la review resta necessaria prima degli utenti reali. Non è necessario rispondere a tutta la tabella in un messaggio.

## M. What Can Wait Until After Pilot

Possono aspettare, **se la procedura minima è verificata e la review non li rende prerequisiti**: portale ricorsi, export self-service, automazioni di triage non necessarie, caselle email separate, strumenti avanzati di gestione casi e refactor architetturali. La scelta founder iniziale è OPTION B; age assurance più forte da rivalutare in futuro. Questo non convalida sufficienza legale: la review prima degli utenti reali deve valutare B sulla scala 2 università e >200 registrati. I purge/TTL non sono rinviati indiscriminatamente: H deve distinguere ciò che può essere gestito manualmente da ciò che richiede un fix prima di raccogliere dati.

La legal review professionale è rinviata durante il technical hardening, non oltre l’apertura reale. **DA COMPLETARE prima degli utenti reali:** professionista e pacchetto D-12, attuazione futura e collaudo di OPTION B, nome/finestre/formazione/accessi del sostituto, sicurezza e prova ricezione della casella, inventario accessi/revoche e accordi università/venue. Rimangono blocker anche retention non approvate, diritti e incident response non provati, provider/accordi non verificati. Non possono aspettare nel perimetro approvato: referente e copertura sostenibili, contatto raggiungibile, scelte/legal review sui dati dating e minori, capacità di seguire diritti e cancellazioni fallite, verifica provider/accessi, criteri retention e piano incidenti/recupero. Questo documento non valuta altri finding o tutta la readiness dell’app.

**Verifica della creazione iniziale (6 ottobre 2026):** solo questo documento interno aggiunto. Nessun file runtime modificato; nessuna migration; nessun cambiamento DB/RLS; nessun documento legale generato; nessuna nuova retention applicata; nessuna base giuridica scelta autonomamente. Nessun deploy, email inviata o modifica a dashboard/cloud. Suite attuale: **164 test passati, 0 falliti** (`node --test tests/*.test.js`). **Build Vite e typecheck TypeScript passati**. Nessun nuovo test necessario per il solo documento. Controllo SHA-256 dei **117 file** runtime, asset, migrazioni, test, script e configurazioni inventariati prima del task: nessuna variazione, nessun nuovo file nelle rispettive directory. Unico file aggiunto: `docs/soma-pre-pilot-decision-sheet-2026-10-06.md`. Le prove tecniche non certificano procedure umane, accordi provider o conformità legale.

**Aggiornamento decisioni founder (6 ottobre 2026):** aggiornato esclusivamente `docs/soma-pre-pilot-decision-sheet-2026-10-06.md`. Le scelte definitive sostituiscono le precedenti ipotesi; nessuna decisione implementata. Nessun codice/UI/UX, migration o DB/RLS modificato; nessuna Privacy Policy, Terms o Cookie Policy generata; nessuna base giuridica scelta. SEC-01, LOC-01, retention non approvate, valutazioni DPIA, fatti provider non verificati e procedure diritti/incidenti non provate restano invariati. Verifiche del presente aggiornamento: **164 test passati, 0 falliti; build e typecheck passati**. Confronto SHA-256 dei 229 file inventariati prima dell’aggiornamento (esclusi `.git`, `node_modules` e output `dist`): unico file modificato, questa decision sheet; nessun altro file aggiunto o eliminato. Le prove tecniche non attestano conformità legale o completamento delle procedure operative.
