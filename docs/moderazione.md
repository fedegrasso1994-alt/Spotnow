> Documento storico: il flusso attuale e lo stato verificato sono in `revisione-adversariale.md` e `operazioni-pilota.md`. Le sezioni precedenti possono descrivere ingresso anonimo, Google dopo il match o match a scadenza, oggi superati.

# Revisione riservata delle segnalazioni

Solo gli amministratori del progetto Supabase possono leggere la coda tramite SQL Editor. Nessun accesso frontend alla tabella `spot_private.reports`.

```sql
select id, reporter_id, target_id, reason, details, created_at, status
from spot_private.reports where status = 'pending' order by created_at;
```

Dopo una revisione umana, usare l’ID esatto della segnalazione per aggiornare `status` a `reviewed` oppure `dismissed` e `reviewed_at` a `now()`. Questi stati registrano la revisione, non sospendono l’account. Non condividere dettagli o identità del segnalante con il profilo segnalato.

Il blocco impedisce alla coppia di vedersi o scriversi. La sospensione globale è disponibile tramite SQL amministrativo; il pannello amministrativo resta da implementare. La segnalazione non promette tempi di risposta o sanzioni automatiche.

## Sospensione e revoca

Dopo la revisione umana, usare l’UUID esatto del profilo:

```sql
select spot_private.suspend_profile('UUID_PROFILO'::uuid, 'Motivo della decisione');
```

Per revocare la sospensione:

```sql
update spot_private.suspensions set revoked_at=now()
where user_id='UUID_PROFILO'::uuid and revoked_at is null;
```

La sospensione nasconde il profilo alle altre persone e impedisce check-in, interessi e accesso ai match per entrambe le parti. La persona può ancora leggere il proprio profilo. I dati sono conservati e la revoca ripristina l’accesso secondo le normali regole di presenza, blocco e scadenza. Le URL delle foto già firmate possono restare valide per un massimo di 30 secondi.

Migrazione 004 applicata; test SQL con fixture e rollback superati. Nessun account reale sospeso. Schermata dedicata implementata: verifica all’apertura e ogni 15 secondi mentre l’app è visibile, più pulsante di controllo manuale. RPC my_account_status restituisce solo lo stato del chiamante. Resta il percorso di contestazione della decisione; il pannello amministrativo è descritto sotto.

## Pannello gestore

Disponibile su `/?admin=1`, con login Google e sessione distinta dall’app utenti. Le RPC verificano l’UUID in `spot_private.moderators`: il frontend non contiene credenziali privilegiate. La coda mostra le ultime 100 segnalazioni, consente verifica/archiviazione/sospensione/revoca e registra attore, azione e nota nella tabella privata di audit.

Il proprietario ha autorizzato il ruolo gestore per il proprio account Google verificato il 2 ottobre 2026. Assegnazione applicata al singolo UUID individuato nel database; accesso al pannello confermato nel browser, coda vuota. Prima di assegnare un ruolo identificare l’account Supabase con email verificata e identità Google, poi ottenere conferma esplicita per la lettura delle segnalazioni e gestione delle sospensioni. Non assegnare privilegi sulla sola email digitata nel frontend. Migrazione 006 e test SQL PASS (nessun auto-assegnamento, lettura/azioni negate ai non gestori, sospensione/revoca e audit). Il pannello richiede aggiornamento manuale; nessuna notifica automatica ai gestori.

Da cambiare prima del lancio: trasferire il ruolo a un account amministrativo dedicato, verificarne l’accesso e poi revocare il ruolo dell’account personale.

Collaudo browser reale completato su Test Anna: sospensione, revoca e archiviazione registrate nell’audit. Stato finale attivo; report di prova archiviato e conservato.
