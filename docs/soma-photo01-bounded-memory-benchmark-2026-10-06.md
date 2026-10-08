# PHOTO-01 — bounded-memory: analisi e benchmark staging

Data: 2026-10-06. Decisione: **B — YES, BUT: restare su Supabase Edge è praticabile solo con limiti/formati più stretti e decoder con allocazioni limitate.** Non è approvata l'implementazione della pipeline. Non è approvato mantenere insieme 8 MiB, 8192×8192 e 24 MP per ogni formato.

## Perimetro ed evidenze

Solo progetto staging `zjinjtkekmaqtxsuyvho`. Produzione `qlucwdjcjomwyziegxrn` non interrogata né modificata. Lettura di AGENTS.md, audit privacy/security e preflight precedente prima delle prove. Nessun account/foto reale, nuovo provider, acquisto o upgrade.

Aggiunta esclusivamente la sonda staging `photo01-bounded-bench`, con controllo del project URL, JWT e account sintetico. Non scrive Storage, profili o DB. `photo-assets`, `delete-account`, schema, migrations 001–015, RLS, API foto dell'app, frontend e UI invariati. Nessuna migration. Le tre revisioni della sonda sono codice di laboratorio; non moduli della pipeline dell'app. PHOTO-02 non affrontato.

109 richieste sintetiche: 96 confronti/esplorazioni e 13 ripetizioni (9 sequenziali e 4 concorrenti). Le 13 ripetizioni del candidato passano. Non costituiscono un load test del pilot né provano il riuso del medesimo isolate: il runtime può creare un worker per richiesta. Le fixture rumorose sono generate con seed fisso; nessuna foto reale. Un file PNG volutamente patologico ha IHDR 1×1 RGB8 e CRC corretti, ma IDAT si espande a 320 MiB anziché 4 byte: non è una PNG valida, è un test avversariale.

Risposte, trace, dimensioni e SHA-256 delle fixture sono in `soma-photo01-bounded-memory-evidence-2026-10-06.json`, senza credenziali, token o identificatori di account. Prototipo e generatori sono in `/tmp/soma-bounded-*`: artefatti di benchmark temporanei, non distribuiti all'app.

## A. Causa tecnica dell'OOM

La PNG critica è valida, 6000×4000, RGB16, esattamente 8.388.608 byte. File compresso e frame decodificato hanno dimensioni indipendenti. Il raster RGB16 occupa 144.000.000 byte e le scanline filtrate 144.004.000 byte.

`fast-png@6.2.0` usa `pako@2.2.0`: l'onData predefinito conserva tutte le parti decompresse; onEnd le concatena in un altro buffer intero. Poi fast-png alloca il raster per unfilter; il wrapper dell'app alloca inoltre RGBA8. Il primo raddoppio richiede circa 288 MB solo per inflate+concatenazione, prima di raster, input, WASM e heap.

La strumentazione riproduce il fallimento **dentro onEnd/flattenChunks**, dopo 144.004.000 byte decompressi in 2.198 chunk: trace `baseline-before-flatten` a 312 ms, errore `Array buffer allocation failed` a 324 ms. Il controllo dei pixel dopo la decodifica non può evitare questa allocazione.

Nel preflight precedente una PNG24MP8 era passata; nel confronto strumentato attuale fallisce. Garbage collection, copie transitorie e strumentazione possono cambiare il margine: quel PASS precedente non rende il limite affidabile. Anche PNG24MP8, WebP24MP e la decompression bomb terminano il worker originale con HTTP 546. I sei HTTP 546 di questo confronto sono accompagnati dai log staging `Memory limit exceeded`: non sono stati chiamati OOM solo sulla base del codice 546.

## B. Memoria e tempi osservati

Il runtime restituisce `rss: 0`. Disponibili campioni `heapTotal`, `heapUsed`, `external` nei punti di allocazione; non un profiler continuo. La metrica riportata è **massimo campionato heapTotal+external**, non RSS né picco RAM completo. I 256 MB e 2 secondi CPU sono limiti del runtime; elapsed_ms misura tempo di parete, non CPU fatturata. Il controllo PNG a 1.300 ms è un budget cooperativo sul decode, non un limite CPU OS.

PNG critica originale: prima dell'allocazione fallita heapTotal 15.851.520 + external 163.983.995 = **171,50 MiB campionati**. Quella misura non include il nuovo buffer di 144 MB che non è stato allocato. Non si può dichiarare un picco RSS esatto. Il decode non completa.

PNG critica streaming: una prova viene rifiutata dal budget decode a 1.524 ms complessivi; altre due completano in 1.180–1.190 ms, decode 797–798 ms, circa 88,27 MiB campionati. È dunque possibile evitare l'OOM ma **non sostenere affidabilmente 24MP16** con questa implementazione e questo budget.

| Input candidato che completa | Massimo campionato incluse ripetizioni | Tempo totale server osservato |
|---|---:|---:|
| JPEG ≤12 MP RGB8, anche progressive/rumore/input 8 MiB | 166,35 MiB | 463–1.147 ms |
| PNG ≤12 MP 8-bit, RGB/RGBA, anche rumore/input 8 MiB | 105,84 MiB | 400–1.497 ms |
| WebP ≤6 MP, lossy/lossless | 160,00 MiB | 398–782 ms |

Decode PNG12RGB nella prova capped: 298 ms, ridimensionamento/tre encoding successivi 336 ms. Per JPEG/WebP i tempi decode isolati non sono stati strumentati: il totale include lettura del body, compilazione/init eventualmente freddi, decode e tre JPEG encoding. La rete dal client è registrata separatamente nei dati e non va usata come tempo decode.

WebP12MP lossless senza cap: fino a 213,20 MiB campionati; JPEG24MP progressive fino a circa 209 MiB. Un PASS vicino al limite non è un limite di produzione approvabile.

## C. Metadata prima del decode

| Formato | Dati leggibili senza decodificare i pixel | Limiti della prova |
|---|---|---|
| PNG | firma, IHDR width/height, depth, color type/canali, compression/filter/interlace; acTL e chunk APNG; numero byte/chunk; pixel totali; CRC e struttura chunk | Parser completo dei chunk, niente inflate dei metadata. Solo coding statico non interlacciato supportato nel prototipo. |
| JPEG | firma SOI, lunghezze segmenti, SOF0/1/2 con width/height/precision/components, progressive | Il primo SOF non dimostra assenza di MPO/multiple immagini o la validità dell'intero flusso. Il parser di produzione deve verificare struttura/duplicati/scan e rifiutare container multipicture. |
| WebP | RIFF/WEBP e size, VP8/VP8L/VP8X dims, flag alpha/lossless, animazione ANIM/ANMF | L'animazione viene rifiutata senza contare/decodificare frame. In produzione obbligatori ordine e unicità dei chunk immagine, non solo firma. |

Header plausibile non significa payload valido. I controlli devono usare offset/length con bounds check, aritmetica non overflow, rifiutare dimensioni nulle/oversize prima dell'allocazione e verificare dimensioni effettive restituite dal decoder. Non fidarsi di MIME, filename o Content-Length da soli.

Rifiuti proposti: >8 MiB, lato >8192, pixel sopra il limite del formato, precision/color coding non autorizzati, immagini animate, container o chunk duplicati/contraddittori, PNG interlacciate/indexed/sub8/16bit nel primo perimetro, formato diverso dalla allowlist, struttura o CRC invalida. Limitare scans JPEG e segmenti/chunk; la sonda PNG/WebP usa 4096 chunk. In caso di PNG, numero esatto atteso di byte decompressi `(stride+1)*height`, filtri 0–4, zlib completo e assenza di payload compresso residuo.

iCCP/zTXt/iTXt non devono essere decompressi dal normalizzatore. La semplice dimensione compressa del metadata non ne limita l'espansione. Test aggiuntivo: un iCCP di circa 40 KiB che espande a 40 MiB viene ignorato dallo streaming (foto PASS) o rifiutato prima del decoder corrente. Un metadata compresso >64 KiB viene rifiutato dalla sonda. Il vecchio decoder alimentato con metadata non sanitizzati rimane rischioso.

## D. Confronto opzioni

| Opzione | OOM / formati | Complessità e deployment Edge | Provider e costo | Onboarding |
|---|---|---|---|---|
| A. Decoder attuale, limiti più stretti | Riduce carico per JPEG/PNG/WebP, ma header piccolo + espansione patologica resta OOM. Nessun budget di decompressione né cap WASM originale. | Bassa; già deployabile. **Insufficiente da sola.** | Nessun provider; meno compute, costi attuali. | Più rifiuti, senza risolvere il payload avversariale. |
| B. Header + rifiuto + decoder attuale | Blocca immagini grandi prima del decode; PNG24 respinta. Bomb IHDR1×1 ancora OOM; metadata compressi richiedono sanitizzazione/rifiuto. | Media; parser compatibile Edge. **Insufficiente da sola.** | Nessun provider, costo parser modesto misurato nelle trace. | Compatibilità limitata dall'allowlist. |
| C. Streaming PNG + JPEG/WebP WASM con tetto memoria | Streaming evita il frame PNG pieno; cap rende controllato il fallimento di allocazioni WASM. JPEG ridotto nel decode; WebP attuale decodifica ancora il frame pieno. | Medio/alta; sonda effettivamente deployata Edge con pako e WASM capped. Libspng/WASM progressivo e libwebp scaling sono alternative da buildare e benchmarkare, non librerie drop-in già validate qui. | Nessun nuovo provider. Nessun acquisto effettuato; CPU delle richieste resta a carico Edge. | Perimetro consigliato JPEG/PNG12MP, WebP6MP, PNG8bit statico non interlacciato; errore/retry chiaro. |
| D. Temporary private Storage → worker/Edge → canonical | Storage separa ingest/processamento e permette retry/queue. **Non riduce la RAM del decoder**. Con Edge usa C; un worker esterno con cap OS potrebbe ampliare formati. | Alta: upload authorization, lease, idempotenza, stato, cleanup, failure handling. Edge/Storage esistenti deployabili; worker alternativo non predisposto. | Dentro Supabase nessun nuovo provider, più storage/operazioni/egress/invocazioni. Worker/provider esterno avrebbe costi da valutare e richiederebbe conferma prima di introdurlo. | Stato asincrono/attesa e retry da progettare senza bloccare onboarding. |
| E. Abbassare limiti/formati | Necessario per margine; **non sostituisce** il decoder bounded. Con C il candidato non registra OOM. | Bassa configurazione, ma allowlist e cap devono essere reali lato server. | Nessun provider; riduce risorse. | Potenziali rifiuti di PNG16, animazioni, interlace, foto grandi. Nessuna modifica frontend in questo task. |

Sharp/libvips non è una soluzione automaticamente disponibile su Edge: il runtime ufficiale segnala vincoli per dipendenze multithread e assenza Web Workers/node:vm. Pako supporta onData/onEnd personalizzati senza trattenere tutti i chunk. Libspng offre decode progressivo/limiti ma necessita componente WASM riproducibile e prove Edge. Libwebp supporta scaling/incremental tramite API avanzata; il wrapper jsquash corrente non espone quella configurazione. Nessuna alternativa non misurata è dichiarata pronta.

## E. Limiti sostenibili proposti dai risultati

**Candidato, non ancora applicato alla pipeline:**

- byte input ≤8.388.608, lettura limitata e senza concatenazioni ripetute;
- entrambe le dimensioni ≤8192; anche il limite pixel del formato deve essere rispettato (8192×8192 è escluso);
- JPEG RGB8 statico: ≤12.000.000 pixel, incluso progressive testato; WASM massimo **96 MiB**;
- PNG8 statico non interlacciato grayscale/RGB/gray-alpha/RGBA: ≤12.000.000 pixel, streaming, niente frame sorgente completo; PNG16 escluso nel primo perimetro;
- WebP statico lossy/lossless: ≤6.000.000 pixel, WASM massimo **64 MiB**;
- output RGBA prima dell'encoding: lato ≤1600, ≤2.560.000 pixel; varianti/encoder in sequenza;
- budget decode PNG cooperativo 1.300 ms, con rifiuto controllato; il residuo per encoding va ulteriormente verificato su immagini difficili. Il runtime 2s CPU non sostituisce una deadline implementata.

Queste combinazioni sono sostenibili **nel corpus misurato**, non un certificato per ogni file arbitrario. 24MP8 PNG è passata in streaming ma viene esclusa per margine CPU; 24MP16 ha esiti temporali variabili; WebP12 è escluso per memoria; JPEG24 progressive è escluso per margine. Non abbiamo dedotto una soglia 16bit più bassa universalmente sicura da una singola immagine RGB16 compressibile.

## F–G. Architettura consigliata e changes futuri necessari

1. Ingest autenticato e autorizzato, input bounded; nessun canonical pubblicato prima del successo. Formato/dimensioni predecode letti dal server e allowlist applicata.
2. Decoder separati per formato con un solo lavoro attivo per isolate. Evitare tenere contemporaneamente istanze WASM JPEG e WebP in un worker caldo; suggerite funzioni/worker di decode dedicati per formato, sempre dentro lo stack Supabase.
3. PNG: pako streaming, finestra zlib/64 KiB chunk, due righe sorgente, RGBA ridotto; limite espansione e deadline. Nel candidato RGBA massimo 10,24 MB, due righe ≤circa64 KiB; niente copie raster complete. Convertire 16→8 solo nei futuri formati autorizzati, non tramite raster float/alta precisione.
4. JPEG: mantenere decode a risoluzione ridotta e imporre cap WASM. WebP: cap WASM + pixel6MP; downscale nel decode richiederebbe build che espone libwebp advanced API e un benchmark nuovo.
5. Un encoding per volta; limitare output e copie; liberare input/istanze e verificare release di ogni allocazione. Cache solo moduli compilati, non buffer originali. Backpressure/lease durevole se richiesto dalla pipeline successiva: il boolean busy della sonda è solo locale all'isolate.
6. Temporary private Storage/queue è opzionale per retry/affidabilità, non una cura OOM. Nessuna nuova tabella, bucket o queue creata qui.

Il cap è stato provato modificando **solo nella sonda** la sezione memory del binario WASM, mantenendo initial pages e aggiungendo maximum pages. JPEG originale non dichiara un maximum; WebP originale arriva a 2 GiB. La prova mostra che i tetti 96/64 MiB sono compatibili con gli input candidati. WebP24 e WebP12 lossless, se volutamente ammessi nella modalità esplorativa capprobe, restituiscono `Decoding error` HTTP422 in 39–40 ms, senza HTTP546.

Non utilizzare automaticamente la riscrittura binaria del benchmark in produzione: per implementare serve una build riproducibile dei decoder con limiti espliciti, versione/licenza/checksum verificati e gestione di malloc/memory.grow failure. Il tetto WASM **non limita** l'heap JavaScript: occorrono anche output dimension checks, copie bounded, serializzazione e test di worker caldi.

## H. Rischi e regressioni da risolvere prima dell'implementazione

La sonda PNG usa campionamento nearest-neighbor; dimostra memoria bounded, **non equivalenza visiva** con il resize bilineare attuale. Sono necessari resampling almeno bilineare a poche righe, alpha flattening corretto e gestione colore/orientamento coerente con PHOTO-01. I 40 test locali dei filtri dimostrano correttezza dei pixel a scala1, non qualità del resize, gestione ICC o canonical metadata.

Sono esclusi PNG16, indexed/sub8, interlace, animazioni, JPEG non-RGB, WebP>6MP, JPEG/PNG>12MP. L'effetto su upload e onboarding va collaudato prima di cambiare il contratto; la preparazione client non costituisce una garanzia di sicurezza server. Non si presume compatibilità di tutte le foto telefono/HEIC.

Restano da provare parser container completi, fuzzing dei decoder, JPEG corrotte/scan patologiche, trasparenza/colori, fotografie sintetiche peggiori per CPU, worker caldo alternando formati, memory release e contesa reale. Un time budget basato su performance.now non interrompe una chiamata WASM sincrona; il limite CPU Edge può ancora terminare un input computazionalmente patologico. Questi rischi non autorizzano ad affermare «mai OOM o TIMEOUT» per file arbitrari.

## I. Matrice richiesta

| Caso sintetico | Decoder attuale | Streaming esplorativo | Candidato con cap e limiti |
|---|---|---|---|
| jpeg-12mp.jpg | PASS | PASS | PASS |
| jpeg-24mp.jpg | PASS | PASS | REJECT SAFE |
| png-12mp-8.png | PASS | PASS | PASS |
| png-24mp-8.png | OOM (HTTP 546, log Memory limit exceeded) | PASS | REJECT SAFE |
| png-24mp-16.png | OOM | REJECT SAFE (budget decode); PASS in altre due esecuzioni | REJECT SAFE |
| webp-12mp.webp | PASS | PASS | REJECT SAFE |
| webp-24mp.webp | OOM (HTTP 546, log Memory limit exceeded) | OOM (HTTP 546, log Memory limit exceeded) | REJECT SAFE |
| corrupt.png | REJECT SAFE | REJECT SAFE | REJECT SAFE |
| pathological.png | OOM (HTTP 546, log Memory limit exceeded) | REJECT SAFE | REJECT SAFE |

Nessun TIMEOUT registrato nel corpus. Gli OOM originali sono intenzionalmente riprodotti solo nella sonda staging. Nel candidato finale con limiti/cap tutti i casi sono PASS o REJECT SAFE.

Aggiunte: JPEG progressive12/24, JPEG12 con rumore e 8MiB di commenti, PNG12 RGB/RGBA con rumore, PNG12 input esatto8MiB, WebP lossless12/6 e lossy6, PNG lato8192 (11.468.800 pixel) PASS, lato9000 REJECT SAFE, WebP animato REJECT SAFE, PNG RGB16 12MP REJECT SAFE per depth, bomb iCCP grande REJECT SAFE, iCCP piccolo ignorato nello streaming. PNG con molti dati casuali >8MiB non è usata per fingere un decode sostenibile: byte input fuori allowlist.

Decisione centrale: **B — YES, BUT**. Il benchmark supporta una soluzione Edge con C+E, parser non solo header e limiti differenti per formato. Non supporta decoder corrente invariato, header-only come difesa sufficiente, né 24MP16 garantita. Nessun nuovo provider necessario nel perimetro consigliato. Non si promettono gli stessi limiti/formati originali.

## J. Prima di implementare PHOTO-01, in un task separato

Approvare esplicitamente limiti/allowlist e comportamento di rifiuto/retry; completare e validare i parser; produrre decoder WASM capped riproducibili; sostituire il campionamento sperimentale con resize/alpha/colori corretti a memoria limitata; definire budget totali, input/output e lifecycle per worker caldo; aggiungere fuzz/property/regression test e ripetere preflight staging con il contratto PHOTO-01 concordato. Poi verificare l'intera pipeline autorizzazione→decode→canonical→Storage e compatibilità QR/Ora/Tribe/Spot/match/chat prima di qualunque proposta di deploy production. Nessun passo di quella implementazione è effettuato qui.

## Verifiche e file

Suite attuale: **164/164 PASS**. Prototipo locale: **47/47 PASS** (40 combinazioni 8/16bit × quattro color type × cinque filtri; truncation, overexpansion, cinque boundary checks). Build PASS, typecheck PASS. Build emessa in `/tmp/soma-bounded-build`, senza modificare dist del repository. SHA-256 di 249 file nello snapshot preflight invariati, incluse sorgenti runtime e asset. Le verifiche della suite app non sostituiscono la futura suite di decoder PHOTO-01.

Nuovi file di questo task: questo report e `docs/soma-photo01-bounded-memory-evidence-2026-10-06.json`. I due documenti già non tracciati all'inizio (`soma-photo01-staging-preflight-2026-10-06.md`, `soma-pre-pilot-decision-sheet-2026-10-06.md`) non sono modificati. Screenshot di staging salvati in `/tmp/soma-bounded-staging-*.png`.

**Benchmark concluso. Produzione invariata. Contratto foto invariato. PHOTO-01 non implementata. PHOTO-02 non avviato.**

## Fonti tecniche primarie

- [Supabase Edge limits](https://supabase.com/docs/guides/functions/limits): 256MB, 2s CPU, restrizioni runtime.
- [Supabase HTTP546 troubleshooting](https://supabase.com/docs/guides/troubleshooting/edge-function-546-error-response): classificare CPU/memoria dai log.
- [pako2.2.0 inflate source](https://github.com/nodeca/pako/blob/2.2.0/lib/inflate.js): onData accumula e onEnd concatena; handler sovrascrivibili.
- [fast-png6.2.0 PngDecoder](https://github.com/image-js/fast-png/blob/v6.2.0/src/PngDecoder.ts): inflate/unfilter e metadata.
- [W3C PNG specification](https://www.w3.org/TR/png-3/): IHDR, depth, color type, chunk, CRC, animation.
- [libspng progressive decode](https://libspng.org/docs/decode/), [context limits](https://libspng.org/docs/context/): opzioni alternative non benchmarkate Edge qui.
- [libwebp API](https://developers.google.com/speed/webp/docs/api): advanced decoding, scaling e incremental decoding; non esposti dal wrapper corrente.
