# Tribe — proposta di implementazione

Richiesta: sezione distinta Live/Tribe, nessuno swipe, griglia a due colonne con foto, nome ed età. Tribe comprende chi ha effettuato almeno un check-in nel luogo; i presenti live sono esclusi. Nessuna cronologia delle visite visibile.

## Analisi del codice attuale

- `index.html`: schermate, scheda profilo, barra inferiore e copy di visibilità.
- `src/live.js`: QR, caricamento del proprio check-in, navigazione e lista live; refresh attuale ogni 25 secondi.
- `src/live-social.js`: profilo dettagliato, interessi, match, chat, segnalazioni e blocchi.
- `src/backend.js`: API Supabase; la lista attuale dipende dalla RLS di `profiles`.
- `src/app.js`: anteprima demo da aggiornare insieme al flusso reale.
- Migrazioni 001–006: `checkins` ha `user_id` come chiave primaria. Un nuovo check-in sostituisce il precedente, anche cambiando luogo: lo storico non è disponibile.
- `express_interest` richiede presenza attiva di entrambi e reciprocità nella stessa sessione QR. Non supporta ancora reciprocità differita per Tribe.

## Implementazione prevista

1. Aggiungere appartenenze private uniche `(user_id, venue_id)`, registrate solo dal check-in QR lato server. Non serve memorizzare tutte le visite. Recuperare solo le appartenenze ancora dimostrabili dai check-in attuali, senza inventare uno storico.
2. Portare la presenza a 90 minuti: vincolo database, RPC check-in e scadenze dei check-in esistenti. Live usa `expires_at > now()`; alla soglia esatta il profilo non è più live. La durata di un match senza messaggi rimane un'ora, salvo nuova decisione.
3. RPC per Live e Tribe nel luogo selezionato, con autorizzazione server, preferenze, esclusione di sé, blocchi bidirezionali, account sospesi e luogo attivo. Tribe non restituisce timestamp di visite. Foto private con gli stessi controlli.
4. Aggiungere scheda Tribe nella barra e griglia dark a due colonne. Riutilizzare profilo dettagliato e invio Spot; copy del dettaglio differente per Live/Tribe. Aggiornare promessa di visibilità prima del check-in.
5. Refresh liste e timer di scadenza per togliere la presenza alla soglia dei 90 minuti anche a schermata aperta. Il server rimane autorevole; a schermo prevedere riallineamento dopo sospensione o ritorno alla scheda.
6. Validazione: test dei limiti 89:59/90:00, appartenenze uniche e multi-luogo, utenti bloccati/sospesi, assenza di timestamp Tribe, autorizzazione delle foto e reciprocità differita. Build e test esistenti; nessun comando type-check è configurato nel progetto JavaScript attuale.

## Decisioni necessarie prima di modificare autorizzazioni e match

- Accesso alla Tribe dopo la scadenza del proprio check-in oppure solo con presenza attiva.
- Durata dello Spot Tribe in attesa di reciprocità.

Implementazione non ancora iniziata: in attesa di queste scelte. Pubblicazione precedente del popup installazione ancora in attesa di autorizzazione CLI Vercel.

## Decisioni confermate dall’utente — 3 ottobre 2026

La specifica più recente è quella con pagina generale «Le tue Tribe» e appartenenze multiple. Login Google prima del check-in, preview aggregata senza profili prima del login, sessione persistente, QR conservato nel percorso OAuth/onboarding. Presenza 90 minuti; appartenenza senza scadenza; nessun ranking/swipe/limite Spot aggiunto.

Spot e match senza scadenza automatica per la nuova esperienza. Nessuna funzione di ritiro Spot. Non aggiungere «Lascia questa Tribe». Nel profilo prevedere «Elimina account», con conferma dell’utente e cancellazione effettiva lato server. Blocchi e segnalazioni restano disponibili. La conformità privacy non è attestata dal solo pulsante elimina account: resta da definire la base giuridica e una procedura per eventuali richieste di cancellazione selettiva, opposizione o revoca applicabili.

Il GDPR non prescrive un pulsante denominato «Lascia la Tribe»; non ne segue che ogni richiesta di rimozione di una specifica appartenenza possa essere subordinata alla cancellazione dell’intero account. Riferimento: Regolamento UE 2016/679, articoli 7, 17, 21 e 25.
