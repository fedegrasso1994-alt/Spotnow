# PHOTO-02 — chiusura controllata dei residui staging

Data: 9 ottobre 2026, Europe/Rome. Progetto esclusivo: `zjinjtkekmaqtxsuyvho` (Soma Staging). Produzione, decoder/limiti PHOTO-01 e UX invariati. Nessun rollout produzione.

## A. Oggetto O1

Eliminato esclusivamente l'originale sintetico PHOTO-01 di 53.129 byte. SHA-256 uguale alla fixture locale verificata. Prima della rimozione: zero riferimenti in profili, assets, validated, legacy, job e ledger/manifest; non pubblicabile; path diverso dalla foto corrente. Snapshot ripetuto immediatamente prima del singolo `Storage.remove([path])`.

Dopo: oggetto assente da API Storage e catalogo; zero riferimenti; fingerprint completi Auth e profilo invariati; path e SHA della foto corrente invariati. La lista della cartella owner differisce esattamente di O1. Nessuna modifica al profilo/account `preprofile`. Audit `ORPHAN_REMOVED` ripetuto due volte con la stessa operation UUID: una sola riga.

## B. W1–W3

Tutti e tre: `state=review`, `writer=unknown`, motivo `LEGACY_SYNTHETIC_RESIDUE`, riferimento alla prova di attribuzione, operatore e data di ingresso. Nessuna prova terminale inventata, nessun marker di protocollo backfill, nessun purge.

Eccezione quota riservata ai residui PRE017 sintetici verificati, senza manifest/oggetti e massimo tre per owner. Storico prenotazioni preservato nel ledger; quota addebitata 0 byte, oggetti presenti 0. Nuovi writer incerti non godono dell'eccezione e rimangono conteggiati. Eventuali effetti tardivi si vedono in diagnostica e vengono conteggiati al successivo upload: richiedono review manuale.

Diagnostica service-only: motivo, età record/review, ultimo tentativo, contatori, oggetti, prenotazione e quota addebitata, operatore/evidenza/ultimo evento manuale. Il collector registra il totale aggregato senza identificativi utenti.

## C. Scheduler, upload e operazioni manuali

- Collector Edge aggiornato soltanto nello staging, da source già versionata (`0eacc6580be0b50b8d95ad07fd7629ed3466a331`). Migration 018 applicata nello staging con transazione riuscita.
- Dry-run: 3 review nella diagnostica, nessuna nella coda automatica.
- Due invocazioni HTTP reali successive: review_total=3, pending=0, failed=0, completed=0, reconciled=0; missing=0, untracked=0. Ultimi tentativi/retry dei tre writer invariati; `claim_photo_cleanup` restituisce null; RPC ordinaria di riconciliazione rifiuta PHOTO_REVIEW.
- Scheduler staging lasciato sospeso. Non è stato riattivato il cron in questo task; è stato collaudato direttamente il medesimo collector via HTTP, senza esecuzioni automatiche su dati estranei al task.
- Normali due upload JPEG concorrenti su account sintetico temporaneo: entrambi riusciti, con retry bounded in caso di BUSY; sei oggetti canonici/varianti verificati. Cancellazione account completa e doppio cleanup idempotente: nessun account/oggetto residuo della fixture. Una prima prova interrotta per BUSY è stata recuperata e la sua fixture eliminata anch'essa.
- L'owner storico aveva già raggiunto il normale limite dei draft. L'admission per quel medesimo owner è stata verificata in una transazione esclusiva: liberazione solo transazionale degli slot ready, due admission sequenziali riuscite, rollback di ogni modifica. I draft originali non sono stati cancellati o cambiati permanentemente.
- Risoluzione manuale di un writer NUOVO creato nella medesima transazione, mai inviato a Storage: fencing del lease e marker reale del protocollo; NO_WRITE_INTENT_FENCED verificato; stesso operation UUID ripetuto, un solo audit RESOLVE. Rollback finale. W1–W3 non sono stati risolti.

Le risposte PHOTO_DRAFTS e PHOTO_BUSY osservate nelle prime prove derivavano dai limiti ordinari già previsti: due draft e un solo processing per owner/isolate. Non sono state aggirate o modificate. I test finali distinguono questi limiti dalla quarantena dei residui.

## D. Test finali

223/223 automatici passati; build PASS; typecheck PASS. Dieci nuovi test PHOTO-02 review/orphan: esclusione quota limitata, abuso nuovi writer, cap tre residui, effetti tardivi, assenza/età insufficienti, protezione account deletion, escalation dopo dieci verifiche e non età, lease attivo, idempotenza/audit/conflitto/evidenza, privilegi, collector, guardia orphan, fingerprint invariati e retention degli audit conclusi. Le fixture Postgres Storage dei test sono aggiornate alle colonne reali metadata/created_at/updated_at. I test esistenti di Profilo/Ora/Tribe/Spot/match/chat/delete account rimangono nella suite; non è stato ripetuto un intero collaudo social manuale in questo task.

Prova finale Postgres: 3 review/3 unknown, quota review 0, candidati automatici review 0, 3 audit HOLD e 1 ORPHAN_REMOVED, oggetto assente, account/profilo preservati. Risultati aggregati nella JSON omonima; journal privato e mapping identificativi esclusi da GitHub.

## E. Rischi residui e arresto sicuro

- L'origine sintetica non prova la terminazione dei writer: effetti tardivi rimangono possibili. Nessun purge dei tre; review monitorabile e audit conservato mentre aperta.
- Il loro owner storico NON può completare automaticamente delete account finché la barriera unknown non viene risolta con prova terminale. È una protezione deliberata e localizzata alla fixture, non un blocco dell'upload dovuto alla quota review.
- La risoluzione manuale è un'operazione service-only: l'operatore fidato verifica e attesta prove esterne; il DB non autentica individualmente l'etichetta operatore né può provare ogni ricevuta esterna. Non usare una ricevuta inventata per chiudere review.
- L'eccezione legacy non garantisce un hard cap istantaneo contro eventuali scritture storiche già avviate: i loro bytes sono conteggiati nella successiva admission. Nessuna esenzione generale per nuovi writer.
- Rollback operativo: scheduler sospeso, schema/ledger/audit 018 conservati. Non ripristinare un collector 017 che riprenda i retry delle review. Nessun downgrade distruttivo delle evidenze.

## F. Raccomandazione

**GO tecnico al rollout controllato di PHOTO-02**, con preflight produzione indipendente e deployment coerente di 017 + 018 + collector. I residui staging non richiedono purge né risoluzione fittizia per procedere. La review è una quarantena operativa, non una dichiarazione di writer terminato. Nessuna produzione modificata; eventuali account reali con writer incerti mantengono prenotazione e richiedono il normale processo di riconciliazione. Prima del rollout non copiare l'eccezione sintetica agli account reali.

Policy definitiva: [soma-photo02-review-policy-2026-10-09.md](soma-photo02-review-policy-2026-10-09.md). Migration: `supabase/migrations/018_photo_review.sql`. Script staging ripetibile: `scripts/photo02-staging-review-close.mjs`, con target privati fissati e guardie del progetto.
