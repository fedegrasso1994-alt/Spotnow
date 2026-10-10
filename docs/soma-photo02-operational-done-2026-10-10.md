# PHOTO-02 — DONE, produzione operativa

10 ottobre 2026. **PHOTO-02 = DONE.** Chiusura operativa autorizzata dal founder:
admission ON, cleanup globale ON, scheduler production ON. Tutti i gate live
superati; nessuna nuova migration, modifica dei decoder/limiti PHOTO-01 o deploy
Edge. Nessun cambiamento a UI/UX, Ora, Tribe, Spot, match o chat.

Questo report sostituisce, per lo stato operativo corrente, lo stato PAUSED dei
precedenti report storici. Non dichiara completati altri finding o la readiness
legale/operativa dell'intero pilot.

## GitHub e runtime

Merge controllato con PR [#1](https://github.com/fedegrasso1994-alt/Spotnow/pull/1):
`photo02-staging` HEAD `318a63af312205807310ddddf8d093e790780f8a` → main,
merge commit **`cfdd3cc83d767a693caac8c09d1932c07125558d`**. Nessun force push,
29 commit conservati. Checkout main allineato al remoto e pulito dopo il merge.

Confronto diretto: nessuna differenza tra main e runtime deployato
`ad27260be84e1f51d1b9f5678a4dd36422be5f29` in src, Edge Functions,
migrations o cutover. Commit successivi al runtime contengono test/report.
L'harness specifico della chiusura è pubblicato prima dell'esecuzione nel commit
main `72b19bbb6afc0945e6a22b425a423bce91fb790b`.

Il commit documentale che contiene questo report è verificabile nella storia
main; il suo SHA finale viene riportato anche nel messaggio di chiusura.
GitHub rimane la source of truth: nessun codice runtime soltanto locale,
nessuna migration riapplicata e nessuna modifica server ad hoc per bypassare gate.

## Nuovo epoch operativo e gate

Precheck fresco: PAUSED **epoch6**, un account/profilo reale, una current e tre
oggetti, zero writer incerti/review/processing/pending cleanup, zero missing,
orfani o quota oltre limite. Foto/Storage reali improntati prima del test.

Epoch6 era stato creato dalla pausa finale del cron precedente: si usa quel
nuovo epoch, senza ulteriore incremento artificiale e senza riusare
l'approvazione epoch5. CANARY limitato a tre account sintetici E/F/G tracciati
in manifest privato, email example.invalid, dati e immagini generati.

Publish/replace reali nell'epoch6, invalid file422, retry valido200 e delete G
attraverso endpoint reale soddisfano `approve_smoke` **verificato dal server**.
Global admission resta chiusa fino a nuova verifica SQL di ledger/Storage/quota
senza anomalie. Nessun aggiornamento manuale di smoke_epoch o altri flag.

Admission OPEN dal **10:13:47.524UTC / 12:13:47 italiane**. Smoke immediato:
upload JPEG200, publish/replace, vecchia foto ancora leggibile, tre nuove copie
leggibili, retry con stesso request id e stesso path, writer legacy rifiutato
PHOTO_PAUSED anche in OPEN. Cleanup/scheduler ancora OFF. Gate SQL PASS.

Prima del cleanup globale, E/F sono eliminati attraverso normale delete-account;
G già eliminato. Auth, profili, Storage e riferimenti validati; venue sintetica
rimossa solo dopo controllo nome/scopo esatto e zero check-in. Nessuna foto reale
modificata. Nessuna fixture attiva residua.

## Cleanup globale e scheduler

Dopo admission stabile e integrità nuovamente confermata:
- dry-run collector autenticato, revisione inventory senza writer incerti/review;
- `execute_all` autorizza scope globale, poi `execute_on`;
- claim della current restituisce null; la current non è eleggibile;
- collector reale ripetuto due volte: HTTP200, completed0/failed0/pending0,
  reviewed0/review_total0 e anomalies missing0/untracked0;
- nuovo gate SQL conferma Storage/quota coerenti e foto reale invariata.

Review/non eleggibili restano esclusi dalla policy verificata nella suite235 e
nel tick reale precedente con fixture review: nessuna modifica di quella policy.
Nessun review presente nello stato finale, nessun purge basato sull'età di un
writer incerto. Metadata conclusi mantengono retention7giorni.

Scheduler ON per ultimo, **10:15:11.974UTC**, job production esistente1,
cron `* * * * *`. Nessun nuovo job duplicato. Tick ordinario **10:16UTC**:

| Evidenza live | Esito |
|---|---|
| cron job1/run2 | succeeded, 10:16:00.144007 → 10:16:00.168668UTC |
| pg_net request2 | HTTP200, no timeout, error null |
| Risposta collector | completed0, failed0, pending0, reviewed0, review_total0 |
| Anomalies | missing0 / untracked0 |
| Reconciliation / metadata purge | 0 / 0 |

Cron succeeded indica il dispatch; **HTTP200 e body pg_net** provano anche
l'esecuzione autenticata. Nessuna invocazione manuale del collector nella
finestra di questo tick; correlazione job/run/request/timestamp. Nessun doppio
processing osservato; non esistono elementi eleggibili residui da riprocessare.
Il purge effettivo e la sua idempotenza sono già dimostrati dal precedente
[collaudo cron](soma-photo02-production-real-cron-2026-10-10.md).

## Stato finale verificato

| Invariante | Valore |
|---|---|
| Phase / epoch / smoke | OPEN / 6 / approvato server |
| Admission / execute globale / scheduler | ON / ON / ON |
| Cron production attivo | 1 job |
| Account / profili / current reali | 1 / 1 / 1 |
| Foto Storage | 3oggetti, 368.181byte |
| Ledger | current1, purged17 |
| Unknown/review/processing/pending cleanup | tutti0 |
| Orfani / riferimenti mancanti / quota over limit | tutti0 |
| Purged con riserva nonzero | 0 |
| Quota charged attiva | 9.469.184byte |
| Account/venue sintetici attivi | 0 |

Quota charged è la riserva conservativa del set reale (9MiB+32.000byte), non i
byte fisici dei tre file. I17 ledger purged sono metadata tecnici conclusi
con riserva0, soggetti alla retention7giorni: non originali né orfani permanenti.

Impronte prima/dopo identiche: foto reale
`481b0f016cdb54faae1218e1442fc4e5`, Storage reale
`1da7f863e3fdf3b4b541c0ce876246da` (id/name/metadata ordinati). Tutti i tre oggetti
reali e la foto corrente preservati. Nessun errore nelle evidenze collector,
cron/pg_net o gate SQL. Le chiavi temporanee locali vengono rimosse al termine;
nessun nuovo segreto creato o versionato.

## Smoke e verifiche

In questa chiusura: fresh session, Profilo, QR/check-in, discovery Ora con foto e
senza timestamp precisi altrui, Tribe membership, reciprocal Spot, match, chat e
persistenza/lettura dopo refresh; doppio invio stesso nonce produce un messaggio.
Prove tramite backend applicativo/RPC/Storage reali, non collaudo visuale manuale
su ogni modello di telefono. JPEG/PNG/WebP, race/quota/review/grace/delete e purge
reale rimangono coperti dalle prove PHOTO-02 già versionate; non si presentano
come ripetuti integralmente in questo task.

Suite finale dopo aggiunta harness: **235/235 PASS**, build PASS, typecheck PASS.
Solo file aggiunti in questo task: harness diagnostico e report MD/JSON.
Nessun comportamento runtime diverso da quello già verificato/deployato.

## Pausa operativa disponibile

In caso di anomalia: `photo_cutover_scheduler_configure(enabled:false)` con
service_role verificato del progetto, poi `photo_cutover_set(action:'pause')`.
La pausa chiude admission, execute e scheduler, preserva la current e crea nuovo
epoch invalidando approval. Non può richiamare richieste HTTP già in volo:
ricontrollare ledger/Storage/writer e riconciliare con evidenze prima di riaprire.
Mai rollback al writer PHOTO-01 dopo017; nessun rollback schema distruttivo.
Nessun rischio irrisolto che impedisca questa attivazione PHOTO-02.
