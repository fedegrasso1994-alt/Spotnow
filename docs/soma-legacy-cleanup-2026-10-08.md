# Soma — cleanup legacy in produzione

Data: 8 ottobre 2026. Progetto: `qlucwdjcjomwyziegxrn`.

## Esito

GO: cleanup completato e verificato. Nessuna normalizzazione effettuata. PHOTO-02 non avviata.

Autorizzazione founder: tutti i profili associati alle 10 foto legacy sono sacrificabili. La lista è stata fissata agli UUID del precedente dry-run, non ricavata da un criterio di cancellazione generale. Ricontrollati prima di ogni mutazione: esatta corrispondenza dei 10 profili e percorsi, account Auth, 22 oggetti e assenza di riferimenti esterni. I due originali orfani erano nei folder di questi account e non referenziati da profili, asset, legacy, foto validate o job.

## Procedura

Usate le API amministrative con le stesse regole del normale delete-account: begin_account_deletion per tutti i target, photo_deletion_barrier (nessun job attivo), rimozione degli oggetti del solo UID autorizzato, prepare_account_deletion, hard delete Auth. Nessuna impersonificazione/login dei profili e nessun reset credenziali. Journal privato salvato dopo ogni operazione; errore o oggetto inatteso avrebbe arrestato la procedura.

Rimossi 10 account Auth e 22 oggetti Storage: 10 foto correnti, 10 varianti e 2 originali orfani. Le cascades e prepare_account_deletion hanno eliminato 67 righe applicative preesistenti, distribuite come segue:

| Tabella | Righe rimosse |
|---|---:|
| `public.profiles` | 10 |
| `public.checkins` | 10 |
| `public.blocks` | 1 |
| `spot_private.interests` | 6 |
| `public.matches` | 2 |
| `public.messages` | 7 |
| `spot_private.reports` | 1 |
| `spot_private.moderation_audit` | 3 |
| `spot_private.suspensions` | 1 |
| `spot_private.moderators` | 1 |
| `spot_private.tribe_memberships` | 10 |
| `spot_private.account_deletions` | 0 |
| `spot_private.photo_assets` | 5 |
| `spot_private.photo_legacy` | 10 |
| `spot_private.photo_upload_accounts` | 0 |
| `spot_private.photo_upload_jobs` | 0 |
| `spot_private.validated_photos` | 0 |

I 10 marker temporanei account_deletions creati dalla procedura sono stati eliminati dalla cascade Auth; non sono inclusi nelle 67 righe preesistenti. Identità/sessioni/refresh token/MFA risultano senza residui per i target; non si attribuisce un numero di righe eliminate a queste tabelle senza un conteggio iniziale.

## Verifiche finali

- Controllo indipendente SQL: zero account/profili/foto legacy/oggetti Storage rimanenti; zero righe target in tutte le 17 tabelle verificate.
- Nessun riferimento pendente o oggetto Storage orfano presente.
- Hash delle righe non correlate invariati, hash delle venue e dei codici QR invariati, definizioni FK invariate.
- Suite attuale: 188/188 PASS; build PASS; typecheck PASS.
- Nessuna modifica a codice runtime, PHOTO-01, schema, RLS o API; nessun deploy/migration.

## Limiti e seguito

Al momento della cancellazione tutti gli account di produzione coincidevano con i dieci target autorizzati: non sono stati coinvolti account ulteriori. Tra i target era presente l’unico moderatore: prima del pilot va predisposto un account moderatore dedicato. Il database di utenti/social è ora vuoto; i contenuti di test non sono recuperabili tramite il normale prodotto.

Non sono stati eseguiti nuovi smoke test social con utenti dopo il cleanup, perché richiederebbero creare nuovi dati. Le verifiche dimostrano integrità dei dati residui e suite invariata, non un nuovo collaudo completo multiutente.

Non restano foto legacy da normalizzare. È possibile avviare PHOTO-02 come task separato. Non è una dichiarazione di readiness del pilot.

Le informazioni diagnostiche private restano in `.local/photo01-legacy-cleanup/` (ignorato da Git); nessuna foto o chiave inclusa nel report pubblico. Credenziali temporanee e script diagnostici rimossi al termine.
