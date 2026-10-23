# Soma — MODERATION FINALIZATION: audit e stop gate

23 ottobre 2026, Europe/Rome. Branch `codex/soma-schema-v2-staging`; baseline `02607a40cee88d8e859a68a81cff33c88df2e714`. Main `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Scope: audit, prove locali e verifica staging **read-only**. Nessuna implementazione runtime, migration, modifica Auth, ruolo reale, fixture cloud, deploy o Production. Nessuna nuova attività di osservabilità.

## Esito

**MODERATION FINALIZATION: BLOCKED.** Il task impone STOP prima dell'implementazione quando il blocco confligge con il contratto congelato (§8) o restano irrisolti scope evidenza chat/procedure di ricorso (§18). Un blocco pubblico reale, riprodotto in un PostgreSQL locale temporaneo, non impedisce visibilità/interazioni SPOTTED. Il contratto Source of Truth §30 prevede anche blocco anonimo con risoluzione autore solo server-side: tale percorso non esiste ancora. Nessun workaround introdotto.

I test esistenti sono verdi ma non dimostrano l'assenza di questi gap: **94/94 mirati, 725/725 suite completa, build PASS, typecheck PASS**. Nessun test modificato per nascondere il problema. Non è un GO per il pilot.

## A/C — Inventario reporting e privacy

| Superficie | Ingresso / RPC | Dati e stato |
| --- | --- | --- |
| Profilo | `src/report-prompt.js`, dettaglio in `src/live-social.js`; `report_profile` | Motivo, dettagli opzionali max1000, nonce; blocco opzionale esplicito (selezionato di default). `spot_private.reports`: reporter/target interni, pending/reviewed/dismissed + open/under_review/closed, revision/claim/closed_at |
| Chat | `blockFromChat` apre lo stesso prompt del profilo interlocutore | Non seleziona messaggio; niente message_id, match_id del caso, snapshot strutturato o API staff per leggere la chat. Note facoltative non sono una prova strutturata/minimizzata del messaggio |
| Post SPOTTED | `src/spotted-social-ui.js`, `src/spotted-social.js`; `board_report` | `spot_private.board_reports`, post_id + reporter privato; upsert unico contenuto/reporter e receipt operazione |
| Commento SPOTTED | stessi moduli; `spotted_report_comment` | Stessa coda; comment_id esclusivo rispetto a post_id; receipt/rate limit tecnici |
| Risposta/commento QoD | Riutilizzo post/commento social | Stessi report/claim/hide/attribuzione; domanda ufficiale di sistema distinta dalle risposte utente |
| Richiesta romantica | `src/spotted-romantic.js` → `report_profile` del sender con blocco | Nessun outbox al mittente; non c'è una coda staff dedicata/request-specific suppression RPC. Il ban/blocco/sospensione già invalidano secondo i gate esistenti |

Tassonomia server esistente: `harassment`, `fake_profile`, `underage`, `inappropriate`, `other`. Profilo mostra cinque motivi; UI social ne mostra quattro (non fake_profile). Spam/hate/scam/safety possono ricadere in Altro, ma non sono codici separati. Non viene sostituita arbitrariamente la tassonomia.

Tabelle private/RLS senza lettura diretta user: reports, board_reports, moderation_audit, board_audit, moderation_roles/events, safety_holds/audit, safety_evidence, board_evidence. Le proiezioni pubbliche social non includono author_id/reporter_id/lista liker. Le queue staff omettono reporter_id; RIGHTS esporta segnalazioni proprie, non identità del reporter al segnalato. Note del profilo restano nel contesto staff autorizzato; non sono pubbliche. Il testo libero richiede formazione/minimizzazione, non un inesistente filtro PII infallibile.

## D/E — Autorizzazione e azioni esistenti

`025_moderation.sql`: ruoli espliciti MODERATOR/ADMIN, attivi, Auth non anonimo/non banned, JWT aal2 e fattore MFA verificato ancora presente. Controllo server su ogni richiesta; revoca ruolo/fattore efficace anche per sessione preesistente. Vecchie RPC 006 revocate. La route `?admin=1` e `VITE_MODERATION_PHASE1` non sono confini di autorizzazione.

`src/moderation-panel.js`, `src/moderation-api.js`: queue paginata, claim/revision, review/dismiss/warn/suspend; ADMIN aggiunge ban/release/reopen/role_set. Claim15min, operation ID e lock/retry. Sospensione1–720h, ban fino revoca ADMIN: semantiche già definite, non riaperte. Gate server impediscono utilizzo prodotto durante sanzione; Match/chat non vengono cancellati per la sola sanzione. RIGHTS/delete/support restano separati.

`src/bacheca-moderation.js`: queue report post/commenti, claim, attribuzione autore solo nel caso claimato e auditato, review/dismiss/hide/warn/suspend/ban (ban ADMIN). Sospensione nasconde permanentemente contenuti esistenti; unsuspend non li ripubblica.

Dashboard Analytics 051 resta separato/read-only. Riutilizza il controllo ADMIN+MFA, senza introdurre comandi moderazione nel dashboard o nuovi grant. Un ADMIN ha già i privilegi moderazione del ruolo 025; non è stato creato un nuovo ruolo analytics con promozione implicita. Staging oggi ha **zero ruoli staff operativi**: provisioning/account/recovery reali ancora da predisporre.

## B/F/H — Finding riprodotto: blocco non uniforme in SPOTTED

Evidenza: `evidence/moderation-finalization/local-audit.json`. Solo fixture nel database locale disposable, nessun account staging coinvolto.

1. A pubblica post; B commenta, crea Share e invia richiesta romantica.
2. A riceve la richiesta e può vedere B attraverso l'autorizzazione direzionale prevista.
3. A chiama il normale `block_profile(B)`, senza inserimento manuale del blocco.
4. La richiesta romantica sparisce: comportamento safety corretto.
5. B continua a vedere il post di A, risolverne lo Share e aggiungere like. A continua a vedere il commento di B.
6. Staff autorizzato nasconde il post: lo Share restituisce correttamente `{available:false}`.

Causa: la versione corrente di `spotted_post_visible` (047) e `spotted_comment_visible` (042) verifica membership/età/sanzione/parent/expiry, non la relazione di blocco. `spotted_like`, commenti e resolver Share riusano quelle guardie. Verifica read-only staging conferma che le due funzioni non consultano `public.blocks`. `can_use_match` e policy romantica invece applicano i blocchi.

Inoltre manca una CTA/RPC di blocco da contenuto anonimo. Riutilizzare ingenuamente `public.blocks` rischia di esporre l'UUID dell'autore: la relazione ha lettura owner del blocker. Non proporre il semplice inserimento di author_id in una tabella leggibile dal client come soluzione anonima.

**Correzione minima da progettare prima del codice:** input opaco post/commento → autore risolto solo server; relazione privata non enumerabile dal blocker; risposta neutra; guardie safety coerenti per feed/commenti/like/Share e interazioni future, preservando la semantica Match/chat già congelata. Nessun nuovo ranking o nuova quota. Servono test di correlazione via API/RIGHTS/blocks, non solo rimozione del campo dal frontend. Non implementato a causa dello stop richiesto.

## G — Richieste romantiche: verificato vs da decidere

043/044 conservano risposta mittente uniforme, sei tentativi validi/giorno, pending7giorni, guard unordered pair30giorni da decline o expiry originale, retry senza estensione; opt-out invalida definitivamente pending ricevuti. Block/suspend/consent/age triggers invalidano senza notificare al sender. Regressioni esistenti PASS, e il probe conferma l'invalidazione da block pubblico.

Nascondere il contenuto non equivale oggi a invalidare una richiesta già consegnata: se l'origine non è visibile, inbox usa contesto generico; coppia ancora eligible può decidere. Non è dimostrato un bug in una policy approvata: va distinta la rimozione del post dalla soppressione di una richiesta abusiva specifica. Qualsiasi nuova azione per-request deve essere silenziosa verso il sender, con motivazione/audit interno e nessun effetto automatico su Match/chat esistenti. Nessuna decisione nuova applicata.

## I — Audit: gap rispetto al nuovo requisito

`moderation_audit` profili registra actor, timestamp, target_id, reason_code, previous_state/new_state, operation e nota limitata: base già utile.

`board_audit` contiene id, actor_id, report_id, action, operation_id, fingerprint, created_at e colonne additive content_kind/comment_id/romantic_request_id. Il writer corrente 042 inserisce solo actor/report/action/operation/fingerprint: non popola i nuovi campi e non conserva reason e stato prima/dopo. Tipo/target/motivo si ricavano indirettamente dal report corrente; non sono un'istantanea immutabile della decisione. Non basta a soddisfare il §12 del task.

Correzione candidata: proiezione categoriale minima immutabile di target_type/target_id/reason/state transition ad ogni azione, senza testo contenuto; idempotenza e autorizzazione prima di scrittura. Retention/cascade/safety hold vanno progettati coerentemente: non trasformare il nuovo audit in uno storico indefinito. Nessuna migration creata.

## J — Retention: separata da Analytics

023/025/026/042, confermati in staging: closed_reports e board_reports180giorni; board_metadata/privacy_operation_metadata7giorni; released_safety_metadata180giorni. **Tutti DESIGN_ONLY, enabled=false; retention paused.** La riga board_posts1secondo non è una nuova durata di visibilità: i post sono invisibili a expiry24h e il codice seleziona gli scaduti al primo ciclo utile, con protezione per report aperti/hold. Account/parent deletion può anticipare la rimozione di report/audit tramite cascade:180giorni non è una promessa di conservazione minima incondizionata.

Hold esplicito richiede case/reason/review_at/audit; review overdue non autorizza purge. Dopo delete: profili/sanzioni sotto hold conservano categorie minimali; board evidence sotto hold può conservare testo UGC limitato280+reason, separato e privato. Non è autorizzata copia completa automatica delle chat. Rilascio e review operativa restano da governare; durate/policy legali richiedono professionista. Nessuna retention Analytics90giorni è applicata ai dati moderazione. Non scelgo nuove durate, non attivo job, non cancello evidence.

## B — Decisioni/gate ancora aperti

- **BLOCKER tecnico:** allineare blocchi anonimi/visibilità/interazioni SPOTTED al contratto, evitando leak dell'autore attraverso la relazione blocks. Stop §8 prima delle modifiche.
- **HIGH tecnico:** completare audit contenuti con target/reason/transizione immutabili.
- **Scope chat da confermare:** mantenere per il pilot segnalazione dell'interlocutore+blocco già esistente, senza accesso staff alle chat complete, oppure progettare separatamente un report message-level con evidenza puntuale e propri criteri hold/delete/accesso. La seconda opzione richiede schema/policy; non viene inventata qui.
- **Richieste abusive:** definire se basta la sanzione/blocco dell'account o serve una soppressione staff della singola richiesta. In entrambi i casi sender neutro e Match/chat preservati; non riaprire guard/opt-out.
- **Ricorsi/hold operativi:** casella `somadatingapp@gmail.com` già approvata, non da riselezionare. Esiste link Assistenza/privacy, non un workflow ricorsi completo. Nei report precedenti sono ancora aperti sostituto nominativo, copertura/escalation, gestione ricorso e review hold. Occorre formalizzarli senza inventare SLA o sufficienza legale. Durate di design non diventano policy legale approvata in questo audit.

## K/L/M — Evidenza, test e staging

- Probe PostgreSQL/PGlite: riproduzione nuova del gap blocchi, invalidazione romantica corretta e Share neutralizzato dopo hide. `local-audit.json` non contiene token, nomi o ID utenti reali.
- 94/94 test mirati esistenti PASS: moderation, Bacheca, social, romantic, QoD, Share e autorizzazione dashboard. Coprono report/anonimato/retry/claim/ruoli/MFA/revoca/sanzioni/hide/expiry/hold/diritti/delete e neutralità; non coprono il nuovo requisito di blocco opaco uniforme.
- Suite intera725/725 PASS; build/typecheck PASS. Nessuna suite riscritta o semantica corretta in silenzio.
- Solo lettura live: 4account,4profili,42oggettiStorage;0staff attivi; Analytics/Discovery/Notifications/cleanup/schedulerOFF, retentionpaused. Config/matrice/hash in `staging-readonly.json`.
- **Nuovo E2E autenticato cloud non eseguito:** stop prima dell'implementazione e dei nuovi grant/fixture cloud. Le prove Auth/MFA storiche restano nel report MODERATION-01; non le presento come nuovo smoke di finalizzazione.
- Nessuna fixture cloud da eliminare; database locale chiuso. Nessun orphan introdotto perché nessun oggetto o dato staging scritto. Non dichiaro un nuovo scan globale di orfani.

## N–Q — File e Git

Nessuna nuova migration. Modifiche solo a questo report ed evidence JSON aggregate. Nessun file runtime/UX/auth/backend/migration cambiato. Commit/push solo sul branch staging; SHA finale e working tree riportati nella consegna. Main e Production invariati. La finalizzazione riprende soltanto dopo risoluzione dei gate sopra, non con nuovi sviluppi osservabilità.
