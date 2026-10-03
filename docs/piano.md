> Documento storico: il flusso attuale e lo stato verificato sono in `revisione-adversariale.md` e `operazioni-pilota.md`. Le sezioni precedenti possono descrivere ingresso anonimo, Google dopo il match o match a scadenza, oggi superati.

# Piano e decisioni

## Confermato
- Foto profilo obbligatoria, senza selezione di colore.
- Prototipo Claude come riferimento grafico e dei flussi; niente modalità nascosta.
- QR fisso del locale, senza geolocalizzazione. La condivisione del codice resta un limite noto del pilota.
- Check-in valido 60 minuti dall'ultima scansione. Solo una nuova scansione rinnova la presenza.
- Login persistente, indipendente dal check-in. Chat e match restano accessibili dopo il check-out.
- PWA installabile sul telefono.
- Match reciproco con scadenza a 60 minuti e avviso a 45 minuti. Il primo messaggio reale di uno dei due annulla la scadenza.
- Messaggio suggerito solo precompilato, mai inviato automaticamente.
- Primo pilota in un solo locale a Milano.

## Milestone
1. Interfaccia fedele e verifica visiva di ogni schermata.
2. Autenticazione persistente, profili, storage foto e validazione server 18+.
3. QR e check-in server; query e autorizzazioni per locale, presenza, preferenze e blocchi.
4. Interessi privati, match atomico, chat reale e scadenze server.
5. Segnalazioni, moderazione, gestione account e notifiche.
6. PWA, test tra dispositivi e pubblicazione del pilota.

## Da definire prima delle relative funzionalità
Metodo di login; compatibilità delle preferenze in entrambe le direzioni; uscita anticipata; canale notifiche. Le proposte precedenti non sono trattate come decisioni confermate.

## Verifica iniziale
Repository GitHub vuoto. La pagina Figma 0:1 contiene template generici (social feed, ecommerce, attività e altri), non le schermate Claude. Questa era la situazione iniziale; vedere l’aggiornamento Figma sotto.

## Verifica della prima base
- Test automatici: 3 superati (scadenza match al limite di 60 minuti, messaggio ricevuto che preserva il match, validazione età, esclusione profili bloccati).
- Browser: verificato ingresso, onboarding, lista, dettaglio, match con Giulia, bozza precompilata senza invio automatico e invio manuale.
- Controllo visivo iniziale della chat eseguito; confronto completo di tutte le schermate e dei viewport ancora da completare.
- File preparati localmente, non ancora pubblicati su GitHub.

## Seconda fase preparata
- Client Supabase ufficiale installato, dipendenze fissate nel lockfile.
- Adapter account/OTP/profili/foto e sessioni persistenti predisposto.
- Migration per profili 18+, foto private obbligatorie, accesso per presenza e blocchi, check-in QR con timestamp server.
- 9 test JavaScript superati. Migration e policy non ancora eseguite/collaudate su database.
- Attivazione in attesa del progetto Supabase e della scelta email/SMS. Interfaccia ancora in modalità demo.

## Collegamento progetto
- URL e chiave pubblica configurati in `.env.local`, escluso da Git.
- Versione live predefinita, demo separata con `?demo=1`.
- Accesso email, recupero sessione e adapter profilo/check-in collegati all’interfaccia.
- Build e 9 test passano. Verificata schermata di accesso nel browser.
- Restano: accesso dashboard, migration e configurazione email/redirect; test integrato non eseguito.

## Database attivato
- Migration eseguita e storage privato creato. Policy foto resa esplicita dopo il blocco della prima proposta da parte della revisione automatica.
- Test reali database superati: isolamento tra locali e foto, blocchi, scadenza, controllo età/foto, rinnovo QR e divieto di cambiare timestamp dal client. Fixture annullate con rollback.
- Site URL e redirect locale configurati.
- Da completare: SMTP per utenti esterni e template OTP; prova completa di login/upload; dati del locale e QR reale.

## Accesso rapido concordato
Ingresso senza email tramite account anonimo Supabase; sessione conservata nel browser. Dopo il primo match, proposta facoltativa di collegare Google per recupero su altri dispositivi. Più tardi non blocca la chat; collegare Google non annulla la scadenza del match.

Anonymous Sign-Ins e Manual Linking attivati. Test browser: ingresso anonimo reale e ricaricamento con recupero della sessione, senza email. 12 test JavaScript passano. Prompt presente nella demo, hook preparato per il futuro servizio match reale. OAuth Google da configurare; non ancora collaudato.


## Figma — prima composizione del flusso
Creata pagina “SPOT NOW — Prototipo” nel file condiviso: 12 schermate modificabili, 5 componenti locali (pulsanti, campo, persona, navigazione), colori collegati ai token CSS e font Inter/Bebas Neue. Flusso QR → locale → profilo → persone → interesse → match → proposta Google → chat collegato per revisione. Foto obbligatoria; nessuna modalità nascosta o scelta colori.

Controlli: nessun font mancante, nessun figlio principale fuori dalle schermate; illustrazione SVG originale mantenuta come vettori. Identificativi in figma-state.json. La composizione Figma è una base di revisione (le azioni match sono attualmente verticali per mantenerle leggibili): resta il confronto pixel per pixel di tutti gli stati e viewport con Claude, oltre ai casi vuoti/errore/scadenza. Le schermate match/chat rappresentano il progetto, non servizi live già completati.

Prossimo sviluppo: interessi e match atomici, scadenze server e chat reale. Google resta disattivato finché non sono configurate le credenziali OAuth.


## Copy locale approvato
Spot Now è dedicata ai single. Titolo dopo la scansione: “SCOPRI CHI È SINGLE QUI ORA”; sotto, nome e indirizzo del luogo ricavati dai dati del QR. Rimossa la palestra inventata dalla demo dell’app, ora identificata come “Locale demo”. La lista live usa già il nome restituito dal database. Aggiornamento Figma applicato dopo l’upgrade: titolo aggiornato e palestra inventata sostituita da “Nome del luogo” nei riferimenti del flusso. In app il valore è dinamico dal QR; in Figma è un segnaposto.


## Interessi, match e chat collegati
Migration 002 applicata a Supabase. Interessi privati inviabili solo con presenza attiva nello stesso luogo; match reciproco creato dal server, serializzato per coppia per evitare duplicati. I match senza messaggi scadono esattamente dopo 60 minuti. Il primo messaggio conserva la conversazione anche dopo il check-out. Blocchi in entrambe le direzioni impediscono lettura e invio. Timestamp e primo messaggio non modificabili dal client.

Interfaccia live: dettaglio, interesse, match, invito Google facoltativo, elenco match, chat e blocco collegati. Aggiornamento mentre l’app è aperta ogni 5 secondi; avviso dopo 45 minuti. Nessun messaggio automatico o risposta fittizia nella versione live. Segnalazioni/moderazione restano da implementare: il controllo profilo ora indica solo “Blocca”.

Verifiche: tests/matches_messages.sql PASS sul database, fixture annullate con rollback. 13 test JavaScript e build passano. Browser con backend isolato di prova: errore di invio conserva la bozza; retry salva una sola volta, visualizza il messaggio e svuota il campo; match revocato fa uscire dalla chat. Resta da eseguire il percorso completo con due account reali e QR di un luogo pilota.


## Prova completa con due account reali — PASS
Creato un “Locale di prova” attivo con QR casuale (token conservato soltanto in .local, escluso da Git). Avviate due sessioni indipendenti su 127.0.0.1:4174 e localhost:4174, separate dalla sessione del fondatore. I profili TEST A/Test Luca e TEST B/Test Anna hanno caricato immagini PNG di prova, salvato il profilo e fatto check-in sullo stesso token.

Verificato nel browser: visibilità reciproca secondo preferenze; interesse unilaterale senza match; interesse reciproco con match in entrambe le sessioni; richiesta Google facoltativa e “Più tardi”; scambio messaggi A→B e B→A; ricaricamento senza login e recupero dei due messaggi dal database; blocco con rimozione del profilo e della chat su entrambi i lati. Screenshot two-users-chat.png.

Le presenze dei due account di test sono state chiuse amministrativamente con query limitata al solo locale/profili di prova: 0 check-in attivi finali. Profili, immagini, messaggi e blocco di prova restano nel progetto per audit; nessuna cancellazione di account reali. Il locale e il QR restano disponibili per prove successive.

QR generato e decodificato dal lettore dell’app. PNG locale: docs/test-qr.png (ignorato da Git); pagina di verifica: /tests/fixtures/qr-validation.html. Il link punta al computer locale, non è ancora utilizzabile da un altro telefono. Prova della fotocamera fisica e su due telefoni da eseguire dopo la pubblicazione HTTPS.


## Da cambiare prima del lancio
- Sostituire l’email personale temporanea di assistenza Google con un indirizzo dedicato a Spot Now; aggiornare schermata consenso OAuth e contatti del progetto. Richiesta del proprietario del 2 ottobre 2026.


## Segnalazioni — base operativa
Migrazione 003 applicata. Segnalazioni private con motivazione, dettagli facoltativi e blocco opzionale atomico. Pannello disponibile nel dettaglio e nelle opzioni della chat live. Test SQL PASS: profili non accessibili, autoreport e motivi invalidi rifiutati, lettura privata negata, blocco opzionale verificato; fixture annullate. La revisione avviene ancora nella dashboard: nessun pannello amministrativo o sospensione globale automatica. OAuth Google resta da collaudare nel percorso completo.


## Sospensione globale — base server completata
Migrazione 004 applicata; gestione riservata tramite SQL amministrativo, reversibile. Liste e accesso ai match filtrati per sospensioni di entrambe le parti; check-in rifiutato. Test database PASS su isolamento, privilegi amministrativi e riattivazione, con rollback. Nessun account reale sospeso. Pannello amministrativo e interfaccia di stato sospeso ancora da costruire.


## Stato sospeso nell’app
Migrazione 005 applicata. Schermata dedicata con controllo manuale e aggiornamento ogni 15 secondi mentre l’app è visibile; al rientro controlla subito. Durante la sospensione nasconde navigazione e popup social; alla revoca recupera il profilo e la presenza secondo le regole esistenti. Test database PASS anche per stato del solo chiamante e revoca; anteprima browser verificata su fixture isolata, senza sospendere account reali. Pannello gestore ancora da implementare: richiede account amministratore identificato e permessi server dedicati, mai una chiave segreta nel frontend.


## Pannello di moderazione
Pagina separata /?admin=1 implementata, login Google con sessione separata, RPC autorizzate tramite lista privata di UUID e audit delle azioni. Migrazione 006 applicata e test SQL PASS con rollback. Accesso Google completato nel browser; account proprietario autenticato ma ancora senza ruolo gestore. Assegnazione dei privilegi in attesa di conferma esplicita. Prova UI della coda e azioni reali da completare dopo assegnazione, con fixture dedicate.


## Account gestore da sostituire
Il proprietario ha autorizzato il ruolo gestore per email personale del proprietario il 2 ottobre 2026. Prima del lancio trasferire il ruolo a un account amministrativo dedicato Spot Now, verificare accesso e permessi del nuovo account, poi revocare il ruolo dell’account personale. Questa attività è distinta dalla sostituzione dell’email di assistenza OAuth.

Assegnazione gestore completata dopo conferma esplicita: verificati email confermata, identità Google e unico UUID corrispondente. Accesso reale al pannello verificato nel browser; coda attualmente vuota.


## Collaudo pannello reale — PASS
Creata una sola segnalazione fittizia tra i profili di test già esistenti (Test Luca/Test Anna, locale di prova). Verificati dal browser: lettura coda, rifiuto sospensione senza nota, sospensione con nota, revoca e archiviazione. Query finale: report dismissed, account attivo, 3 azioni di audit. La segnalazione e l’audit rimangono come prova chiaramente marcata COLLAUDO. Nessun utente reale sospeso. Stati tradotti in italiano e singolare/plurale corretti. Build passata.


## PWA e preparazione HTTPS
Manifest standalone con avvio senza token QR, icone 192/512/maskable/Apple, pulsante Aggiungi alla schermata Home nel profilo e istruzioni Safari/menu browser. Service worker solo in produzione: cache esclusiva della pagina offline, nessuna cache di foto/profili/chat/autenticazione. 16 test e build passati; dimensioni icone e file della build verificati. Anteprima istruzioni verificata nel browser. Vercel scelto dal proprietario per delega; configurazione build pronta in vercel.json. Account Vercel da creare previa accettazione delle condizioni. Pubblicazione e prova installazione su telefoni ancora da eseguire.


## HTTPS pubblicato
Account Vercel registrato dopo autorizzazione. Build dist caricata e pubblicata su https://spot-now-alpha.vercel.app/ tramite Drop to Deploy. Supabase Site URL e due redirect esatti aggiornati. Login Google gestore sul sito pubblico verificato fino alla coda; ingresso QR fino a onboarding verificato. QR HTTPS generato per telefoni. Nessun collegamento GitHub automatico ancora configurato. Rimangono test fisici installazione/fotocamera/due telefoni e collegamento Google anonimo con conservazione match.

### Invito a installare dopo il primo match
- Implementato invito una volta per browser dopo il primo match: prima Google, poi installazione quando si sceglie Più tardi; chi ha già collegato Google vede direttamente l’invito all’installazione.
- Android/browser compatibili: pulsante apre conferma nativa quando beforeinstallprompt è disponibile. iPhone: brevi istruzioni Safari, Condividi, Aggiungi alla schermata Home. Nessuna installazione silenziosa.
- Più tardi ed Escape chiudono il popup senza bloccare la chat. Il profilo mantiene il pulsante per riprovare. Nessun invito in modalità standalone.
- Verifica locale della sequenza, della chiusura e dell’assenza di ripetizione: superata; 16 test e build superati.
- Pubblicazione di questo aggiornamento in attesa dell’autorizzazione alla CLI ufficiale Vercel; sito pubblico ancora alla versione precedente.

### Tribe — implementazione locale (3 ottobre 2026)
Implementati ingresso account prima del check-in, pagina «Le tue Tribe», più luoghi per utente, griglia separata, presenza 90 minuti, Spot/match persistenti e cancellazione account lato server. Nessun ritiro Spot o uscita dalla Tribe. Dettagli, file, verifiche e limiti in `docs/tribe-implementation.md`. Le migrazioni 007–008 sono pronte nell’editor Supabase ma non eseguite: l’ampliamento di visibilità ai membri offline richiede conferma al momento dell’applicazione. Funzione e bundle pubblico ancora da attivare; non considerare questa feature pubblicata.

### Tribe — pubblicazione e verifica reale (3 ottobre 2026)
Autorizzazioni ricevute e migrazioni 007–008 applicate con successo. Funzione delete-account pubblicata con verifica JWT attiva. CLI ufficiale Vercel autenticata; aggiornamento pubblicato su https://spot-now-alpha.vercel.app/ (deployment finale D91fSG6Zvv4qidDb6oA3fcNx6SUE, READY). Google prima del check-in e invito all’installazione dopo il primo match sostituiscono la sequenza precedente. Verificati sul sito pubblico: accesso Google con account esistente, conservazione del luogo QR durante OAuth, check-in, appartenenza reale alla Tribe e ripristino sessione dopo ricaricamento. Corretto il conflitto con un’identità Google già collegata tramite scelta esplicita dell’account esistente. 21 test, typecheck e build superati. Prova: docs/tribe-live-published.png. Rimangono collaudo su telefoni fisici, percorso completo con due account Google distinti e cancellazione effettiva di un account di prova sacrificabile. Dettagli in docs/tribe-implementation.md.

### Debug dopo prova con due telefoni (3 ottobre 2026)
Correzioni pubblicate: Google standard anche da vecchia sessione temporanea, liste senza caricamento periodico, navigazione chat stabile, mantenimento schermata al ritorno dall'app in background, bozze, errori foto isolati e rinnovo foto personale, modifica profilo e pulizia dopo logout. 39 test, typecheck e build superati. Verifica reale apertura/ritorno/riapertura chat e profilo sul sito pubblico. Dettagli e limiti in docs/debug-2026-10-03.md. Deployment finale E9APKZRNv2mJALDbD3Gm1WdedHkF READY.

### Revisione sistematica completa
Piano del 3 ottobre in docs/piano-revisioni-completo.md: 14 aree, funzioni con ID/priorità/criteri di chiusura, 30 journey completi, matrice dispositivi/rete/account, sequenza di sette passaggi e gate del pilota. È un piano da eseguire, non un certificato di test passati. Esplicitata la divergenza durata iniziale 60 minuti / implementazione attuale 90 minuti da confermare prima del pilota.

Durata del check-in confermata dal proprietario: 90 minuti. Rinnovo soltanto con nuova scansione del QR; aggiornato il piano di revisione.
