# Notifiche di messaggi ad app chiusa

Stato: soluzione definita, non implementata né attiva in produzione. Il service worker attuale gestisce soltanto la pagina offline. Il polling della chat funziona soltanto mentre la pagina è aperta.

## Esperienza proposta

Dopo il primo match, invito chiudibile «Attiva le notifiche dei messaggi». Richiesta nativa soltanto dopo un tap esplicito; niente richiesta all'apertura della home o ogni volta che si accede. Nel Profilo, stato e controllo per attivare/disattivare. Su iPhone non installato, prima istruzioni per aggiungere Spot Now alla Home. Non sovrapporre questo invito a quello di installazione o a un dialogo esistente.

Android: browser compatibile, HTTPS e consenso. iPhone: iOS 16.4 o successivo, web app aggiunta alla schermata Home e consenso richiesto dall'app aperta dalla sua icona. Non serve pubblicarla in App Store per questa modalità. Una scheda Safari da sola non equivale all'app Home. Non promettere consegna immediata o identica su tutti i dispositivi: sistema operativo, rete, impostazioni delle notifiche e modalità di concentrazione possono influenzarla.

## Implementazione prevista sul progetto

1. Estendere il service worker con gestione push e notificationclick. Il tap apre la chat corretta; se serve un nuovo login, conservare soltanto l'identificativo del match e riprendere il percorso dopo accesso.
2. Creare una coppia VAPID. Chiave privata soltanto fra i segreti della funzione server; chiave pubblica nel client. Non inserire chiavi private nel bundle o in GitHub.
3. Registrare la sottoscrizione del dispositivo con l'utente autenticato tramite endpoint protetto. Endpoint e chiavi di sottoscrizione restano privati. Gestire più dispositivi, rinnovo, consenso negato, logout e cancellazione account senza notifiche al successivo utilizzatore dello stesso browser.
4. Accodare una notifica quando un messaggio nuovo viene confermato nel database. Deduplicare per message_id e destinatario; un retry di send_message non crea una seconda notifica. Non dipendere dal client del mittente per effettuare l'invio push.
5. Una funzione server consuma la coda, ricontrolla match, blocchi, sospensioni e cancellazioni, poi invia Web Push al destinatario. Retry con attesa progressiva per errori temporanei; disattivare sottoscrizioni scadute (410/404) senza fermare gli altri dispositivi. La chiave privata di invio non è accessibile ai normali utenti.
6. Testare con due account e telefoni concordati: messaggio confermato → app destinatario chiusa → notifica → tap → chat. Verificare anche rifiuto, ritiro consenso, rete assente, app già aperta, duplicati, logout, blocchi e dispositivi multipli. Invii reali soltanto a utenti di collaudo consenzienti.

Payload consigliato per la prima versione: «Hai ricevuto un nuovo messaggio su Spot Now», senza contenuto privato sulla schermata bloccata. Un nome o anteprima del testo può diventare una preferenza esplicita in seguito.

## Fonti tecniche

- [WebKit: Web Push su iOS e iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple: invio Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [MDN: Push API e service worker](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
