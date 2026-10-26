# SOMA — Backup / Restore + Vercel rollback proof

26 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `b1ab8e2fe913371670f9bd6b0ceeb86823463a71`. Audit read-only, documentazione e test locali; nessun restore, deploy, alias change, nuovo provider o upgrade. Main/Production invariati.

**BACKUP / RESTORE + VERCEL ROLLBACK: BLOCKED**

## A–C. Database: capacità, provenienza e restore

Target unico: Supabase staging `zjinjtkekmaqtxsuyvho`, regione `eu-west-1`. Il breadcrumb provider “main PRODUCTION” identifica il branch interno del progetto staging: non è il progetto Soma Production né Git main. Ogni operazione deve verificare il ref, non il solo nome ambiente.

| Verifica live | Risultato | Conseguenza |
|---|---|---|
| Piano console organizzazione | FREE | Nessun acquisto effettuato |
| Scheduled backups | Console: Free non include project backups; Pro propone 7 giorni | Backup automatico utilizzabile non dimostrato |
| API backup | `backups:null`, `physical_backup_data:{}`, `pitr_enabled:false`, `walg_enabled:true` | WAL-G abilitato non prova un restore point accessibile |
| Ultimo timestamp recuperabile / tipo / retention effettiva | Non disponibile | Provenienza del backup non dimostrata; STOP restore |
| Branch isolati esistenti | 0 | Nessuna destinazione di recovery verificata |
| Restore to new project | Console richiede Pro o superiore e physical backups | STOP prima di upgrade/creazione/restore |
| Copie esterne | UNKNOWN | Non assumere né esistenza né assenza |

Controlli ripetibili non distruttivi: `supabase backups list --project-ref zjinjtkekmaqtxsuyvho --output json` e `supabase branches list --project-ref zjinjtkekmaqtxsuyvho --output json`. Usare l'autenticazione CLI del titolare; non cercare secret o credenziali nei file. La connessione corrente consente inventario; autorizzazione provider al restore e custode recovery devono essere verificati separatamente. I ruoli applicativi ADMIN/MODERATOR non conferiscono accesso console/DB.

Il provider distingue backup DB e file Storage; Free non costituisce qui un backup operativo verificato. [Supabase backups](https://supabase.com/docs/guides/platform/backups). Console consultata: `/database/backups/scheduled`, `/pitr`, `/restore-to-new-project` nel solo progetto staging. Nessun pulsante Upgrade/Restore/Create confermato.

**Restore cloud NON eseguito.** Il test locale PostgreSQL/PGlite ripristina uno snapshot sintetico in un secondo database e verifica schema/quarantena/rischio di resurrezione. Non prova backup Auth gestito dal provider, ripristino cloud, bytes foto, tempi di recovery o accesso operativo.

## D–E. Storage distinto dal database

Inventario aggregato del 26 ottobre: bucket `profile-photos` privato, **42 oggetti metadata**, 4 foto correnti; riferimenti current e varianti mancanti nei metadata: 0. Non sono stati scaricati file reali: questo non è un controllo GET/hash dei bytes. Ledger: 4 current settled, 8 ready settled, 3 review unknown, 112 purged settled. Nessun oggetto o stato PHOTO modificato.

Sei oggetti sono fuori dalla semplice proiezione dei path ledger, ma sono referenziati da `photo_assets`. Non sono foto correnti; non risultano referenze manifest/job/validated nella verifica effettuata, e i relativi asset non si collegano al ledger tramite `photo_path`. È un gap di riconciliazione/attribuzione da preservare, **non prova di orfani eliminabili**. Le tre review restano protette. Nessun cleanup ad hoc.

Il DB salva riferimenti/manifest, non i pixels. La compatibilità S3 Supabase non supporta versioning: non esiste qui prova di undelete/snapshot Storage utilizzabile. [Compatibilità S3](https://supabase.com/docs/guides/storage/s3/compatibility). Le tabelle Storage rappresentano metadata e non vanno mutate per recuperare file. [Storage schema](https://supabase.com/docs/guides/storage/schema/design).

| Scenario | Recovery effettivamente disponibile |
|---|---|
| DB perso, Storage sano | Ripristino DB coerente e riconciliazione necessaria; nessun backup DB verificato oggi |
| DB ripristinato, Storage invariato | Rischio riferimenti a file già eliminati e resurrezione di dati/receipt; verificare cutoff e replay |
| Storage perso, DB sano | Manifest/path/size/hash possono diagnosticare, non ricostruire i pixels |
| Perdita dei 42 oggetti | Ricostruzione non dimostrabile senza copia bytes verificata; nessuna promessa di recupero |

Nessun drill Storage cloud eseguito: manca un backup path governato approvato, non va simulato recupero con il solo metadata DB. Mitigazione minima candidata: backup cifrato e con scadenza delle sole varianti canoniche ancora necessarie, manifest coerente con cutoff DB, ownership/accessi separati, prova sintetica di ripristino bytes/policy/riferimenti e cancellazione della copia di test. Non reintrodurre originali scartati da PHOTO; copie senza retention/replay delete non sono accettabili. Durata, destinazione/costi e owner devono essere approvati; nessuna nuova retention introdotta. Una copia nello stesso account/provider non è indipendente da perdita totale di quell'account/provider.

## F. RPO/RTO

RPO candidato ≤24h per DB e Storage separatamente; RTO candidato poche ore/stesso giorno operativo: **NON dimostrati, non SLA approvati**. Nessun timestamp di backup recuperabile, copia Storage o drill cloud cronometrato. Il tempo dei test locali non misura il recovery del servizio. L'upgrade da solo non chiude questi gate.

## G–J. Vercel: accesso, inventario e prova

Il 403 precedente era autorizzazione della connessione allo scope team `fedegrasso1994-1482`, non errore dell'app o necessità di disattivare Deployment Protection. Dopo approvazione founder della richiesta ufficiale monouso, le medesime letture project/deployments funzionano. Nessun token manuale raccolto. Piano Vercel e permessi di scrittura/rollback non dimostrati da queste letture.

Progetto `spot-now`, ID `prj_zJG3gK7HboAKb0H6XMlF6yRZ5sWZ`, team `team_wlAVvnWmjj5TSD0TS72gXO92`. Entrambi i deployment seguenti READY, branch staging, target Preview (`target:null`):

| Ruolo nella simulazione | URL immutabile | Deployment | Commit |
|---|---|---|---|
| A: Preview corrente identificata | https://spot-pbhht3a4y-fedegrasso1994-1482.vercel.app/ | `dpl_CWHd6z2bQmXUssX8FSaQfwYyZMXW` | `3f17ff1523cf98eb1b9c388cc6bac48518f3ae93` |
| B: precedente Share con evidenze storiche | https://spot-2rhspdi2y-fedegrasso1994-1482.vercel.app/ | `dpl_2svcK7Ze1jPedMxB2ThMJyfF3wtG` | `e8a399d72bcc1da86ebc513e3134670a5fa5e2d7` |

La Preview corrente non serve il HEAD documentale/staff attuale. Non dedurre compatibilità completa o “known-good per tutto il pilot” dal solo READY o dalle prove storiche Share. Prima di un vero fallback servono smoke autenticati e confronto contratti backend correnti.

**Simulazione read-only A → B → A: PASS nel perimetro shell pubblica.** Browser reale: benvenuto Soma renderizzato su tutte e tre le navigazioni. Entry JS corrente `/assets/index-pQLF8Mq3.js` e precedente `/assets/index-DUWZ0SkY.js`: HTTP 200, configurazione Supabase staging presente, ref Production assente in tali entry. Non è una scansione esaustiva di ogni chunk/env. Nessun login o contenuto protetto usato, nessun redirect Auth cambiato.

**Rollback alias reale e Production Instant Rollback NON eseguiti.** I due alias esistenti `spot-now-alpha.vercel.app` e `spot-now-fedegrasso1994-1482.vercel.app` puntano entrambi prima/dopo a `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`. Non esiste nell'inventario un alias staging mutabile dedicato; cambiare quelli esistenti rischierebbe Production. Il rollback Production richiede un deployment già assegnato a domini Production; i due candidati Preview risultano `isRollbackCandidate:false`. [Instant Rollback](https://vercel.com/docs/instant-rollback).

Deployment Protection invariata prima/dopo: Vercel Authentication `enabled:true`, `all_except_custom_domains`; password protection disabilitata già prima. Nessuna apertura o bypass persistente; nessuna modifica env/alias/deployment/Production. Il fallback URL è reversibile tornando ad A, non dimostra un cambio di route/alias centralizzato né privilegi per farlo.

## K. Procedura di recovery e acceptance

Runbook aggiornati: [RB-A/B/D](soma-ops-runbooks-2026-10-23.md). Sequenza da eseguire solo dopo chiusura prerequisiti:

1. Owner approva capacità/piano, backup verificabile con timestamp/tipo/retention e destinazione isolata. STOP se provenance o ref non coincidono.
2. Quarantena prima dell'import: nessun writer, cron, pg_net, webhook, SMTP/push o credenziale riutilizzabile verso source. Un clone fisico può avviare job immediatamente; non basta spegnerli dopo il clone. [Avvertenze clone](https://supabase.com/docs/guides/platform/clone-project).
3. Restore selettivo isolato senza overwrite staging. Verificare schema, FK, tabelle critiche, RLS/policies/grants/RPC e integrità Auth/prodotto. Ledger migration storico incompleto: 36 versioni non registrate; nessun repair per supposizione.
4. Verificare compatibilità 055 e account/fence/sessioni; restore può resuscitare vecchie revoche, grant e sessioni. Il solo codice 055 non protegge contro rollback dell'intero stato di sicurezza. Replay indipendente approvato di cancellazioni/revoche/ban e hold successivi al cutoff, prima di accessi o riapertura. Registro durabile di replay ancora non dimostrato.
5. Ripristinare solo bytes canonici necessari da manifest coerente; verificare hash/policy privata/ownership/current/quota e oggetti mancanti. Nessun purge unknown per timeout.
6. Canary sintetici auth/MFA/diritti/PHOTO/core, zero egress non previsto, approvazione riapertura a gate e job ultimi; registrare RPO/RTO reali. Eliminare ambiente/copie del drill secondo autorizzazione e retention approvata.

## L. Blocker e prossime azioni minime

| Priorità | Gap | Owner / decisione richiesta | Evidenza di chiusura |
|---|---|---|---|
| P0 pilot | DB senza backup recuperabile verificato | Founder approva piano/costi o alternativa logica governata separatamente | Timestamp, provenienza, retention, accesso recovery e restore isolato riuscito |
| P0 pilot | Storage senza backup bytes governato | Founder + tecnico recovery; destinazione/retention/accessi da approvare | Restore sintetico bytes/policy/manifest, expiry e replay deletion |
| P0 pilot | Quarantena e replay post-backup non provati cloud | Operatore recovery da confermare | Nessun egress/cron, nessuna resurrezione account/dati/privilegi |
| P1 | Vero rollback route/alias staging non provato | Owner deployment; definire route staging isolata se necessaria | Switch autorizzato B→A + smoke auth, senza domini Production |
| P1 | Drift migration ledger / release compatibile | Tecnico release | Mappa versioni e contratti verificata prima del restore, senza repair cieco |

Nessuna azione su SMTP/support/device QA. Staff ADMIN e MODERATOR preservati, conteggi ruoli attivi 1/1; nessuna modifica MFA o ruolo. Cron staging Phase A resta `0 3 * * *`; nessun job attivato/disattivato. PHOTO invariato.

## M–R. Verifiche, file e Git

- Targeted ops/inventory/staff: **12/12 PASS**.
- Full suite: **806/806 PASS**, zero fail/skip/cancel.
- Build: PASS. Typecheck: PASS.
- Nessun runtime, migration, RLS, API, env, secret o test modificato. Nessuna fixture cloud creata, nessun file foto scaricato, nessun restore/upgrade effettuato.
- Evidenze minimizzate: [JSON](evidence/ops-phase-a/backup-restore-rollback-2026-10-26.json); report + runbook + indice readiness aggiornati. Output CLI locali esclusi da Git; nessuna credential/link Auth/UGC esportata nel report.
- Commit/push di questa documentazione sul solo branch staging; SHA finale nella risposta e in Git. Main resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

**BACKUP / RESTORE + VERCEL ROLLBACK: BLOCKED**
