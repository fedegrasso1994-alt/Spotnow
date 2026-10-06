# Regole di sviluppo di Soma

Queste regole valgono per i prossimi task nel repository. Non richiedono alcun
refactoring del codice esistente né modifiche al comportamento attuale.

- Sviluppare una feature o modifica alla volta.
- Evitare modifiche trasversali non necessarie al task.
- Non aggiungere nuova logica a file già grandi quando può vivere in un modulo dedicato.
- Separare UI, business logic e accesso backend quando ragionevole.
- Riutilizzare i moduli esistenti invece di duplicare la logica.
- Non fare refactor non richiesti durante l'implementazione di una feature.
- Ogni nuova feature significativa deve avere un modulo chiaramente identificabile.
- Aggiungere o aggiornare test per il comportamento modificato.
- Eseguire la suite di test, build e typecheck dopo ogni task; riportare risultati ed eventuali impedimenti.
- Segnalare prima di implementarle eventuali modifiche a schema database, RLS o API condivise, spiegandone impatto e compatibilità.
- Preservare la retrocompatibilità con i flussi esistenti salvo istruzione esplicita.

Per il task che introduce questo documento, non suddividere `src/live.js`,
`src/live-social.js`, `src/backend.js` o altri file esistenti. Eventuali future
estrazioni di moduli sono proposte da valutare separatamente, non attività
autorizzate da questo documento.

## Verifiche

- Test: `pnpm test`.
- Build: `pnpm build`.
- Typecheck: `pnpm typecheck`.

Se il package manager non è disponibile, usare i corrispondenti entry point
locali: `node --test tests/*.test.js`, `node node_modules/vite/bin/vite.js build`
e `node node_modules/typescript/bin/tsc --noEmit`.

## Mappa dei moduli attuali

- Avvio e scelta tra app reale, demo e moderazione: `src/main.js`.
- Coordinamento dei flussi reali, sessione, profilo, Ora e Tribe: `src/live.js`.
- Dettaglio profilo, Spot/interessi, match e chat: `src/live-social.js`.
- Accesso a Supabase e contratti dati: `src/backend.js`, `src/supabase-client.js`.
- Regole e validazione condivise: `src/domain.js`, `src/photo.js`, `src/qr.js`.
- Foto e caricamento: `src/avatar.js`, `src/detail-photo.js`, `src/photo-memory.js`,
  `src/photo-variants.js`, `src/optimize-photo.js`.
- Navigazione, paginazione e richieste: `src/navigation.js`, `src/pagination.js`,
  `src/ui-refresh.js`, `src/request.js`, `src/request-queue.js`.
- Funzioni UI dedicate: scanner, modali, installazione PWA, segnalazioni,
  sospensioni e viewport nei rispettivi moduli di `src/`.
- Demo separata: `src/app.js`, `src/demo.js`. Moderazione: `src/admin.js`.
- Markup e stile: `index.html`, `src/styles.css`, `src/admin.css`.
- Autorizzazioni e regole server: `supabase/migrations/`; funzioni server dedicate
  in `supabase/functions/delete-account/` e `supabase/functions/photo-assets/`.

## Possibili interventi futuri, non richiesti per il pilot

I principali punti di accoppiamento sono `live.js` (stato dell'account, DOM e
coordinamento di diversi flussi), `live-social.js` (stato social, DOM, polling e
richieste) e `backend.js` (molte operazioni dati e gestione delle foto). Il
numero di righe sottostima la complessità perché molte righe sono dense.
La funzione `photo-assets/index.ts` è grande soprattutto per il decoder WASM
incorporato: il peso del file, da solo, non indica un problema architetturale.

In task futuri esplicitamente dedicati, si potrebbe estrarre da `live.js` il
recupero della sessione, il flusso profilo e i controller Ora/Tribe; separare in
`live-social.js` dettaglio, match e conversazioni; suddividere internamente
`backend.js` per dominio mantenendone la facciata pubblica. Anche la funzione
server delle foto potrebbe separare autorizzazione, trasformazione e storage.

Questi refactor non sono prerequisiti del pilot. Un problema concreto di
sicurezza, correttezza o prestazioni richiede una correzione mirata e verificata;
non giustifica automaticamente una riorganizzazione generale.
