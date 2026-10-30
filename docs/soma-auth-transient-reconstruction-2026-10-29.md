# Recovery v3 — ricostruzione dello stato Auth transitorio

**Follow-up 30 ottobre:** [USER locale automatico e unico gate umano](soma-local-user-recovery-gate-2026-10-30.md): canary password/sessione recovery-only PASS e rimosso; source-token rejection USER resta una prova distinta su account già esistente, senza reset. Esito storico sotto preservato.

29 ottobre 2026. Branch `codex/soma-schema-v2-staging`, baseline `f522f5a4c454d648f1a2d6b912e314d996a33c50`.

**ISOLATED RECOVERY V3: BLOCKED sui gate umani finali**, non più sul loader GoTrue. Fix deterministico applicato una sola volta nel recovery esistente, 7/7 identità caricate, replay della fixture cancellata completato e idempotente. Nessun nuovo restore DB; nessun cambiamento a schema Auth o payload durevole. Source-token rejection, login recuperato e MFA staff richiedono ancora prove umane reali: non sono promossi a PASS dai test di modello.

## A–D. Tooling, allowlist e invarianti

Nuovo modulo `scripts/recovery/auth-transient-reconstruction.mjs`: policy separata versione 1, associata al contratto checkpoint v3 già valido. Campi classificati **TRANSIENT AUTH STATE → excluded from checkpoint payload → reconstructed to canonical inert GoTrue representation `''`**:

- `auth.users.confirmation_token`;
- `auth.users.recovery_token`;
- `auth.users.email_change_token_new`;
- `auth.users.email_change`.

Il modulo valida il contratto v3 e che i quattro campi non siano proiettati; vincola la ricostruzione all'insieme esatto di UUID contenuto nello snapshot cifrato, rifiuta campi non vuoti e runtime Auth non vuoto. Transazione/lock esclusivo e fingerprint prima/dopo di tutti gli altri campi utente e delle identità impediscono modifiche durevoli collaterali. Non usa COALESCE, non applica normalizzazioni generiche e non copia token della sorgente.

Lo stesso passo è integrato nel normale importatore dopo l'importazione delle proiezioni e dei dati, nella stessa transazione, prima della barriera di sicurezza. Il wrapper `repair-auth-transient.mjs` lo riusa per il target esistente, solo se i tre servizi recovery sono arrestati e senza porte pubblicate. Autorità offline di import: `supabase_admin` già presente, nessun nuovo grant; mai usata da servizi runtime.

Repair reale **PASS**, 7 utenti, una sola esecuzione:

| Campo | NULL prima | NULL dopo | Rappresentazione dopo |
|---|---:|---:|---|
| confirmation_token | 7 | 0 | stringa vuota |
| recovery_token | 7 | 0 | stringa vuota |
| email_change_token_new | 7 | 0 | stringa vuota |
| email_change | 7 | 0 | stringa vuota |

Fingerprint durevole/identità invariato. Email/phone confirmation, ruolo, password nullable/non-nullable, ban/deleted state, metadata e updated_at non sono stati cambiati. `phone=NULL` rimane NULL. Nessun fattore, sessione o token ricreato.

Archivio originale e manifest v3 invariati: checkpoint `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`, SHA-256 `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae`. La policy di ricostruzione non aggiunge dati al payload o modifica retroattivamente l'archivio.

## E–F. Prova reale GoTrue: PASS

`prove-auth-loader.mjs`: sentinel esclusivo, **un solo avvio GoTrue** dopo il repair. GET amministrativi interni, senza login, usando la credenziale locale del target, non una credenziale sorgente.

- `/health`: 200;
- identità caricate **7/7**, risposta 200 e UUID corrispondente per ciascuna;
- nessun nuovo errore NULL/string durante i sette caricamenti;
- verifica con token hash vuoto: **400**;
- alla fine: **0 sessions, 0 refresh_tokens, 0 flow_state, 0 mfa_factors**;
- 7 righe con tutti e quattro i campi esattamente `''`.

GoTrue v2.197.0 usa la stessa rappresentazione per invalidare i pending token (`ClearAllPendingTokens`); il percorso OTP rifiuta expected-token vuoto. Non viene introdotta una capability o un bypass dell'autenticazione. La verifica negativa non costituisce login.

## G. Replay post-cutoff: PASS

Rinnovato il confronto sorgente **read-only**: un solo delete della fixture sintetica vuota; nessun delta hold/suspension/moderation. Il normale engine PHOTO-02/account deletion è stato ripreso senza forzare lease o cambiare policy.

- identità già cancellata in source ora assente anche nel recovery;
- fingerprint degli altri utenti Auth, identità e ruoli invariato durante il replay;
- successo registrato dal normale engine, nessun DELETE Auth manuale;
- seconda invocazione idempotente: **PASS**, zero chiamate engine, identità ancora assente.

Il primo controllo di idempotenza si era fermato **prima di qualsiasi chiamata engine** perché il piano read-only era scaduto oltre la finestra di un'ora. La finestra non è stata ridotta o aggirata: rinnovato il confronto source in sola lettura e il successivo controllo ha confermato il no-op. Non è un rerun della cancellazione fino al verde.

## H–L. Gate umani e superficie privata

Pagina operator-only `http://127.0.0.1:4297`, titolo **Recovery Auth — solo locale isolato**. Nessuna modifica alla UI prodotto. Il founder ha già autorizzato i login/MFA privati; unica checklist inviata per USER, ADMIN e MODERATOR.

1. Identità di prova USER già nel checkpoint, distinta dagli staff: login source per ottenere capability reali, poi prova contro il target isolato e login recuperato.
2. Staff: source login e challenge sul fattore **staging esistente** verificano la custodia AAL2; nessun enrollment/reset source.
3. Login recovery della stessa identità; ADMIN/MODERATOR AAL1 devono essere negati sulle superfici privilegiate.
4. Solo dopo custodia source verificata server-side, enrollment di un fattore **nuovo e distinto nel recovery**, challenge e AAL2; probe reali su analytics/ops/moderation e negativa role-management MODERATOR.
5. Logout locale e verifica che il token precedente non mantenga privilegi.

Le capability sono solo in RAM e transitano senza log dei body. Config browser: solo source publishable e anon locale; nessun service key. Il relay è loopback-only, Host/Origin controllati, no-store, rotte Auth allowlisted. Nega update password, DELETE fattori e API amministrative; nessun grant/revoke ruolo. L'evidence persistita contiene solo ruolo, fase, status/risultati, mai token/OTP/QR/password/email.

Smoke superficie PASS: pagina 200, public-key class e target anon corretti; origine estranea 403; route Auth admin 403; prova privilegi senza custodia source 400/SOURCE_PROOF_REQUIRED. Source credentials devono provenire dal normale SDK/login umano, non da fixture cancellate, JWT finti o mock.

**Al momento della consegna tecnica:** i gate umani reali sono pending. Source JWT/refresh rejection, fresh USER, staff AAL2/separazione e logout non sono dichiarati PASS senza evidence server-side. La pagina resta disponibile al custode. Se non esiste un USER di prova con credenziali utilizzabili già nel checkpoint, non crearne uno source né cambiare password senza una successiva autorizzazione specifica.

## M–P. DB/Storage, misure e blocker

Riutilizzato il DB restaurato. REST `public` e Storage provider 73→74 sono già verificati; nessun nuovo restore, downgrade, modifica owner/ACL/RLS o lifecycle PHOTO. Il replay riguardava una fixture senza profilo/oggetti: nessuna foto o variante di altri utenti toccata. Ultima verifica reale Storage: **42/42 SHA-256 PASS**, 0 orfani, 0 canoniche mancanti; non ripetuta inutilmente per sole modifiche ai campi Auth.

**RPO e RTO NON MISURATI / NON ATTESTATI** finché Auth, replay, login, MFA e application smoke non sono tutti completi. Nessun riavvio del cronometro per nascondere i tempi precedenti; eventuale misura dovrà usare il riferimento di drill e le timestamp effettivamente registrate.

Blocker residuo: completare/verificare i login e MFA umani reali sulla pagina privata. Nessun blocker loader, nessuna richiesta di modificare GoTrue/schema o di acquistare servizi cloud. Non dichiarare chiuso il recovery completo sulla base dei test SQL.

## Q–V. Test e consegna

- Ricostruzione: **6/6 PASS** (inerti, durable NULL/password/phone, CSV NULL vs empty PostgreSQL reale, deterministic contract, input negati, rollback su mutazione durevole).
- Gate privato: **2/2 PASS** (binding account/ruoli e rotte proibite).
- Mirati recovery/Auth/staff/MFA/security: **70/70 PASS**.
- Full suite: **868/868 PASS**, zero fail/skip/cancel, una sola esecuzione completa.
- Build PASS; typecheck PASS, entry point locali con runtime Node disponibile.

Solo tooling/operator UI/test/report nel branch staging. Nessun cambiamento a `src/`, `supabase/`, migrazioni, main, Production o configurazione/source data. Credenziali/config `.local` ignorate da Git e 0600. Gli eventuali login umani source sono normali operazioni Auth autorizzate, non mutazioni amministrative del progetto o dei suoi fattori.

Hash commit/push e working tree nella consegna. Evidence: [auth reconstruction](evidence/ops-phase-a/auth-transient-reconstruction-2026-10-29.json).
