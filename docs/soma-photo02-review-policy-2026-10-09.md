# PHOTO-02 — policy di riconciliazione e review

Ambito: staging; migration 018 additive alle dipendenze 016–017. Nessuna modifica ai decoder o ai limiti PHOTO-01, alla UI o alla produzione.

## Stati e prove

- Pending: riconciliazione automatica solo con tutti gli effetti immutabili verificati (manifest, bytes, SHA), oppure protocollo di intent assente esplicitamente fenced. L'età e l'assenza di oggetti non dimostrano la terminazione di un writer storico.
- Dopo dieci verifiche incomplete effettive, senza lease processing attiva, lo stato passa a `review`; il passaggio non dipende dalla sola età.
- Review: esclusa dall'inventario automatico, dalla riconciliazione ordinaria e dal purge. Nessun incremento continuo dei tentativi. Lo stato `writer=unknown` viene preservato.
- Risoluzione manuale: RPC service-only `photo_review_resolve`, lease attesa, operation UUID idempotente, codice di evidenza terminale, riferimento alla prova verificata e operatore. Conflitti di replay sono rifiutati. Il riferimento alla prova è un'attestazione dell'operatore fidato, non una verifica automatica dei log terminali né un'identità umana certificata dal database. Nessuna prova terminale è stata ricostruita per W1–W3: non risolverli sulla base della loro origine sintetica.
- Audit privato: HOLD/RESOLVE/ORPHAN_REMOVED. Conservazione delle review aperte senza scadenza automatica; eventi conclusi eliminabili dopo sette giorni secondo la policy tecnica esistente.

## Quota e continuità

I writer incerti nuovi, anche in review, mantengono la prenotazione: non si può accumulare Storage gratuito tramite timeout. Solo i tre residui PRE017 storici attribuiti indipendentemente a fixture sintetiche possono usare l'eccezione `review_quota_exempt`: metadata Auth sintetici verificati, nessun manifest/oggetto/reference valido, massimo tre per owner, autorizzazione service-only e audit. Le prenotazioni storiche rimangono nel ledger ma non sono addebitate. Eventuali scritture tardive sono visibili nella diagnostica e conteggiate come bytes reali al successivo upload; richiedono review, mai purge automatico. Questo non prova che il writer abbia terminato.

Le nuove richieste con nonce nuovo procedono normalmente nei limiti 128 MiB/due draft. Il riuso del nonce storico restituisce PHOTO_EXPIRED; il normale flusso client di rinnovo una tantum è invariato. Le tre review unknown continuano deliberatamente a impedire il completamento automatico di delete account per l'owner storico: occorrono prove terminali, non un timeout.

## Operazioni

1. Inventario operativo service-only `photo_review_inventory`: motivo, età del record e della review, ultimo tentativo, conteggio tentativi, prenotazione, quota addebitata, oggetti presenti, operatore e riferimento prova. Il collector riporta `review_total` nei suoi log aggregati; dry-run include l'inventario diagnostico separato. Nessun dato di review è accessibile ai client utenti.
2. HOLD con path e lease fissati, UUID univoco e evidenza verificata. Ripetere la stessa operazione è sicuro. Non retrodatare marker INTENT_PROTOCOL_V1 dei tentativi PRE017.
3. RESOLVE solo dopo verifica indipendente di tutte le risposte Storage terminali, oppure di tutti gli effetti immutabili. Per NO_WRITE_INTENT_FENCED serve il protocollo di intent effettivamente registrato. Un nome di evidenza basato su age/timeout/absence è rifiutato, ma l'operatore rimane responsabile della veridicità delle prove.
4. Oggetto orfano attribuito a fixture: controllare `photo_orphan_candidate` immediatamente prima della rimozione, references=0, publishable=false, hash della fixture esatto; rimuovere solo quel path tramite API Storage. Ricontrollare assenza, fingerprint profilo/account e foto corrente invariati; registrare `photo_orphan_removed`. Non usare SQL DELETE su storage.objects.
5. Se una review mostra nuovi oggetti, non cancellarli automaticamente: verificare manifest, hash, lease, job, riferimenti e ricevute, poi decisione manuale auditabile.

## Rollback operativo

Prima azione: sospendere scheduler. Migration 018 additive e ledger review vanno conservati. Non ripristinare un collector/schema 017 che rimetta queste review nel giro automatico e non cancellare audit. Per fermare il lavoro basta mantenere scheduler sospeso; upload normali rimangono disponibili. Un downgrade distruttivo della migration non è un rollback sicuro delle evidenze. Il rollout produzione richiede un proprio preflight: l'eccezione sintetica non è applicabile agli account reali.
