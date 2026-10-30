# ISOLATED RECOVERY V3 — quarantena e gate finale pronto

30 ottobre 2026. Baseline `4fd714ca80c9510ac5ef551ccdd98ca0e8066d85`.
Branch `codex/soma-schema-v2-staging`. Sorgente `zjinjtkekmaqtxsuyvho` in sola lettura.

**Recovery congelato sul provider email HTTP 429. Nessuna nuova richiesta email in questa fase. Nessun login, enrollment, replay o restore eseguito.**

Questo documento consolida il preflight non interattivo. Non marca PASS le prove umane ancora mancanti e non modifica il contratto storico. Evidenza: [readiness](evidence/ops-phase-a/recovery-quarantine-readiness-2026-10-30.json); storia completa e fix: [USER gate](soma-local-user-recovery-gate-2026-10-30.md).

## Integrità riletta nel target

| Controllo | Esito |
|---|---|
| Archivio cifrato v3 / hash / manifest | invariato, verificato dal lettore archivio |
| Originali schema/owner/ACL/default ACL/RLS/SECURITY DEFINER | 1.547 oggetti preservati |
| Delta Storage provider | soltanto 0074 già approvata, applicata una volta |
| Byte Storage tramite API privata | 42/42 SHA-256 PASS |
| Accesso pubblico/anonimo ai byte | negato; bucket privato |
| Orfani / canonical mancanti | 0 / 0 |
| PHOTO ledger | invariato |
| PostgreSQL / DB owner / public owner | 17.11 / postgres / pg_database_owner |
| Sessioni, refresh, MFA factors, flow_state, revocation receipts target | tutti 0 |
| FK non validate | 0 |
| Fixture USER locale già ripulita / identità cancellata dal source | entrambe assenti |
| ADMIN / MODERATOR durevoli | entrambi attivi, nessun nuovo grant |
| Runtime Auth/REST/Storage | tutti running, nessuna porta pubblicata, rete Docker internal |
| Runtime con superuser bootstrap | nessuno |

Vere connessioni DB `supabase_auth_admin` e `supabase_storage_admin`: leggono le rispettive tabelle, non le tabelle staff private. `authenticator → authenticated`: owner 1 / altro profilo 0. `anon` e authenticator diretto negati. `service_role` mantiene il bypass previsto. Queste sono prove DB, non sessioni Auth/MFA inventate.

## Harness e staff

- GoTrue health 200. I quattro RPC di lettura realmente restaurati hanno zero argomenti obbligatori; owner/SECURITY DEFINER e grant authenticated corretti, anon denied.
- `moderation_role_set(uuid,text,uuid)` controlla ADMIN prima degli input. La prova negativa MODERATOR con input invalidi non può cambiare ruoli ed esercita il denial autorizzativo previsto.
- `/target-proof` e `/logout-proof` senza custodia source: 400 `SOURCE_PROOF_REQUIRED`.
- Source relay senza signup/reset/enrollment/removal; target enrollment solo dopo identità staff/source AAL2 verificata. Nessun cambio a questi controlli.
- Fix già green: SVG con prologo XML, separazione SDK source/target, campo email vuoto, stato richiesta dopo reload, refresh opaco a 12 caratteri. Nessuna credenziale permanente aggiunta.
- USER target password/sessione: canary recovery-only già PASS e ripulito, distinto dalle identità storiche. Non viene riusato uno staff per questa prova.
- Source credential/identity reconciliation conferma surviving users invariati; un solo delta noto è la cancellazione della vecchia fixture vuota, già applicata nel target. Nessuna promozione ruolo o release hold.

Non è possibile provare positivi fresh AAL2 prima del titolare: questi rimangono esplicitamente pending. Non sono stati individuati altri blocker nei percorsi verificabili senza login.

## Prevenzione del falso blocco replay dopo i login

Il vecchio comando di replay conserva un digest completo delle righe Auth per provare l'assenza di modifiche collaterali durante la **prima cancellazione**. Non va riutilizzato dopo login/MFA legittimi per dedurre che tutto Auth sia byte-identico: i timestamp di accesso cambiano.

`final-replay-audit.mjs` aggiunge una verifica **read-only** per la fase finale. Riusa la proiezione sicurezza già approvata (credential/identity digest, ruoli, consensi, hold/suspension/moderation) e `replayPlan`; richiede la precedente cancellazione provata, l'esatto unico delta noto e l'assenza di righe/ruoli inattesi. Credenziali mutate, ruolo revocato, hold cambiato, account risorto o nuova security row causano STOP. Non ignora una variazione di sicurezza per tollerare un timestamp di login.

Prova reale prima del gate umano: **PASS, zero chiamate al deletion engine**. Dopo il gate va ricalcolata con snapshot source aggiornato: qualsiasi nuovo delta richiede review. Il motore di cancellazione originale e PHOTO non sono modificati. La prova MFA rimane separata e obbligatoria.

## Email e ripresa

Ultimo invio accettato noto: 09:36:18 UTC; successivo 429: 09:45:45 UTC. Nessun nuovo OTP richiesto qui e nessuna modifica a limiti, SMTP, Auth o IP forwarding. Il quota state residuo e l'istante esatto di refill non sono esposti dal transport: nessuna garanzia di disponibilità dedotta dal solo trascorrere di pochi minuti.

La richiesta di una ripresa programmata **non è stata creata**: auto-review ha rifiutato il job persistente con accesso workspace e possibile invio email source, richiedendo autorizzazione esplicita allo scheduling. Nessun cron/timer/script alternativo creato. Nessuna prosecuzione automatica promessa finché il job non è effettivamente autorizzato e registrato.

Per un'eventuale unica ripresa differita: nuova lettura dei metadata email project-wide, finestra prudenziale di almeno un'ora dall'ultimo invio e dall'ultimo 429, nessun login umano in corso, poi al massimo una richiesta normale con `create_user:false`. In caso di 429/error STOP senza retry. Non estrarre token da Auth né usare generateLink/admin come scorciatoia. Il passare del tempo non garantisce da solo disponibilità in presenza di altri invii.

## Unica checklist umana — da consegnare soltanto dopo HTTP 200

1. Aprire `http://127.0.0.1:4297` e verificare titolo `Recovery Auth — solo locale isolato`. Nessun login staff prima di USER PASS.
2. USER: non premere una nuova richiesta email. Copiare il link dalla **nuova email confermata dall'operatore**, senza aprirlo; incollarlo solo nel campo privato locale. Premere `Verifica USER source e rifiuto nel recovery`. Attendere PASS; il USER target locale è già stato verificato e cancellato automaticamente.
3. ADMIN: login sorgente con account dedicato; inserire MFA STAGING esistente e premere `Verifica sorgente e isolamento`. Poi login recovery con la stessa identità/password; AAL1 deve risultare negato. Attivare MFA RECOVERY una sola volta, scansionare privatamente il nuovo QR con etichetta distinta da STAGING; verificare il codice RECOVERY. Attendere AAL2 e autorizzazioni PASS; premere `Esci e verifica vecchia sessione recovery`, attendere PASS.
4. MODERATOR: ripetere la stessa sequenza. L'esito include moderation allowed e analytics/ops/role management denied, poi logout/stale denied.
5. Non ricaricare durante il QR. Non usare enrollment sorgente né controlli ruoli. Comunicare soltanto `USER PASS; ADMIN PASS; MODERATOR PASS` oppure ruolo/fase/codice STOP. Nessun link Auth, password, QR, OTP o screenshot in chat.

## Dopo il gate umano

Verificare il risultato server-calculated, non soltanto un messaggio del client. Source JWT/refresh rejection sono eseguiti dal harness durante ciascuna fase source e registrati senza capability; non richiedere nuovi login per ripeterli inutilmente. Verificare identità staff, AAL1 denied/AAL2 allowed, scope MODERATOR e logout stale. Nessun token resta in report o Git.

Rileggere il source e applicare l'audit finale read-only del replay: il delta noto è già assente nel target; non effettuare una seconda cancellazione. Nuovi delta non coperti fanno STOP. Proseguire con application/API smoke compatibile con il target isolato; non dichiarare full UI/Edge deploy se si sono verificati solo RPC. Non riattivare scheduler/delivery/Discovery o riaprire il target al pubblico.

Solo alla chiusura completa registrare tempi reali. Snapshot archivio: `2026-10-28T07:40:43.624898Z`; avvio del retry v3 provato: `2026-10-28T16:33:36.988Z`. Il tempo osservato del percorso retry include blocchi e attese; non azzerare il cronometro al login finale. Distinguere età del backup, perdita dati rispetto a un incidente/cutoff dimostrabile e RTO del percorso osservato. Non inventare l'istante di un incidente reale e non dichiarare RPO≤24h o RTO di poche ore sulla sola base di DB/Storage PASS. L'intera campagna precedente non ha un unico nuovo cronometro ricostruibile da questi due timestamp.

## Stato

Nessuna nuova email, login, modifica Auth/MFA/ruoli, purge, restore, feature o provider attivata. Main, Production, sorgente staging e PHOTO invariati. Gate umano e RPO/RTO ancora pending. Il target resta quarantinato.

## Verifiche e consegna Git

Mirati **14/14 PASS**. Suite finale **885/885 PASS**, zero failure/skip/cancel, una sola esecuzione dopo i tre nuovi test dell'audit replay. Il precedente run 882/882 era già verde prima dell'aggiunta, non è stato ripetuto per nascondere una failure. Build/typecheck PASS. Modifiche limitate al nuovo audit recovery read-only, relativi test, report/evidence; nessuna migration, frontend prodotto o handler Auth modificato. SHA/push/working tree nella consegna.
