# Revisione sotto carico — 4 ottobre 2026

## Esito e ambito

Simulazione isolata con 10.000 utenti, 19.009 appartenenze a 10 luoghi, 1.000 check-in attivi, 2.000 match dello stesso utente e 20.000 messaggi nella stessa conversazione. Nessun utente o messaggio sintetico è stato inserito in produzione. Le ottimizzazioni del database sono state applicate al progetto Supabase; la release applicativa usa le nuove letture paginate.

Sono stati corretti elenchi illimitati, lavoro ripetuto per ogni membro, richieste duplicate e concorrenti senza limite, caricamento dell'intera chat e lookup dei match che assumevano che tutti fossero nella prima pagina. Le schermate mostrano subito i dati disponibili senza attendere tutte le foto. Le letture condivise hanno un timeout di 15 secondi e possono essere riprovate.

Non è una certificazione di 10.000 utenti simultanei. Il database è PostgreSQL locale tramite PGlite; il browser usa dati fittizi e ritardi artificiali. Capacità, quote Supabase, throughput reale, CDN, dispositivi fisici e latenza Internet richiedono una successiva prova su ambiente di staging con le risorse del servizio pubblico.

## Misure riproducibili

`pnpm review:load` ricrea il database in memoria ed esegue tutte le migrazioni. Le query precedenti restano disponibili per confrontarle con quelle nuove sullo stesso dataset e durante la stessa esecuzione. Tempi di una singola esecuzione, senza rete: non sono percentili p95/p99 né tempi completi della pagina.

| Lettura | Prima | Dopo | Dati restituiti dopo |
|---|---:|---:|---:|
| Tribe, 9.000 profili fuori dalla presenza attiva | 467,4 ms | 21,6 ms | 49, di cui 48 visualizzati |
| Ora, 999 altre persone presenti | 408,1 ms | 7,6 ms | 49, di cui 48 visualizzati |
| 2.000 match | 50,2 ms | 5,8 ms | 49, di cui 48 visualizzati |
| Chat da 20.000 messaggi | 468,0 ms | 3,0 ms | ultimi 100 |

Pagina Tribe verso la fine: 20,1 ms; pagina precedente di 100 messaggi: 5,5 ms. Anteprima aggregata del QR: 11,8 ms; conteggi di 10 Tribe: 23,1 ms. Risultati grezzi in `load-review-results.json`. Il file `load-review-baseline.json` conserva la misurazione precedente all'introduzione delle nuove RPC.

## Controlli automatici

122 test passati, controllo TypeScript e build di produzione. I test includono:

- Tutti i 1.200 profili con lo stesso nome raggiungibili in pagine deterministiche, senza duplicati o taglio a 1.000 risultati.
- Griglie e liste limitate a 48 schede anche con 10.000 profili; cambi di Tribe e risposte obsolete non mescolano i dati.
- 2.000 match: paginazione, apertura e ripristino di una chat oltre la prima pagina, senza inviare un altro interesse.
- 20.000 messaggi: 100 bolle alla volta, storico precedente, ritorno agli ultimi messaggi, invio dallo storico e conservazione delle bozze.
- 10.000 foto: gruppi di 100, massimo quattro richieste di firma contemporanee. Il fallimento di un gruppo non cancella le foto degli altri.
- 1.000 letture identiche simultanee condividono una richiesta; 100 letture distinte rispettano il limite di sei richieste attive. Una lettura bloccata scade e permette di riprovare.
- Blocchi in entrambe le direzioni, sospensioni, cancellazione dell'account, preferenze, scadenza dei check-in, assenza di timestamp di presenza nei profili Tribe e diniego dei profili agli anonimi.
- Suite esistente: QR, richieste camera, sessione e account, login, installazione, navigazione, messaggi idempotenti, moderazione, immagini e viewport.

La nuova API non rende pubblici i profili. In produzione sono state verificate presenza delle RPC, esecuzione consentita agli account autenticati ed esecuzione negata al ruolo anonimo.

## Verifica nel browser nativo

`pnpm preview:load`, poi `pnpm dev`, apre la fixture locale `/tests/fixtures/load-review.html`. Usa il codice applicativo reale con un backend sintetico disponibile soltanto in sviluppo. Il controllo della release verifica che il relativo hook e le fixture non siano nel bundle pubblico.

Sono stati eseguiti 100 cambi consecutivi Ora → Tribe → Match → Chat → Profilo → Ora. Dopo questi passaggi: zero errori non gestiti, nessun long task rilevato dall'osservatore, massimo tre richieste di lettura simultanee osservate, 48 schede nella schermata attiva e 1.145 elementi nel contenitore dell'app. Questo conteggio include le schermate inattive; non cresce di migliaia di schede per ogni navigazione.

Verificati apertura della chat da 20.000 messaggi, storico precedente, ritorno al fondo e invio locale; disconnessione con messaggio di errore e ripresa dopo ripristino; ritardo artificiale di 1.500 ms con recupero dei profili; apertura dalla Tribe del match con Utente 001001, assente dalla prima pagina dei match; pagina profili 49–96 di 9.000. Dopo questi controlli: zero errori non gestiti, 48 schede attive, nessun long task rilevato. Le immagini sintetiche sono SVG locali ripetute: non simulano il peso o la distribuzione di 10.000 fotografie reali diverse.

Controllati i nuovi pulsanti di paginazione a 320×568, 390×844, 412×915 e 844×390: nessun overflow orizzontale, altezza minima 44 px, pulsanti sopra la barra di navigazione. Le precedenti prove responsive e i test della tastiera restano parte della suite. Questi controlli di viewport non sostituiscono una prova della tastiera su iPhone e Android fisici.

## Prossime verifiche prima di un'acquisizione su larga scala

Su staging, aumentare progressivamente utenti contemporanei e misurare latenza p95/p99, errori, CPU, connessioni, traffico Storage, consumo quote e durata delle letture. Includere foto reali di dimensioni diverse, OAuth reale e reti mobili, senza condividere dati personali. Poi fare un piccolo test sul campo con più dispositivi fisici.

Le notifiche push ad app chiusa restano da implementare: questo intervento non le attiva. Vedere `notifiche-push.md`. Non dichiarare che ogni possibile percorso o dispositivo sia stato certificato, o che il servizio non possa mai bloccarsi.
