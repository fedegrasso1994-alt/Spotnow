# Fase A2 — audit e piano di ritiro diagnostica staging

13 ottobre 2026. Solo progetto `zjinjtkekmaqtxsuyvho`. Codice letto dal pannello Code; Verify JWT legacy ON osservato per tutte3. Nessuna chiave runtime letta: i sorgenti fanno riferimento a Deno.env, non valori. Nessuna sonda invocata; nessun dato/foto originale letto. Stato di ritiro: **PROPOSTO, conferma cancellazione permanente pending**.

| Nome / classificazione | Scopo e ultima necessità | Auth/dati/side effects | Dipendenze e rischi |
|---|---|---|---|
| photo01-preflight — **RETIRE** | Preflight decoder6ottobre, prima del contratto PHOTO-01; non necessario a pipeline corrente | ProjectURL esatto; POST; getUser(token) con service client; user_metadata.synthetic=true richiesto. Marker utente non è un ruolo amministrativo. Input caller letto integralmente prima del limite8MiB; vecchio PNG24MP/16-bit, decoder e resize con allocazioni ampie. Risponde solo metriche, zero writes dichiarati e nessuna chiamata Storage/DB nel codice. Auth lookup può accedere identity usata per gate, non inventario utenti | jpeg-js/fast-png/jSquash/WASM incorporato, service credential env; nessuna chiamata da src/Edge operative/CI. Rimanenza: abuso risorse/OOM con Auth synthetic auto-dichiarato, codice obsoleto e superficie superflua. Rimozione: vecchi test manuali su endpoint falliscono, nessun flusso prodotto rotto |
| photo01-bounded-bench — **RETIRE** | Benchmark decisione B6ottobre; modi baseline/stream/safe/strict/capped/capprobe, già sostituito da test pipeline implementata | ProjectURL esatto, POST, getUser+metadata.synthetic; occupied guard. Input reader8MiB; mode query baseline consente vecchio decode24MP/16bit e copie. Metriche/memoria/header/trace, nessun Storage/DB write nel sorgente | Decoder/WASM/pako/header/resize laboratorio, non modulo PHOTO corrente. Rimanenza: mode baseline/risorse/log/vecchi parser non necessari; ritiro perde solo laboratorio ad hoc, benchmark/report versionati restano |
| photo01-verification — **RETIRE** | Worker reuse/corrupt/valid-after-failure7ottobre, sorgente SHA identico al manifest PHOTO-01. Attuale suite copre le stesse condizioni | Project staging guard. Worker POST; serviceKey esatto oppure authorize tramite RPC photo_processing_authorized(server service verificato), non normale utente. Body bounded8MiB, process rifiuta >64KiB; processori3formati, prova5decode e ritorna canonicale/thumbnail/base64/reuse metriche. Nessun Storage write/pubblicazione. RPC di autorizzazione read-only | Sonda generata da scripts/build-photo-staging-probe.mjs con file/tmp di laboratorio; pipeline runtime non la usa. Rimanenza: endpoint/admin-only superfluo con copie di worker vecchio; ritiro interrompe solo quel generatore/test storico se redeployato. Non toccare RPC photo_processing_authorized necessaria ai normalizer operativi |

Endpoint esatti:
- https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo01-preflight
- https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo01-bounded-bench
- https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo01-verification

Gateway JWT non equivale a service-only. Nessuna vulnerabilità di lettura DB/Storage arbitraria dimostrata; nessun test di attacco/ricarico memoria eseguito. Non estendere il finding a PHOTO-01/02 operative, che restano invariati.

## Evidenze e recupero

SHA256 dei sorgenti deployati, estratti attraverso UI Code:
- preflight: 885153941d4c7dcd3c054d44545be9581cc3c2692bbaa7492a2324b3efc97ced
- bounded-bench: 9e3c0016d72438e8fca4c7d276a972d576ab30e5202fe5f013976c7c11198ef0
- verification: cc6d506a8a583bfe2b1b668ffbd67e82ec39fdec93946b76c1691321e86a94e8

Backup tecnici privati owner-only in `.local/phase-a/` ignorato da Git, nessun secret nel sorgente. Non pubblicare duplicati dei vecchi decoder nel branch né introdurre nuove dipendenze. Documentazione storico benchmark/implementation resta versionata.

## Piano concreto di ritiro dopo conferma

1. Snapshot read-only: account/profili/Storage/ledger/quota/current e scheduler/cleanup/cron OFF, Confirm email ON; nessuna invocazione sonde in corso osservabile. Ricontrollare nomi/progetto.
2. Eliminare solo3Edge diagnostiche via console, dopo conferma richiesta dalle regole browser per cancellazione permanente. Non cambiare Auth, secrets, normalizer/photo-assets/delete-account/photo-lifecycle/privacy-retention.
3. Verificare lista funzioni passa10→7 e sonde non più deployate; HTTP missing atteso se endpoint raggiungibile, senza foto/input. Ripetere inventory invarianti, normal endpoints/Auth read-only e smoke fixture autorizzato.
4. Ripulire backup di laboratorio quando evidenze/necessità recupero sono chiuse; eventuale redeploy futuro richiede nuovo task esplicito con isolamento forte, non ripristino automatico.

KEEP BUT ISOLATE sarebbe appropriato solo con necessità di test futura documentata, autorizzazione service-only/fixture allowlist server e versione sicura/current, risorse/body bounded e TTL deployment. Tale necessità non è emersa: non introdurre un nuovo deploy per mantenere strumenti obsoleti.


## Ritiro eseguito — 13 ottobre 2026

Autorizzazione founder esplicita alla chiusura Fase A ricevuta. Immediatamente prima della cancellazione: ricontrollati progetto `zjinjtkekmaqtxsuyvho`, nomi esatti, classificazione RETIRE e backup/hash; ricerca in `src`, `supabase/functions`, `.github` senza dipendenze verso le tre sonde. Conferma individuale nella console sui tre nomi, nessuna modifica alle sette funzioni operative, Auth o produzione.

Eliminate permanentemente **photo01-preflight**, **photo01-bounded-bench**, **photo01-verification**. Console: da 10 a 7 funzioni. Probe pubblico read-only alle 17:20:13 UTC: tutte e tre **HTTP 404 / NOT_FOUND**. `photo-assets`, `photo-lifecycle`, `delete-account`, `privacy-retention` rispondono 405 al GET, guard metodo preservato; Auth settings 200. Nessun payload decoder inviato. Probe ripetibile `scripts/phase-a-retirement-probe.mjs`, staging hardcoded, nessuna credenziale amministrativa né scrittura.

Dopo ritiro: rehearsal integrato reale Postgres PASS, rollback e zero fixture; baseline 3 account, 3 profili, 39 oggetti, 3 review storici preservati, zero unknown inattesi, PHOTO PAUSED, cleanup/scheduler OFF, retention paused e cron attivi 0. Suite unificata 293/293, build e typecheck PASS. Evidenza visiva privata `.local/phase-a/edge-retired.png`.

Lo smoke Auth/MFA/upload reale integrato è ancora un gate separato: Confirm email risulta ON sul server, nessuna nuova fixture Auth creata. Non presentare il rehearsal SQL come sostituto del login/MFA reale.
