# PHOTO-01 — implementazione e verifica staging, 7 ottobre 2026

## Stato e perimetro

Implementazione PHOTO-01 completata nel repository e verificata su **Soma Staging `zjinjtkekmaqtxsuyvho`**, con soli utenti e immagini sintetici. Migration **016** applicata e registrata nel ledger staging; 001–015 invariate. Deploy staging di `photo-assets`, `photo-normalize-jpeg`, `photo-normalize-png`, `photo-normalize-webp`, `delete-account`. Sonda `photo01-verification` service-only, senza Storage, bloccata per progetto diverso dallo staging.

**Produzione `qlucwdjcjomwyziegxrn` invariata. Nessun deploy Vercel/production, nuovo provider, acquisto o PHOTO-02.** Il finding sulla produzione non può essere dichiarato chiuso finché il rollout e la normalizzazione delle foto correnti non sono verificati anche lì.

## A. Implementazione

Originale → Edge autenticata → controlli reali su container/header/payload → decoder separato per formato → resize proporzionale → re-encoding JPEG senza metadata → tre oggetti privati → registro server validato → profilo. Nessuna persistenza dell'originale nuovo e nessun fallback raw. Registro collegato ad `auth.users` prima della creazione del profilo; trigger e RLS impediscono foto/preview/percorsi forgiati. Snapshot legacy congelato, normalizzazione solo del riferimento corrente con compare-and-swap, vecchia foto preservata in caso di errore.

PNG decodificata con pako in due scanline, senza frame sorgente completo; expansion esatta e CRC verificati, tutti i filtri/color type 8-bit supportati inclusa palette. JPEG: validatore entropy/MCU prima del decoder ridotto con cap WASM 96 MiB; caso SOF falsificato che il decoder tollerava ora respinto. WebP: cap WASM 64 MiB, controlli RIFF/canvas e geometria nativa. WASM da sorgenti/versioni/checksum fissati; il massimo di memoria è parte dell'artifact verificabile.

Encoder jpeg-js derivato in modo riproducibile, con output e deadline bounded. Campionamento bilineare; alpha su bianco; orientamento EXIF JPEG applicato ai pixel, metadata non ricopiati. Nessuna conversione HDR/16-bit intermedia. Le Edge hanno guardie di memoria e busy prima della lettura; il DB serializza per account; retry idempotenti con nonce/hash, 10 job distinti/ora, max tre tentativi, lease 45 s. La cancellazione attende upload attivi/falliti ancora in lease e mantiene la precedente rimozione dei file flat + cascade.

Corretto nel collaudo reale anche un errore del percorso di failure: PostgREST restituisce un thenable senza `.catch()`. Ora il rilascio della lease usa `try/await/catch`, coperto da test che riproduce il contratto SDK.

## B. File modificati / aggiunti

Elenco esatto relativo alla radice del repository, esclusi i quattro documenti non tracciati già presenti prima di questo task:

- `docs/soma-photo01-implementation-2026-10-07.md`
- `docs/soma-photo01-implementation-evidence-2026-10-07.json`
- `scripts/build-photo-jpeg-encoder.mjs`
- `scripts/build-photo-staging-probe.mjs`
- `scripts/build-photo-wasm.mjs`
- `scripts/bundle-photo-edge.mjs`
- `src/backend.js`
- `src/errors.js`
- `src/live.js`
- `src/photo-contract.js`
- `src/photo-upload.js`
- `src/photo.js`
- `supabase/functions/_shared/photo-jpeg-encoder.js`
- `supabase/functions/_shared/photo-jpeg-validation.js`
- `supabase/functions/_shared/photo-png.js`
- `supabase/functions/_shared/photo-processing.js`
- `supabase/functions/_shared/photo-upload.js`
- `supabase/functions/_shared/photo-wasm.js`
- `supabase/functions/_shared/photo-worker.js`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/photo-assets/LICENSE-pako.txt`
- `supabase/functions/photo-assets/README.md`
- `supabase/functions/photo-assets/index.ts`
- `supabase/functions/photo-normalize-jpeg/index.ts`
- `supabase/functions/photo-normalize-png/index.ts`
- `supabase/functions/photo-normalize-webp/index.ts`
- `supabase/migrations/016_authoritative_photo_uploads.sql`
- `tests/account-deletion.test.js`
- `tests/helpers/database.js`
- `tests/live-navigation.test.js`
- `tests/load-scaling.test.js`
- `tests/photo-assets-auth.test.js`
- `tests/photo-assets.test.js`
- `tests/photo-authority.test.js`
- `tests/photo-processing.test.js`
- `tests/photo-upload.test.js`
- `tests/profile-preference-privacy.test.js`
- `tests/reliability.test.js`
- `tests/tribe-database.test.js`
- `tsconfig.json`
- `types/deno.d.ts`
- `types/photo-codecs.d.ts`

I report benchmark/preflight e la decision sheet del 6 ottobre sono rimasti invariati. Nessun CSS, markup, palette, logo o migrations 001–015 modificato. Nessun refactor di live-social.js o degli altri domini.

## C. Contratto finale

| Input | File / lato | Requisiti / pixel | Decode |
|---|---|---|---|
| JPEG | ≤8 MiB, ≤8192 px per lato | RGB8, tre componenti, ≤12.000.000 px; baseline/progressive conformi | ridotto; hard cap 96 MiB |
| PNG | stessi limiti | statica 8-bit non interlacciata, ≤12.000.000 px | streaming due righe |
| WebP | stessi limiti | statica, ≤6.000.000 px | hard cap 64 MiB |

Rifiutati PNG16, animazioni, payload corrotti/incoerenti/espansione errata. Limiti indipendenti e simultanei: 8192² non è ammesso. Sotto soglia un file può comunque essere respinto per budget temporale/memoria. JPEG validation 600 ms, PNG streaming 900 ms, decode completo entro 1000 ms, encoding cooperativo entro 1700 ms. Non sono garanzie di accettazione di qualsiasi bitstream formalmente sotto soglia.

Output canonical/detail JPEG85 max1600/4MiB, thumbnail JPEG78 max480/1MiB, preview JPEG65 max120/11kB. Canonical/detail condividono i medesimi byte sanificati mantenendo i reader esistenti. Il contratto API, le grants/RLS, i codici errore e il rollout sono documentati in `supabase/functions/photo-assets/README.md`.

## D. Verifiche e risultati

**184/184 test PASS; 0 failure. Build Vite PASS; typecheck PASS; git diff --check PASS.**

Test mirati: boundary byte e lato esatti/+1; pixel al limite e riga immediatamente sopra; byte/header/formato non fidati; JPEG SOF plausibile falsificato, entropy e truncation; PNG expansion sotto/sopra il dichiarato, CRC, 16-bit, palette fuori range e filtri 0–4; WebP canvas discordante/payload troncato; cap WASM testato con memory.grow che fallisce con RangeError; EXIF/orientamento e assenza metadata in output; warm reuse, memoria occupata e concorrenza; nonce retry; SDK thenable; storage/worker failure senza finalize; upload raw, registro, RPC e pubblicazione forgiati negati; pre-profile registry, server assets, CAS legacy, rate limit e cancellazione.

Collaudo Supabase reale:

| Caso sintetico | Esito |
|---|---|
| JPEG baseline 12 MP | PASS, 347 ms processing |
| JPEG progressiva 12 MP | REJECT SAFE: TIME, risposta JSON 422 |
| JPEG progressiva rumorosa 12 MP | PASS, 1163 ms processing |
| JPEG 12 MP / esattamente 8 MiB | PASS HTTP/1.1, 351 ms processing |
| JPEG 24 MP | REJECT SAFE: PIXELS |
| PNG RGB8 12 MP | PASS, 448 ms |
| PNG RGBA8 12 MP | PASS HTTP/1.1, 561 ms |
| PNG RGB8 24 MP | REJECT SAFE: PIXELS |
| PNG16 12 MP | REJECT SAFE: DEPTH |
| JPEG/WebP dimensioni falsificate entro soglia | REJECT SAFE: INVALID |
| PNG16 24 MP / circa8 MiB | REJECT SAFE: PIXELS, prima del decode |
| PNG patologica, header1×1/payload espansivo | REJECT SAFE: INVALID |
| PNG corrotta | REJECT SAFE: INVALID |
| PNG12 MP esattamente8 MiB | PASS, 670 ms |
| Metadata PNG compressi patologici | PASS, metadata ignorati/non decompressi e output pulito, 462 ms |
| WebP lossy6 MP | PASS, 323 ms |
| WebP lossless6 MP | PASS, 319 ms |
| WebP12/24 MP | REJECT SAFE: PIXELS |
| WebP animata | REJECT SAFE: ANIMATED |

Nessun OOM osservato in questo corpus finale. Il primo trasporto Node ha avuto timeout su due upload grandi: ripetuti con HTTP/1.1, entrambi PASS. Restano separati nell'evidence; un timeout di trasferimento non è stato trasformato in un PASS né confuso con un OOM.

Nella sonda sullo **stesso worker**: valid → corrupt → valid → invalid → valid per tutti i formati, rispettivamente PASS / REJECT SAFE / PASS / REJECT SAFE / PASS. JPEG linear memory 1,18 MB e WebP16 MiB sui file piccoli. Massimo campionato heapTotal+external: 79.1 MiB. `rss=0` nel runtime: non è una misura affidabile del picco RSS assoluto e il campionamento non vede ogni allocazione transitoria. I cap 96/64 riguardano la memoria lineare, non l'intero isolate.

E2E: upload prima del profilo, retry stesso path, pubblicazione profilo, tre JPEG scaricabili sintetici, preview/detail server, raw Storage/forged path/service-RPC negati, errore patologico lascia foto corrente invariata, Alice/Bob legacy normalizzati con originali conservati. Adapter **vero `createBackend`**: uploadPhoto/saveProfile/getProfile per JPEG/PNG/WebP PASS. Concorrenza stesso account: una200/una409 BUSY; cancellazione in lease409, poi200 e zero oggetti/auth account rimosso sul solo account usa-e-getta.

QR/check-in90min, SEC-01, Ora LOC-01 timestamp peer null, fotoHD privata, Tribe, Spot reciproci, match, invio/lettura chat PASS in staging. La suite DB copre anche Tribe dopo scadenza e preservazione degli altri flussi.

L'evidence JSON contiene risultati aggregati e hash degli artifact, nessuna chiave, sessione, credenziale o foto reale. Le metriche dashboard sull'ultima ora includono failure di sviluppo e rifiuti BUSY intenzionali; non rappresentano solo la suite finale.

## E. Rischi residui e UX

- La memoria del runtime è condivisa con JS/HTTP/encoder: i cap WASM non sono un cap globale. Guardie conservative possono restituire BUSY anche sotto i limiti nominali; non si promette che ogni possibile input non osservato non possa mai stressare il runtime.
- Il WASM sincrono non è preemptable; i limiti/due decoder separati e la validazione riducono il rischio, ma i test non sono una prova universale contro ogni bitstream. Fuzzing più ampio rimane utile.
- JPEG progressiva complessa può superare il budget e richiedere una versione più piccola. Input4032×3024 supera12MP. UI usa i toast esistenti con messaggi specifici; nessun redesign/nuova schermata. Aggiornata solo la gestione necessaria del flusso foto e del path legacy normalizzato.
- Nessun ICC color management: possibile differenza wide-gamut; orientamento applicato per JPEG, PNG/WebP normalizzati in orientamento codificato. Bilineare è un compromesso qualitativo con costo bounded.
- Rete lenta/interrotta produce errore, non pubblicazione raw. Una scrittura parziale può lasciare oggetti privati non referenziati; cleanup/retention/quota cumulativa appartengono a PHOTO-02 e non sono stati implementati.
- URL già firmati per foto legacy possono restare validi fino alla propria scadenza; il rollout deve considerare questa finestra.
- La prima modifica di un profilo legacy attende la normalizzazione opzionale prima di ricaricare il riferimento, evitando che il client conservi il vecchio path dopo il compare-and-swap; i nuovi upload già canonicali evitano questa chiamata aggiuntiva.
- Foto legacy non conformi (es.16bit/oltre soglia) rimangono disponibili se la normalizzazione fallisce; va risolto il caso prima di dichiarare la produzione interamente normalizzata.
- Client/PWA in cache con vecchio upload raw richiedono refresh durante il rollout. Nessun raw fallback di compatibilità.

## F. Intervento founder / prossimi passi autorizzabili

Per questa implementazione staging non occorrono nuovo provider, acquisto o nuove scelte sui limiti già approvati. **Restano da autorizzare separatamente il rollout production coordinato e la normalizzazione controllata delle sole foto correnti reali**, con verifica dei fallimenti legacy e della cache client. Non eseguiti in questo task. PHOTO-02 non iniziata.
