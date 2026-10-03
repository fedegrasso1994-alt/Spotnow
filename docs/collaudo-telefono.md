# Collaudo guidato sul telefono

Sito di prova: https://spot-now-alpha.vercel.app/. Il numero di telefono non serve: si usa Google. Questo documento registra i test da eseguire, non certifica che siano già riusciti.

## Prima prova: un telefono

1. Apri il sito in **Safari su iPhone** o **Chrome su Android**. Evita inizialmente il browser interno di un'altra app. Usa il QR del Locale di prova già preparato sul computer; non inoltrarlo a persone esterne al collaudo.
2. Inquadra il QR con la fotocamera del telefono. Verifica nome del luogo nell'anteprima, accesso Google e ritorno allo stesso luogo. Con un account già usato devono tornare foto, profilo e match, senza creare un secondo profilo.
3. Nella sezione Ora controlla che i profili siano cliccabili mentre la lista si aggiorna. Non dovrebbe comparire un caricamento ogni cinque secondi.
4. Apri una chat esistente, torna alla lista e riaprila tre volte. Scrivi una bozza, torna indietro, rientra: deve essere rimasta. Non inviarla a una persona reale senza accordo di collaudo.
5. Con tastiera aperta verifica che testo, invio e indietro siano raggiungibili. Scorri verso messaggi precedenti: il prossimo messaggio deve preservare la posizione se non sei a fondo pagina.
6. Vai in Profilo → Modifica, cambia un campo e metti il browser in background. Al ritorno la modifica non deve sparire. Indietro deve funzionare. Il salvataggio non deve rinnovare il check-in.
7. Per una nuova foto usa JPG, PNG o WebP fino a 8 MB. Se il telefono propone HEIC, il formato non è ancora supportato: l'errore deve essere leggibile e deve permettere scegliere un'altra foto.
8. Apri il dialogo Segnala o blocca e premi Annulla, senza inviare nulla. La chat deve tornare utilizzabile.
9. Metti offline il telefono mentre stai leggendo, poi torna online. Deve apparire uno stato offline; le nuove azioni non devono dare falso successo. La bozza deve restare. Riprova eventuali caricamenti dopo il ritorno online.
10. Dopo la scadenza del check-in Ora deve richiedere un nuovo QR; Tribe e chat restano accessibili. Riaprire l'app non deve rinnovare automaticamente i 90 minuti.

## Installazione

**iPhone:** Safari → Profilo → Installa Spot Now → istruzioni Condividi → Aggiungi alla schermata Home. Apri l'icona e verifica nome, icona, schermata e recupero dell'account; se richiede login, usa lo stesso Google. Non assumere che Safari e app Home condividano sempre la sessione.

**Android:** Chrome → Profilo → Installa Spot Now. Se disponibile deve aprirsi la conferma nativa del browser. Se non disponibile, segui le istruzioni mostrate. Dopo installazione apri dalla Home e verifica gli stessi dati e nessun rinnovo implicito del check-in.

Dopo il primo match l'invito deve essere chiudibile con Più tardi. Non deve coprire un dialogo già aperto e non deve ripetersi continuamente nello stesso browser.

## Seconda prova: due account concordati

Con due account di collaudo consenzienti e lo stesso QR: Spot reciproco → un solo match → invio/risposta → indietro/rientro → background → ritorno. Ripetere con rete lenta e retry: nessun duplicato nella stessa sessione della pagina. Blocco, sospensione ed eliminazione richiedono dati/account dedicati: non usarli sul proprietario o sui match reali per una prova veloce.

Per la cancellazione preparare un account D esplicitamente eliminabile. Prima dell'azione va confermata la cancellazione permanente; poi verificare account, foto, appartenenze e accesso dall'altro dispositivo.

## Esito da riportare

Modello del telefono, versione iOS/Android, browser, passaggio preciso, risultato e problema eventuale. Non mandare numero di telefono, password, token o screenshot con conversazioni private. I passaggi non provati restano aperti nel registro di revisione.
