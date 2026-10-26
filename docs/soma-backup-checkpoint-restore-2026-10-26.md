# SOMA — primo checkpoint GCS e restore isolato

**Follow-up:** [contratto sessioni v2](soma-checkpoint-session-contract-2026-10-26.md): fix candidato staff testato, nuovo capture fermato prima del dump su dipendenza SAML non classificata. Il restore fallito qui sotto resta l'ultima prova DB reale; nessun restore v2 attestato.

26 ottobre 2026. Branch `codex/soma-schema-v2-staging`, baseline `32c5346c7d640ec3c41b864a3682d4aac51da031`.

**BACKUP / RESTORE RECOVERY: BLOCKED**. L'archivio è stato recuperato da GCS e verificato; il restore DB è fallito atomicamente. Nessun restore point attestato, nessun GO pilot.

Questo aggiornamento supera i punti “Docker mancante / bucket vuoto / checkpoint non implementato” del [report infrastruttura](soma-backup-recovery-infrastructure-2026-10-26.md). Le altre limitazioni restano applicabili.

## Risultati effettivi

| Gate | Evidenza / esito |
|---|---|
| Sorgente | Solo Supabase staging `zjinjtkekmaqtxsuyvho`; dump e inventario nella stessa transazione repeatable-read con snapshot esportato |
| Copertura | Schemi public, spot_private, auth, storage, extensions, supabase_migrations; inventario di tabelle/RLS/RPC/policies e mapping Storage cifrato |
| Esclusioni | Dati delle vecchie sessioni, refresh token, one-time token, flow state e challenge MFA; niente Vault secret, cron job o code di rete sorgenti |
| Storage | 42 oggetti classificati come referenziati; dimensioni verificate, hash sorgente confrontato dove disponibile; hash SHA-256 di ogni file nel manifest |
| PHOTO | Nessun originale reintrodotto, nessuna ricodifica, nessun writer/cleanup mutato. Copiati i byte presenti e necessari secondo il cutoff; review storiche preservate |
| Cifratura | AES-256-GCM autenticata, chiave separata locale 0600; manifest e mapping dentro il ciphertext |
| Upload | Oggetto privato nel bucket SOMA già approvato; accesso anonimo HTTP 403 |
| Download | Automatico in timeout; download manuale founder, nome invariato. SHA-256 e dimensione uguali all'archivio originario |
| Decifratura | Autenticazione e hash di tutti i 44 file PASS: DB, inventario e 42 oggetti |
| Restore DB | FAIL, foreign key session-dependent descritta sotto; transazione unica annullata |
| Restore Storage tramite API | NON eseguito, fermato prima del caricamento dei byte |
| Auth/RLS/Storage smoke sul restore | NON eseguito; nessuna attestazione basata sulla sola lettura del dump |
| Replay post-cutoff | NON eseguito; non esiste ancora prova di journal indipendente e completo per riaprire un recovery dopo perdita della sorgente |

Un primo tentativo di capture è stato invalidato perché Storage CLI richiede `--experimental`. Eliminati i temporanei; nessun archivio pubblicato da quel tentativo. Adapter corretto e copia singola prevalidata prima del secondo capture. Il secondo capture è l'unico oggetto pubblicato. Nessun retry del restore dopo il nuovo blocker.

## Identità del checkpoint, non dati utente

- ID: `8f5b8523-d5a2-49ab-b99b-04388e7b4c76`.
- Cutoff DB: **2026-10-26 12:31:15.980443 UTC**.
- Dimensione cifrata: **2.242.848 byte**.
- SHA-256 ciphertext: `b33c06483d24a207b0536105206435875eed332ff55031723925753e56991c9c`.
- Bucket: `soma-staging-backups-rare-array-510414-d9`, progetto **`rare-array-510414-d9`**, regione europe-west1.
- Oggetto: ID checkpoint con estensione `.soma.enc`; creato **13:27:21 UTC**.
- Conservazione minima mostrata dalla console: fino al **2 novembre 2026, 13:27:21 UTC**. Lifecycle Delete age ≥7 giorni; esecuzione asincrona, cancellazione effettiva non ancora osservata. Nessun lock irreversibile, soft delete/versioning OFF secondo conferma founder.
- Stato: **sealed integrity candidate, restore BLOCKED**. Non contare questo oggetto come recovery point validato né nella misura RPO.

## Blocker esatto del restore

```
pg_restore: error: could not execute query: ERROR:
insert or update on table "staff_revoked_sessions" violates foreign key constraint
"staff_revoked_sessions_session_id_fkey"
```

Migration 055 definisce `spot_private.staff_revoked_sessions.session_id REFERENCES auth.sessions(id) ON DELETE CASCADE`. Il capture esclude correttamente le vecchie sessioni per non riattivare accessi pregressi, ma include i dati della tabella figlia. Il vincolo viene quindi applicato su riferimenti privi del relativo parent.

È un difetto del contratto include/exclude del nuovo checkpoint, **non** una prova di errore nel lifecycle PHOTO o nell'autorizzazione staff in staging. Non è billing, IAM GCS, cifratura o indisponibilità Docker. Il download manuale ha superato il precedente limite del tool.

Restore eseguito su un database nuovo `soma_restored` nel solo Docker locale, usando `--exit-on-error --single-transaction`. Dopo l'errore: **zero tabelle applicative/Auth/Storage ripristinate**, cron locale OFF. Nessun vincolo disabilitato, nessuna ricevuta cancellata nella sorgente, nessuna vecchia sessione importata per far passare il test.

**Prossimo singolo passo proposto, non applicato:** definire un contratto di esclusione transitiva dei dati session-dependent e la relativa prova fail-closed. Stabilire quali ricevute non hanno più significato senza la sessione parent, come preservare revoche/role fences e come richiedere nuovi login/MFA dopo recovery. Testare dipendenze, stale-session e replay prima di un nuovo checkpoint. Non basta escludere la tabella figlia alla cieca o ignorare il vincolo; nessun cambiamento a migration 055, ruoli o MFA è autorizzato implicitamente da questo report.

## Isolamento e pulizia

Docker Desktop operativo dopo installazione manuale founder. PostgreSQL locale 17.11, compatibile con la major sorgente. Rete dedicata Docker `--internal`, DB senza porte pubblicate; porta host rifiutata e probe verso Supabase esterno fallito prima dell'importazione. Nessuna credenziale sorgente nei servizi di restore. Lettori sorgente effimeri separati dalla rete di restore.

Il bootstrap vuoto aveva pubblicato porte su tutte le interfacce nonostante l'opzione loopback della rete: DB e gateway sono stati ricreati senza port binding **prima di importare dati**. Nessun dato sorgente presente durante quella fase. Gateway locale successivamente non avviabile per certificato bootstrap mancante: resta un ulteriore prerequisito per il futuro smoke HTTP, non la causa dell'errore FK.

Il DB nuovo è stato inizializzato con le estensioni disponibili richieste; public/extensions già inizializzati sono gli unici CREATE SCHEMA omessi dal catalogo di restore. Ownership e altri oggetti non ignorati indiscriminatamente. La transazione di import è stata annullata per intero. File decifrati, manifest dettagliato e catalogo/log temporanei del restore rimossi dopo la diagnosi. Restano intenzionalmente archivio cifrato, chiave separata privata e summary minimizzato, tutti fuori Git; container locali vuoti dedicati ancora presenti. Nessuna fixture utente creata o cancellata nello staging corrente.

## RPO/RTO e operatività non dimostrati

- Cutoff e completamento upload sono misurati; **non dimostrano RPO ≤24h** senza restore valido e ciclo giornaliero governato.
- **RTO non attestato**: restore DB non completato, passaggio di download manuale e timeout inclusi nel percorso reale. Non azzerare il cronometro dopo la fase lenta per dichiarare un RTO favorevole.
- Backup giornaliero automatico Storage/checkpoint e identità writer minima non attivati. Non è stato creato un service account o un job cloud per aggirare i gate.
- Chiave solo locale non equivale a custodia recovery indipendente verificata. Recuperabilità della chiave e replay restano gate.
- Nessun nuovo piano, PITR, provider, account cloud o risorsa a pagamento aggiuntiva creati in questa ripresa oltre all'oggetto nel bucket già autorizzato.

## Codice, test e invarianti

Nuovi moduli operatore: `scripts/recovery/checkpoint-artifact.mjs`, `source-connection.mjs`, `snapshot-inventory.sql`, `capture-staging.mjs`; test `tests/recovery-checkpoint-artifact.test.js`. Nessun modulo app, schema, RLS, Edge o policy prodotto modificato.

- Test recovery: **15/15 PASS** — integrità, autenticazione, chiave errata, corruzione, manifest, traversal/symlink, file cambiato/mancante, pubblicazione concorrente, parser e target staging.
- Suite completa: **821/821 PASS**, zero skip/fail.
- Build **PASS**, typecheck **PASS**.
- Questi test non coprono con successo il restore DB reale: il FAIL live resta prevalente sul gate.
- Main e origin/main restano `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; nessun deploy/azione Production.
- PHOTO, retention, Discovery, Notifications e scheduler staging non modificati; nessun job abilitato da questo task. Ultimo stato operativo noto: Retention Phase A giornaliero 03:00 UTC; PHOTO cleanup/scheduler, Discovery e Notifications delivery OFF. Nessuna nuova lettura live finale dei flag viene spacciata per verifica effettuata dopo il restore fallito.

**Nessuna azione manuale immediata richiesta al founder.** Serve prima approvare il piccolo intervento al contratto checkpoint e le prove fail-closed; non un upgrade, acquisto o restore distruttivo. Commit/push di codice operatore e report sul solo branch staging; hash finale nella consegna/Git.
