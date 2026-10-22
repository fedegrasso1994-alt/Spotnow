# Soma — Notifications MVP: contratto staging

Decision freeze founder 2026-10-22. Supera i quattro gap dell'audit `soma-notifications-mvp-audit-2026-10-22.md`; non riapre le semantiche prodotto.

## Architettura e confini

- CTA opzionale «Attiva notifiche» in PROFILO, richiesta sistema solo su click; rifiuto non blocca Soma.
- Web Push/VAPID, trasporto Edge separato da outbox/eventi. Nessun analytics, nuova inbox, modifica MATCH o nuovo provider applicativo. I push service dei browser vanno inclusi nel provider/legal pack.
- Migration `049_notifications_mvp.sql`, staging-only, quattro tabelle private RLS senza accesso diretto browser: `notification_control`, `push_bindings`, `notification_events`, `notification_deliveries`. Default `enabled=false`, `delivery_enabled=false`.
- Trigger downstream sulle INSERT canoniche di Match, messaggi, richieste deliverable ed exposure DD. Non sostituiscono writer, non allocano drop, non creano Match/richieste/messaggi. Rollback della transazione annulla anche outbox. DD usa constraint trigger differito: osserva lo stato ready finale, exposure autorizzabile, finestra effettiva dalle 08:00 Europe/Rome. Nessun evento per allocation vuota, clock-only o notte.
- Deduplica unica `(kind, canonical_id, owner_id)`; DD usa window ID. Fanout solo verso subscription attive già esistenti, nessun replay storico all'opt-in. Delivery unica per evento/binding. Nessuna notifica al sender del messaggio o al sender di una richiesta soppressa.
- Solo quattro copy generiche approvate; il push cifrato trasporta esclusivamente due riferimenti casuali (evento e binding). Nessun ID prodotto, identità, testo chat/post/commento, Tribe o luogo. Il SW ottiene copy generica dopo nuova validazione server. Endpoint e chiavi non vengono loggati.

## API, autorizzazioni e lifecycle

RPC browser autenticate: `notification_register`, `notification_revoke`, `notification_resolve`. Owner sempre dalla sessione; register richiede eligibility. Massimo dieci binding per account (limite tecnico anti-accumulo), più dispositivi supportati. Endpoint dei push service ammessi esplicitamente; nessun URL arbitrario per il dispatcher. Un endpoint esistente non può essere riassociato senza il segreto casuale precedente. Il normale client cancella subscription/binding precedente prima del nuovo opt-in. Una registrazione nuova crea un nuovo ID/epoch del binding e annulla il vecchio fanout.

Logout esplicito: invalida prima storage locale e SW, chiude notifiche gestibili, unsubscribe, revoca server e solo dopo signOut. Cambio account: scarta immediatamente stato locale vecchio e unsubscribe, mai registra automaticamente il nuovo account; ulteriori delivery vecchie non superano il controllo locale. Gli altri tab ricevono invalidazione storage. I binding scadono dopo 30 giorni; `pushsubscriptionchange` invalida l'associazione e richiede un nuovo opt-in esplicito. Auth deletion elimina binding/eventi/delivery per cascade. Le notifiche già mostrate dal sistema operativo non sono retroattivamente ritirabili con garanzia assoluta.

RPC `notification_claim/finish/check/prune` eseguibili solo dal service role Edge, nessuna chiave privilegiata nel client. `check` HTTP usa prova casuale revocabile dell'installazione, non JWT utente persistito nel SW; token opaco e binding devono corrispondere a una delivery e a un evento ancora autorizzato. Request body limitato a 2048 byte anche senza Content-Length. CORS limitato all'origine Preview configurata; risposte no-store.

Claim con row lock SKIP LOCKED, lease e massimo tre tentativi. HTTP 404/410 rimuove subscription; 429 permette retry ritardato; 4xx permanente conclude; timeout/5xx/esito incerto → `unknown`, nessun resend automatico. Worker perso in `sending` diventa `unknown` dopo due minuti, non una nuova autorizzazione all'invio. Non promettiamo exactly-once fisico attraverso rete/OS; SW deduplica i riferimenti recenti prima dello show. Nessuna risoluzione automatica cieca di unknown. Risoluzione operativa richiede evidenza del trasporto; altrimenti si lascia scadere senza reinvio.

Outbox e tentativi eliminabili dopo sette giorni da `notification_prune`; riferimento risolvibile per massimo 24 ore e comunque solo finché il target è accessibile. TTL trasporto cinque minuti, non estende autorizzazioni o finestra DD. Endpoint scaduti eliminati nello stesso prune. Nessun payload prodotto nelle receipts. Non si riusano né si attivano PHOTO cleanup/retention scheduler. Il comando prune è separato e idempotente; programmazione operativa notifiche non attivata implicitamente.

## Tap e SW

Ingresso `/?n=<riferimento casuale>`, preservato in Auth redirect/onboarding senza segreti Auth. `notification_resolve` controlla owner e autorizzazione corrente. DD→TRIBE; Match/messaggio→chat unificata esistente. Richiesta→singola vista recipient in SPOTTED con proiezione profilo autorizzata, accetta/rifiuta tramite RPC romantic esistenti. Nessun pannello «Vorrebbero conoscerti» in MATCH. Target scaduto/rimosso/non autorizzato → fallback generico. Risposte tardive di un altro account non navigano né mostrano dati.

`public/sw.js` conserva integralmente il codice fetch/offline preesistente; aggiunge solo `importScripts('/notification-runtime.js')`. Push, click, messaggi binding e cambio subscription sono isolati. Nessuna cache di contenuti protetti, riscrittura navigazione o fallback offline. Fallimento di un check push non mostra una notifica né una pagina offline.

## Configurazione e rollout staging

1. Migration 049 con entrambi i controlli OFF; verificare baseline e RLS.
2. Deploy Edge `notifications` dal sorgente versionato. `scripts/notifications-edge-bundle.mjs` produce un bundle deterministico per editor dashboard, senza env/segreti. Edge verifica project ref staging a runtime.
3. Generare solo credenziali nuove con `node scripts/notifications-staging-secrets.mjs`: file `.local/notifications-mvp/staging-secrets.env` ignorato, permessi 0600; esecuzioni successive non ruotano segreti. Inserimento manuale owner in Edge Secrets. Non leggere o modificare credenziali Production. Nomi: `NOTIFICATIONS_VAPID_PUBLIC`, `NOTIFICATIONS_VAPID_PRIVATE`, `NOTIFICATIONS_VAPID_SUBJECT`, `NOTIFICATIONS_DISPATCH_SECRET`.
4. Build Preview con `scripts/notifications-staging-build.mjs` dopo aver esportato URL/chiave pubblica Supabase staging. Il helper imposta esplicitamente `VITE_NOTIFICATIONS_MVP=true` e la sola chiave VAPID pubblica, evitando variabili shell non esportate. Il file separato `public-build.env` non contiene la chiave privata. Configurare `NOTIFICATIONS_PREVIEW_ORIGIN` all'origine esatta della nuova Preview. Nessun valore privato in bundle/config Git.
5. Gateway JWT della nuova funzione disabilitato secondo `supabase/config.toml`: check ha prova device revocabile; dispatch/prune richiedono Bearer segreto dedicato. Non disabilitare protezioni di altre funzioni. Collaudare 401 senza segreto e rifiuto check invalido.
6. Solo per fixture sintetiche opt-in, attivare controllo notifiche; non iscrivere account staging esistenti. Dispatcher invocato autenticato e limitato a 20 delivery/ciclo. Discovery resta OFF: il suo evento reale richiede un distinto collaudo isolato già autorizzato prima di un'eventuale finestra DD ON. Non alterare gli altri scheduler.
7. Hosted E2E, revoca/logout/cambio account, cleanup fixture e ritorno controlli OFF prima di gate finale. La cadenza operativa di invocazione dispatch/prune va configurata e collaudata esplicitamente prima di considerare la delivery operativa: il solo deploy non la avvia.

Rollback operativo staging: controlli notifiche OFF, disabilitare la CTA tramite flag frontend, preservare gli altri moduli e lasciare schema additivo; nessun rollback distruttivo necessario. Disattivare delivery non modifica Spot/Match/chat/DD. Non attivare altri job per riparare la pipeline.

## Limiti ed evidenze richieste

La libreria trasporto è `npm:web-push@3.6.7`, solo lato Edge; nessuna nuova dipendenza browser. Import npm supportato dal runtime Supabase non equivale a prova di esecuzione di questa libreria: richiede smoke hosted. Fonti: [Supabase dependencies](https://supabase.com/docs/guides/functions/dependencies), [web-push](https://github.com/web-push-libs/web-push), [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291.html).

I test automatici usano PostgreSQL/PGlite isolato, DOM sintetico e veri handler SW eseguiti in VM; trasporto esterno iniettato. Non sono prova di ricezione OS. Il report di consegna distingue test locali, schema cloud, login/subscription browser, dispatch cloud e ricezione reale. Fino a configurazione segreti, Preview e smoke hosted completati: **NOTIFICATIONS MVP: BLOCKED**, non semplicemente “push device deferred”.
