# PHOTO-02 — attribuzione residui staging, 9 ottobre 2026

**Tutti e quattro i residui hanno origine sintetica di test confermata. Il singolo oggetto O1 è candidato a cleanup; i tre writer W1–W3 restano in review operativa prima del purge.** Origine di test e certezza di chiusura della scrittura sono due prove diverse.

Task esclusivamente read-only su Soma Staging `zjinjtkekmaqtxsuyvho`. Nessuna cancellazione, riconciliazione o modifica DB/Storage/Auth, migration, runtime o produzione. Scheduler già in pausa, lasciato in pausa. Le etichette di classificazione sono in questo report: non sono stati modificati gli stati nel ledger.

Evidence aggregata: `soma-photo02-residue-attribution-2026-10-09.json`. Mapping esatto dei quattro target e snapshot privati in `.local/photo02-residue-review/`; nessuna email/password/JWT/foto pubblicata. I case ID sono associati ai target nello snapshot, non ricavati dal solo nome del file.

## Correlazioni verificabili

1. **Identità:** il proprietario di tutti i quattro target coincide esattamente con l'UUID dell'account `preprofile` nel manifest iniziale `/private/tmp/soma-staging-accounts.json`. Lo script che ha creato quel manifest, `/private/tmp/soma-staging-baseline.mjs`, verifica esplicitamente il progetto staging e crea account/immagini sintetici. Auth conferma `synthetic:true` e `purpose: PHOTO-01 staging only`. Non sono presenti corrispondenze con gli UUID dei dieci account di amici cancellati in produzione; non si è usata quella precedente autorizzazione come motivo di cancellazione.
2. **Tempi:** account creato il6 ottobre2026 alle21:40:55 CEST; oggetto O1 creato alle21:40:55,907 CEST, nella stessa preparazione del fixture. I lease dei tre job scadono il7 ottobre rispettivamente alle17:50:33,490 /17:51:52,062 /17:54:34,210 CEST. Questo è il timestamp del lease, non un log che dimostra la fine dell'upload. Il timestamp del ledger PHOTO-02 è invece il bootstrap017 del giorno successivo: non è stato trattato come orario dell'upload storico.
3. **Byte dei job:** tutti i tre `input_sha` coincidono con `pathological.png` del corpus bounded-memory; l'hash è stato ricalcolato dal file locale, non solo letto nel manifest. File326207byte, SHA256 `8b4fb619b3dbc70de2cb138d7e592f8f76f900de75815118a210ce8121255341`, header PNG1×1 RGB8, espansione del payload incoerente.
4. **Scenari storici:** `photo01-e2e-stage.mjs` usa proprio `preprofile` e invia questa fixture, verificando HTTP422 INVALID e conservazione della foto corrente. I risultati storici registrano tale esito. Le tre specifiche request UUID non compaiono però negli artefatti storici recuperati: il risultato422 è correlazione di scenario/coorte, non prova individuale che tutti i tre writer siano terminati.
5. **Originale O1:** path completo uguale al path salvato nel manifest iniziale per `preprofile`. Download effettuato read-only via API Storage staging, senza conservare foto:53129byte, SHA256 `58afc1beaf131da9709abe3eee0aef9bd1f2a1b933783f9ab11e70f6d277d23e`, identico byte per byte a `/private/tmp/soma-photo01-preflight/normal.jpg`. Lo script iniziale aveva caricato quell'originale senza creare il profilo per `preprofile`; le successive prove hanno pubblicato altri path validati. È una correlazione esatta di identità, path e contenuto, non una supposizione basata sul nome.
6. **Stato attuale:** ogni writer è PRE017, writer unknown, manifest assente, ledger failed; job W1/W2 processing, W3 failed. Nessuno dei tre ha oggetti canonical/detail/thumb attualmente presenti, né un riferimento corrente/legacy. O1 ha un solo oggetto presente e zero riferimenti da profili, assets, validated_photos, photo_legacy, job (incluso legacy_path), ledger e manifest. L'account proprietario ha ancora un profilo corrente: non va cancellato per eliminare questi residui.
7. **Riproduzione locale:** il processore PNG PHOTO-01 corrente respinge il file con INVALID prima dell'encoding, encoderCalls0. È una conferma della natura patologica della fixture; non sostituisce un log terminale delle richieste storiche.

## Classificazione

| Caso | Origine | Disposizione operativa | Cleanup proposto |
|---|---|---|---|
| W1 | CONFIRMED_SYNTHETIC_TEST | REVIEW_UNRESOLVED_WRITER | Riconciliazione con prova individuale, poi purge del solo tentativo |
| W2 | CONFIRMED_SYNTHETIC_TEST | REVIEW_UNRESOLVED_WRITER | Come W1 |
| W3 | CONFIRMED_SYNTHETIC_TEST | REVIEW_UNRESOLVED_WRITER | Come W1: status failed da solo non certifica gli effetti Storage |
| O1 | CONFIRMED_SYNTHETIC_TEST | CLEANUP_CANDIDATE_AFTER_RECHECK | Rimozione del singolo oggetto esatto via Storage API |

Non si modifica retroattivamente il marker PRE017 in INTENT_PROTOCOL_V1: quei writer non avevano la nuova barriera intent e non possono usare NO_WRITE_INTENT_FENCED solo perché oggi non c'è un manifest. Non si usa né l'età né l'assenza degli oggetti per dichiararli settled.

## Cleanup sicuro proposto, NON eseguito

**O1: pronto per una successiva esecuzione autorizzata.** Pin del target da manifest privato; immediatamente prima dell'eliminazione ricontrollare tutti i riferimenti, path corrente del proprietario, dimensione/hash e assenza di una scrittura che rivendichi quel path. Se emerge un cambiamento, fermare il singolo target e mantenerlo review. Eliminare soltanto quel path con Storage API, senza wildcard o cancellazione folder. Verificare Storage.info assente, catalogo assente, foto corrente invariata e accessibile. La rimozione non richiede la cancellazione dell'account o dei dati social né una nuova migration. Conservare evidence tecnica minima del cleanup, senza foto o segreti.

**W1–W3: origine risolta, purge ancora bloccato.** Cercare eventuale evidenza server/diagnostica correlata alle esatte request/lease che dimostri risposta terminale o mancata dispatch di ogni possibile scrittura. Anche una prova verificabile del codice storico effettivamente deployato e del gate attraversato deve coprire tutte le possibili scritture di ogni tentativo: non basta riprodurre il decoder di oggi. Se la prova non è recuperabile, preservare i record unknown e la relativa prenotazione, trattandoli review. Non cancellare ledger/job per far sparire il contatore.

Solo dopo tale riconciliazione esplicita, eseguire il normale ciclo claim → verifica riferimenti → Storage removal dei tre path esatti → controllo assenza → finish; preservare il profilo corrente, gli altri tentativi e ogni dato social. Rileggere stato/lease/request/hash prima di ogni azione e interrompere se diversi dallo snapshot. Non invocare TERMINAL_STORAGE_RESPONSES_CONFIRMED sulla base della sola attribuzione a un account di test.

**Nessun cleanup di account proposto. Nessun rollout produzione autorizzato o effettuato.** La vecchia dicitura "oggetto non attribuito" può essere aggiornata a "originale sintetico attribuito, in attesa di cleanup"; i tre writer rimangono una review operativa, pur avendo provenienza di test accertata.

## Verifiche

Task documentale/read-only; nessun nuovo test di runtime necessario. Suite esistente213/213, build e typecheck: risultati registrati dopo l'esecuzione del task. Nessuna modifica al comportamento PHOTO-01/PHOTO-02.
