# BACHECA-01 — piano implementazione staging

14 ottobre 2026. Baseline `73eaa31`, branch `codex/bacheca-01-staging`. Contratto founder approvato; validazione legale pending. Nessun merge main/produzione, nessun Cupido/provider/media.

## Schema e compatibilità prima del coding

Migration candidate 026 dedicata, con guard ambiente staging prima di DDL. Post/author, reactions, quota giornaliera/receipts e report in schema privato con RLS, nessun SELECT peer/staff generico. RPC esplicite feed/create/delete/react/report, proiezioni minimizzate. La quota conserva solo contatore tecnico giornaliero, non testo o storico visite. Reactions unica per owner/post, quattro valori consentiti, cambio/rimozione idempotenti. Timestamp prodotto 24h server; nessun check-in timestamp nei post.

AGE gate separato dal consenso dating: utente maggiorenne non anonimo, account/profilo attivo, membership stessa Tribe. Nessun requisito Ora attivo o consenso dating. Revoca dating non blocca Bacheca. STAFF dedicati restano esclusi dai flussi prodotto; accesso autore solo per caso e ruolo/AAL2 autorizzati/auditato.

MODERATION: report subject post esplicito, senza trasformarlo in report profilo. Usare RBAC/AAL2/claim-revision/opID esistenti. Hide persistente per sospensione, non ripubblicazione al reversal; blocchi peer senza mostrare author UUID. SAFETY: hold esplicito e minimal evidence separata; report aperto rinvia purge scaduti, delete ordinario cancella dati prodotto salvo hold esplicito. Review/retention configurabile, niente hold implicito indefinito.

RIGHTS: nuove categorie proprie post/reaction/report, nessun dato privato peer/audit security/author mapping di terzi. Cancellazione account disponibile restricted/revoked, non altera PHOTO. RETENTION: job esistente, nuove categorie dedicate/dry-run/pause, locks e ricontrollo eligibilità; scheduler e cleanup finali OFF. Nessuna nuova automazione/provider.

UI: modulo Bacheca dedicato, tab Persone | Bacheca dentro Tribe corrente, testo via textContent, contatore280, composer/quota/status, feed paginato, reaction/toggle/report/delete. Riutilizzare stile/tokens senza redesign. Hook minimi a live/backend e resets account/navigation; nessun refactor dei file esistenti.

## Verifiche richieste prima del GO

- Post280/281 Unicode; quota3/4, giorno Europe/Rome/DST, scope Tribe; replay same/different payload, quota non ripristinata da delete.
- Anonymous/nonmember/17/missing/restricted/staff denied; revoca dating ammessa; RLS/REST/join/count non espongono author/reagents.
- Reaction quattro valori, una attiva, change/remove/replay/race, invalid kind denied.
- Expiry24h server/read/react/report; safety/open report/no indefinite default; purge dry-run, pause, replay, retry/interruption.
- Delete post/account, suspension/reversal senza resurfacing, reports/moderation/hold/RBAC/AAL2/audit, own export e redazioni.
- Regressioni onboarding/Profilo/Ora/Tribe/Spot/match/chat/PHOTO; staging synthetic SQL rollback, nessun Auth config cambiato; test/build/typecheck.

Il messaggio task ricevuto è troncato dopo “una reaction att…”. La baseline completa sopra è già approvata; eventuali requisiti ulteriori saranno incorporati dalla parte restante chiesta al founder. Questa pagina è un piano, non attesta una feature già implementata o un collaudo riuscito.

## Preflight sorgente eseguito

Working tree iniziale pulito; baseline main/produzione non modificata. Auth settings read-only conferma Confirm email ON, account creati0. Suite baseline293/293 PASS (node --test --test-concurrency=2), build/typecheck PASS. Nessuna migration026 creata/applicata, nessun modulo Bacheca implementato. Attesa della parte restante del task prima di cambiamenti runtime, per acquisire eventuali ulteriori gate/scope richiesti; non è un blocco tecnico né richiesta di nuova approvazione del contratto già approvato.

## Avanzamento dopo ricezione della richiesta completa

Richiesta completa acquisita dall'allegato724f4e9b. Implementazione server/client/test pronta sul branch;026 e allineamento nonce applicati solo staging,18corpi funzione verificati senza drift. Esiti e gate reali nel report `soma-bacheca-01-staging-report-2026-10-14.md`:312/312/build/typecheck PASS, smoke SQL reale con rollback PASS; smoke Auth/browser/HTTP reale ancora pending e nessuna falsa chiusura. Main/produzione invariati, nessun Cupido/provider. Il precedente stato “prima del coding” è storico, superato da questo aggiornamento.
