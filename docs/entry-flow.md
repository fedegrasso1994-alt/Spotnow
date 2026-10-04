# Ingresso e rientro — 4 ottobre 2026

Il flusso reale è in `src/live.js`. `index.html` contiene l’invito al primo QR e il percorso «Hai già un account? Accedi». La demo simula l’accesso: non certifica Google né lo stato reale di un account.

| Stato iniziale | Destinazione |
| --- | --- |
| Nessun account/sessione e nessun QR | Invito a scansionare; accesso alternativo per chi ha già un account |
| QR validato, senza accesso | Anteprima del luogo con soli conteggi aggregati, poi accesso |
| Account con profilo incompleto, senza QR | Invito a scansionare prima di creare il profilo |
| Account con profilo incompleto e QR validato | Creazione profilo; salvataggio, un check-in, Ora |
| Profilo completo, presenza ancora valida | Ora nel luogo del check-in originale |
| Profilo completo, presenza assente/scaduta | Tribe |
| Apertura manuale di Ora senza presenza valida | Nessun profilo live; «Scansiona il QR per vedere chi c’è qui ora» |

`loadAccount` decide la destinazione dopo il recupero della sessione e del profilo. `liveCheckin` confronta `expires_at` restituito dal server con l’ora corrente, senza riscriverlo. `performCheckin` chiama il backend esclusivamente per un QR corrente: nessun rinnovo alla riapertura. Le autorizzazioni del server restano definitive, anche se l’orologio del telefono è inesatto.

Una bozza separata (`spot-onboarding-venue-v1`) conserva il QR dell’ingresso incompleto nello storage locale. Dopo l’accesso è legata all’ID dell’account; un altro account non la recupera. Alla ripresa del profilo incompleto il QR viene nuovamente validato. Se il profilo è già completo, una bozza recuperata viene eliminata senza check-in. Successo, nuova scansione, ingresso tramite «Hai già un account?» e cancellazione account eliminano la bozza. Se lo storage non è disponibile, il flusso corrente funziona e il redirect OAuth/email continua a portare il QR nell’URL, ma il recupero dopo chiusura non è garantito.

Lo scanner ha priorità sulle risposte asincrone del recupero account, compresi gli errori: aprirlo significa attendere una nuova scansione. Un QR non valido non conserva una bozza, non completa l’onboarding e non crea presenza. Un errore di rete non viene interpretato come assenza di account o check-in. Alla ripresa da background, un check-in scaduto nella schermata Ora porta a Tribe; chat e moduli aperti vengono conservati.

Nessuna migrazione SQL: `check_in` continua a impostare i 90 minuti sul server, sostituire l’unica presenza attuale e inserire la membership permanente con gestione dei duplicati. Google/email, Spot, match, ranking, chat e navigazione inferiore restano invariati.

Verifica: 96 test passati, typecheck, build e controllo di rilascio. I nuovi test esercitano ingresso senza presenza, scadenza, ritorno entro la scadenza, QR obbligatorio prima del profilo, recupero e salvataggio dell’onboarding senza seconda scansione, isolamento delle bozze fra account, prevenzione del replay, QR invalido e corse con lo scanner. I test database verificano presenza singola, membership multiple senza duplicati e limiti temporali. Interfaccia iniziale e accesso verificati a 320×568, senza overflow orizzontale e con i pulsanti visibili. La tastiera di Safari su iPhone fisico resta da verificare come indicato nella revisione responsive; non è certificata dall’emulazione.
