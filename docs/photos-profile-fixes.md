# Foto Tribe e profili — 4 ottobre 2026

## Difetti corretti

- Il polling sostituiva periodicamente le foto perché le URL firmate cambiavano; una risposta fallita poteva svuotarle. `renderAvatar` usa l’identità del file, conserva l’immagine già decodificata o in download e permette il retry dopo un errore. Cambio foto, scelta di un’anteprima locale e logout continuano a sostituire/rimuovere l’immagine corretta.
- Tribe attendeva tutte le richieste per mostrare qualsiasi scheda. Le schede ora appaiono dopo la risposta dei profili e sono immediatamente cliccabili; i link privati vengono richiesti in gruppi di massimo 100, con condivisione delle richieste in corso. Le prime quattro foto sono caricate con priorità. Se si apre il dettaglio prima che la foto arrivi, anche l’immagine grande si completa senza riaprire la scheda.
- Le nuove foto pesanti vengono ridimensionate proporzionalmente a un lato massimo di 1280 pixel e compresse in WebP prima dell’upload, solo se il risultato è più leggero. In caso di funzione browser assente o conversione fallita si usa l’originale già validato. Le foto esistenti non vengono modificate: il loro peso originale può ancora incidere sul primo download su una rete lenta.
- I due pulsanti del dettaglio avevano ciascuno larghezza 100% e non si restringevano. A 320 pixel il secondo terminava a 614 pixel, fuori schermo. Ora condividono la riga e il testo può andare a capo. A 320 pixel i bordi destri sono 156 e 308 pixel.
- Il profilo personale ha un gruppo di azioni dedicato sopra la navigazione. Foto e metadati si adattano allo spazio disponibile e possono scorrere; i pulsanti restano accessibili. In orizzontale, foto e azioni sono affiancate.
- Nell’anteprima «Scopri chi è single qui ora», il nome del luogo è in evidenza, con testo chiaro e dimensione 30–42 pixel; i nomi lunghi vanno a capo.

## Verifiche e limiti

111 test passati, typecheck, build e controllo di rilascio. Regressioni aggiunte per link rinnovati, download lenti, errori parziali, retry, logout durante richieste, foto locali nuove, firma in gruppo e apertura anticipata del dettaglio. `profile-responsive-checks.json` registra le misure browser dei pulsanti del dettaglio in cinque formati e delle quattro azioni personali in sei formati. Le misure non certificano un iPhone fisico o la velocità di una rete mobile reale.

Nessuna migrazione SQL o modifica alle autorizzazioni: bucket privato, firma di 30 secondi, riuso locale dei link per 20 secondi. Nessuna cache persistente di foto private nel service worker. Gli aggiornamenti dei profili continuano a rimuovere persone non più visibili; logout/sospensione/cancellazione mantengono le protezioni esistenti.

## Notifiche

Le notifiche dei messaggi ad app chiusa **non sono attive**. `public/sw.js` gestisce soltanto il fallback offline, senza handler push. Il progetto non ha ancora sottoscrizioni dispositivo, coda messaggi push o invio server Web Push. Il piano è in `notifiche-push.md`. Queste correzioni non dichiarano né simulano notifiche funzionanti.
