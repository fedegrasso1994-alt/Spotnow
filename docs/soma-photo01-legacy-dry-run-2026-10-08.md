# Soma — dry-run normalizzazione legacy, 2026-10-08

**Raccomandazione: NO-GO alla normalizzazione reale con la procedura attuale.** PHOTO-01 resta chiusa lato sicurezza e produzione, come approvato dal founder. Questo esito riguarda esclusivamente la preparazione della normalizzazione legacy.

## Perimetro e metodo

Inventario read-only di profili, snapshot legacy, registry, asset, job e tutti gli oggetti del bucket privato. Sono state controllate le 10 foto correnti e, separatamente, due originali non referenziati. Formato reale e header sono stati letti dai byte, non da estensione/MIME; il parser PHOTO-01 ha verificato il contratto. Le 9 immagini ammissibili sono state processate sequenzialmente dai normalizer JPEG/PNG/WebP già presenti in produzione, che lavorano in memoria e non hanno codice di scrittura Storage o pubblicazione. Il client ha verificato canonicale, thumbnail e preview restituite, poi scartato i byte. Nessun file immagine è stato salvato localmente o in Storage. Non è stato invocato il percorso `photo-assets` di normalizzazione, né alcuna RPC di job/pubblicazione. Nessun deploy, migration, account di test o nuovo provider.

Il confronto completo dell’inventario prima/dopo è identico, inclusi fingerprint di profili, Storage e tabelle foto. Zero foto sostituite o cancellate, zero nuovi oggetti o record. Diagnostica limitata a metadati strutturali e categorie; valori EXIF/GPS, fotografie, credenziali e identificativi utenti non compaiono nel report condivisibile. Il lookup operativo dei codici Lxxx è riservato in `.local/photo01-legacy-dry-run/private-lookup.json`, fuori dai file di release e da Git.

## A–G. Riepilogo

| Voce | Esito |
|---|---:|
| A. Foto legacy attualmente referenziate | 10 |
| B. Compatibili con il contratto input PHOTO-01 | 7 |
| C. Decode e canonicale possibili tecnicamente | 7 |
| C. Ammesse anche dalla policy account, oggi | 2 |
| D. Rifiutate dal contratto immagine | 3 |
| Account esclusi dalla procedura corrente | 5 anonimi |
| Foto già simili alla forma canonicale | 1 |
| Foto correnti già attestate nel nuovo registry | 0 |
| Originali aggiuntivi non referenziati | 2 |
| Oggetti Storage complessivi | 22 |

B e C tecnici si sovrappongono: le 7 immagini ammissibili hanno anche superato il decode e l’encoding reali. Non sono 14 immagini. Una sola ha già forma JPEG8, lato <=1600, orientamento 1 e solo APP0/JFIF; questo non equivale a una validazione server PHOTO-01 già registrata. Dei 7 file validi, 5 appartengono ad account anonimi e non sono pubblicabili tramite `begin_photo_upload`: nessun allargamento della policy è proposto o effettuato. I cinque account ammessi hanno due immagini normalizzabili e tre rifiutate. Nessun account corrente risulta in cancellazione o sospeso.

### E. Rifiuti

Tre JPEG contengono un marker MPF/multipicture: il parser PHOTO-01 risponde `ANIMATED / 422`. MPF è prova di una struttura multipicture/ausiliaria, **non prova di animazione temporale**: l’etichetta applicativa non va interpretata come un video osservato. Due di queste immagini hanno inoltre 24.470.208 pixel, sopra i 12 MP; la terza ha 7.151.808 pixel ma resta incompatibile per MPF. Le categorie si sovrappongono: 3 MPF, di cui 2 anche sopra il limite pixel. Nessun rifiuto per >8 MiB, lato >8192, PNG16 o corruzione è emerso nel campione. I file rifiutati non sono stati inviati al decoder; il loro decode non è stato tentato fuori contratto. Servono nuove foto statiche conformi, oppure una futura decisione tecnica esplicita; non si possono semplicemente ignorare i marker o aumentare i limiti.

### F. Coerenza e orfani

Tutte le 10 foto correnti hanno l’oggetto originale. Nessuna variante dichiarata è mancante; nessun asset DB stale, nessun oggetto senza account proprietario. Dei 22 oggetti, 10 sono originali correnti, 10 varianti referenziate e 2 originali non raggiungibili dai profili/asset correnti. Questi ultimi sono orfani rispetto ai riferimenti correnti, pur avendo un proprietario Auth valido. Entrambi sono tecnicamente normalizzabili, ma non devono essere trasformati/pubblicati automaticamente: manca un profilo corrente da aggiornare. Nessun cleanup o retention è stato implementato.

### G. Rischi prima del lavoro reale

- Tre foto correnti non ammissibili, tutte su account ammessi: conservarle e gestire una sostituzione conforme, senza bloccare il resto del manifest.
- Cinque profili anonimi esclusi dal percorso server: il dry-run non autorizza una conversione dell’account o una modifica delle regole.
- Snapshot soggetto a cambiamenti successivi: il lavoro reale deve rileggere path, hash, disponibilità e stato account prima di ogni operazione e usare CAS.
- EXIF/ICC/XMP e altri marker sono presenti su 7 delle 10 foto correnti, escludendo APP0 tecnico. Le canonicali ottenute conservano solo APP0/JFIF, senza copiare EXIF/ICC/GPS/commenti; i valori dei metadata originali non sono stati estratti o salvati.
- Nessuna gestione colore ICC: una conversione da wide gamut può cambiare i colori. EXIF JPEG viene applicato; nessuna promessa aggiuntiva su orientamento PNG/WebP.
- Risultati di runtime sono di questa esecuzione: deadline/admission e pressione memoria possono produrre rifiuti sicuri in un tentativo successivo. Tempi riportati sono wall time HTTP, non CPU. Nessun OOM o errore dei worker è emerso nei 9 decode eseguiti.

## Dettaglio per immagine

Codici anonimi; dimensioni ottenute dai byte. JPEG indica tre componenti a 8 bit ammesse dal contratto; WebP usa output decoder RGBA a 8 bit, non prova di alpha sorgente. MPF non significa animazione temporale verificata. APP0/JFIF è un marker tecnico.

| Codice | Corrente / account ammesso | Formato, bit/canali | Byte | Pixel | Marker metadata | Esito | Canonicale in memoria |
|---|---|---|---:|---|---|---|---|
| L001 | sì / no | PNG, 8 bit / 3 | 1676 | 200×200 | nessuno rilevato | PASS | 200×200; 5510 B |
| L002 | sì / no | JPEG, 8 bit / 3 | 73194 | 738×1600 | APP0 | PASS | 738×1600; 119598 B |
| L003 | sì / sì | JPEG, 8 bit / 3 | 3744352 | 4284×5712 | APP0, EXIF, MPF, APP2, ICC, APP10 | ANIMATED + >12 MP | non tentata: rifiuto pre-decode |
| L004 | sì / no | PNG, 8 bit / 3 | 1727 | 200×200 | nessuno rilevato | PASS | 200×200; 5580 B |
| L005 | sì / sì | JPEG, 8 bit / 3 | 333658 | 1342×1790 | APP0, EXIF, APP13 | PASS | 1200×1600; 295796 B |
| L006 | sì / sì | WebP, 8 bit / RGBA decode | 30784 | 576×1024 | ICCP | PASS | 576×1024; 73863 B |
| L007 | sì / sì | JPEG, 8 bit / 3 | 4292863 | 5712×4284 | APP0, EXIF, XMP, MPF, APP2, ICC, APP10 | ANIMATED + >12 MP | non tentata: rifiuto pre-decode |
| L008 | sì / sì | JPEG, 8 bit / 3 | 1820708 | 2316×3088 | APP0, EXIF, XMP, MPF, APP2, ICC, APP10 | ANIMATED | non tentata: rifiuto pre-decode |
| L009 | sì / no | JPEG, 8 bit / 3 | 740253 | 1376×768 | APP0, APP11 | PASS | 1376×768; 256089 B |
| L010 | sì / no | JPEG, 8 bit / 3 | 327242 | 1365×768 | APP0, ICC | PASS | 1365×768; 93342 B |
| L011 | no / no | JPEG, 8 bit / 3 | 706438 | 3264×1836 | APP0, EXIF, ICC | PASS | 900×1600; 173641 B |
| L012 | no / no | PNG, 8 bit / 4 | 441773 | 800×800 | pHYs, iTXt | PASS | 800×800; 77060 B |

Le PNG sono tutte statiche, 8 bit, non interlacciate; il WebP non ha flag/chunk animati. Per i JPEG senza MPF non sono stati trovati segnali multipicture ammessi dal parser. L003/L007/L008 contengono MPF. Tutti i file sono sotto 8 MiB e tutti i lati sono sotto 8192. Canonicale/detail JPEG <=1600, thumbnail <=480 e preview <=120 hanno passato i controlli di formato, byte massimi e dimensioni. Le varianti sono state soltanto generate in memoria.

## Verifica della procedura futura

| Requisito | Procedura attuale |
|---|---|
| Foto precedente fino alla canonicale pronta | Sì: validazione e tre upload precedono la pubblicazione |
| Pubblicazione senza sovrascrivere una foto scelta nel frattempo | Sì: compare-and-swap del vecchio path |
| Retry ready idempotente | Sì: nonce/hash e risultato registrato |
| Retry dopo fallimento | Limitato: lease 45 s, max 3 tentativi; nuovo path a ogni lease |
| Nessun file parziale | **Non garantito**: le tre scritture non sono transazionali; due possono riuscire e una fallire |
| Nessun output non referenziato | **Non garantito**: fallimento successivo agli upload o CAS perso lascia output privato |
| Rimozione originali non necessari | **No**: il percorso conserva originale e vecchie varianti dopo successo |
| Batch riprendibile che salta i fallimenti | Non presente: `pending_photo_normalization` seleziona il primo; un caso rifiutato può bloccare il batch |
| Arresto sicuro | Il path precedente rimane valido; gate oggi OFF. Manca però una riconciliazione degli output già scritti |
| Delete account | Barrier/lease e cascade presenti; non nuova race testata con foto reali |

Un test locale con failure injection dimostra due upload riusciti e uno fallito: nessuna finalizzazione/pubblicazione, ma due oggetti privati rimangono. Il server preserva il riferimento precedente; ciò non soddisfa la richiesta più forte di zero residui. I test DB esistenti verificano CAS, idempotenza ready, lease, protezione del vecchio riferimento e cascade. Non è stata simulata una cancellazione o un match/chat su account reali; i flussi social restano intatti perché il dry-run non li modifica.

Per una futura esecuzione serve un manifest durevole con esito per elemento, esclusioni esplicite, cursor/resume e stop; cleanup/riconciliazione dei soli output del singolo job fallito o non pubblicato; verifica di checksum e completezza prima del CAS; gestione controllata degli originali sostituiti e delle loro varianti. La rimozione richiede una finestra/condizione esplicita che tenga conto dei client con path già caricati e delle signed URL correnti (30 s), senza lasciare originali indefinitamente. Nessuna di queste operazioni viene implementata o autorizzata da questo report; non si tratta di avviare il cleanup globale PHOTO-02.

La modifica reale del path mantiene UID, membership, Spot, match e chat. I lettori supportano canonical/detail/thumb; vanno però testati in staging cambio path, polling, cache, CAS concorrente, stop/resume e delete account contemporaneo prima del batch reale. Non garantire continuità delle foto ai vecchi client se si eliminano subito gli oggetti ancora referenziati in cache.

## Decisione e verifica finale

**NO-GO** alla normalizzazione reale con la procedura attuale, anche limitata ai due account pronti: mancano garanzie richieste su residui e originali, ed esistono fallimenti da gestire senza bloccare il manifest. GO soltanto alla preparazione e verifica separata di una procedura controllata, previa autorizzazione del founder; il gate resta `normalizeLegacy:false`. Nessuna riapertura di PHOTO-01 lato sicurezza e nessun avvio di PHOTO-02.

Suite **188/188 PASS**, build PASS, typecheck PASS. Il nuovo test è soltanto una failure injection locale sul percorso comune degli upload; nessun file runtime è stato modificato. I file diagnostici eseguibili/SQL e le credenziali temporanee vengono rimossi al termine; restano report/evidenze e lookup riservato, senza bytes delle immagini.
