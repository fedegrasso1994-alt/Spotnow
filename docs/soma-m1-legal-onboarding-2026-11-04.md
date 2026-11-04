# SOMA — M1 onboarding legale, opzione A

4 novembre 2026. Baseline `97d7d27271a2ba5c6223ffc8badd7cc3e2c20a68`, branch `codex/soma-schema-v2-staging`.

**Implementazione tecnica locale pronta per review; porzione giuridica sospesa. Non è un'autorizzazione al pilot.** Nessuna migration applicata al cloud, nessun deploy, attivazione globale, modifica provider/main/Production o utilizzo di account reali. Non sono stati modificati i processi retention/recovery né i testi di `docs/legal/`.

## Flusso e UI

Login → schermata `privacy` esistente con 18+/Terms e un solo Continua → profilo `onboarding` esistente con consenso specifico vicino alle preferenze → Tribe → Chance. Quattro schermate interattive, senza nuove schermate, redesign, Non ora, Attiva dating o accettazione della Privacy.

Il checkbox Terms sostituisce, nel conto delle azioni obbligatorie standard, il pulsante separato del vecchio consenso: resta il confronto di 13 macro-interazioni nel percorso Google già specificato, esclusi intro, operazioni provider, picker e digitazione carattere per carattere. La foto resta nel profilo. Il testo aggiunto può richiedere scroll verticale; il salvataggio resta raggiungibile a 320/390 px.

Le prove già valide non vengono ripetute: si mostra solo il controllo mancante, una nuova versione non equivale a una vecchia accettazione. Il nuovo testo specifico di consenso ha un nuovo identificatore e NON eredita silenziosamente gli assensi dei placeholder precedenti.

## Contratto server candidato — migration 063

- Due tabelle private con RLS e nessun accesso diretto anon/authenticated/service_role: catalogo Terms immutabile e assensi owner/versione/hash/operazione/timestamp server. Nessuna email, IP, user agent, password, token, sessione o preferenza negli assensi.
- `accept_legal_terms`: solo account autenticato ammesso, età idonea, scelta esplicita, versione/hash correnti; lock versione e owner, retry idempotente, una prova per account/versione. Non permette di scegliere account o timestamp.
- `my_privacy_state`: aggiunge stato/versione/hash/URL e timestamp dei Terms dell'account corrente, conservando il contratto privacy precedente.
- `has_account`, `board_eligible` e `privacy_discovery_eligible` riusano i predicati precedenti aggiungendo Terms; vengono conservati gli ACL precedenti. Gli alias dei predicati precedenti non sono eseguibili dai client.
- L'attestazione 18+ usa il predicato account precedente ai Terms, evitando una dipendenza circolare. La dichiarazione e l'assenso sono prove separate, anche quando l'utente usa una sola prosecuzione.
- Revoca del consenso e accesso owner ai diritti restano disponibili senza Terms. Test negativi verificano che gli stessi account non possano però avviare ORA, accedere al feed o scrivere profilo tramite bypass dei gate.
- Riutilizzati challenge, eventi e revoca del consenso. Nuovo testo specifico dalla sezione D di `03_ONBOARDING_LEGAL_COPY.md`, versione `dating-profile-1.1-staging`; resta `placeholder`, NON una dichiarazione di validazione legale.
- Nessun backfill di assenso, cambiamento a ruoli/MFA/sessioni, quote, release, Match/chat o flag PHOTO/retention/Discovery/Notifications.

La migration è candidata staging-only, non applicata. Un futuro rilascio deve essere coordinato: applicarla da sola rende incompleti gli account senza Terms e i vecchi frontend non hanno la nuova UI per completarli. Questa nota non autorizza rollout o modifiche alle configurazioni.

## Coordinamento e isolamento client

- `legal-onboarding.js` gestisce le conferme indipendenti e gli UUID di retry; ricontrolla il server e rifiuta versioni sconosciute/cambiate.
- `profile-consent.js` conserva il checkbox non selezionato, controlla versione e stato prima del salvataggio, riusa challenge/opid sui retry e non ricostruisce preferenze dopo revoca. Il consenso viene preparato prima di foto/salvataggio nel normale coordinamento del form; le guardie DB restano autorevoli anche se interviene una revoca successiva.
- Cambio account/logout invalidano lo stato dei componenti e le continuazioni pendenti. Non vengono conservate dichiarazioni pre-auth o nuovi identificatori cross-session.
- Google/email mantengono il percorso autenticato; QR/Share conservano gli intenti e non saltano i prerequisiti. L'eccezione QR resta quella esistente: nessun auto-join e nessuna seconda conferma di presenza introdotta.
- La semplice collocazione del consenso nel profilo non viene rappresentata come prova di libertà o validità giuridica.

## Documenti disponibili nella sola build locale

`scripts/legal/materialize.mjs` produce due documenti statici staging da tutte le clausole numerate dei Terms e della Privacy v1.1. Sono escluse soltanto intestazioni editoriali/non pubblicabili e checklist interne, senza riscrivere clausole. Test roundtrip confrontano integralmente il payload servito con quello estratto dalle fonti immutate. Versioni, provenienza e SHA-256 sono nei descrittori tecnici; l'utente vede il testo e l'indicazione di anteprima staging, non hash/registri interni.

I link sono disponibili nel login, nella schermata legale e nel profilo. Le pagine sono anteprime locali con avviso pilot non autorizzato: non è avvenuta una pubblicazione remota né una promozione del Legal Pack a validato per il pilot.

## Porzioni sospese e alternative da decidere

1. **Rifiuto iniziale/libertà del consenso.** Nessuna nuova modalità alternativa implementata. Senza scelta esplicita non si procede al nuovo salvataggio delle preferenze; resta il comportamento fail-closed. L'editing già supportato di un profilo esistente con preferenza NULL resta disponibile secondo il contratto precedente. Non si conclude che queste conseguenze rendano libero il consenso.
   - Se la valutazione professionale conferma il modello, si precisano le sole funzioni realmente dipendenti e le conseguenze comunicate.
   - Se non lo conferma, si mantiene chiusa l'apertura e si richiede una decisione sul trattamento. Non basta una nuova formula nel checkbox; nessun Non ora o percorso di prodotto inventato da questo task.
2. **Match/Chat residui.** Non cancellati né ridefiniti. Il test dimostra che la revoca cancella la preferenza e blocca nuove presenze, conservando il comportamento tecnico preesistente delle conversazioni; NON determina la base Art. 6 o la condizione Art. 9. Serve decisione per finalità/categoria prima del pilot.
3. **Validazione/pubblicazione definitiva.** Testi/versioni tecniche staging e disponibilità locale non autorizzano utenti reali. Nessun flag di ammissione o raccolta viene attivato.

## Verifiche ed evidenze

Evidenza minimizzata: `docs/evidence/m1-onboarding-local/verification.json`, con checksum dei log locali e risultati responsive. Tutti i database test sono PGlite usa-e-getta; il target recovery quarantinato non è stato aperto o modificato.

| Verifica | Risultato e limiti |
|---|---|
| M1/client/server + welcome/navigation/inventario finale | 80/80 PASS |
| Proiezione documenti e controlli client finali | 8/8 PASS, sottoinsieme della suite |
| Full suite | 954/954 PASS, zero fail/skip/cancel; non sommare i sottoinsiemi |
| Build | PASS |
| Typecheck | PASS, inclusi esplicitamente i nuovi moduli |
| Responsive Chromium locale | 320/390 PASS su login, 18+/Terms e profilo; scrollWidth=clientWidth, CTA raggiungibile, zero page errors; nessuna preferenza/checkbox preselezionata |
| DB bypass/negative | anon/service e tabelle/alias privati negati; Terms assenti, falsi o vecchi negati; normale profilo/ORA/feed bloccati senza prerequisiti |
| Proof/retry/versioni | Prove età/Terms/consenso separate, timestamp server, retry deduplicato e cambio versione/account protetti |
| Frozen product | Hash dei corpi delle RPC ORA/Spot/Chance/richieste/message invariati nel canary locale, flag e quote invariati all'installazione della candidata; reciprocità e chat normali verificate dopo le prove |
| Cloud/Auth reale | NON ESEGUITO: nessuna migration/deploy o login reale autorizzato da questa verifica locale |
| Git whitespace | PASS |

Il responsive riproducibile usa `scripts/legal/responsive-fixture.html` (markup profilo originale, componenti reali e backend sintetico) e `scripts/legal/responsive.mjs`. È una prova dei componenti, NON un E2E Google/email con server staging. Chromium è temporaneo, senza profili personali; schermate in `/tmp/soma-m1-responsive`.

### Fallimenti incontrati, senza rerun occulto

- Primo mirato: 12/15; tre errori nelle nuove query di test, alias posto dopo FROM. Corretto il helper.
- Secondo mirato: 14/15; la nuova fixture di reciprocità ORA non avviava entrambe le presenze prima del primo Spot. Corretta la fixture, non il prodotto.
- Typecheck iniziale: due callback inferite senza argomenti. Corrette le firme.
- Prima full suite: 936/952; sedici ReferenceError nel VM harness di navigazione che rimuove gli import. Aggiunte le nuove dipendenze e le prove Terms alle fixture già conformi, mantenute le asserzioni e aggiunti due test negativi M1. Successiva full: 954/954.
- Revisione finale: nascosto il ritorno al profilo con Terms incompleti per evitare rimbalzi, mantenuto il messaggio di errore sui retry. Ripetuti il gruppo mirato (80/80) e la full suite sulla release finale (954/954).
- Il controllo visivo ha individuato una regola `.field label` che prevaleva sull'allineamento del consenso: aggiunta una correzione CSS circoscritta e riverificato Chromium. Nessun redesign.
- Il download browser e l'avvio loopback erano impediti nel sandbox; ripetuti con il solo accesso necessario al tooling temporaneo. Nessuna anomalia provider/app classificata sulla base di questi limiti locali.

## File modificati

- Runtime: `src/live.js`, `src/privacy-phase1.js`, `src/privacy-welcome.css`.
- Moduli dedicati: `src/legal-onboarding.js`, `src/profile-consent.js`, `src/legal-documents.js`, `src/legal-document-data.js`.
- SQL candidata: `supabase/migrations/063_legal_onboarding_m1.sql`.
- Documenti generati: `public/legal/terms-v1.1-staging.html`, `public/legal/privacy-v1.1-staging.html`.
- Tooling locale: `scripts/legal/documents.mjs`, `materialize.mjs`, `responsive.mjs`, `responsive-fixture.html`.
- Test: `tests/legal-onboarding-client.test.js`, `tests/legal-onboarding-database.test.js`, `tests/privacy-welcome.test.js`, `tests/live-navigation.test.js`, `tests/ops-phase-a-inventory.test.js`; `tsconfig.json` per la copertura dei moduli.
- Questo report e `docs/evidence/m1-onboarding-local/verification.json`.

I tre percorsi non tracciati dell'audit precedente sono preesistenti, preservati e non inclusi nel commit. Il commit M1 è riportato nella consegna finale; nessun push richiesto o eseguito, nessun merge su main.
