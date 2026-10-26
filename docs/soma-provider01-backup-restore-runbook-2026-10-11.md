# Soma — backup/recovery pre-pilot: runbook candidato

Design soltanto; nessun backup/export reale creato in PROVIDER-01. Owner Federico + tecnico nominativo, revisione retention/diritti da professionista. Nessun originale foto reintrodotto. Applicare solo con autorizzazione successiva e prove sintetiche.

Aggiornamento 26 ottobre: [strategia consolidata e decisioni necessarie](soma-backup-strategy-isolated-restore-plan-2026-10-26.md). Prevale per capacità/prezzi verificati e prossima scelta architetturale. Durate e destinazioni sono ancora proposte, nessun export/backup attivato. Il precedente divieto di export laptop riguarda copie non governate: il nuovo documento valuta soltanto supporto offline dedicato cifrato, ancora da autorizzare.

## Copie e obiettivi distinti

| Piano candidato | DB/Auth | Storage foto | RTO candidato |
|---|---|---|---|
| Minimo Pro | backup giornaliero; RPO fino a 24h, rolling 7d provider | snapshot canonicale validato almeno giornaliero; RPO fino a 24h; rolling 7d candidato | 4h per servizio completo, da misurare |
| Recovery più stretto | PITR opzionale se budget approvato; candidato RPO 15min da verificare | snapshot incrementale orario; RPO 1h se realizzato e collaudato | 4h da misurare |

RPO DB e Storage diversi richiedono riconciliazione: non promettere recupero coerente al secondo più recente. Questi obiettivi NON sono approvati; INCIDENT-01 deve definire perdita/downtime accettabili, budget, owner reperibile e recovery tests. Il piano Pro non garantisce RTO 4h. DB backup contiene dati/Auth/metadati Storage, **non bytes foto**. [Documentazione](https://supabase.com/docs/guides/platform/backups).

DB comprende prodotto, ledger PHOTO, quota, job e policy/config versionate. Separare dati di safety soggetti a hold. Non duplicare log/diagnostica o code HTTP come backup permanente. Inventariare backup provider, snapshot operatori e artifact; ogni copia ha owner, scadenza, cifratura, accesso e prova delete/expiry.

Storage: selezionare solo oggetti canonicali pubblicati ancora necessari (detail/thumb e copie effettivamente previste dal contratto). Input originali, draft scaduti, failed e retired eleggibili **non entrano nella selezione**. Writer review/incerti restano governati dalla reconciliation PHOTO, non classificati/copiati/cancellati per età. Niente versioning infinito, export sul laptop o bucket pubblico. Possibile destinazione da valutare: bucket privato separato sullo stesso provider con ruolo limitato e cifratura; **non creato**, costo/capacità/resilienza separata da approvare. Non è automaticamente un backup indipendente dal guasto dell'intero provider/account.

## Snapshot coerente, specifica per implementazione successiva

1. Pianificare finestre/TTL configurabili e accesso break-glass MFA auditabile. Nessun secret nei manifest/log. Separare chi può cancellare produzione da chi può cancellare backup, compatibilmente al piano.
2. Acquisire snapshot DB e manifest referenze correnti/versione, chiavi immutabili, hash/size e schema commit. Minimizzare dati nel catalogo; non includere preferenze/chat/foto duplicate nei log.
3. Copiare canonicali referenziati; replace/delete concorrenti possono rimuovere oggetti dopo grace: usare il protocollo di protezione PHOTO o abortire/retry snapshot se lettura/versione non coincidono. Non allungare retention PHOTO implicitamente. Snapshot non completo non diventa restore point valido.
4. Verificare hash, riferimenti e consistenza DB/Storage; pubblicare catalogo atomicamente dopo successo. Pulire copie temporanee incomplete con retry idempotente e TTL documentato.
5. Applicare rolling expiry a DB/catalogo/Storage, comprese eventuali versioni delete marker del backup. Evidenza giornaliera minimizzata di successo/failure/expiry, alert senza UGC.

## Cancellazione/revoca e backup non editabili

Delete account/retention agiscono subito sulle copie attive secondo i contratti. Un backup provider immutabile può contenere dati fino alla sua scadenza: impedirne l'uso ordinario, documentare durata massima/accesso/expiry e far validare modalità e disclosure al professionista. Non promettere erase immediato di backup non modificabili.

Per evitare resurrezione, prevedere registro minimo separato di deletion/revoca/purge successivi al restore point (identificatore tecnico, cutoff, evento/policy version), senza contenuti dating. Conservazione limitata alla finestra backup più buffer approvato; ruolo dedicato, integrità/audit e cancellazione del registro alla scadenza. **Da progettare/implementare in RIGHTS/INCIDENT, non presente per effetto di questo documento.** In sua assenza recovery all'apertura è NO-GO se non si possono riapplicare affidabilmente gli eventi. Safety hold distinto, motivato/auditabile e con durata validata, mai per discovery.

## Restore isolato: gate obbligatorio

**Rischio concreto:** clone fisico/PITR può riattivare pg_cron/pg_net prima che un operatore li spenga. Non clonare produzione in staging ordinario né presumere scheduler OFF dopo clone. [Avvertenza Supabase](https://supabase.com/docs/guides/platform/clone-project).

1. Prima di restore reali verificare isolamento di destinazione, network e credenziali. Preferire restore logico selettivo in recovery environment ristretto: escludere cron/net run state, Vault secrets, webhook/Auth hooks/email delivery e credenziali produzione; importare configurazioni operative OFF. Se isolamento preventivo non dimostrabile: STOP, coinvolgere provider. Non accendere/leggere reali dati nel normale staging.
2. Pause admission, cleanup, scheduler e retention/reconciliation side effects; applicare schema/Edge compatibili col restore point (attuale produzione 001–019; non applicare 020+ non rollate). Nessun ritorno al writer PHOTO-01.
3. Ripristinare DB e canonicali solo da restore point validato; niente originali. Confrontare manifest, ledger/quota/current, hash e Storage; missing/orfani/writer incerti → STOP/manual review, non purge per timeout.
4. Riapplicare deletion/revoca/purge/ban successivi prima di ogni accesso; scadere check-in non più validi, preservare Tribe senza ricostruire storico. Non resuscitare preferenze revocate, messaggi/account cancellati o sessioni/token obsoleti. Definire revoca sessioni/rotazione credenziali con Auth provider e prova sintetica.
5. Smoke sintetici Profilo/Ora/Tribe/Spot/match/chat/foto/delete e quota, cleanup dry-run, scheduler autenticato OFF. Misurare recovery point effettivo/RTO; verificare nessuna email, job o webhook non autorizzato partito.
6. Riaprire admission a gate; cleanup e scheduler per ultimi secondo PHOTO-02. Monitoraggio/stop immediato, nessun rollback distruttivo o writer legacy.
7. Scadere copie temporanee di recovery, revocare accessi temporanei e registrare solo contatori/esiti/commit e riferimenti a evidenze private redatte.

## Collaudo richiesto prima del pilot (non eseguito qui)

Fixture sintetica DB/Auth + foto canonicali; replace durante snapshot; delete/revoca dopo backup; file mancante; backup parziale; restore interrotto/retry; snapshot expiry; denied admin/read pubblico; cron/Vault/network isolation; core social; PHOTO quota/lifecycle. PASS solo con zero resurrezioni, zero originali, manifest coerente, RPO/RTO misurati e prova expiry. Nessun trattamento reale aggiuntivo autorizzato da questo runbook.
