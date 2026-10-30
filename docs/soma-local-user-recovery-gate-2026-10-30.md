# Recovery v3 — USER locale automatico e unico gate umano

> Esito successivo: [ISOLATED RECOVERY V3 — GO FOR REVIEW](soma-isolated-recovery-v3-final-2026-10-30.md). I precedenti STOP sotto sono evidenza storica.

30 ottobre 2026. Branch `codex/soma-schema-v2-staging`, baseline `14bfd250f2056a2ebc13eda55c9d6c003f9c4192`.

**USER target harness: PASS. Unico gate umano finale: READY. Recovery complessivo ancora BLOCKED fino alle prove umane source/staff.** Nessuna modifica al checkpoint storico, nessun utente sorgente creato o password/hash esistente modificato. Il test locale non è presentato come autenticazione con password di un'identità storica recuperata.

## Separazione delle prove

| Prova | Identità | Stato |
|---|---|---|
| Loader delle identità realmente recuperate | UUID originali del checkpoint | precedente 7/7 PASS; fixture cancellata poi rimossa dal replay |
| Password/login/sessione USER target | nuova fixture **recovery-only**, esclusa dal checkpoint | PASS automatico e cleanup |
| Rifiuto JWT/refresh effettivamente emessi dallo staging per USER ordinario | account source già esistente, non staff | gate umano source; non sostituito con token finti/locali/staff |
| Staff source e nuovo MFA nel recovery | ADMIN/MODERATOR originali | preflight PASS; login/challenge reali pending |

`final-gate.mjs` richiede separatamente il canary locale PASS e la prova source USER reale. ADMIN/MODERATOR non possono coprire il posto USER. La chiusura richiede anche source AAL2, target AAL1 negato, target AAL2 e privilegi corretti e logout/stale denied per ciascuno staff.

## Fixture recovery-only riproducibile

- UUID derivato deterministicamente da checkpoint + namespace della prova; email riservata `example.invalid`, metadata `synthetic/recovery_only/purpose/checkpoint_id`.
- Password derivata da un seed casuale **effimero in RAM**, deterministica entro la singola esecuzione; nessuna password fissa/permanente in Git o report. Seed e password vengono scartati; token mai persistiti.
- Sentinel esclusivo limita il canary a una sola esecuzione. Se l'UUID esiste già, il tool si ferma: non modifica hash, password o account esistenti.
- Creazione con normale API amministrativa Auth **solo locale**; nessun signup globale abilitato. Il cleanup richiede ownership/marker esatti e che l'UUID non appartenga al checkpoint.

Canary reale `prove-local-user.mjs`, **una sola esecuzione PASS**:

| Controllo | Esito |
|---|---|
| Password volutamente errata | 400 `invalid_credentials` |
| Password corretta | 200, identità attesa |
| GET Auth user | 200, UUID corrispondente |
| JWT/sessione | `authenticated`, AAL1, session_id presente e riga Auth reale |
| REST con JWT locale | 200; nessun profilo di altri utenti visibile |
| analytics/admin/ops/moderation | tutte negate, 42501 |
| Refresh locale positivo | 200, stesso USER |
| Logout della sessione locale | 204, sessione eliminata |
| Cleanup | normale engine PHOTO-02/account deletion, PASS |
| Residui | 0 identità, sessioni, refresh, profili, oggetti Storage |
| Account recuperati/identità/ruoli preesistenti | fingerprint prima/dopo invariato |

Nessun record prodotto è stato creato per simulare onboarding/eligibility. Il test copre il gate Auth, non pretende una nuova prova UI PHOTO/Tribe o una password storica recuperata. Le eventuali technical receipts del normale delete seguono le semantics già esistenti; non sono cancellate ad hoc.

## Source-token rejection preservata

La mancanza della password delle vecchie fixture non viene aggirata con reset o manipolazione degli hash. Per il solo controllo source è predisposto il normale accesso **magiclink** dell'account ordinario confermato già esistente e presente nel recovery, identificato server-side. Non serve la password di un USER di test né si crea un nuovo account.

- Endpoint OTP normale, `create_user:false`; prima dell'invio, confronto read-only del credential/confirmation witness source con il checkpoint, fail-closed se cambiato. Il controllo source confermato evita il ramo provider di signup di un utente non confermato.
- Invio **solo dopo click umano**, una sola richiesta per sessione del tool; nessuna email inviata dall'agente durante la preparazione.
- Il link nuovo viene incollato esclusivamente nel campo privato locale e non aperto nella Preview; host, path, tipo `magiclink` e formato hash sono vincolati. Link `recovery`, access JWT, altro progetto o frammenti vengono respinti.
- Verifica tramite normale Auth provider. Ispezione del codice ufficiale GoTrue v2.197.0: `create_user:false` rifiuta utenti inesistenti; il percorso magiclink per utente già confermato non crea identità email né cambia password. Consuma lo stato transitorio del login e crea una normale sessione source, come previsto da questo passaggio umano.
- Una volta ricevuta la sessione source autentica, il server la valida sul source e prova JWT contro Auth/REST target e refresh contro il target. Nessun successo può essere inferito dal solo status HTTP di un endpoint pubblico.

Queste operazioni future sono normali Auth del titolare, non interventi amministrativi su source. Nessun redirect, Site URL, provider o Confirm email cambiato. La allowlist source è stata letta nella dashboard: solo Preview già autorizzate; il tool usa una Preview staging già presente come redirect e verifica il link privatamente, evitando un nuovo callback localhost o un deploy.

## Preflight staff reale

Sorgente, sola lettura:

- ADMIN e MODERATOR: identità confermate, password presente (valore/hash non letto), non banned/deleted;
- ciascuno con **1 TOTP verified**, **0 unverified**;
- witness delle credenziali source confrontato con il checkpoint: coincidente per entrambi; ruoli source ancora attivi. Nessun valore di credenziale esposto;
- nessun fattore source letto come secret, rimosso, creato o modificato.

Recovery:

- entrambi caricati via GET Auth con 200; ruoli durevoli ADMIN/MODERATOR attivi;
- **0 fattori** e **0 sessioni** prima del gate umano;
- TOTP enrollment/verify abilitati nel solo recovery già autorizzato;
- con ruolo PostgreSQL authenticator effettivo, contesto AAL1 e AAL2 senza una vera sessione entrambi negati (42501). È una prova DB negativa, non un finto token o un positivo AAL2.

La pagina privata mantiene custodia source AAL2 verificata server-side prima di permettere enrollment target. Il relay source ammette solo login password, letture user/factor e challenge/verify: nega enrollment, reset/rimozione fattori, reset password, signup, logout e refresh source. Nessun ruolo viene assegnato o revocato. Il relay target resta allowlisted; MFA nuovo solo locale e distinto da STAGING.

## Trasporto e pagina verificati

Rilevato un problema transitorio del resolver Mac sull'hostname source (`ENOTFOUND`/`SERVFAIL`), mentre progetto provider Healthy e due resolver pubblici concordavano. Nessuna modifica al DNS di sistema, hosts file, TLS, progetto o rete del recovery.

Il solo transport operator source conserva hostname, SNI e `rejectUnauthorized:true`. Prima usa il resolver normale; soltanto in errore DNS usa risposte pubbliche concordanti, senza trasmettere ai resolver credenziali o dati account, solo hostname tecnico. Niente IP permanenti o chiavi di trust aggiunte. Prova reale GET `/auth/v1/settings`: **200**, provider email abilitato, TLS verificato; in tale prova il resolver normale era tornato funzionante. Nessuna modifica infrastrutturale o servizio cloud acquistato.

Pagina `http://127.0.0.1:4297` verificata via HTTP e browser, senza premere invio email/login/enrollment. USER mostra il canary locale già PASS/cleaned; schermate staff, controlli disabilitati prima della custodia e distinzione source/target verificati. Link, password, OTP e token restano RAM-only; nessun contenuto Auth sensibile nei log/report. Storage keys dei due SDK in memoria distinte; persistSession/autoRefresh disattivati.

Smoke negativi: origine estranea/route admin/source enroll/source recover/source signup negate; link email senza richiesta e prova target senza source custody negate. Summary rimane **non-PASS** fino a tutte le prove reali, anche se USER locale PASS.

## Invarianti finali e test

- DB restaurato riutilizzato; nessun reimport o modifica al payload v3.
- 42 oggetti Storage, metadata digest e PHOTO ledger invariati; precedente SHA-256 **42/42**, zero orphan/missing canonical preservati. Nessun upload/foto toccato dal USER locale.
- Source: solo letture di metadata/configurazione; nessuna email, login, creazione account, reset o modifica amministrativa eseguita durante questa preparazione.
- Nessuna modifica a Production/main, schema/RLS/API prodotto, PHOTO lifecycle, scheduler o feature flag. Nessun servizio provider/account nuovo, costo cloud o attività GCP amministrativa.
- Nuovi test: fixture deterministica/cleanup scope; signup-disabled/link scope; relay source con rotte vietate; DNS scope/consenso; composizione gate con source USER indipendente e separazione staff. Mirati **79/79 PASS**, full suite **877/877 PASS**, zero fail/skip/cancel, una sola esecuzione completa e un solo canary. Build/typecheck PASS. Git nella consegna/evidence.

RPO/RTO rimangono **non attestati** fino alla chiusura Auth/MFA/application smoke. Non si rinomina il USER locale come utente recuperato e non si dichiara chiuso il source-token gate prima dei token source reali.

Unica checklist umana completa nella consegna finale; nessun tentativo manuale esplorativo richiesto durante la preparazione. File/evidence: [prova locale e readiness](evidence/ops-phase-a/local-user-recovery-gate-2026-10-30.json).

## Follow-up — campo link vuoto e nuova email source

Diagnosi del successivo `SOURCE_EMAIL_LINK_REQUIRED`: il parser riceveva un campo vuoto, non un errore di invio email. La richiesta del primo link era già stata accettata. Verifica source strettamente read-only dei soli indicatori/timestamp: account confermato, link pendente, invio precedente alle 09:30:42 UTC; cooldown superato. Nessun token o hash estratto.

Correzione solo harness locale:

- `/summary` espone solo `attempted/requested/verified`, mai link/token; distingue tentativo fallito da email accettata.
- La pagina ricaricata riprende lo stato corretto: nessun secondo invio dalla UI. Verifica disabilitata finché il campo è vuoto; anche il relativo handler non invia una chiamata Auth per input vuoto.
- Nessuna modifica al parser di sicurezza, alla prova di rifiuto JWT/refresh, alla custodia staff o ai percorsi Auth sorgente.
- Dopo il riavvio del solo harness, una nuova richiesta normale esplicitamente autorizzata è stata inviata **una volta**: HTTP 200 alle **09:36:19 UTC / 10:36:19 Europe/Rome**. `create_user:false`; nessuna generazione admin del link, reset password o modifica al checkpoint. Il precedente link non va usato.
- HTTP e browser confermano `requested:true`, `verified:false`, nuova richiesta disabilitata, verifica disabilitata con campo vuoto. Nessun login o MFA eseguito.

La risposta 200 attesta accettazione provider, non ricezione nella casella né chiusura E2E. La sola azione USER ancora umana è copiare il link dalla nuova email al campo privato locale senza aprirlo. Prove source-token/staff e RPO/RTO restano pending. Nessun nuovo micro-gate: consegna unica USER → ADMIN → MODERATOR.

Follow-up test: mirati email/transport/gate **9/9 PASS**; full suite **879/879 PASS**, una sola esecuzione, zero fail/skip/cancel; build/typecheck PASS.

## Follow-up — refresh token opaque di GoTrue

`SOURCE_CAPABILITIES_REQUIRED` dopo la successiva verifica email è un errore del harness: richiedeva arbitrariamente almeno 16 caratteri per il refresh token. Il GoTrue auditato v2.197.0 genera nel percorso compatibile `crypto.SecureAlphanumeric(12)` (`internal/models/refresh_token.go`, `createRefreshToken`). La verifica source read-only dei soli metadata dell'account atteso conferma: link consumato, `last_sign_in_at` 09:40:36 UTC, ultimo refresh token di **12 caratteri**, non revocato. Nessun valore di token è stato estratto dal DB. L'API email verify era dunque riuscita; il controllo locale falliva prima delle prove target.

Fix limitato a `source-capabilities.mjs`: refresh trattato come stringa opaca non vuota, senza soglia di lunghezza inventata. Controlli di presenza/tipo e access JWT strutturato preservati. Non costituisce autenticazione: source GET user, identità/ruolo/AAL, target Auth, target REST e vero tentativo refresh sul target restano obbligatori e invariati. Nessuna evidenza di rifiuto source viene marcata PASS dal solo shape check. I tre test specifici includono il formato a 12 caratteri, input mancanti/malformati e permanenza delle verifiche effettive.

Nessun login staff, cambio password/hash, ruolo, fattore MFA, configurazione sorgente o restore è stato eseguito. Nessun token è stato recuperato dalle tabelle Auth per riprendere il test. Il link già usato è consumato; occorre una nuova normale email, non un token admin/generato ad hoc. Invio operativo unico tramite lo stesso percorso già autorizzato, senza retry automatici.

Esito fix: mirati **12/12 PASS**, full suite **882/882 PASS** (una sola esecuzione, zero fail/skip/cancel), build/typecheck PASS.

Il singolo nuovo invio alle **09:45:45 UTC** ha ricevuto **HTTP 429**, tradotto dal vecchio adapter nel codice generico `SOURCE_EMAIL_COOLDOWN_STOP`; nessuna nuova email accettata e nessun retry successivo. La pagina Rate Limits del corretto staging è stata letta senza modifiche: sending-email quota project-wide, distinta dalla frequenza per-user. Il valore email non era esposto dall'accessibility tree: non viene dichiarato verificato. Documentazione ufficiale Supabase: provider built-in 2 email/h per progetto, distinto dal cooldown OTP per-user di 60 secondi (https://supabase.com/docs/guides/auth/rate-limits). Il 429 dopo oltre nove minuti dall'invio precedente è coerente con quota email project-wide; il dettaglio provider e l'istante esatto di refill non sono stati esposti dal transport e non vengono inventati. Nessun limite, SMTP, IP forwarding o configurazione è stato cambiato per aggirarlo.

Stato finale: fix harness completato; prova USER source ancora PENDING per indisponibilità del nuovo invio provider. ADMIN/MODERATOR non avviati. Nessuna checklist umana da eseguire finché non è disponibile un nuovo link. RPO/RTO non attestati; nessun account/sessione/fattore letto come secret o modificato amministrativamente. Nessuna modifica main/Production/PHOTO o ai dati sorgente oltre al precedente login email legittimo del titolare.
