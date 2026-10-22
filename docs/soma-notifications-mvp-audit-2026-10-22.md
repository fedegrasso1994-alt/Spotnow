# Soma — Notifications MVP: audit e gate architetturale

Data: 2026-10-22. Branch: `codex/soma-schema-v2-staging`.
Baseline auditata: `ff72d8e943a660a01fe4109040c974fc3673cd82`.
Stato alla baseline auditata: **NOTIFICATIONS MVP: BLOCKED**.

Aggiornamento: i quattro gap decisionali sono stati successivamente approvati dal founder. Vedere `soma-notifications-mvp-contract-2026-10-22.md` e `soma-notifications-mvp-staging-report-2026-10-22.md` per implementazione, verifiche e blocker browser residui.

Questo documento completa l'audit richiesto prima dell'implementazione. Non introduce codice runtime, migration, provider, credenziali, richieste di permesso o fixture. Le proposte seguenti non sono decisioni prodotto approvate. Il §20 del task richiede STOP se trigger del permesso, delivery, ownership delle subscription o destinazione della richiesta SPOTTED sono indefiniti. La Source of Truth, §36, mantiene il delivery delle notifiche tra i TBD.

## A. Inventario architetturale

| Area | Evidenza nel repository | Conseguenza |
| --- | --- | --- |
| Push | Nessuna implementazione PushManager, subscription, VAPID, outbox o dispatcher nelle sorgenti/configurazioni versionate | Nessuna delivery push esistente da riusare |
| Dipendenze | `package.json`: Supabase JS e qr-scanner; nessun SDK push | Scelta delivery/runtime ancora necessaria |
| PWA | `public/manifest.webmanifest`: Soma, standalone, scope e start URL `/` | Manifest non equivale a supporto push collaudato |
| SW | `src/main.js` registra `/sw.js`; `public/sw.js` gestisce solo navigazione network-first e pagina offline statica | Nessun handler push/notificationclick/pushsubscriptionchange |
| Match in app | `src/live-social.js`: polling visibile e Set locale dei Match già noti | Toast e dedup in memoria non sono delivery background |
| Messaggi | `src/backend.js` chiama `send_message` con nonce; RPC inserisce messaggi dopo autorizzazione | Riutilizzare la scrittura canonica, non il polling |
| DD | Builder e lettura pubblica nelle migration 037–041; controlli e finestre server-side | Non creare un secondo allocatore per notificare |
| Richieste SPOTTED | Migration 043; `src/spotted-romantic.js`, `src/spotted-romantic-ui.js` | Stato canonico esistente, destinazione UI attiva assente |
| Sessione | `src/supabase-client.js`, `src/backend.js`, `src/live.js` | Sessione persistente e logout esistenti, nessun binding push/revoca |

Le istruzioni SQL `notify pgrst, 'reload schema'` aggiornano la cache schema PostgREST: non sono notifiche utente. La ricerca esclude il bundle decoder generato `photo-wasm.js`. Non sono state lette chiavi o segreti. Eventuali risorse esterne inutilizzate non sono verificabili dalla sola codebase: MANUAL CHECK, senza assumere provider aggiuntivi.

## B. Quattro decisioni necessarie prima del coding

| Decisione | Gap esatto | Raccomandazione da approvare |
| --- | --- | --- |
| Permission UX | “Dopo uno stato autenticato significativo” non identifica una CTA o schermata | CTA esplicita «Attiva notifiche» in PROFILO dopo onboarding minimo. Permesso solo su click, niente blocco onboarding o nag |
| Delivery | Nessun meccanismo scelto | Web Push standard/VAPID con dispatcher Supabase Edge, previa prova di compatibilità runtime. Nessun SDK marketing. I push service dei browser restano destinatari tecnici da mappare nel provider/legal pack |
| Ownership | Nessun contratto account/installazione/endpoint o revoca | Binding server-authoritative multi-dispositivo, owner da sessione autenticata, epoch del binding e revoca su logout/account switch; trasferimento endpoint controllato |
| SPOTTED tap | Nessuna superficie recipient montata nella shell attuale | Approvare una vista della singola richiesta dentro SPOTTED, senza inbox e senza ripristinare il pannello MATCH rimosso |

`mountRomanticRequests()` viene chiamato da `src/live.js` con `settingsRoot` ma senza `inboxRoot`. Il codice legacy «Vorrebbero conoscerti» resta opzionale e non montato. Non costituisce quindi una destinazione utilizzabile. Ripristinarlo in MATCH contraddirebbe il cleanup approvato.

## C–D. Permesso e subscription: contratto candidato

Il consenso installazione PWA (`setupInstallApp`, anche dopo primo Match) non è consenso notifiche e non verrà riutilizzato implicitamente. Lo stato reale del permesso browser non è stato richiesto né verificato: manca il trigger approvato.

La proposta richiede subscription private con endpoint e chiavi di cifratura protetti, account proprietario derivato da `auth.uid()`, identificazione installazione non utilizzabile come autorizzazione, epoch e stato attivo/revocato. Non assumere un token per utente. Nessun endpoint/chiave in report, analytics o log ordinari. Il rebind non deve consentire furto silenzioso di endpoint tramite parametri frontend.

Logout e cambio account devono invalidare binding e tentativi ancora in coda; il SW deve scartare delivery di epoch precedenti e chiudere le notifiche gestibili già presenti. La sola revoca server non copre push già in volo. Non promettere rimozione retroattiva di notifiche già mostrate dal sistema operativo. Logout offline, race di rebind e ritardi del push service richiedono test specifici prima di GO.

## E. Mappa eventi canonici e tap

| Evento | Punto canonico | Dedup candidato | Destinazione autenticata |
| --- | --- | --- | --- |
| DD disponibile | Esposizioni effettive autorizzabili nella finestra corrente, non solo creazione allocation vuota | Utente + finestra, una prima disponibilità | TRIBE |
| Nuovo Match | INSERT reale in `public.matches`, condiviso da Spot v2 e accettazione romantic | Match + destinatario | Chat del Match già autorizzato |
| Richiesta romantic | INSERT effettivo pending/deliverable in `spot_private.board_romantic_requests` | Richiesta + destinatario | **Bloccata: superficie recipient da approvare** |
| Nuovo messaggio | INSERT reale in `public.messages` dopo controlli `send_message` | Messaggio + destinatario diverso dal sender | Chat esistente autorizzata |

Match: migration 034 e 043 convergono sulla stessa tabella con conflitto sulla coppia. Un retry che restituisce un Match esistente non crea un nuovo evento. Messaggi: migration 009 implementa nonce e retry; non emettere da ogni invocazione RPC. Richieste: tentativi neutri, soppressione per Match già esistente, guard o opt-out non sono richieste deliverable; nessun feedback push al sender per decline/expiry/opt-out.

DD: rispettare 08:00–16:00 e 16:00–00:00 Europe/Rome; nessun evento notturno o per pool vuoto. Una prima assegnazione utile a metà finestra può generare il solo evento della finestra, non duplicati al fetch/completamento slot. Il builder attuale è on-demand: un push non rende autonomamente esistente un drop per chi non è stato allocato. L'eventuale generazione proattiva richiede un task/approvazione separata; non attivare Discovery o introdurre un builder schedulato in questo task.

Non esiste un contratto pubblico d'ingresso notifiche: `src/navigation.js` usa history interna; `restoreChat`/`presentMatch` riottengono Match autorizzati. Non riutilizzare i token pubblici Share come capability notifiche. Un futuro riferimento opaco owner-bound deve essere risolto server-side dopo Auth e onboarding, poi riverificare accesso corrente; target scaduto/eliminato/non autorizzato → fallback sicuro senza contenuti privati.

## F–G. Privacy, persistenza e idempotenza candidate

Solo copy generica: «Nuove persone ti aspettano su SOMA.», «Hai un nuovo match ❤️», «Qualcuno vorrebbe conoscerti 👀», «Hai un nuovo messaggio.». Mai testo chat/post/commento, identità, origine Match, luogo, Tribe o ID interni nella preview. Il dato tecnico opaco necessario al tap non deve codificare tali informazioni.

Persistenza proposta, non creata:

- binding subscription privati con ownership e epoch;
- outbox minimale con unicità tipo/evento canonico/destinatario, inserita nella stessa transazione business;
- tentativi per evento/subscription/epoch, retry limitati e stato terminale osservabile;
- resolver opaco autenticato e receipts minimizzate con TTL/retention da definire, senza contenuti prodotto.

Nessuna nuova inbox. Nessun framework generale di feature flag. Nessuna scelta di base giuridica. Una futura migration/API condivisa richiederà presentazione di schema, grants, RLS e compatibilità prima dell'implementazione, come da AGENTS.md.

Dedup server-side prima della delivery e dedup limitata nel SW; il solo `tag` del browser non basta. Per multi-device: un evento logico per destinatario e al più una delivery intenzionale per installazione attiva. Non promettere exactly-once fisico sulla rete: l'esito incerto dopo invio necessita una policy esplicita di retry/scadenza. Ricontrollare binding, eligibility e target al dispatch e al tap. Nessuna nuova semantica di presenza o soppressione chat aperta: non esiste oggi uno stato canonico di presenza da inventare.

## H–J. Stato verifiche runtime e staging

| Verifica | Esito |
| --- | --- |
| Logout/account switch push | NON IMPLEMENTATO / NON TESTATO; i normali reset sessione non dimostrano revoca push |
| SW | Invariato; oggi cache solo offline statica, nessun contenuto protetto scritto da questi handler |
| Push E2E, tap, fixture cleanup | NON ESEGUITI: STOP §20; nessuna fixture creata, nessun utente staging coinvolto |
| Permessi sistema / telefono reale | NON VERIFICATI; nessuna richiesta effettuata |
| Discovery, cleanup, scheduler | Nessun comando di attivazione o modifica eseguito |
| Main, Production, PHOTO, Auth | Nessuna modifica o deploy eseguito |

Il supporto piattaforma non è prova E2E. Apple documenta Web Push per web app Home Screen su iOS/iPadOS 16.4+ e richiesta dopo interazione utente: [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers). Le subscription contengono endpoint del push service e materiale di cifratura: [MDN PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription), [endpoint](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/endpoint). Compatibilità Edge/library, delivery reale e dispositivo installato restano da collaudare dopo le decisioni.

## Test da aggiungere dopo sblocco

Tutti i casi notifiche seguenti sono pianificati, **non PASS**:

| Task test | Verifica |
| --- | --- |
| A–B | Opt-in richiesto, nessuna delivery prima di permesso/binding valido |
| C–D | DD una volta/finestra con assegnazione reale; nessun evento overnight/vuoto |
| E–G | Match e richiesta una volta; nessuna identità o contesto romantic nel push |
| H–K | Messaggio una volta, esclusione sender, nessun testo lock-screen, retry concorrenti |
| L–M | Logout/account switch, binding vecchio/in-flight, endpoint scaduto, rebind concorrente |
| N–O | Tap autorizzato, Auth/onboarding, target scaduto/eliminato, fallback sicuro |
| P | SW navigazione invariata, reload/logout, offline reale e nessuna cache protetta |

Staging E2E futuro: sole fixture sintetiche isolate, un evento per ciascuno dei quattro tipi, due account e più binding per verificare ownership, cleanup finale completo. Non modificare gli utenti staging esistenti. Scheduler notifiche inizialmente OFF; nessun riuso dei controlli PHOTO/retention.

## K–O. Regressioni e consegna

- Suite completa eseguita: **672/672 PASS**, 0 fail, 0 skipped (109697 ms).
- Build staging: **PASS**, Vite 8.3.2, 115 moduli.
- Typecheck: **PASS**, `tsc --noEmit`.
- Log diagnostici locali ignorati: `.local/notifications-audit/`; nessuna credenziale aggiunta al report.
- Questi risultati verificano la baseline, non una feature notifiche implementata.
- Unico file di consegna: questo report; nessuna modifica a runtime, stile, SW, schema o configurazioni remote.
- Commit e stato push: identificabili dal commit che introduce questo documento e dalla verifica Git di consegna. Main baseline invariata: `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

Per procedere occorre approvare o correggere i quattro contratti della sezione B. Nessuna richiesta generica «procedi» è interpretata come scelta automatica di UX, provider o nuova superficie recipient.

**NOTIFICATIONS MVP: BLOCKED**
