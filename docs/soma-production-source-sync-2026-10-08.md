# Soma — sincronizzazione sorgenti produzione / GitHub

Data: 8 ottobre 2026. Branch: `main`. Remote: `fedegrasso1994-alt/Spotnow`.

## Stato iniziale

HEAD e origin/main: `4cd4bf413bbeeb1401806ada6516395a6ae02446`; nessun commit preesistente non pushato o divergenza. Mancavano 18 file modificati e 36 singoli file non tracciati (54 totali). L’elenco completo è nell’evidence JSON allegato.

## Corrispondenza con produzione

- Nuovo confronto SHA-256: tutti i 20 artifact pubblici della build locale coincidono con il sito live, inclusi chunk caricati dinamicamente, manifest, service worker e icone.
- Acquisiti in sola lettura dal dashboard i sorgenti deployati di photo-assets, delete-account e dei tre normalizzatori; confronto byte per byte con bundle generati dagli stessi moduli del repository: 5/5 coincidenti.
- Nuova snapshot SQL produzione confrontata con quella verificata dopo il rollout: funzioni/RPC e ACL, policies, colonne, RLS, bucket e presenza di migration016 coincidenti.
- Migration016 SHA-256: `41dc5d3983d23027e9e5d231726098cec99daa6d3dc9927ea9a746e496169e22`. Nessuna migration applicata in questo task.

Il frontend in produzione proviene dal deploy manuale `dpl_CBB5C8SDuxM92KxkthHHpUrZMcQN` documentato nel rollout: non è stato redeployato per cambiare il commit dichiarato nei metadata. La corrispondenza è verificata sul contenuto degli artifact, non dedotta da un SHA Git del provider. Le funzioni Edge sono deployate separatamente e sono ora ricostruibili dal sorgente versionato.

## Commit separati

- `03b45fe` — docs: record approved pre-pilot founder decisions
- `a5b796a` — docs(photo01): record staging preflight and bounded-memory benchmark
- `a607ff8` — feat(photo01): version deployed authoritative bounded-memory photo pipeline
- `aed43fd` — docs(photo01): record production rollout and oversize verification
- `ed9ed70` — docs: record legacy photo dry-run and authorized account cleanup
- Commit documentale finale: questo report e la relativa evidence dei confronti. Il suo SHA va letto dalla history Git, per evitare un riferimento circolare.

## Ambito e dati

Versionati implementazione completa PHOTO-01, migration016, contratto/README e licenze incluse, test, strumenti di generazione, benchmark, staging, implementazione, rollout, oversize, dry-run e cleanup. La decision sheet founder preesistente è inclusa in un commit separato.

Le cancellazioni dei dieci account sono operazioni sui dati, non cambiamenti del sorgente: versionati solamente i risultati aggregati del cleanup. Nessun dump, UUID/mapping privato, chiave, sessione o foto reale è stato aggiunto. `.local`, build, dipendenze e configurazione privata restano ignorati. Nessuna migration distruttiva o script di cleanup di account è aggiunto al repository.

Nessun file runtime è stato riscritto durante la sincronizzazione; mantenuta esattamente anche la formattazione upstream dell’encoder generato e i line break Markdown della decision sheet.

## Verifiche

Suite locale 188/188 PASS; build PASS; typecheck PASS. Controllo dei file da pubblicare: nessuna chiave privata/server o credenziale rilevata. Il push Git CLI non disponeva di credenziali; pubblicazione tramite la connessione GitHub dell’app con update_ref fast-forward e expected SHA, senza force push. Local Git viene riallineato agli stessi commit remoti dopo il confronto esatto del tree; snapshot locale precedente conservata in un branch backup. Il risultato remoto e lo stato Git finale sono verificati dopo il push e riportati nella risposta.

GitHub rappresenta i sorgenti e la documentazione della produzione verificata; non è un backup dei dati né delle impostazioni/segreti cloud non versionabili. Nessuna modifica a runtime, schema, RLS, UX o PHOTO-02.
