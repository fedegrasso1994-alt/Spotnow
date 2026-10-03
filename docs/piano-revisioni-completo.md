# Piano completo di revisione Spot Now

Versione: 3 ottobre 2026. Base: codice attuale, migrazioni 001–008 e correzioni pubblicate dopo il primo collaudo con due utenti. Questo documento pianifica le verifiche; non certifica che siano già tutte superate.

## 1. Obiettivo e regole

Portare ogni percorso del pilota a uno stato verificabile, coerente con il prototipo Claude e con le modifiche di prodotto approvate. Prima si correggono i blocchi, poi si verifica la coerenza delle sezioni e infine si prepara il lancio nel primo luogo.

Priorità:

- P0: impedisce accesso, navigazione, match o messaggi; perdita dati; accesso non autorizzato; destinatario errato. Blocca il rilascio.
- P1: necessario prima di invitare utenti nel locale pilota: affidabilità mobile, errori recuperabili, installazione, moderazione, cancellazione, coerenza visiva e comprensione delle regole.
- P2: miglioramento successivo al collaudo: efficienza, strumenti operativi, automazioni e rifiniture senza impatto sui percorsi essenziali.

Stati delle singole prove: da verificare → in verifica → superata oppure fallita → corretta → riconfermata. Una prova fallita non diventa superata solo perché è stata scritta una correzione.

Per chiudere una voce occorrono: versione del sito, dispositivo/browser, condizioni iniziali, passaggi, risultato atteso ed effettivo, evidenza, eventuale ticket e riconferma. Una prova automatica, una prova nel browser desktop e una prova su telefono sono evidenze distinte.

## 2. Decisioni da usare come riferimento

| Tema | Regola attuale da verificare |
|---|---|
| Aspetto | Prototipo Claude come riferimento, con le variazioni approvate; confrontare anche Figma e risolvere le divergenze |
| Pubblico | App dedicata ai single; headline generale «Scopri chi è single qui ora» |
| Presenza | Solo QR; nessuna geolocalizzazione |
| Accesso | Google prima del check-in; email alternativa nel flusso attuale; sessione persistente |
| Profilo | Foto obbligatoria, nome, età 18+, genere e preferenza; nessuna scelta colore |
| Presenza live | 90 minuti, confermati dal proprietario; codice, database e copy devono usare questa durata |
| Rinnovo | Nuova scansione del QR; riaprire l'app non rinnova la presenza |
| Più luoghi | Un solo check-in live corrente; appartenenze a più Tribe mantenute |
| Tribe | Appartenenza dopo check-in; durata illimitata nella configurazione attuale; accesso anche fuori dal luogo |
| Live/Tribe | Nel singolo luogo i presenti live sono esclusi dalla griglia Tribe |
| Spot | Inviato dal dettaglio; persistente e non ritirabile; contestualizzato al luogo |
| Match | Reciprocità nello stesso luogo; match unico per coppia, persistente anche senza messaggi |
| Privacy Tribe | Nessuna distanza, cronologia visite o orario di presenza nella griglia |
| Profilo nascosto | Escluso dalla prima versione |
| Uscita Tribe | Nessun comando Lascia Tribe; presente Elimina account |
| Installazione | Invito dopo il primo match; conferma nativa quando disponibile, istruzioni su iPhone |
| Notifiche | Aggiornamenti dentro l'app; notifiche push non implementate |

Altre decisioni da rendere esplicite nella revisione: le preferenze di visibilità attuali sono applicate dal punto di vista di chi guarda, non come filtro necessariamente reciproco; i conteggi includono membri che possono non comparire nella griglia per preferenze/blocchi; lo stesso match può collegare due utenti che condividono più luoghi. La UX deve spiegare questi comportamenti o il prodotto deve approvare una regola diversa.

## 3. Matrice di ambienti e dati

Dispositivi minimi: iPhone con Safari, Android con Chrome, entrambi anche con app aggiunta alla Home; Chrome/Safari desktop per supporto. Browser integrati di social e app email: verificare apertura del link, eventuali limiti Google/camera e percorso chiaro verso il browser del telefono. Non assumere che tutti supportino lo stesso flusso.

Dimensioni da controllare: schermo piccolo, telefono comune, telefono grande; tastiera aperta, orientamento verticale/orizzontale, testo ingrandito e area sicura inferiore. Il cambio viewport desktop non vale come test di una fotocamera o installazione reale.

Rete: normale, lenta, assente, ritorno online; pagina in background e ritorno; due schede aperte; due telefoni contemporanei; riavvio del browser; riapertura dell'app installata.

Dati di prova separati:

- A e B: due account Google di prova con preferenze compatibili, foto distinte e stesso luogo.
- C: account senza appartenenza al luogo; accessi non autorizzati e QR iniziale.
- D: account eliminabile, senza dati personali da conservare; cancellazione reale solo con conferma al momento dell'azione.
- E: vecchio profilo temporaneo per migrazione/conflitto Google.
- Luoghi L1 e L2: QR distinti, nomi distinti, nessuna ambiguità sui conteggi.
- Gestore di prova autorizzato e account non gestore; segnalazioni chiaramente fittizie.

Scadenze e sospensioni si provano prima localmente con dati controllati. Non cambiare le presenze, sospendere utenti o cancellare dati reali per accelerare i test. Conservare evidenze senza token OAuth, credenziali, messaggi personali o dati non necessari.

## 4. Revisioni per sezione e singola funzione

Ogni riga comprende percorso normale, errore, ripetizione dell'azione, navigazione avanti/indietro e comportamento mobile quando applicabile.

### A. Prima apertura e introduzione

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| A01 | Prima visita senza account, QR o sessione | Intro corretta, un'azione principale, nessun dato personale visibile | P1 |
| A02 | Riapertura con account e check-in valido | Recupera profilo e luogo senza login o rinnovo involontario | P0 |
| A03 | Riapertura con check-in scaduto | Tribe disponibili; Ora non presenta una presenza inesistente | P0 |
| A04 | Account senza profilo/Tribe; visita diretta senza QR | Percorso comprensibile per completare profilo e scansionare, senza vicoli ciechi | P1 |
| A05 | Illustrazione, headline, font, colori, spaziature e pulsanti | Confronto con riferimento approvato; nessun nome di palestra fisso | P1 |
| A06 | Primo caricamento lento o fallito | Stato comprensibile e possibilità di riprovare; nessun falso stato vuoto definitivo | P0 |

### B. QR, fotocamera e anteprima del luogo

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| B01 | QR aperto dalla fotocamera del telefono | Apre HTTPS e il luogo giusto, prima e dopo login | P0 |
| B02 | Scanner interno e fotocamera posteriore | Permesso richiesto nel contesto giusto; scansione utilizzabile su entrambi i telefoni | P1 |
| B03 | Permesso negato, assenza camera, camera occupata | Errore leggibile e alternativa della fotocamera esterna; possibilità di tornare indietro | P1 |
| B04 | QR estraneo, dominio diverso, token malformato, luogo disattivato | Non crea check-in/appartenenza; errore e percorso di recupero | P0 |
| B05 | Scansioni ripetute e doppio callback dello scanner | Una sola operazione per azione, nessun blocco permanente | P0 |
| B06 | Uscita dallo scanner e app in background | Fotocamera rilasciata; riattivazione possibile | P1 |
| B07 | Nome/indirizzo/conteggi dinamici della preview | Cambiano tra L1/L2; prima del login solo dati aggregati | P0 |
| B08 | Zero/uno/molti presenti e membri | Copy corretto, singolari e conteggi comprensibili | P1 |
| B09 | QR interrotto da login, onboarding o errore rete | Luogo conservato; nessun QR perso o check-in nel luogo precedente | P0 |
| B10 | URL ripulito dopo check-in e avvio PWA senza token | Ricaricare/riaprire non rinnova la presenza; nuova scansione sì | P0 |
| B11 | QR condiviso a distanza | Limite del QR statico documentato; nessuna promessa di verifica certa della presenza | P1 |

### C. Accesso, recupero e sessione

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| C01 | Google: nuovo account ed esistente | Pulsante unico principale; accesso reale riuscito per entrambi | P0 |
| C02 | Google annullato, provider fallito, ritorno con errore | Stato esplicito; retry funzionante; nessun pulsante bloccato | P0 |
| C03 | Vecchia sessione temporanea → normale Google | Account esistente recuperato senza conflitto di linking | P0 |
| C04 | Conserva profilo temporaneo, Google nuovo o già collegato | Conseguenze spiegate; nessuna fusione automatica o perdita nascosta; errore recuperabile | P0 |
| C05 | Email alternativa: indirizzo valido/errato, link, codice se esposto, modifica email | Ogni controllo visibile ha un flusso funzionante; link conserva il QR e arriva al profilo corretto | P1 |
| C06 | Email su browser diverso, link già usato/scaduto, invii ripetuti | Nessun account duplicato silenzioso; istruzioni e recupero comprensibili | P1 |
| C07 | Chiudi/riapri, token rinnovato, offline durante rinnovo | Sessione stabile quando valida; accesso richiesto chiaramente quando non recuperabile | P0 |
| C08 | Logout e login con altro account, anche in due schede | Nessuna foto, bozza o lista dell'account precedente riutilizzata | P0 |
| C09 | Navigazione mentre l'accesso si completa | Nessuna schermata protetta senza account e nessun cambio improvviso errato | P0 |
| C10 | Google OAuth in modalità test e utenti non invitati | Verificare configurazione prima di aprire il pilota a persone nuove | P1 |
| C11 | HTTPS, redirect pubblico/locale, errori e parametri OAuth | Redirect previsti soltanto; token mai in log/evidenze; errori ripuliti dall'URL | P0 |

### D. Creazione e modifica profilo

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| D01 | Nome: vuoto, spazi, accenti, emoji, limite 60 caratteri | Validazione coerente client/server; nessun contenuto interpretato come HTML | P1 |
| D02 | Età: mancante, <18, decimale, limite server 120, tastiera mobile | Rifiuti prima del salvataggio e messaggi chiari | P0 |
| D03 | Genere/preferenze e selezioni dopo riapertura | Valori salvati e selezione visuale coerenti; nessuna scelta colore | P1 |
| D04 | Foto obbligatoria: mancante, valida, formato non supportato, vuota, >8 MB | Foto richiesta sempre; errore comprensibile; JPEG/PNG/WebP funzionanti | P0 |
| D05 | Foto da libreria/fotocamera; HEIC, orientamento, file rinominato | Test sul telefono; formati non supportati spiegati o conversione valutata senza promessa implicita | P1 |
| D06 | Upload lento/fallito, database fallito dopo upload, retry e doppio click | Nessun falso successo o upload duplicato non necessario; possibilità di riprovare | P0 |
| D07 | Foto privata e link scaduto | Foto personale rinnovata; errori foto non bloccano navigazione | P0 |
| D08 | Modifica titolo, Salva, Indietro, nessun nuovo check-in | Non sembra creazione di un altro account; salvataggio e uscita funzionano | P0 |
| D09 | Dati modificati e ritorno dall'app in background | Campi non sovrascritti; comportamento delle modifiche non salvate esplicito | P0 |
| D10 | Cambio foto rapido e retry; eliminazione vecchie foto non più usate | Nessuna risposta vecchia sostituisce la scelta più recente; definire pulizia storage e verificarla | P1 |

### E. Ora e ciclo di presenza

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| E01 | Check-in dopo account e profilo; timestamp server | Nessun check-in anonimo/incompleto; scadenza conforme alla decisione finale | P0 |
| E02 | Rinnovo QR nello stesso luogo | Presenza rinnovata e appartenenza unica | P0 |
| E03 | QR di un altro luogo | Live trasferito a L2, Tribe L1 mantenuta; nessuna doppia presenza | P0 |
| E04 | Zero/uno/molti profili, esclusione di sé e preferenze | Lista coerente con le policy e differenze conteggio spiegate | P1 |
| E05 | Polling, click durante refresh, scorrimento e lentezza | Nessun caricamento periodico distruttivo, click perso o salto della lista | P0 |
| E06 | Scadenza propria e altrui: prima, esattamente, dopo | Utente non più live al confine server; refresh dopo background corregge subito | P0 |
| E07 | Foto fallita/scaduta e caricamenti simultanei | Le altre persone restano utilizzabili; richieste obsolete non popolano un altro luogo | P0 |
| E08 | Dettaglio, chiusura, ritorno alla stessa posizione | Identità e luogo corretti; niente overlay che blocca profilo/chat | P0 |
| E09 | Luogo disattivato e account sospeso durante uso | Accesso revocato dal server e UI aggiornata; nessuna presenza persistente fittizia | P0 |

### F. Tribe e appartenenze

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| F01 | Nessuna, una, molte Tribe | Stati vuoti e schede corretti; ordinamento comprensibile | P1 |
| F02 | Appartenenza solo dopo QR/check-in | Account estraneo escluso anche chiamando direttamente API | P0 |
| F03 | Accesso da casa, scadenza live e appartenenza persistente | Nessun nuovo check-in richiesto per Tribe già acquisita | P0 |
| F04 | Griglia per singolo luogo e separazione dai presenti live | Nessun profilo del luogo precedente, né duplicazione live/Tribe nello stesso luogo | P0 |
| F05 | Conteggi totali/live, sé incluso e filtri della griglia | Differenze deliberate comprese; nessun conteggio dichiarato come numero di profili visibili | P1 |
| F06 | Dettaglio e Spot da Tribe | Luogo coerente; stessa autorizzazione server del flusso live | P0 |
| F07 | Privacy: niente orari visite, cronologia, distanza o ranking | Dati assenti sia dalla UI sia dalle risposte della RPC Tribe | P0 |
| F08 | Apertura rapida di L1/L2, polling, griglia lunga | Risposte obsolete ignorate; griglia scorrevole e tap stabile | P0 |
| F09 | Nessuna uscita Tribe; durata illimitata attuale | Nessun comando non approvato; informativa coerente con appartenenza persistente | P1 |
| F10 | Futura finestra attività configurabile | Caso di test locale dedicato; non attivarla senza decisione di prodotto | P2 |

### G. Spot e match

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| G01 | Spot dal solo dettaglio, live e Tribe | Nessun invio accidentale dalla griglia; destinatario/luogo corretti | P0 |
| G02 | Primo invio, doppio tap, retry, interesse già inviato | Una sola registrazione; stato recuperato dal server dopo riapertura | P0 |
| G03 | Invio unilaterale e reciprocità differita | Nessun falso match; reciproco nello stesso luogo genera match | P0 |
| G04 | Invii simultanei di A/B | Un solo match e nessuna race condition | P0 |
| G05 | Coppia in più luoghi; Spot in luoghi diversi | Nessun match reciproco tra luoghi diversi per errore; riuso del match di coppia coerente | P0 |
| G06 | Spot non ritirabile e match senza scadenza | Nessun ritiro o countdown errato; match accessibile anche senza messaggi dopo molto tempo | P0 |
| G07 | Match nuovo mentre si chatta/modifica/guarda dettaglio | Non cambia destinatario, non chiude form, avviso non distruttivo | P0 |
| G08 | Schermata match: avatar, continua, inizia conversazione | Entrambe le azioni funzionano; invito installazione chiudibile | P0 |
| G09 | Match con account bloccato/sospeso/eliminato | Server impedisce accesso quando previsto; testo senza falsa scadenza temporale | P0 |
| G10 | Lista match: vuota, lunga, foto fallita, nuova sessione | Ogni match disponibile apribile; nessun refresh blocca la lista | P0 |

### H. Chat e messaggi

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| H01 | Primo accesso da match o lista; nessun primo messaggio | Conversazione accessibile da entrambe le sezioni | P0 |
| H02 | Indietro → lista → stessa chat, ripetuto | Sempre apribile; nessun caricamento infinito | P0 |
| H03 | Cambiare chat rapidamente, nuovo match simultaneo | Nessuna risposta/messaggio/avatar dell'altra conversazione | P0 |
| H04 | Invio con pulsante/Invio, vuoto, spazi, emoji, multilinea, limite 2000 | Dati coerenti; nessun invio vuoto o duplicato da doppio click | P0 |
| H05 | Rete persa prima/durante/dopo invio e retry | Bozza conservata; distinguere invio fallito da conferma persa; verificare rischio duplicati | P0 |
| H06 | Ricezione dall'altro telefono e ordinamento | Messaggi ordinati e aggiornati nella chat corretta | P0 |
| H07 | Polling, scroll su messaggi vecchi, testo selezionato | Nessuna ricostruzione inutile; scroll a fondo solo quando opportuno | P1 |
| H08 | Bozza, uscita/rientro e app in background | Bozza mantenuta nella sessione; non promettere persistenza dopo ricaricamento se non implementata | P0 |
| H09 | Tastiera, input, pulsante invio, schermo piccolo | Scrittura/invio/back sempre raggiungibili; nessun elemento coperto | P0 |
| H10 | Conversazione dopo presenza scaduta e cambio luogo | Match/chat disponibili secondo regole persistenti | P0 |
| H11 | Blocco/sospensione/eliminazione mentre chat aperta | Invio negato dal server; UI recuperabile senza mostrare successo falso | P0 |
| H12 | Messaggi lunghi, HTML, link e caratteri speciali | Testo sicuro, niente esecuzione HTML/script o rottura layout | P0 |

### I. Segnalazioni, blocco e sospensione

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| I01 | Apertura da dettaglio/chat, motivi e dettagli facoltativi | Persona giusta; form comprensibile e chiudibile | P1 |
| I02 | Segnala e blocca, segnala senza bloccare, blocca soltanto | Effetti distinti, nessuna segnalazione creata per un semplice blocco | P0 |
| I03 | Annulla, Escape, focus tastiera e tastiera mobile | Nessuna azione involontaria; focus e schermata recuperati | P1 |
| I04 | Invio fallito/doppio invio/retry | Stato chiaro; dettagli mantenuti; duplicazioni controllate | P1 |
| I05 | Effetto blocco su Ora, Tribe, match, chat e foto | Invisibilità/indisponibilità coerente in entrambe le direzioni | P0 |
| I06 | Riservatezza di segnalazione e note | Accesso ristretto; nessun report leggibile da utenti normali | P0 |
| I07 | Sospensione già presente o applicata durante uso | Discovery, check-in, Spot e chat negati dal server; schermata dedicata | P0 |
| I08 | Ricontrollo sospensione e revoca | Account riabilitato recupera il flusso; polling non produce salti ripetuti | P0 |

### J. Account e cancellazione

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| J01 | Profilo: dati, modifica, installa, logout, elimina | Tutte le azioni raggiungibili e correttamente nascoste quando non applicabili | P1 |
| J02 | Cancellazione: conferma e annullamento | Effetti chiari; annullare non modifica nulla; eseguire solo su D con conferma | P0 |
| J03 | Cancellazione reale: sessione OAuth attuale e gateway JWT | Verificare POST reale, non dedurre successo dal GET 405 già provato | P0 |
| J04 | Account, foto, Tribe, Spot, match, messaggi e riferimenti | Rimozione effettiva e conseguenze sull'altro utente documentate | P0 |
| J05 | Foto multiple, errore storage/RPC/auth e retry | Nessun falso successo; definire recupero di cancellazione parziale | P0 |
| J06 | ID contraffatto e chiamata senza sessione | Nessuna cancellazione di altri account; secret solo server | P0 |
| J07 | Riapertura e altro telefono dopo eliminazione | Accesso precedente non riporta dati cancellati; nessun ritorno a vecchie liste | P0 |
| J08 | Richieste privacy selettive e assistenza | Procedura operativa e verifica professionale prima del lancio, senza introdurre automaticamente Lascia Tribe | P1 |

### K. Installazione, offline e riapertura

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| K01 | Invito dopo primo match e Più tardi | Una volta per browser quando previsto, chiudibile, chat non bloccata | P1 |
| K02 | Android: evento installazione e conferma nativa | Installazione fisica riuscita quando supportata; nessuna promessa di installazione silenziosa | P1 |
| K03 | iPhone: Safari, Condividi, aggiunta Home | Istruzioni eseguibili sul dispositivo e avvio riuscito | P1 |
| K04 | Già installata, prompt non disponibile, errore o rifiuto | Niente inviti impropri; alternativa chiara nel profilo | P1 |
| K05 | Avvio Home, icona, nome, modalità standalone, sessione | Avvio senza QR incorporato; test esplicito della sessione Safari/PWA senza assumerne condivisione | P0 |
| K06 | Offline e ritorno online | Spiegazione chiara; nessun falso invio o profilo offline dichiarato aggiornato | P0 |
| K07 | Service worker e cache privata | Nessuna cache di foto, chat, auth, risposte API o URL OAuth | P0 |
| K08 | Aggiornamento app già installata | Carica la versione nuova senza reinstallazione obbligatoria; nessun vecchio bundle incompatibile | P1 |

### L. Pannello gestore

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| L01 | Login Google gestore e account non autorizzato | Autorizzazione server; URL admin da solo non concede accesso | P0 |
| L02 | Sessione separata utente/gestore e logout | Uscire dal pannello non confonde l'account utente | P0 |
| L03 | Coda vuota/lunga, aggiorna, errore rete | Report leggibili, stati e ordine comprensibili; retry | P1 |
| L04 | Motivo, dettagli, data, stato account | Dati corretti e visibili solo ai gestori autorizzati | P0 |
| L05 | Verifica, archivia, sospendi con nota, revoca | Nota richiesta per sospendere; azioni persistenti e audit | P0 |
| L06 | Doppio click, due gestori, refresh durante revisione | Nessuna azione incoerente o nota persa senza avviso | P1 |
| L07 | Account amministrativo dedicato | Trasferimento del ruolo personale pianificato, verificato e approvato prima della revoca | P1 |

### M. Navigazione, design e accessibilità trasversale

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| M01 | Cinque tab, selezione attiva, dettaglio, match, chat, form | Ogni schermata ha uscita comprensibile e nessun vicolo cieco | P0 |
| M02 | Indietro app e indietro browser/telefono | Distinguere i due comportamenti; definire e testare ritorno interno senza uscita accidentale o perdita bozza | P1 |
| M03 | Sovrapposizioni di dettaglio, report e installazione | Un'interazione comprensibile alla volta; niente tap su controlli nascosti sotto un overlay | P0 |
| M04 | Loading, vuoto, errore e successo per ogni sezione | Stati distinti; timeout/retry valutati; nessun spinner infinito | P0 |
| M05 | Testo italiano e terminologia account/Spot/Tribe | Nessun «account Google» usato per intendere «account Spot Now»; errori tecnici tradotti | P1 |
| M06 | Confronto screenshot Claude/Figma/app | Inventario di tutte le schermate, varianti e differenze intenzionali | P1 |
| M07 | Responsive, scroll, safe area, tastiera e zoom testo | Controlli raggiungibili e niente troncamenti che impediscono azioni | P0 |
| M08 | Contrasto, focus, etichette, lettore schermo, tap target | Percorsi essenziali eseguibili anche senza mouse; errori annunciati | P1 |
| M09 | Animazioni e preferenza movimento ridotto | Caricamento distinto dalle animazioni decorative; variante ridotta dove necessaria | P2 |
| M10 | Demo e app reale | Demo chiaramente riconoscibile e isolata, nessun dato fittizio nel flusso reale | P0 |

### N. Backend, sicurezza e operatività

| ID | Funzione e prove | Criterio di chiusura | Priorità |
|---|---|---|---|
| N01 | RLS/RPC su profili, membership, check-in, Spot, match, messaggi | Matrice anonimo/proprietario/membro/estraneo/bloccato/sospeso/gestore verificata | P0 |
| N02 | Storage upload/lettura, percorsi contraffatti, URL firmati | Foto private; accesso limitato; durata residua link già emessi documentata | P0 |
| N03 | Integrità: vincoli, transazioni, reciprocità simultanea, cascade | Nessuna duplicazione o riferimento orfano; verifiche PostgreSQL | P0 |
| N04 | Client secret, service role, ambiente build e log | Nessun segreto server nel bundle/Git/evidenze | P0 |
| N05 | Carico di polling/foto, utenti simultanei e risposte lente | Misurare latenza/costi; nessun accumulo incontrollato; fissare soglie dopo baseline | P1 |
| N06 | Errori client/server e monitoraggio | Errori riproducibili e diagnosticabili senza raccogliere chat/token; alert operativi da definire | P1 |
| N07 | Google, email mittente, dominio e supporto dedicati | Configurazione adatta al pubblico pilota, contatti funzionanti | P1 |
| N08 | Repository: commit, push, documentazione e tracciamento | Il workspace oggi non ha commit: creare una base versionata prima di altri rilasci; nessun segreto incluso | P1 |
| N09 | Build, deploy statico Vercel e configurazione | Build riproducibile; config statica ricopiata dopo build; verifica URL finale | P0 |
| N10 | Migrazioni, compatibilità frontend e rollback | Procedura distinta per frontend e database; rollback dati non presunto automatico | P1 |
| N11 | Backup e ripristino dati | Verificare capacità/piano del servizio e prova controllata di ripristino | P1 |
| N12 | Produzione/prove, QR e dati fittizi | Ambienti e dati distinguibili; locale pilota non confuso con Locale di prova | P1 |
| N13 | Informativa, condizioni, pubblico 18+, gestione abusi e richieste dati | Revisione professionale e procedura operativa prima di inviti pubblici; il piano non è una certificazione legale | P1 |
| N14 | Documentazione storica e moduli non più attivi | Evidenziare flussi superati (anonimo/primo match Google) e riferimenti attuali; pulizia solo dopo verifica dipendenze | P2 |

## 5. User journey da eseguire dall'inizio alla fine

Queste prove collegano le singole sezioni: una sezione funzionante isolatamente non basta. Per ogni journey si eseguono anche ritorno indietro, background e almeno un errore di rete nel passaggio critico.

| Journey | Condizioni e sequenza | Risultato atteso | Copertura |
|---|---|---|---|
| U01 — Nuovo utente dal QR | Nessun account → QR L1 → anteprima → Google → foto/dati → check-in → Ora | Profilo e presenza creati nel luogo giusto; Tribe L1 acquisita | A–E, F01–F03 |
| U02 — Nuovo utente dal sito | URL generale → intro → scanner → QR → ingresso | Nessun obbligo di indovinare come entrare; stesso esito U01 | A, B, C |
| U03 — Ritorno durante presenza | Chiudi browser → riapri | Accesso e profilo recuperati, presenza non rinnovata | A02, C07, B10 |
| U04 — Ritorno dopo scadenza | Attendi scadenza → riapri → Tribe → dettaglio | Tribe usabile; Ora non dichiara utente live | A03, E06, F03 |
| U05 — Rinnovo presenza | Presenza scaduta → QR L1 | Presenza rinnovata, appartenenza non duplicata | B, E02 |
| U06 — Visita a un secondo luogo | Live L1 → QR L2 → Ora → elenco Tribe → L1 | Solo live L2; entrambe le Tribe disponibili | E03, F04–F08 |
| U07 — Accesso Google esistente | Nessuna sessione → QR → Google già usato | Stesso profilo, match e messaggi; nessun nuovo onboarding indebito | C01, C07 |
| U08 — Vecchio profilo temporaneo | Sessione anonima precedente → Continua con Google | Recupero account Google esistente, conseguenze chiare sul temporaneo | C03–C04 |
| U09 — Migrazione temporanea | Temporaneo → conserva → Google nuovo o in conflitto | Conservazione quando possibile, conflitto esplicito e percorso di accesso normale | C04 |
| U10 — Google annullato/errore | Avvia Google → annulla o errore → riprova | Login recuperabile e luogo ancora corretto | B09, C02 |
| U11 — Email alternativa | QR → email → link/codice → profilo/check-in | Account corretto e luogo mantenuto; UI completa senza controlli inutilizzabili | C05–C06 |
| U12 — Spot live non reciproco | A/B in L1 → A apre B → Spot → esci/rientra | Interesse persistente, nessun falso match, nessun ritiro | G01–G03, G06 |
| U13 — Primo match simultaneo | A/B Spot reciproci quasi insieme | Un match, invito installazione chiudibile, chat apribile | G04, G08, K01 |
| U14 — Spot da Tribe a distanza | Presenza scaduta → L1 Tribe → Spot → altro ricambia più tardi | Match persistente contestualizzato a L1 | F06, G03, G06 |
| U15 — Match su più luoghi | A/B membri L1/L2 → Spot in luoghi diversi → reciprocità nello stesso | Nessuna reciprocità incrociata errata, un match per coppia | G05 |
| U16 — Conversazione completa | Match → primo messaggio → risposta altro telefono → indietro → rientro | Messaggi corretti e chat sempre disponibile | H01–H07 |
| U17 — Conversazione interrotta | Scrivi bozza → altra sezione/background → rientro → invia | Destinatario e bozza conservati nella sessione | G07, H03, H08 |
| U18 — Rete instabile in chat | Invia/leggi con rete lenta o assente → torna online | Stato veritiero e recupero; verificare duplicazione da retry | H05–H07, K06 |
| U19 — Modifica profilo | Profilo → modifica nome/preferenza/foto → salva → riapri | Dati aggiornati; niente nuovo check-in; indietro funziona | D08–D10 |
| U20 — Abbandono modifica | Modifica senza salvare → indietro/background | Comportamento esplicito, nessun form resettato al ritorno | D09, M02 |
| U21 — Blocco dalla chat | A blocca B → B prova a scrivere/vedere A | Restrizioni applicate server e UI in tutte le sezioni | I02, I05, H11 |
| U22 — Segnalazione senza blocco | A segnala B con opzione disattivata → gestore legge | Segnalazione privata, nessun blocco implicito | I02, I06, L03–L04 |
| U23 — Sospensione e revoca | Report fittizio → gestore sospende → utente ricontrolla → revoca | Restrizioni effettive e recupero dopo revoca, audit corretto | I07–I08, L05 |
| U24 — Installazione Android | Primo match → prompt → conferma → avvio Home | App avviabile, sessione testata, nessun QR rinnovato | K01–K05 |
| U25 — Installazione iPhone | Primo match → istruzioni → aggiungi Home → apri | App usabile; eventuale nuovo login spiegato e dati recuperati | K03–K05 |
| U26 — Rifiuto installazione | Primo match → Più tardi → chat → installa da profilo | Chat libera; invito non ripetuto impropriamente | K01, K04 |
| U27 — Cambio account | Logout A → Google B → visita stesso luogo | Nessun dato/bozza/foto di A nel contesto B | C08, J01 |
| U28 — Cancellazione account | D con foto/membership/match/report fittizi → conferma → altro account controlla | Rimozione effettiva e niente accesso residuo ai dati | J02–J07 |
| U29 — Accesso negato | Estraneo/non gestore/bloccato/sospeso → URL e API protette | Server nega indipendentemente dalla UI | N01, L01 |
| U30 — Aggiornamento versione | App già aperta/installata → nuova release → riapri | Versione aggiornata, account/dati conservati, nessun flusso vecchio incompatibile | K08, N09–N10 |

## 6. Sequenza di lavoro

### Passaggio 1 — Baseline e inventario

Congelare una versione identificabile, registrare regole di prodotto e dispositivi, predisporre A–E/L1/L2. Recuperare e confrontare schermate Claude/Figma/app. Creare registro dei bug con gli ID di questo piano. Verificare la coerenza della durata live confermata di 90 minuti e le altre decisioni esplicite del paragrafo 2. Versionare il progetto prima dei prossimi rilasci.

Uscita: inventario completo e versione riproducibile, senza certificare test non eseguiti.

### Passaggio 2 — Accesso e ingresso

A–D, E01–E03, C08–C11. Eseguire U01–U11 e U27 su telefoni reali. Prima risolvere login, QR perso, profilo bloccato, navigazione e camera; poi copy e layout.

Uscita: un nuovo utente e uno esistente entrano senza assistenza; account e luogo sono sempre corretti.

### Passaggio 3 — Ora e Tribe

E–F, G01–G05; U04–U06 e U12–U15. Verificare scadenza reale, due luoghi, filtri, conteggi, richieste lente e passaggio tra schermate.

Uscita: presenza temporanea e appartenenza persistente coerenti con server e comprensibili agli utenti.

### Passaggio 4 — Match e chat

G–H e M01–M04; U13 e U16–U18. Stressare navigazione, invii simultanei, destinatari, bozze, ricezione e ripristino rete. Aggiungere test automatici per ogni bug significativo riprodotto.

Uscita: nessun blocco o destinatario errato; messaggi persistenti e stati di invio veritieri.

### Passaggio 5 — Sicurezza e ciclo account

I–J, L e N01–N04; U21–U23, U28–U29. Prima test locali delle policy, poi azioni reali su utenti di prova autorizzati. Verificare realmente la cancellazione POST con OAuth e JWT gateway, la rimozione dei dati e i casi parziali.

Uscita: utenti estranei non vedono/scrivono/cancellano dati altrui; moderazione e cancellazione operative.

### Passaggio 6 — Esperienza mobile e installazione

K e M05–M10; U19–U20 e U24–U26/U30. Confronto visivo per tutte le schermate e stati, tastiera, schermi piccoli, lettore schermo, Safari/Chrome e avvio Home.

Uscita: app utilizzabile e installabile sui dispositivi del pilota; istruzioni aderenti al browser reale.

### Passaggio 7 — Prontezza del locale pilota

N05–N14. QR del luogo reale, supporto e account gestore dedicati, verifica configurazione Google/email, documentazione privacy e abusi, backup/ripristino, procedura pubblicazione/rollback e monitoraggio. Ripetere smoke test della release finale, non tutti i test indiscriminatamente a ogni modifica.

Uscita: nessun P0 aperto, tutti i P1 richiesti dal pilota superati oppure rinvio motivato esplicitamente approvato, evidenze archiviate e percorso di assistenza pronto.

## 7. Registro dei bug e criteri di accettazione

Per ogni bug utilizzare:

- ID bug e riferimenti feature/journey.
- Versione, ambiente e account di prova (alias, non credenziali).
- Passaggi minimi, atteso/effettivo, frequenza e impatto.
- Evidenza e priorità; responsabile della correzione e del collaudo.
- Correzione, verifica automatica pertinente, riconferma sul dispositivo dove è apparso.
- Stato e regressioni controllate nelle sezioni vicine.

Esempio: BUG-CHAT-01 → H02/U16 → torna dalla chat e riaprila → atteso apertura stessa conversazione → corretto nel debug del 3 ottobre → test automatico passato e verifica browser pubblico fatta → riconferma Safari/Chrome fisici da registrare.

Non dichiarare «tutto OK» se resta una voce P0 non eseguita. Una deroga P1 deve descrivere utenti coinvolti, limite, percorso alternativo e data di riesame.

## 8. Evidenze già disponibili e gap

Baseline disponibile: 39 test automatici passati, build e controllo tipi del perimetro backend/domain/Edge configurato. I nuovi test UI usano un DOM semplificato e backend controllati: verificano race condition e navigazione, non rendering reale, tastiera o fotocamera. I test PostgreSQL verificano policy/integrità localmente; non certificano automaticamente tutte le impostazioni del servizio pubblico.

Verifiche browser registrate: Google/account esistente, QR mantenuto, check-in, ripristino sessione, appartenenza Tribe, presenza di altro utente, apertura/ritorno/riapertura chat e modifica/ritorno profilo. L'ultimo percorso Google dal profilo temporaneo è stato verificato nell'anteprima con lo stesso backend reale. Il proprietario ha confermato che due utenti si vedono e messaggiano su telefoni; il collaudo ha fatto emergere bug poi corretti. Serve registrare la riconferma fisica della release finale.

Gap prioritari: matrice completa Safari/Chrome/PWA, Google per utenti non già ammessi al progetto OAuth, 90 minuti reali e secondo luogo, errori rete durante invio, cancellazione POST end-to-end su D, moderazione con account dedicato, camera/installazione fisiche, readiness legale/operativa, versionamento e ripristino.

Riferimenti attuali: `docs/debug-2026-10-03.md`, `docs/tribe-implementation.md`, `docs/piano.md`. I documenti storici su login anonimo e Google dopo il match non sono la specifica del flusso corrente.

## 9. Smoke test per ogni nuova release

1. Build e test appropriati alla modifica; nessun P0 aperto.
2. QR L1 → login/profilo → Ora, con account nuovo ed esistente quando cambia l'accesso.
3. Tribe L1/L2 e ritorno a Ora quando cambiano presenza/navigazione.
4. Match → chat → indietro → riapertura → ricezione messaggio di prova.
5. Profilo → modifica → indietro; background → ritorno senza cambio schermata.
6. Sessione dopo riapertura; nessun rinnovo QR implicito.
7. Verifica non distruttiva delle restrizioni rilevanti; azioni reali solo sui test autorizzati.
8. Versione pubblica corretta e almeno un telefono; entrambi quando cambia mobile/auth/installazione.

Non effettuare una cancellazione reale o una nuova segnalazione a ogni release se la modifica non le riguarda. Ripetere le prove ampie quando una modifica trasversale, un fallimento o una nuova evidenza lo giustifica.
