# Tribe — implementazione e attivazione

## Stato

Migrazioni 007–008 applicate sul backend pubblico e funzione `delete-account` pubblicata il 3 ottobre 2026. Verifica JWT del gateway mantenuta attiva; GET non distruttivo con sessione esistente arriva alla funzione e restituisce il previsto 405. Sito HTTPS aggiornato il 3 ottobre 2026. Verificati sul sito pubblico login Google sull’account esistente, QR conservato nel ritorno OAuth, check-in, appartenenza Tribe e recupero della sessione al ricaricamento. La cancellazione reale di un account non è stata eseguita; coperta da test locali e disponibilità non distruttiva dell’endpoint.

## Modifiche

- `index.html`: landing con conteggi, Google all’ingresso, copy di appartenenza, schermate «Le tue Tribe» e singola Tribe, quinta scheda inferiore.
- `src/live.js`: QR conservato in sessionStorage e nel redirect OAuth, ingresso autenticato, recupero Tribe anche con check-in scaduto, griglia e dettagli, refresh, timer di rimozione delle righe live alla scadenza, elimina account con conferma.
- `src/backend.js`: preview, Tribe, discovery per luogo, Google sign-in e invio Spot contestualizzato; chiamata alla funzione di cancellazione.
- `src/live-social.js`: Spot per luogo, testo distinto per Tribe, interessi già inviati restituiti dal server, match senza scadenza e nessun avviso di scadenza.
- `src/app.js`, `src/demo.js`: anteprima isolata con due luoghi, griglia Tribe e login simulato; `?demo=1&preview=tribes` apre direttamente la nuova sezione senza backend.
- `src/domain.js`: finestra live 90 minuti, match persistenti finché disponibili/non bloccati.
- `src/styles.css`: griglia a due colonne e barra a cinque voci.
- `supabase/migrations/007_tribes.sql`: appartenenze private uniche utente–luogo, finestra attività configurabile null=illimitata, check-in 90 minuti, preview aggregata con QR, RPC autorizzate, Spot reciproci persistenti per luogo e match senza scadenza.
- `supabase/migrations/008_account_deletion.sql`: pulizia dei riferimenti non cascading, eseguibile esclusivamente dal service role.
- `supabase/functions/delete-account/index.ts`, `supabase/config.toml`: funzione server che valida JWT con auth.getUser, ignora id nel body, elimina solo foto/account dell’utente autenticato. Service key disponibile solo nell’ambiente server, mai nel frontend.
- `tests/domain.test.js`, `tests/tribe-database.test.js`, `tests/account-deletion.test.js`: verifiche temporali, migrazioni/RLS nel motore PostgreSQL locale PGlite, reciprocità differita, foto, blocchi/sospensioni e cancellazione autorizzata.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `types/deno.d.ts`: strumenti di test e controllo tipi per backend, dominio e funzione server. Il controllo tipi non copre ancora tutta la UI JavaScript preesistente.

## Decisioni e limiti

- Google è già configurato; nessun nuovo provider Apple viene introdotto. L’email già esistente rimane come alternativa per sessioni non anonime; per i profili anonimi precedenti il flusso propone il collegamento Google, evitando di creare un secondo account via email.
- Una sessione anonima precedente deve collegarsi a Google prima di un nuovo check-in. Il linking mantiene l’identità dove possibile; un Google già associato a un altro profilo può richiedere gestione esplicita del conflitto. Nessuna fusione automatica di account.
- Il primo match propone ora soltanto l’installazione PWA: la richiesta account post-match è stata tolta dal flusso attivo.
- Un solo check-in live per utente: un QR di un altro luogo sostituisce la presenza corrente, mantenendo entrambe le appartenenze.
- La migration recupera soltanto l’ultima associazione ancora esistente. Lo storico sovrascritto non è ricostruibile.
- Il passaggio Live/Tribe è deciso esattamente dal timestamp server. A schermo la riga live ha un timer di scadenza; la griglia Tribe viene aggiornata ogni 5 secondi quando visibile. Ritardi di rete o sospensione del browser possono ritardare l’aggiornamento visuale.
- I conteggi sono membri unici totali (incluso l’utente), con account anonimi/sospesi esclusi; la griglia applica anche preferenze e blocchi e può quindi mostrare meno persone. Nessun orario di visita è restituito dalla RPC Tribe.
- Lo Spot è unico per coppia direzionale e luogo; non si ritira. Il match resta unico per coppia, anche se le persone condividono più luoghi, riutilizzando il modello esistente.
- Non vengono introdotte notifiche push: restano aggiornamenti in-app tramite polling.
- La cancellazione rimuove le conversazioni condivise della persona e le segnalazioni/audit che la identificano. Errori vengono mostrati senza dichiarare una cancellazione riuscita; eventuali foto già eliminate non vengono ripristinate se un passaggio successivo fallisce.

## Attivazione coordinata

1. Approvazione dell’ampliamento di visibilità: da profili live a membri delle Tribe condivise, mantenendo foto private, account autenticati, blocchi e sospensioni.
2. Applicare migrazioni 007–008 sul progetto `qlucwdjcjomwyziegxrn` senza eliminare dati esistenti.
3. Pubblicare funzione `delete-account` (JWT verificato nella funzione tramite auth.getUser; verifica JWT del gateway attiva oltre ad auth.getUser).
4. Pubblicare il nuovo `dist` sul progetto Vercel `spot-now`. Pubblicazione manuale, nessun collegamento Git automatico.
5. Aggiornare le schede già aperte: i vecchi bundle usano regole e copy precedenti. Minimizzare l’intervallo tra modifica backend e frontend.
6. Collaudare A–J con account reali di prova; verificare ritorno Google con QR conservato, due luoghi e logout/login. Non eliminare l’account reale del proprietario.

## Verifica locale

21 test superati, incluso PostgreSQL reale in memoria (PGlite), controllo tipi del perimetro indicato e build. UI demo: elenco di due Tribe, griglia separata dalla lista Ora, apertura dettaglio senza date delle visite e invio Spot. Il login Google sul sito pubblico è verificato, incluso il conflitto tra sessione anonima e Google già collegato a un account esistente.

### Attivazione — stato del 3 ottobre 2026
Migrazioni 007–008 eseguite in un’unica transazione nell’editor SQL: Success, nessun errore. Funzione delete-account pubblicata via editor; JWT legacy del gateway mantenuto attivo oltre ad auth.getUser. Test GET non distruttivo dalla sessione browser: 405 previsto. Landing QR reale verificata con nome del luogo e conteggi, nessun profilo prima del login; Entra conduce a Google per collegare il profilo anonimo preesistente.

Vercel CLI 62.2.0: accesso device in attesa. Il primo codice è scaduto; nuova richiesta preparata, richiesta al proprietario di completarla nel browser abituale perché Allow Access rimane disabilitato in Codex. Nessun deploy nuovo eseguito. Il controllo automatico ha rifiutato la disattivazione JWT (mantenuta attiva; controllo funzione superato) e l’accesso a Finder dopo permessi non risolti (nessun caricamento nativo effettuato).

### Pubblicazione completata — 3 ottobre 2026
CLI Vercel autorizzata. Pubblicato il bundle compilato su https://spot-now-alpha.vercel.app/. La configurazione statica è in `vercel.static.json` (da copiare in dist dopo pnpm build); il deploy della cartella compilata non deve eseguire pnpm build una seconda volta. `vercel.json` alla radice rimane dedicato al futuro deploy del progetto sorgente.

Corretto il caso identity già collegata: errore OAuth visibile all’utente, pulsante esplicito «Ho già un account Google», nessun trasferimento automatico dal profilo temporaneo. Login sul Google esistente provato: ritorno al luogo del QR, check-in completato, 1 appartenenza reale; ricaricamento senza nuovo login o QR e senza duplicazioni.

Restano da verificare fisicamente installazione su iPhone/Android, due account Google distinti con la nuova versione, cancellazione end-to-end su account esplicitamente eliminabile. Non sono stati cancellati account reali né trasferiti profili temporanei.
