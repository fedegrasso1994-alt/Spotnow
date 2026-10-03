# Operazioni del pilota

Questa procedura distingue preparazione tecnica e autorizzazione al lancio. Referente operativo: proprietario del progetto. Non sono stati inventati indirizzi di assistenza, identità societarie o tempi di conservazione.

## Pubblicazione e ritorno alla versione precedente

1. Conservare commit sorgente, ID del deploy e migrazioni applicate. Installare con lockfile, eseguire test, typecheck, build e controllo degli asset.
2. Applicare prima le migrazioni compatibili con il frontend corrente. La 009 mantiene le firme precedenti di invio messaggi/segnalazioni per consentire il cambio di versione.
3. Pubblicare la funzione account con verifica JWT attiva e verificare POST `dry_run:true` con sessione valida. Questa prova non cancella account.
4. Pubblicare con `scripts/deploy-production.sh`. Ricontrollare sessione, Tribe, Chat, indietro, profilo e asset statici sul dominio pubblico.
5. In caso di regressione frontend, ripubblicare il deploy precedente da Vercel oppure ricostruire il commit verificato. Non eliminare colonne, dati o marker di cancellazione per ottenere un rollback.
6. La vecchia UI invia la cancellazione senza `confirm:true`: dopo il nuovo endpoint quel comando deve fallire in modo sicuro. Un ritorno alla vecchia UI richiede un hotfix compatibile; non ripristinare alla cieca la cancellazione precedente, che non gestiva quarantena e recupero.
7. Le modifiche al database richiedono una migrazione correttiva verificata su copia, non una cancellazione delle migrazioni già applicate.

Le URL firmate delle foto già emesse possono restare utilizzabili per massimo 30 secondi dopo la revoca. Le bozze chat e le chiavi di retry sono mantenute nella sessione della pagina; non promettere recupero dopo ricaricamento.

## Backup e ripristino

Verifica dashboard del 3 ottobre 2026: piano Free, **project backups non inclusi**. Non è stato acquistato un upgrade. Il test locale `tests/restore.test.js` verifica un ripristino separato di dati fittizi e policy; non sostituisce una prova di ripristino Supabase.

Prima degli inviti nel luogo pilota: scegliere backup del servizio oppure esportazione cifrata autorizzata, frequenza e conservazione; definire perdita dati massima e tempo di recupero accettabili. Conservare separatamente database e oggetti Storage: un dump SQL non dimostra la recuperabilità delle fotografie. Nessuna esportazione dei dati reali è stata effettuata.

Prova di ripristino: usare un progetto separato, ripristinare schema/dati/oggetti di prova, verificare conteggi e hash foto, accesso del proprietario e rifiuto dell'estraneo, match/chat, poi documentare durata e versione. Non ripristinare sopra la produzione durante un test.

## Moderazione, assistenza e privacy

Il pannello `/?admin=1` verifica il ruolo sul server e usa una sessione separata. Verifica, archiviazione, sospensione con nota e revoca registrano audit. Non sospendere persone reali per collaudare il pannello. Le segnalazioni rimangono riservate; valutare evidenze e non inoltrare identità o note al segnalato.

Per richieste di assistenza: identificare il problema senza chiedere token, password o contenuti della chat; verificare l'identità attraverso l'account; registrare richiesta, decisione, responsabile ed esito in uno strumento riservato. Stabilire contatto, frequenza di controllo della coda, escalation e possibilità di contestare una sospensione prima del lancio.

Per richieste sui dati o appartenenze: valutazione umana e professionale caso per caso; nessuna promessa che Elimina account risolva ogni possibile richiesta. Non è stato introdotto Lascia Tribe. Prima del lancio verificare informativa, condizioni, titolare, contatto, finalità, base e tempi di conservazione, fornitori/trasferimenti, età minima e procedura per abusi con un professionista; questi documenti non sono una certificazione legale.

Cancellazione parziale: il marker server esclude l'account da discovery e chat. La UI permette ripetere la cancellazione e uscire. La cancellazione reale va collaudata solo su un account D chiaramente eliminabile e con conferma al momento dell'azione. Non cancellare l'account del proprietario o del secondo collaudatore.

## Configurazioni ancora da sostituire

- Email personale di supporto OAuth → indirizzo dedicato Spot Now.
- Ruolo gestore personale → account amministrativo dedicato; autorizzare nuovo account, provarlo, quindi revocare quello precedente.
- Mittente email/SMTP e supporto pubblico: configurare e verificare consegna prima di esporre l'alternativa email a utenti nuovi.
- Verificare audience Google e accesso di un utente pilota non già invitato; nessuna promessa di accesso pubblico prima della prova.
- Dominio del pilota, redirect esatti, QR HTTPS e luogo reale da preparare; il locale di prova resta identificato come tale.
- Decidere backup e prova di ripristino del servizio.
- Foto sostituite/abbandonate: oggi conservate nello Storage fino alla cancellazione account; definire pulizia con periodo di grazia e verifica dei riferimenti, evitando di rimuovere un file durante il salvataggio concorrente.

## Monitoraggio e capacità

Diagnostica client: ultimi 30 eventi locali, solo tipo e orario, nessun testo di errori, chat o token; banner offline e timeout delle richieste. Non esiste un sistema di allarme esterno già configurato.

Per il pilota controllare dashboard Supabase/Vercel, errori HTTP, latenza, volume richieste e coda moderazione. Target operativi proposti da confermare: nessun errore di autorizzazione o destinatario, nessun invio duplicato da retry nella stessa sessione, recupero dopo timeout entro una nuova richiesta. Polling sociale/presenze ogni 5 s quando visibile, stato account ogni 15 s; letture identiche condivise, foto private riutilizzate localmente per 20 s con URL valide 30 s. Latenza e costo sotto carico reale non sono ancora misurati: aumentare utenti a piccoli gruppi e registrare baseline prima di fissare soglie/alert.

## Collaudo fisico da completare

Su Safari iPhone e Chrome Android, più Home installata: QR esterno/interno, camera negata/occupata, libreria foto e HEIC, login nuovo/esistente/annullato, tastiera e schermo piccolo, ritorno da background, prima installazione/rifiuto/già installata, sessione dopo riavvio, aggiornamento app. Usare due account di prova per messaggi, blocco e presenza. Annotare modello, OS/browser, release, azioni, risultato ed evidenza senza dati sensibili.
