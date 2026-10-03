# Revisione avversariale Spot Now

Data: 3 ottobre 2026. Ambito: 134 voci A–N e 30 user journey del piano completo. **Il piano non è interamente chiuso**: correzioni tecniche implementate, prove automatiche eseguite, verifiche fisiche/operative/distruttive distinte. Il rilascio tecnico non equivale ad autorizzazione al lancio pubblico del pilota.

## Correzioni implementate

- Retry di messaggi e segnalazioni con nonce e vincoli server: una risposta persa non genera una seconda scrittura durante la stessa sessione della pagina.
- Timeout richieste; separazione delle richieste per account/navigazione; risposte tardive ignorate e liste stabili durante polling.
- Chat riapribile; bozze conservate dentro la sessione; invio confermato distinto dall'errore della lettura successiva; destinatario protetto durante cambio chat.
- Cronologia interna del browser, profilo senza QR recuperabile, schermata dedicata alla cancellazione incompleta.
- Quarantena account prima della cancellazione: niente discovery, messaggi, check-in o upload durante una cancellazione parziale. Retry idempotente del blocco.
- Foto obbligatoria, limiti e contenuto del file controllati, guardie per selezioni tardive; URL private brevi riutilizzate localmente e cache pulita al cambio account.
- Un dialogo per volta, focus tastiera, Escape, sfondo inert e installazione differita quando c'è un altro dialogo.
- Camera protetta da startup/callback vecchi, doppia scansione ignorata; anteprima QR protetta da risposte obsolete.
- Moderazione serializzata nel pannello, note conservate negli errori, autorizzazione server e audit mantenuti.
- Errori tecnici sostituiti da testi italiani, etichette accessibili, foto come pulsante, banner offline, movimento ridotto e demo riconoscibile.
- Script rilascio, controllo asset/chiavi, CI, documentazione attuale e procedure rollback/backup/assistenza.

## Evidenze e limiti

Suite Node: prove UI con DOM simulato, backend con client simulato, PostgreSQL PGlite con ruoli e migrazioni reali 001–009, funzione Edge in VM e ripristino locale su database separato. Il modello Auth/Storage nei test è una fixture: non certifica gateway, SDK e filesystem cloud. Typecheck copre domain/backend, QR, errori, timeout, foto, refresh, navigazione e funzione Edge; build Vite verifica import/bundle del resto della UI.

Browser reale: sessione pubblica recuperata al reload; Tribe con dati reali; modifica profilo/indietro; chat → indietro → stessa chat; indietro browser locale; dialogo report → Escape → chat accessibile. Nessuna nuova segnalazione, messaggio al collaudatore, sospensione o cancellazione reale effettuata. A 390×844 il form resta entro i 390 px: non è una prova di tastiera/camera/PWA fisica.

Supabase: migrazione 009 applicata con «Success. No rows returned»; endpoint account aggiornato; POST dry_run con sessione reale risponde autenticato e nessuna cancellazione iniziata. Verifica JWT dashboard attiva. Backup: il piano Free non include project backups.

Figma: screenshot introduttivo nodo 13:76 confrontato tramite skill figma-use; stile del prototipo mantenuto. Nessun aggiornamento completo delle varianti del file è stato eseguito. Evidenza browser locale privata: `docs/revisione-pubblicata.png`, esclusa da Git.

## Registro delle 134 voci

«Tecnica parziale» significa che l'evidenza copre parte della riga, **non** che tutte le combinazioni del criterio di chiusura sono superate. «Esterna aperta» richiede prova fisica, account controllato o decisione operativa. Ogni voce mantiene il criterio originale del piano; le evidenze sotto sono un punto di partenza riproducibile.

| ID | Oggetto | Stato | Evidenza / prossimo controllo |
|---|---|---|---|
| A01 | Prima visita senza account, QR o sessione | Tecnica parziale | Copertura parziale: live-navigation.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| A02 | Riapertura con account e check-in valido | Tecnica parziale | Copertura parziale: live-navigation.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| A03 | Riapertura con check-in scaduto | Tecnica parziale | Copertura parziale: live-navigation.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| A04 | Account senza profilo/Tribe; visita diretta senza QR | Tecnica parziale | Copertura parziale: live-navigation.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| A05 | Illustrazione, headline, font, colori, spaziature e pulsanti | Tecnica parziale | Intro Figma 13:76 confrontata: headline crush introduttiva; preview luogo headline single, senza palestra fissa. |
| A06 | Primo caricamento lento o fallito | Tecnica parziale | Copertura parziale: live-navigation.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B01 | QR aperto dalla fotocamera del telefono | Esterna aperta | Link e token validati; scansione fisica esterna da ripetere su entrambi i telefoni. |
| B02 | Scanner interno e fotocamera posteriore | Esterna aperta | Logica camera e callback verificata; permessi/lente posteriore richiedono telefono. |
| B03 | Permesso negato, assenza camera, camera occupata | Esterna aperta | Rifiuto/errore gestito nel codice; assenza camera e camera occupata da collaudare fisicamente. |
| B04 | QR estraneo, dominio diverso, token malformato, luogo disattivato | Tecnica parziale | Copertura parziale: qr.test.js; scanner.test.js; tribe-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B05 | Scansioni ripetute e doppio callback dello scanner | Tecnica parziale | Copertura parziale: qr.test.js; scanner.test.js; tribe-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B06 | Uscita dallo scanner e app in background | Esterna aperta | Stop/destroy e callback tardivi testati; background della camera sul telefono aperto. |
| B07 | Nome/indirizzo/conteggi dinamici della preview | Tecnica parziale | Copertura parziale: qr.test.js; scanner.test.js; tribe-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B08 | Zero/uno/molti presenti e membri | Tecnica parziale | Copertura parziale: qr.test.js; scanner.test.js; tribe-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B09 | QR interrotto da login, onboarding o errore rete | Tecnica parziale | Token conservato; risposte vecchie ignorate. Percorso multi-browser resta da provare. |
| B10 | URL ripulito dopo check-in e avvio PWA senza token | Tecnica parziale | Copertura parziale: qr.test.js; scanner.test.js; tribe-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| B11 | QR condiviso a distanza | Tecnica parziale | Limite QR statico documentato: non è prova certa della presenza. |
| C01 | Google: nuovo account ed esistente | Esterna aperta | Accesso reale account esistente verificato nella release precedente; nuovo account da ripetere. |
| C02 | Google annullato, provider fallito, ritorno con errore | Tecnica parziale | Copertura parziale: backend.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| C03 | Vecchia sessione temporanea → normale Google | Tecnica parziale | Copertura parziale: backend.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| C04 | Conserva profilo temporaneo, Google nuovo o già collegato | Esterna aperta | Nessuna fusione automatica; conservazione temporaneo e conflitto reale ancora da provare. |
| C05 | Email alternativa: indirizzo valido/errato, link, codice se esposto, modifica email | Esterna aperta | Flusso implementato; SMTP dedicato e consegna a utenti esterni ancora da configurare/verificare. |
| C06 | Email su browser diverso, link già usato/scaduto, invii ripetuti | Esterna aperta | Email tra browser e link scaduti non collaudati in questa revisione. |
| C07 | Chiudi/riapri, token rinnovato, offline durante rinnovo | Esterna aperta | Sessione pubblica recuperata con reload; scadenza token/PWA fisica resta aperta. |
| C08 | Logout e login con altro account, anche in due schede | Esterna aperta | Logout/richieste obsolete nei test; cambio account e due schede da collaudare insieme. |
| C09 | Navigazione mentre l'accesso si completa | Tecnica parziale | Copertura parziale: backend.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| C10 | Google OAuth in modalità test e utenti non invitati | Esterna aperta | Audience Google e utente non invitato da verificare prima del pilota. |
| C11 | HTTPS, redirect pubblico/locale, errori e parametri OAuth | Tecnica parziale | Copertura parziale: backend.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D01 | Nome: vuoto, spazi, accenti, emoji, limite 60 caratteri | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D02 | Età: mancante, <18, decimale, limite server 120, tastiera mobile | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D03 | Genere/preferenze e selezioni dopo riapertura | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D04 | Foto obbligatoria: mancante, valida, formato non supportato, vuota, >8 MB | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D05 | Foto da libreria/fotocamera; HEIC, orientamento, file rinominato | Esterna aperta | HTML rinominato respinto; HEIC non supportato esplicitamente. Orientamento/libreria sul telefono da provare. |
| D06 | Upload lento/fallito, database fallito dopo upload, retry e doppio click | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D07 | Foto privata e link scaduto | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D08 | Modifica titolo, Salva, Indietro, nessun nuovo check-in | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D09 | Dati modificati e ritorno dall'app in background | Tecnica parziale | Copertura parziale: domain.test.js; backend.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| D10 | Cambio foto rapido e retry; eliminazione vecchie foto non più usate | Esterna aperta | Guardie per scelte tardive; vecchie foto conservate fino a elimina account: pulizia periodica da implementare dopo policy di conservazione. |
| E01 | Check-in dopo account e profilo; timestamp server | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E02 | Rinnovo QR nello stesso luogo | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E03 | QR di un altro luogo | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E04 | Zero/uno/molti profili, esclusione di sé e preferenze | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E05 | Polling, click durante refresh, scorrimento e lentezza | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E06 | Scadenza propria e altrui: prima, esattamente, dopo | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E07 | Foto fallita/scaduta e caricamenti simultanei | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E08 | Dettaglio, chiusura, ritorno alla stessa posizione | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| E09 | Luogo disattivato e account sospeso durante uso | Tecnica parziale | Copertura parziale: tribe-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F01 | Nessuna, una, molte Tribe | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F02 | Appartenenza solo dopo QR/check-in | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F03 | Accesso da casa, scadenza live e appartenenza persistente | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F04 | Griglia per singolo luogo e separazione dai presenti live | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F05 | Conteggi totali/live, sé incluso e filtri della griglia | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F06 | Dettaglio e Spot da Tribe | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F07 | Privacy: niente orari visite, cronologia, distanza o ranking | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F08 | Apertura rapida di L1/L2, polling, griglia lunga | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F09 | Nessuna uscita Tribe; durata illimitata attuale | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| F10 | Futura finestra attività configurabile | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-navigation.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G01 | Spot dal solo dettaglio, live e Tribe | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G02 | Primo invio, doppio tap, retry, interesse già inviato | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G03 | Invio unilaterale e reciprocità differita | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G04 | Invii simultanei di A/B | Tecnica parziale | Unicità e transazione ispezionate/testate; due transazioni concorrenti reali richiedono ambiente PostgreSQL separato. |
| G05 | Coppia in più luoghi; Spot in luoghi diversi | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G06 | Spot non ritirabile e match senza scadenza | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G07 | Match nuovo mentre si chatta/modifica/guarda dettaglio | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G08 | Schermata match: avatar, continua, inizia conversazione | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G09 | Match con account bloccato/sospeso/eliminato | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| G10 | Lista match: vuota, lunga, foto fallita, nuova sessione | Tecnica parziale | Copertura parziale: tribe-database.test.js; adversarial-database.test.js; live-social.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H01 | Primo accesso da match o lista; nessun primo messaggio | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H02 | Indietro → lista → stessa chat, ripetuto | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H03 | Cambiare chat rapidamente, nuovo match simultaneo | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H04 | Invio con pulsante/Invio, vuoto, spazi, emoji, multilinea, limite 2000 | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H05 | Rete persa prima/durante/dopo invio e retry | Tecnica parziale | Nonce e bozza riusati nei retry della stessa pagina. Dopo reload la chiave non è conservata. |
| H06 | Ricezione dall'altro telefono e ordinamento | Esterna aperta | Lettura reale della chat verificata; ricezione simultanea tra due telefoni va riconfermata. |
| H07 | Polling, scroll su messaggi vecchi, testo selezionato | Tecnica parziale | Polling identico preserva DOM. Arrivo nuovo messaggio mantiene le bolle esistenti e lo scroll nei test; selezione e tastiera su telefono da verificare. |
| H08 | Bozza, uscita/rientro e app in background | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H09 | Tastiera, input, pulsante invio, schermo piccolo | Esterna aperta | Layout desktop a 390 px controllato; tastiera fisica e safe-area da verificare. |
| H10 | Conversazione dopo presenza scaduta e cambio luogo | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H11 | Blocco/sospensione/eliminazione mentre chat aperta | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| H12 | Messaggi lunghi, HTML, link e caratteri speciali | Tecnica parziale | Copertura parziale: live-social.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I01 | Apertura da dettaglio/chat, motivi e dettagli facoltativi | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I02 | Segnala e blocca, segnala senza bloccare, blocca soltanto | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I03 | Annulla, Escape, focus tastiera e tastiera mobile | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I04 | Invio fallito/doppio invio/retry | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I05 | Effetto blocco su Ora, Tribe, match, chat e foto | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I06 | Riservatezza di segnalazione e note | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I07 | Sospensione già presente o applicata durante uso | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| I08 | Ricontrollo sospensione e revoca | Tecnica parziale | Copertura parziale: adversarial-database.test.js; dialogs-install.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| J01 | Profilo: dati, modifica, installa, logout, elimina | Tecnica parziale | Copertura parziale: account-deletion.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| J02 | Cancellazione: conferma e annullamento | Esterna aperta | Conferma esplicita nel prodotto; nessuna eliminazione reale in questa revisione. |
| J03 | Cancellazione reale: sessione OAuth attuale e gateway JWT | Esterna aperta | POST autenticato dry_run riuscito sul servizio pubblicato, JWT attivo. POST distruttivo su D non eseguito. |
| J04 | Account, foto, Tribe, Spot, match, messaggi e riferimenti | Esterna aperta | Cascade/quarantena testati su fixture SQL; verifica Auth+Storage reale dopo consenso su D aperta. |
| J05 | Foto multiple, errore storage/RPC/auth e retry | Tecnica parziale | Errori storage e marker testati; schermata retry pronta. Guasto reale e recupero distruttivo non provocati. |
| J06 | ID contraffatto e chiamata senza sessione | Tecnica parziale | Copertura parziale: account-deletion.test.js; adversarial-database.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| J07 | Riapertura e altro telefono dopo eliminazione | Esterna aperta | Liste ripulite nei test; secondo dispositivo dopo eliminazione reale ancora aperto. |
| J08 | Richieste privacy selettive e assistenza | Esterna aperta | Procedura in operazioni-pilota.md; validazione professionale e contatto ancora necessari. |
| K01 | Invito dopo primo match e Più tardi | Tecnica parziale | Copertura parziale: dialogs-install.test.js; pwa.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| K02 | Android: evento installazione e conferma nativa | Esterna aperta | Evento nativo testato con simulazione; installazione fisica Android non certificata. |
| K03 | iPhone: Safari, Condividi, aggiunta Home | Esterna aperta | Istruzioni predisposte; installazione reale Safari non certificata. |
| K04 | Già installata, prompt non disponibile, errore o rifiuto | Tecnica parziale | Copertura parziale: dialogs-install.test.js; pwa.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| K05 | Avvio Home, icona, nome, modalità standalone, sessione | Esterna aperta | Manifest avvia / senza QR; sessione PWA e icone fisiche da collaudare. |
| K06 | Offline e ritorno online | Tecnica parziale | Copertura parziale: dialogs-install.test.js; pwa.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| K07 | Service worker e cache privata | Tecnica parziale | Copertura parziale: dialogs-install.test.js; pwa.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| K08 | Aggiornamento app già installata | Esterna aperta | SW evita cache privata; aggiornamento di app già installata va verificato su telefono. |
| L01 | Login Google gestore e account non autorizzato | Tecnica parziale | Copertura parziale: adversarial-database.test.js; src/admin.js (ispezione). Completare le condizioni della riga originale nel collaudo pilota. |
| L02 | Sessione separata utente/gestore e logout | Tecnica parziale | Copertura parziale: adversarial-database.test.js; src/admin.js (ispezione). Completare le condizioni della riga originale nel collaudo pilota. |
| L03 | Coda vuota/lunga, aggiorna, errore rete | Tecnica parziale | Copertura parziale: adversarial-database.test.js; src/admin.js (ispezione). Completare le condizioni della riga originale nel collaudo pilota. |
| L04 | Motivo, dettagli, data, stato account | Tecnica parziale | Copertura parziale: adversarial-database.test.js; src/admin.js (ispezione). Completare le condizioni della riga originale nel collaudo pilota. |
| L05 | Verifica, archivia, sospendi con nota, revoca | Tecnica parziale | Copertura parziale: adversarial-database.test.js; src/admin.js (ispezione). Completare le condizioni della riga originale nel collaudo pilota. |
| L06 | Doppio click, due gestori, refresh durante revisione | Esterna aperta | UI serializza azioni e conserva note; due gestori simultanei da collaudare. |
| L07 | Account amministrativo dedicato | Esterna aperta | Trasferimento account personale pianificato; manca account dedicato autorizzato. |
| M01 | Cinque tab, selezione attiva, dettaglio, match, chat, form | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M02 | Indietro app e indietro browser/telefono | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M03 | Sovrapposizioni di dettaglio, report e installazione | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M04 | Loading, vuoto, errore e successo per ogni sezione | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M05 | Testo italiano e terminologia account/Spot/Tribe | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M06 | Confronto screenshot Claude/Figma/app | Esterna aperta | Riferimento Figma introduttivo controllato; inventario completo di varianti Figma non aggiornato. |
| M07 | Responsive, scroll, safe area, tastiera e zoom testo | Esterna aperta | 390 px: form e profilo dentro viewport; telefono/tastiera/orizzontale/zoom da completare. |
| M08 | Contrasto, focus, etichette, lettore schermo, tap target | Esterna aperta | Etichette, focus modale, inert, Escape e target migliorati; lettore schermo fisico da provare. |
| M09 | Animazioni e preferenza movimento ridotto | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| M10 | Demo e app reale | Tecnica parziale | Copertura parziale: live-navigation.test.js; live-social.test.js; dialogs-install.test.js; reliability.test.js. Completare le condizioni della riga originale nel collaudo pilota. |
| N01 | RLS/RPC su profili, membership, check-in, Spot, match, messaggi | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N02 | Storage upload/lettura, percorsi contraffatti, URL firmati | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N03 | Integrità: vincoli, transazioni, reciprocità simultanea, cascade | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N04 | Client secret, service role, ambiente build e log | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N05 | Carico di polling/foto, utenti simultanei e risposte lente | Esterna aperta | Richieste identiche condivise e cache privata breve; baseline costi/latenza sotto carico non misurata. |
| N06 | Errori client/server e monitoraggio | Esterna aperta | Eventi locali senza payload e banner offline; alert di servizio ancora da definire. |
| N07 | Google, email mittente, dominio e supporto dedicati | Esterna aperta | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N08 | Repository: commit, push, documentazione e tracciamento | Tecnica parziale | Repository pubblicato, sorgente coincidente con locale, workflow GitHub completato con successo; registro sotto. |
| N09 | Build, deploy statico Vercel e configurazione | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N10 | Migrazioni, compatibilità frontend e rollback | Tecnica parziale | Copertura parziale: adversarial-database.test.js; restore.test.js; scripts/check-release.mjs; ispezione build. Completare le condizioni della riga originale nel collaudo pilota. |
| N11 | Backup e ripristino dati | Esterna aperta | Dashboard Free senza project backups; ripristino PGlite fittizio superato, ripristino Supabase/Storage aperto. |
| N12 | Produzione/prove, QR e dati fittizi | Esterna aperta | Demo marcata e QR locali esclusi dalla build; luogo reale e ambiente prove separato da predisporre. |
| N13 | Informativa, condizioni, pubblico 18+, gestione abusi e richieste dati | Esterna aperta | Nessuna certificazione legale; dati operativi del titolare e revisione professionale necessari. |
| N14 | Documentazione storica e moduli non più attivi | Tecnica parziale | README riscritto e documenti storici marcati. Modulo account-prompt non attivo conservato per riferimento. |

## Registro dei 30 user journey

| Journey | Stato / evidenza | Prossima verifica |
|---|---|---|
| U01 — Nuovo utente dal QR | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U02 — Nuovo utente dal sito | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U03 — Ritorno durante presenza | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U04 — Ritorno dopo scadenza | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U05 — Rinnovo presenza | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U06 — Visita a un secondo luogo | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U07 — Accesso Google esistente | Account esistente verificato nel precedente rilascio; sessione recuperata qui | Nuovo ciclo OAuth completo dopo questa release. |
| U08 — Vecchio profilo temporaneo | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U09 — Migrazione temporanea | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U10 — Google annullato/errore | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U11 — Email alternativa | Percorso implementato; verifica completa esterna aperta | SMTP e link/codice tra browser, consegna a utenti esterni. |
| U12 — Spot live non reciproco | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U13 — Primo match simultaneo | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U14 — Spot da Tribe a distanza | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U15 — Match su più luoghi | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U16 — Conversazione completa | Chat → indietro → rientro verificato in produzione | Invio/risposta tra due telefoni con questa release. |
| U17 — Conversazione interrotta | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U18 — Rete instabile in chat | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U19 — Modifica profilo | Profilo → modifica → indietro verificato nel browser | Salvataggio nuovo contenuto/foto e ritorno fisico sul telefono. |
| U20 — Abbandono modifica | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U21 — Blocco dalla chat | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U22 — Segnalazione senza blocco | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U23 — Sospensione e revoca | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U24 — Installazione Android | Percorso implementato; verifica completa esterna aperta | Telefono fisico, Home e sessione dopo riavvio/aggiornamento. |
| U25 — Installazione iPhone | Percorso implementato; verifica completa esterna aperta | Telefono fisico, Home e sessione dopo riavvio/aggiornamento. |
| U26 — Rifiuto installazione | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U27 — Cambio account | Percorso implementato; verifica completa esterna aperta | Confermare intero percorso su due account/dispositivi controllati. |
| U28 — Cancellazione account | Percorso implementato; verifica completa esterna aperta | Account D eliminabile e conferma al momento; Auth, Storage, altri dispositivi. |
| U29 — Accesso negato | Copertura tecnica parziale su fixture e simulazioni | Confermare intero percorso su due account/dispositivi controllati. |
| U30 — Aggiornamento versione | Percorso implementato; verifica completa esterna aperta | Telefono fisico, Home e sessione dopo riavvio/aggiornamento. |

## Condizioni ancora necessarie prima del pilota

Collaudo iPhone/Android e due account, eliminazione reale su D con conferma, Google per utenti non invitati, SMTP/supporto/account gestore dedicato, backup e ripristino Supabase/Storage, contatti e documenti validati professionalmente. Restano inoltre inventario completo varianti Figma, pulizia foto obsolete e baseline carico. Vedi `operazioni-pilota.md` per procedura e responsabilità.

Nessuno di questi punti viene presentato come superato grazie a una simulazione o come obbligo legale dedotto senza verifica. Il progetto è disponibile per collaudo controllato; non è certificato pronto per inviti pubblici indiscriminati.

## Registro pubblicazioni e verifica finale

Prima pubblicazione della revisione: dpl_CEVf7xFeXkhw8brDe2nnT2xJx35y, READY, dominio https://spot-now-alpha.vercel.app/. Successive correzioni di scanner/anteprima/sfondo modale e relativo deploy finale sono registrate sotto dopo i controlli.

Rilascio finale: `dpl_HHr3FBr4vKksWdrjtBLeBLBJkQj2`, READY, https://spot-now-alpha.vercel.app/. Suite finale: **65 test**, zero fallimenti; typecheck ampliato, build e controllo asset superati. Migrazione 009 e funzione Edge pubblicate.

GitHub: sorgente pubblicato nel commit `47d6d5ab83266858b6845cb8f57952c02b5490e4`; confronto alberi locale/remoto senza differenze. CI `Verify Spot Now #1` completata con successo in 20 s: https://github.com/fedegrasso1994-alt/Spotnow/actions/runs/37153460408. Dopo il rilascio finale, presenza scaduta correttamente a 0 con comando QR disponibile, Tribe mantenuta.

## Secondo passaggio della revisione

Foto non caricabile: segnaposto esplicito; immagine invariata mantiene il proprio nodo; errore tardivo non rimuove la foto sostitutiva. Nuovo messaggio: bolle precedenti e scroll conservati. Suite aggiornata: **69 test superati** e typecheck riuscito. Inventario delle foto non referenziate disponibile in `supabase/maintenance/photo-cleanup-preview.sql`: solo lettura, nessuna cancellazione. Collaudo fisico pronto in `collaudo-telefono.md`; numero di telefono non necessario. La pulizia Storage resta da autorizzare e collaudare, non è stata effettuata.

Secondo passaggio pubblicato: `dpl_8uSMeVN27g1D4J58CFtxTngegA2E`, READY, dominio invariato. Android confermato dal proprietario come primo dispositivo di collaudo; QR del luogo di prova preparato localmente, escluso dal repository.

Foto lenta: iniziale visibile fino al caricamento riuscito. Rilascio definitivo Android: `dpl_ErwKD6wiR4ABcbtjQuP72dFvqrcr`, READY; 69 test, typecheck, build e controllo asset superati.

Ripristino installazione richiesto dal proprietario: pulsante statico Salva l’app sul telefono nel profilo, stato già salvata visibile anziché rimozione del controllo; invito dopo il match riattivato una volta tramite flag versione v2. 71 test, build e typecheck superati. Deploy `dpl_AZbGHk1HcxKXEnsaFTkSyvoZE9Nx`, READY.
