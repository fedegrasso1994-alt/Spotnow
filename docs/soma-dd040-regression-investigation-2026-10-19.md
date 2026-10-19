# Soma — DD040 intermittent regression investigation

Data: 2026-10-19. Branch: `codex/soma-schema-v2-staging`.
Baseline analizzata: `d1115fb3b6e208b9d7f5924a8061d724fa69a1b9`.
Source of Truth: `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`, sezioni 8–9.

## A. Classificazione e causa

**TEST FLAKE**, non un difetto dimostrato del motore DD.

Il test delle riletture pubbliche chiamava `wrapperDatabase(t)` con il default di
**sei membri** compatibili della stessa Tribe. Il builder inizializza
`generation_id` con `gen_random_uuid()` e usa MD5 di seed/ID come spareggio dopo
fairness, novelty e diversity. Il test pretendeva sempre quattro profili senza
garantire quattro slot reciprocamente disponibili per l'osservatore.

In 20 ripetizioni su database PostgreSQL/PGlite nuovi: **18 risultati a quattro,
2 risultati a tre** (run 8 e 10). Tutte le 20 esecuzioni mantengono payload e stato
persistente identici nelle cinque riletture successive. Non si tratta di
`DD_WINDOW_OVERLAP` né di una perdita al secondo fetch.

Seed falliti:

- run 8: `c0fb4a95-6ce0-4db6-95a6-eebcfcb8f101`;
- run 10: `2733cb8f-0576-41cb-96c9-8d14577093b0`.

Il replay del primo seed su un ulteriore database nuovo riproduce gli stessi
undici pairing, nello stesso ordine, e tre profili per A.

## B. Perché tre; verifica dei quattro candidati

Gli ID A…F sono esclusivamente UUID sintetici `10000000-…-000001`…`000006`.
Nel run 8:

| Utente | Slot assegnati | Relazione con A |
| --- | ---: | --- |
| A | 3 | osservatore |
| B | 4 | già assegnato ad A |
| C | 4 | già assegnato ad A |
| D | 4 | non assegnato ad A, nessuno slot libero |
| E | 3 | già assegnato ad A, non duplicabile |
| F | 4 | non assegnato ad A, nessuno slot libero |

Ordine effettivo dei pairing: CD, BF, AE, AC, BD, EF, CF, AB, DE, BC, DF.
Al termine non esiste un ulteriore pairing legale per A. Il run 10 ha la stessa
condizione strutturale: A e D a tre e già accoppiati; B e F, non assegnati ad A,
sono a quattro. Tutti gli altri vincoli sono soddisfatti.

**Distinzione essenziale:** all'inizio esistono cinque candidati compatibili per
A. Un grafo diverso potrebbe attribuire quattro profili a tutti e sei. Il motore
attuale produce un grafo massimale, non promette una soluzione globalmente massima.
Con gli slot già assegnati e congelati non restano quattro candidati con capacità
reciproca: arrivare a quattro richiederebbe sostituire pairing già assegnati.
La Source of Truth ammette pool parziali e vieta sostituzione/refill degli slot.
Questo task non introduce una nuova politica di ottimizzazione o riordino.

L'evidenza per ogni run comprende clock/window, seed, membership, eleggibilità e
compatibilità in entrambe le direzioni, stato precedente, budget, ordine dei
pairing, contatori dopo ogni inserimento, fairness, pair memory, candidati e payload.

## C. Cause alternative controllate

- **Leak tra test, fairness, recurrence, finestre stale:** esclusi nei 20 run;
  ogni database è nuovo e windows/allocations/exposures/memory/fairness sono vuoti.
- **Compatibilità/consenso/safety/membership:** tutte le 15 coppie iniziali sono
  eleggibili in entrambe le direzioni; nessun riempitivo incompatibile.
- **Budget giornaliero/stato precedente:** nessuna allocation prima della chiamata;
  i candidati mancanti sono bloccati dal cap quattro della finestra, non da otto/giorno.
- **Clock/DST:** il helper preesistente mantiene una finestra sintetica attiva,
  con limiti catturati una sola volta nel database; nessuna transizione osservata
  durante i run falliti. Non è stato cambiato il clock di alcun ambiente remoto.
- **SQL non ordinato:** l'array `new_users` è usato per appartenenza (`ANY`), non
  come ordine di iterazione. L'ordine determinante passa dagli spareggi con seed;
  il replay riproduce l'intera sequenza.
- **Parallelismo/transaction ordering:** la riproduzione avviene anche isolata e
  sequenziale su database nuovi; nessuna interferenza tra file è necessaria.
  PGlite esegue PostgreSQL in-process: questi run non costituiscono una nuova
  prova di concorrenza multi-sessione del servizio cloud.
- **039–041:** 039 proietta lo stato Spot; 040 riutilizza la finestra prima
  dell'INSERT, senza cambiare il builder. Il test originale carica 039/040 e non
  041; quindi 041 non è necessaria alla riproduzione. I test esistenti di 041,
  comprese default-OFF e compatibilità 039/040, restano nella suite completa.

## D. Correzione esclusivamente test/harness

Il test full-drop ora crea **esattamente cinque membri**: A e quattro peer.
Verifica tutte le dieci coppie reciprocamente eleggibili, identità dei membri e
assenza di finestre/allocazioni/esposizioni/fairness/memory/intents/operations
precedenti. Rimane invariata l'asserzione rigorosa `profiles.length === 4`,
rafforzata dagli ID esatti, dieci pairing totali e quattro slot per ogni membro.

Prova indipendente dal seed: in un grafo compatibile completo di cinque utenti,
se manca l'arco A–B, entrambi hanno al massimo tre vicini. Quindi nessun arco
mancante può essere impedito da un peer già pieno; la generazione può completare
il grafo senza sostituzioni. Nessun seed favorevole viene scelto per nascondere
il problema.

Due test aggiunti:

1. **Controllo negativo 4→3:** il test ottiene quattro profili, rimuove un'esposizione
   solo nel proprio database usa e getta e dimostra che lo stesso controllo
   rigoroso fallisce sul payload SQL reale a tre. Non modifica il codice SQL del
   motore e non rappresenta un'operazione prodotto autorizzata.
2. **Controesempio catturato:** sei membri con il seed del run 8; verifica il
   risultato parziale, capacità dei candidati mancanti, reciprocità per tutti
   e assenza di mutazioni alle riletture. È separato dal test full-drop rigoroso.

`reproduce.mjs` raccoglie l'evidenza con un trigger di osservazione solo nel
PostgreSQL locale usa e getta. `verify-repeated.mjs` ripete l'intero file DD040
in processi Node nuovi e si arresta al primo errore. Nessuno script si connette
ad alcun provider. Le fixture locali vengono chiuse dopo ogni run.

Per riprodurre localmente: `node scripts/dd040-investigation/reproduce.mjs original 20`
(rigenera il file di evidenza originale); per la verifica corretta:
`node scripts/dd040-investigation/verify-repeated.mjs 20`.

## E. Verifiche finali

| Verifica | Risultato |
| --- | --- |
| Originale, 20 database isolati | 18 a quattro / 2 a tre; tutte le riletture idempotenti |
| Replay seed fallito | tre profili, identico ordine degli undici pairing |
| DD040 corretto, processi nuovi | **20/20 consecutivi; 11/11 per run, 220/220** |
| Suite completa baseline | 583/583 (il PASS singolo non escludeva il flake) |
| Suite completa dopo fix | **585/585 in tre esecuzioni complete** |
| SPOTTED dedicato | **20/20** |
| Build staging | **PASS** (`pnpm build`) |
| Typecheck | **PASS** (`pnpm typecheck`) |
| Release assets / font / secret bundle check | **PASS** |
| `git diff --check` | **PASS** |

Suite complete: prime due con l'entry point Node equivalente a `pnpm test`,
terza con `pnpm test`. Nessun retry automatico fino al verde: il runner ufficiale
si ferma al primo errore. Nessun errore nei 20 run corretti. `validation.json`
contiene contatori e hash dei log di verifica; le durate dei run DD040 sono
nell’evidenza TAP ripetuta.
I due test aggiunti portano la suite da 583 a 585 test.

## F. File modificati

- `tests/dd-idempotent-read.test.js` — fixture deterministica, precondizioni,
  asserzioni rigorose e due test mirati.
- `scripts/dd040-investigation/reproduce.mjs` — riproduzione isolata e diagnostica SQL.
- `scripts/dd040-investigation/verify-repeated.mjs` — 20 run ufficiali consecutivi.
- `docs/soma-dd040-regression-investigation-2026-10-19.md` — questo report.
- `docs/evidence/dd040-investigation/original.json` — tutti i 20 run originali.
- `docs/evidence/dd040-investigation/original-replay.json` — replay del seed fallito.
- `docs/evidence/dd040-investigation/classification.json` — verifiche derivate del controesempio.
- `docs/evidence/dd040-investigation/corrected-repeated.json` — output TAP dei 20 run corretti.
- `docs/evidence/dd040-investigation/validation.json` — riepilogo verifiche e hash log.

## G. Invarianti e consegna

Nessuna modifica a `src/`, migration, Edge Function, decoder, policy/quote/finestre
DD, Spot v2, Match, ORA, Membership, autorizzazione foto o SPOTTED. Nessun deploy,
merge su main, modifica Production, fixture remota o accesso a console/API provider.
Discovery/cleanup/scheduler remoti non sono stati modificati né riattivati; lo
stato live non è stato nuovamente interrogato in questo task locale.

Main locale/remoto verificato prima della consegna:
`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
Il commit di consegna è il commit che introduce questo report sul branch staging;
SHA locale/remoto riportati nel messaggio finale per evitare autoreferenze nel file.
Nessuna Preview nuova è necessaria: il bundle runtime non è cambiato.

**DD040 REGRESSION: GO**
