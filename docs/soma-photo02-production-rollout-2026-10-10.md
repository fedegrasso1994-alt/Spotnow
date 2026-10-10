# PHOTO-02 — rollout produzione interrotto al gate canary, 10 ottobre 2026

**STOP / rollout non completato. Admission OFF, execute OFF e scheduler OFF.**
Il rollout era esplicitamente autorizzato dal founder con arresto al primo gate
live non verificabile. La verifica del canary non è stata possibile: il runner
non risolve più `qlucwdjcjomwyziegxrn.supabase.co` (`ENOTFOUND`). Questo è un
problema osservato sul percorso di rete del runner; non dimostra un outage del
provider né un difetto applicativo. Nessuno smoke viene dichiarato passato.

## Versione e operazioni completate

Codice collaudato: `ad27260be84e1f51d1b9f5678a4dd36422be5f29`.
Branch `photo02-staging`, HEAD prima del rollout
`c781c014ed0b292a6094700fb2ffd36fbdf898d9`; codice runtime identico al commit
collaudato. Nessun merge su main, che resta sulla versione precedente.

1. Frontend compatibile: deploy Vercel Ready, alias `spot-now-alpha.vercel.app`.
   Deployment `spot-fvk26hbbu-fedegrasso1994-1482.vercel.app`.
   Test 235/235, typecheck, build e release check passati. Index, tre asset
   hashed e manifest Soma verificati sul sito pubblico.
2. `supabase/cutover/prepare.sql`: installazione atomica PAUSED;
   execute/scheduler false, nessun writer incerto/inflight/delete pendente.
3. Bridge PHOTO-01 pubblicato come `photo-assets` con admission OFF.
4. `close` → DRAINING; ricontrollo live; `photo_cutover_assert_drained()`
   superato → SCHEMA_LOCKED.
5. Migration 017: ledger importato con una sola foto `current`, writer settled,
   riserva conservativa 9.437.184 byte. Impronte profilo/Storage invariate.
6. Migration 018: review/quarantena installata, nessun record review.
7. Migration 019: fence di protocollo/cleanup e runtime wrapper installati.
8. Pubblicate le funzioni `photo-assets` PHOTO-02, `delete-account` PHOTO-02 e
   `photo-lifecycle`. Il dashboard conferma i deploy. I tre decoder PHOTO-01
   non sono stati deployati né modificati.
9. Installato `supabase/cutover/scheduler.sql` (pg_cron, pg_net e configuratore
   autenticato). **Configurazione del job e attivazione non eseguite.**

La chiamata iniziale per creare il primo account sintetico è fallita per DNS,
prima del canary. La verifica finale SQL conferma che non è stato creato alcun
account: produzione resta con un solo account/profilo.

## Stop e verifiche finali

Eseguita pausa operativa tramite dashboard SQL: phase PAUSED, epoch3;
execute/scheduler false. Non eseguiti approve_smoke, open, execute_all o cleanup.

| Gate verificato nel database live | Risultato |
|---|---|
| Account / profili / foto correnti | 1 / 1 / 1 |
| Oggetti Storage foto | 3, invariati |
| Ledger | 1 current, nessun writer unknown/review |
| Missing / orfani | 0 / 0 |
| Upload legacy in corso / incerti | 0 / 0 |
| Delete/cleanup pendenti | 0 / 0 |
| Scheduler attivi PHOTO-02 production | 0 |
| Impronte foto e Storage rispetto alla baseline | identiche |

Impronta foto `481b0f016cdb54faae1218e1442fc4e5`;
impronta catalogo Storage `dac9a189fe97289fac5d32823e72726b`.
Questo controllo prova invarianti catalogo/riferimenti; non sostituisce gli
smoke HTTP di visualizzazione, upload e social ancora da eseguire.

Una query diagnostica iniziale ha citato una tabella quota inesistente:
`photo_storage_quota`. È stata corretta usando `reserved_bytes` del ledger;
nessuna modifica dati da quella query fallita e nessun gate applicativo aggirato.

## Smoke ancora NON eseguiti

JPEG/PNG/WebP, file invalido, retry/idempotency, replace e grace, visualizzazione
Profilo/Ora/Tribe, QR/Spot/match/chat, delete account, quota e draft limit, cleanup
idempotente, authenticated collector e scheduler reale. Il test PAUSED runtime
non ha raggiunto l'endpoint; non è conteggiato come PASS. Non riaprire admission
prima di aver verificato tutto il canary.

## Stato operativo e ripresa sicura

Gli upload/replace foto e la pubblicazione di nuovi profili foto restano
bloccati dalla barriera; anche la cancellazione account resta soggetta alla
pausa del cutover. La foto corrente non è stata persa o sostituita. Non si
asserisce che gli altri flussi siano stati ricollaudati dopo il deploy.

Dopo 017 non tornare al writer PHOTO-01. Il rollback operativo attuale è già
attivo: PAUSED + execute/scheduler OFF con codice PHOTO-02 compatibile. Nessun
rollback distruttivo dello schema. Non riapplicare prepare/017/018/019/scheduler
SQL: sono già installati.

Alla ripresa: ristabilire l'accesso API dal runner, ricontrollare live i gate e
le versioni Edge, configurare il job autenticato OFF, preparare fixture
sintetiche isolate, CANARY e smoke completi. Solo dopo PASS: approve_smoke →
OPEN → verifica globale e dry-run → execute_all/execute_on → scheduler ON per
ultimo → controllo post-scheduler. Usare il grace reale di5min senza anticipare
la scadenza di dati reali. Nessun purge di writer incerti basato sul tempo.

Le credenziali locali temporanee vengono rimosse. Nessuna foto/account reale
usata come fixture; nessun dato reale cancellato. Nessuna modifica ai decoder,
limiti PHOTO-01 o UX aggiuntiva. Report aggregato nel JSON omonimo.
