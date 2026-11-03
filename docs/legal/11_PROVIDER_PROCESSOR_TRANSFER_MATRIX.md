# SOMA — Provider / Processor / Transfer Matrix — Fonte PDF v1.1

## Provenienza e destinazione — metadati interni, non pubblicabili

- Fonte fornita dal titolare: `SOMA – Provider _ Processor _ International Transfer Matrix (3).pdf` (19 pagine).
- SHA-256 PDF: `cb931877eed629087dbbc190e5c90610f28c67bc0420fdf787e54f76d0c88e15`.
- Destinazione del testo principale: **MATRICE INTERNA — NON DESTINATA AGLI UTENTI**.
- Trascrizione integrale da PDF; nessuna clausola o decisione riscritta. Fences e titoli A/B sono solo separatori redazionali. Non costituisce autorizzazione alla pubblicazione o al pilot.
- A conserva il corpo della fonte e i suoi indicatori editoriali; B conserva separatamente la checklist operativa. Gli indicatori interni della fonte non vanno pubblicati come copy agli utenti.
- ID in B: **locali alla fonte, namespace `PROV-MX`**. Le etichette originali, anche spezzate dalla tabella PDF, sono preservate; non sono nuove righe dei 145 controlli canonici. Non unirle al register per uguaglianza del numero.
- Checksum, pagine e confronto delle altre sei fonti: [manifest](sources/v1.1/source-manifest.json). Gli originali PDF restano invariati nella cartella fornita dal titolare.

## A. Testo principale integrale della fonte

<!-- SOMA-SOURCE-SEGMENT main BEGIN -->
```text
SOMA — Provider, Processor &
International Transfer Matrix

Versione: 1.1 — Candidata per il pilot
Data di revisione: 3 novembre 2026
Titolare del trattamento: Federico Grasso, persona
fisica
Stato: Valutazione preliminare; verifiche contrattuali e
tecniche pre-pilot aperte

Documento interno — GDPR, articoli 28, 32 e 44–49

1. Scopo

La presente matrice identifica i fornitori utilizzati da
SOMA e definisce le verifiche necessarie per valutare la
liceità, la sicurezza e la proporzionalità dei trattamenti
affidati a servizi esterni.

Per ciascun fornitore devono essere documentati:

  ●  servizio effettivamente utilizzato;
  ●  ruolo privacy;
  ●  account, piano e contratto applicabile;
  ●  categorie di dati trattati;
  ●  eventuali categorie particolari di dati;
  ●  accordi sul trattamento;
  ●  subresponsabili;
  ●  luoghi di conservazione, elaborazione e accesso;
  ●  trasferimenti internazionali e relative garanzie;
  ●  conservazione e cancellazione;



  ●  gestione degli incidenti;
  ●  supporto ai diritti degli interessati;
  ●  evidenze e decisione pre-pilot.

Un fornitore non è approvato automaticamente per la
sua notorietà o diffusione.

2. Identità e responsabilità

Durante il pilot, SOMA è gestita da Federico Grasso
come persona fisica, in qualità di titolare del
trattamento.

La mancanza di una società dedicata non elimina gli
obblighi del titolare.

Gli accordi con i fornitori devono essere valutati
rispetto alla persona che esercita effettivamente
l'attività e alle condizioni applicabili al servizio
utilizzato.

Una futura costituzione di società richiederà la verifica
dell'eventuale trasferimento dei rapporti contrattuali e
delle responsabilità privacy.

3. Stato sintetico dei fornitori

      Fornitore                   Funzione                  Stato
                                                        preliminare


Supabase                  Database,                     Condiziona
                          autenticazione,               to



                        archiviazione,
                        backend


Vercel                  Hosting, deployment,        Criticità
                        eventuale runtime           aperta
                        server


Resend                  Email transazionali         Condiziona
                                                    to


Google                  Autenticazione              Condiziona
Sign-In/OAuth           federata                    to


Gmail                   Privacy, supporto,          Criticità
somadatingapp@          safety, ricorsi             aperta
gmail.com


Google Cloud            Backup e                    Verifica
Storage                 conservazione               dedicata
                        tecnica                     aperta


Google                  Eventuale casella           Alternativa
Workspace               professionale               facoltativa


Fornitore di age        Eventuale verifica          Non
assurance               aggiuntiva                  selezionato



Le classificazioni si riferiscono alle evidenze disponibili
e non attestano una verifica completa degli account
effettivi.

4. Supabase

Funzione: database, autenticazione, archiviazione di
fotografie, servizi backend e funzioni eventualmente
utilizzate.

Ruolo: in linea generale, SOMA è titolare e Supabase
responsabile per i Customer Data coperti dall'accordo
applicabile; eventuali trattamenti autonomi di Supabase
devono essere distinti.

Dati potenzialmente coinvolti: profili, fotografie,
preferenze di dating, Chance, Spotted, ORA, Match,
Chat, consensi, segnalazioni e registrazioni operative.

Verifiche pre-pilot:

  ●  DPA applicabile al contratto effettivo;
  ●  regione dell'ambiente destinato al pilot;
  ●  ruoli e autorizzazioni;
  ●  Row Level Security;
  ●  policy dello Storage;
  ●  isolamento delle service-role key;
  ●  gestione degli accessi privilegiati;
  ●  sicurezza delle funzioni server;
  ●  retention e cancellazione;
  ●  backup, recupero e riconciliazione;
  ●  subresponsabili e trasferimenti;
  ●  notifiche di incidenti e supporto ai diritti.



L'esistenza di un database in Europa non dimostra che
qualsiasi accesso, servizio di supporto o
subtrattamento avvenga esclusivamente nello Spazio
economico europeo.

Stato: CONDIZIONATO — conformità operativa
dell'ambiente da verificare.

5. Vercel

Funzione: hosting del frontend, deployment, CDN e, se
effettivamente utilizzati, funzioni server, log e strumenti
di osservabilità.

Dati potenzialmente trattati: metadati di accesso,
indirizzi IP, richieste, identificativi tecnici, eventuali
payload e informazioni inserite nei log.

Questioni contrattuali:

  ●  il DPA pubblico verificato riguarda i piani Pro ed
     Enterprise;
  ●  il piano Hobby è soggetto a limitazioni di utilizzo
     personale e non commerciale;
  ●  il DPA pubblico contiene una restrizione relativa
     all'inserimento di dati sensibili o categorie
     particolari nei Customer Data.

Per SOMA, quest'ultima questione richiede attenzione
perché il servizio tratta informazioni che possono
rivelare aspetti della vita sessuale o dell'orientamento
sessuale.

Condizione pre-pilot:



Verificare con evidenze tecniche se dati particolari,
Chat o altre informazioni altamente personali
raggiungano il runtime, i log, gli strumenti di
osservabilità o altri servizi Vercel.

Se il trattamento previsto non è compatibile con le
condizioni contrattuali, occorre limitarlo, modificarne il
percorso tecnico, utilizzare un accordo che lo consenta
oppure scegliere un'infrastruttura adeguata.

Non è sufficiente un semplice upgrade a Pro per
considerare automaticamente risolta la restrizione sui
dati sensibili.

Devono inoltre essere verificati piano effettivo, DPA,
accessi, regioni, subresponsabili, trasferimenti,
retention e cancellazione.

Stato: CRITICITÀ APERTA — non autorizzato per flussi
incompatibili con le condizioni contrattuali.

6. Resend

Funzione: invio di email transazionali e comunicazioni
di servizio.

Ruolo: generalmente responsabile per i dati trasmessi
dal cliente secondo il DPA; eventuali dati dell'account e
di utilizzo trattati autonomamente devono essere
distinti.

Principio di minimizzazione: le email non devono
divulgare inutilmente preferenze romantiche, identità



degli interessati a uno Spot, contenuti delle Chat,
evidenze di sicurezza o identità dei segnalanti.

Preferire notifiche generiche che rinviino alle
informazioni dettagliate dopo l'autenticazione nell'app.

Verifiche:

  ●  contratto e DPA applicabili;
  ●  subresponsabili;
  ●  trasferimenti;
  ●  template effettivi;
  ●  open tracking e click tracking;
  ●  retention di payload e metadati;
  ●  accesso amministrativo;
  ●  notifiche degli incidenti.

Stato: CONDIZIONATO.

7. Google Sign-In / OAuth

Funzione: autenticazione federata.

Il rapporto privacy non deve essere qualificato
automaticamente come rapporto titolare-responsabile
per tutti i trattamenti Google.

Devono essere considerate le specifiche condizioni del
prodotto e gli eventuali trattamenti autonomi.

Verifiche:

  ●  scope OAuth strettamente necessari;
  ●  configurazione della schermata di consenso;
  ●  domini e redirect URI;



  ●  sicurezza dei token;
  ●  eventuali requisiti di verifica Google;
  ●  collegamento all'informativa;
  ●  compatibilità con i controlli 18+ e con l'onboarding.

Non devono essere richiesti accessi a Gmail, Contatti,
Drive, Calendario o altri servizi non necessari
all'autenticazione.

Stato: CONDIZIONATO.

8. Casella Gmail per privacy, supporto e safety

Indirizzo attualmente indicato:
somadatingapp@gmail.com.

La casella può ricevere richieste di accesso ai dati,
segnalazioni di molestie, ricorsi, documentazione e
comunicazioni contenenti informazioni altamente
personali.

Verifiche necessarie:

  ●  tipo di account e prodotto Google utilizzato;
  ●  condizioni contrattuali e ruoli privacy;
  ●  adeguatezza dell'utilizzo per attività organizzate di
     supporto;
  ●  autenticazione a più fattori;
  ●  assenza di password condivise;
  ●  accessi limitati;
  ●  regole di inoltro e download;
  ●  conservazione e cancellazione;
  ●  trattamento degli allegati;
  ●  modalità di risposta agli interessati;



  ●  gestione degli incidenti.

La casella Gmail personale non è qualificata
automaticamente come illegale.

Se il modello contrattuale o operativo risulta
inadeguato, deve essere scelta una soluzione che
consenta una gestione appropriata delle
comunicazioni, anche mediante un servizio
professionale con condizioni applicabili.

Stato: CRITICITÀ APERTA — definire e dimostrare un
modello adeguato prima del pilot.

9. Google Cloud Storage — Backup

Funzione: archiviazione tecnica delle copie di sicurezza
effettivamente realizzate su Google Cloud Storage.

La presenza di questo servizio deve essere distinta
dall'utilizzo di Google OAuth e dalla casella Gmail.

Dati potenzialmente coinvolti: copie di dati applicativi e
registrazioni tecniche, eventualmente comprendenti
categorie particolari.

Verifiche:

  ●  progetto Google Cloud e soggetto contraente;
  ●  accordo Cloud Data Processing Addendum
     applicabile;
  ●  bucket, regioni e localizzazione;
  ●  accessi IAM e account di servizio;
  ●  cifratura e controllo delle chiavi;
  ●  lifecycle e cancellazione;



  ●  eventuale versioning e ulteriori copie;
  ●  ripristino;
  ●  riconciliazione di cancellazioni, restrizioni e
     revoche;
  ●  audit e incident notification;
  ●  subresponsabili e trasferimenti;
  ●  cessazione del servizio ed eliminazione finale.

Un lifecycle di sette giorni configurato sul bucket non
dimostra, da solo, che tutte le copie siano eliminate
entro sette giorni né che la riattivazione di dati revocati
sia impossibile.

Stato: VERIFICA DEDICATA APERTA.

10. Google Workspace — Eventuale alternativa per la
casella

Google Workspace può essere valutato come soluzione
per la gestione professionale delle comunicazioni
privacy e safety.

Non costituisce una scelta obbligatoria a priori.

Se adottato, devono essere verificati:

  ●  piano e condizioni contrattuali;
  ●  DPA applicabile;
  ●  accessi nominativi e MFA;
  ●  amministrazione e audit;
  ●  retention;
  ●  cancellazione;
  ●  localizzazione e trasferimenti.



La migrazione deve mantenere operativi i recapiti
comunicati agli utenti e preservare le richieste ancora
aperte.

Stato: NON SELEZIONATO.

11. Eventuale fornitore di age assurance

Il modello SOMA rimane progressivo e proporzionato.

Non è previsto un servizio esterno obbligatorio di
verifica documentale o biometrica per tutti gli utenti.

L'eventuale introduzione di un fornitore aggiuntivo
deve essere preceduta dalla valutazione di:

  ●  effettiva necessità;
  ●  accuratezza ed efficacia;
  ●  dati trattati;
  ●  eventuale utilizzo di documenti, selfie o dati
     biometrici;
  ●  conservazione e cancellazione;
  ●  ruolo privacy;
  ●  DPA;
  ●  subresponsabili;
  ●  localizzazione e trasferimenti;
  ●  sicurezza;
  ●  contestazione degli errori;
  ●  aggiornamento della DPIA e dell'informativa.

Stato: NON SELEZIONATO — nessuna integrazione
autorizzata.

12. Registro dei trasferimenti internazionali



Per ciascun trasferimento pertinente devono essere
documentati:

  ●  soggetto esportatore;
  ●  destinatario o importatore;
  ●  paese di destinazione;
  ●  categorie di dati;
  ●  finalità;
  ●  natura e frequenza del trasferimento;
  ●  base normativa del trasferimento;
  ●  eventuale decisione di adeguatezza;
  ●  eventuali clausole contrattuali standard;
  ●  misure supplementari, quando necessarie;
  ●  valutazione d'impatto sul trasferimento, quando
     richiesta;
  ●  ultimo riesame.

Il solo fatto che un fornitore abbia sede negli Stati Uniti
non determina automaticamente un trasferimento
illecito.

L'esistenza di SCC, certificazioni o decisioni di
adeguatezza deve essere riferita al soggetto, al flusso e
al meccanismo effettivamente applicabili.

Non devono essere date per scontate né l'assenza di
trasferimenti né la copertura di ogni trasferimento.

13. Necessità della Transfer Impact Assessment

Quando il trasferimento si fonda su strumenti che
richiedono una valutazione delle condizioni nel paese



terzo, SOMA deve documentare gli elementi necessari,
comprese eventuali misure supplementari.

La necessità di una TIA separata deve essere
determinata per il trasferimento effettivo e per il relativo
strumento giuridico.

Una TIA non deve essere imposta automaticamente a
ogni servizio estero, né considerata superflua senza
esaminare il meccanismo applicabile.

14. Minimizzazione presso i fornitori

Per quanto tecnicamente possibile, i dati altamente
personali devono restare nei sistemi strettamente
necessari.

In particolare:

  ●  evitare preferenze di dating nei normali log;
  ●  evitare corpi completi delle Chat negli strumenti
     generici di osservabilità;
  ●  evitare identità dei segnalanti nelle email non
     necessarie;
  ●  non includere evidenze di moderazione nei ticket
     di supporto ordinari;
  ●  usare dati sintetici o pseudonimizzati nelle
     richieste ai fornitori, quando sufficienti;
  ●  non trasmettere segreti nei ticket o nella
     documentazione non protetta.

Le limitazioni devono essere testate attraverso i flussi
effettivi.



15. Conservazione e cancellazione

Per ogni fornitore devono essere distinti:

  ●  durata configurata da SOMA;
  ●  durata operativa applicata dal fornitore;
  ●  eventuale conservazione dei log;
  ●  copie di sicurezza;
  ●  copie residue dopo la cancellazione;
  ●  conservazione successiva alla cessazione del
     contratto;
  ●  procedure di eliminazione e supporto ai diritti.

La Privacy Policy non deve promettere tempi che
SOMA non può sostenere tecnicamente o
contrattualmente.

16. Incidenti e richieste privacy

Per i fornitori critici devono essere documentati i canali
attraverso cui segnalare o ricevere informazioni su
incidenti di sicurezza.

I tempi e le modalità di notifica contrattuale devono
essere integrati nella procedura Incident Response.

Deve inoltre essere verificata la possibilità di ottenere
assistenza per accesso, cancellazione, rettifica,
limitazione e portabilità dei dati, quando applicabili.

SOMA rimane il punto di riferimento per gli interessati
rispetto ai trattamenti per i quali è titolare.

17. Sicurezza degli account dei fornitori



Gli accessi amministrativi e tecnici devono rispettare,
secondo le funzionalità disponibili:

  ●  autenticazione forte;
  ●  privilegi minimi;
  ●  account attribuibili;
  ●  separazione degli accessi di servizio;
  ●  revoca delle credenziali non più necessarie;
  ●  protezione dei segreti;
  ●  monitoraggio degli accessi rilevanti.

Le credenziali non devono essere incluse nel codice
client, in repository pubblici o in documenti accessibili
senza restrizioni.

18. Cessazione e migrazione

Per ogni fornitore critico SOMA deve poter individuare:

  ●  modalità di esportazione dei dati;
  ●  percorso di migrazione;
  ●  cessazione dei flussi;
  ●  eliminazione dei dati;
  ●  revoca degli accessi;
  ●  gestione di copie e backup;
  ●  conservazione residua prevista contrattualmente;
  ●  verifica finale della disattivazione.

Non è necessario progettare un complesso sistema
automatico di migrazione per il pilot, ma deve essere
possibile documentare come uscire dal servizio senza
perdere il controllo dei dati personali.



19. Decisione pre-pilot

La matrice viene chiusa solo quando risultano
dimostrate le condizioni pertinenti.


      Area                     Decisione attuale


Supabase            OPEN — verifiche sull'ambiente
                    effettivo


Vercel              OPEN CRITICAL — termini
                    contrattuali e dati particolari


Resend              OPEN — verifica delle condizioni e
                    dei flussi


Google OAuth        OPEN — configurazione e ruolo da
                    documentare


Gmail               OPEN CRITICAL — modello
                    contrattuale e operativo


Google Cloud        OPEN — contratto, backup e ciclo
Storage             di vita


Google              Facoltativo, non selezionato
Workspace



Age provider         Non selezionato; dipende dalla
                     valutazione sull'età


Transfer             OPEN
Register


TIA                  Da determinare per i trasferimenti
                     applicabili


Valutazione          NO-GO fino alla chiusura delle
complessiva          criticità sostanziali

20. Conclusione

SOMA adotta un approccio proporzionato al pilot,
basato su una verifica concreta dei fornitori, dei
contratti e dei dati effettivamente trattati.

Non sono richiesti acquisti o migrazioni preventive in
assenza di una necessità dimostrata.

Devono però essere risolti i casi in cui un servizio o un
flusso risultino incompatibili con le condizioni
contrattuali o con le garanzie richieste dalla normativa.

Stato conclusivo: matrice v1.1 pronta per approvazione
editoriale.



Autorizzazione al pilot con utenti reali: non concessa
finché non siano state completate le verifiche
contrattuali, tecniche e sui trasferimenti pertinenti.
```
<!-- SOMA-SOURCE-SEGMENT main END -->

## B. Checklist operativa interna — separata dal testo principale

<!-- SOMA-SOURCE-SEGMENT checklist BEGIN -->
```text
4. Checklist Provider — Cosa resta da fare


    ID                            Attività                               Responsabile
                                                                           prevalente



 PROV-0    Confermare contratto, regione e controlli               Codex + verifica
 1         Supabase                                                account



 PROV-0    Identificare il progetto Vercel, il piano e i flussi    Codex + verifica
 2         di dati sensibili                                       contrattuale



 PROV-0    Risolvere eventuali incompatibilità con le              Decisione
 3         condizioni Vercel                                       tecnica/contrattuale



 PROV-0    Verificare Resend, template, tracking e                 Codex +
 4         conservazione                                           documentazione



 PROV-0    Verificare Google OAuth e relativi permessi             Codex
 5



 PROV-0    Definire il modello per la casella di supporto e        Decisione del gestore
 6         privacy



 PROV-0     Verificare Google Cloud Storage e backup                     Codex +
 7                                                                       documentazione



 PROV-0     Completare registro trasferimenti,                           Documentale/giuridico
 8          SCC/adeguatezza e TIA dove necessaria



 PROV-0     Verificare subresponsabili, incidenti, retention e           Documentale + test
 9          cancellazione
```
<!-- SOMA-SOURCE-SEGMENT checklist END -->
