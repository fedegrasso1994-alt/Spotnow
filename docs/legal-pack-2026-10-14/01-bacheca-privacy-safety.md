# Bacheca — privacy/safety extension e threat model

14 ottobre 2026. Audit documentale di codice e prove sintetiche già versionate, non penetration test nuovo, prova formale di anonimato o attestazione legale. **LEGAL VALIDATION PENDING**. Fonti: migration [026](../../supabase/migrations/026_tribe_board.sql), [smoke reale](../soma-bacheca-01-staging-report-2026-10-14.md), [evidence](../soma-bacheca-01-authenticated-evidence-2026-10-14.json), [test](../../tests/bacheca.test.js).

## Confini e flusso dei dati

Browser autenticato → Supabase Auth/RPC → tabelle `spot_private` RLS → proiezione feed della Tribe. Staff dedicato → MFA verificata/AAL2/RBAC → queue → claim → reveal per caso, auditato. Retention service-only → stesso lock delle scritture → purge; delete prepara eventuale evidence sotto hold, poi cascade dati ordinari. Nessun testo/post/reaction inviato intenzionalmente a Google OAuth, Vercel come relay, venue, analytics, AI o nuovo provider. Metadati di rete/provider restano una superficie distinta da verificare.

Audience: account non anonimo con profilo, AGE eligible, non deleting/suspended/banned/staff e membership nella Tribe attiva. Nessun check-in Ora necessario e nessun uso di preferenza/consenso dating per autorizzare Bacheca. Membership significa appartenenza storica al luogo, **non presenza attuale**. Non salva una nuova visita quando si legge il feed.

## Data map Bacheca effettiva

Tutte le sette tabelle hanno RLS e nessun SELECT generico anon/authenticated. “Staff” significa RPC autorizzata, non accesso SQL libero. OPS/DB admin e service role restano privilegiati: non promettere anonimato verso il gestore/provider.

| Oggetto / campi esatti | Finalità / necessità | Lettori / copie | Lifetime e delete |
|---|---|---|---|
| board_posts: id, venue_id, author_id, body, created_at, expires_at, hidden, revision | UGC e ownership/expiry/sanzioni; author serve al controllo interno, non ai peer | Peer solo proiezione; owner RIGHTS; staff testo dal caso, author solo reveal; OPS raw. DOM/RAM del destinatario | Visibile <24 h se eligible/non hidden; purge primo ciclo eleggibile; account/post delete cascade, salvo capture held |
| board_reactions: post_id, user_id, kind | Unicità/change/remove e aggregati; nessun roster pubblico | Peer counts + propria reaction, SELF own export; OPS. Non esiste nuovo timestamp reaction nella tabella | Cascade post/account; rimozione propria sostituisce/elimina row. Report/hold sul post può prolungare il parent |
| board_quota: user_id, venue_id, day, used | 3 pubblicazioni riuscite/giorno civile Europe/Rome/utente/Tribe; non conteggio visite | Solo server/OPS; remaining riguarda il chiamante | board_metadata candidata 7 d, cutoff per giorno; account/venue cascade. Delete post non restituisce quota |
| board_receipts: user_id, operation_id, action, fingerprint, result_id, created_at | Replay/conflict/anti-resurrezione, non analytics | Solo server/OPS; esclusi da JSON automatico, accesso personale tecnico via procedura manuale | 7 d candidata, account cascade. Fingerprint create=MD 5(venue +testo), non plaintext ma verificabile con ipotesi/dizionario: **dato correlabile**, non anonimo |
| board_reports: id, post_id, reporter_id, reason, state, revision, assigned_to, claim_until, created_at, closed_at | Caso con reference al testo unico; niente seconda copia body/details liberi | SELF solo id/reason/state/date propri; staff queue testo/caso senza reporter; OPS raw | Open/review blocca purge post; closed max 180 d candidata ma può sparire prima col parent/delete; hold distinto |
| board_audit: id, actor_id, report_id, action, operation_id, fingerprint, created_at | Azioni e accesso author auditabili, senza copia body/author in audit | Staff/OPS secondo capability; mai peers, esclusione automatica rights non diniego legale | FK cascade report o actor delete. Non ha una durata autonoma 180 d né snapshot previous/new: limiti da sottoporre a review |
| board_evidence: hold_id, body, reason, archived_at | Minima prova testuale solo con hold esplicito al delete | Privata, non feed/discovery/matching; eventuale accesso individuale valutato manualmente | Cascade hold dopo release + retention configurata. Body può contenere dati identificanti/Art.9: assenza author_id **non la anonimizza** |
| safety_holds / safety_hold_audit riusati | category/target/case/reason/created/review/released e audit operatori | Solo ruoli OPS autorizzati/service; nessuna API ordinaria di reveal evidence | review_at non è expiry automatico. Released metadata candidata 180 d; hold attivo non viene purgato per sola età |
| retention_runs riusati | operation/category/version/dry-run/candidates/purged/completed | OPS aggregati, senza testo/account/venue | technical_receipts candidata 7 d; pause/outage differisce il ciclo |
| Auth/Tribe/moderation esistenti | Autorizzazione a ogni chiamata; nessuna tabella nuova di visite | Confini AGE/MODERATION esistenti | Restano governati dal core; timestamp visita Tribe NULL dopo 022 |

Non vi sono upload Bacheca, cache persistenti app dedicate, polling analytics, provider di moderazione AI o notifiche Bacheca. Service worker solo fallback offline, non archivio UGC. Sessione Auth/localStorage, rete HTTP e copie DOM/screenshot restano nel data map core. La scelta di un eventuale futuro cache layer richiederà audit separato.

### Contratto peer verificato

`board_feed` restituisce `items[{id,text,created_at,expires_at,can_delete,reactions,my_reaction}], more, remaining`. Nessun author UUID/name/avatar/link/professione/preferenza/consenso/check-in/reporter/claim/revision. `can_delete` rivela solo ownership al chiamante; counts non elencano reagenti. `remaining` è la quota propria. Post ID casuale UUIDv4, ordine `(created_at DESC,id DESC)`, non author order. Nonce di creazione temporale server UUIDv7 privato al richiedente, non chiave author pubblica.

Rifiuti eligibility/membership/read-react-report convergono su BOARD_ACCESS. Le azioni staff verificano ruolo prima del caso; resolve_author richiede claim valido della stessa persona. `board_delete` può distinguere un ID assente da un post altrui, ma non restituisce la sua identità: non usare questo fatto per promettere indistinguibilità di ogni errore. Nessuna lettura raw tramite alias legacy rights/retention autorizzata ai client.

**Esito limitato:** nessun mapping diretto autore→post peer rilevato nel contratto, RLS/RPC/export e test disponibili. ** NON provato:** assenza di qualsiasi inferenza da tempi, testo, osservazione fisica, conteggi o latenza. Timestamp pubblicazione precisi restano nel payload; non sono timestamp check-in ma possono corroborare attività. I piccoli gruppi possono inferire reactions da differenze nei conteggi. Non scrivere “nessuna identità ricostruibile” come garanzia assoluta.

## Threat model e gap

| ID / attore | Attacco / effetto | Controllo ed evidenza | Residuo / lavoro futuro, non implementato |
|---|---|---|---|
| BP-01 peer/nonmember | Join/REST/RPC/export per author | Private SELECT negato, feed/export own-only; smoke A/B, altra Tribe reale, ordinary reveal denied | LOW accesso diretto coperto; no prova matematica non-interferenza |
| BP-02 peer della stessa Tribe | Correlazione testo/time/ordine con conoscenze esterne | Nessun pseudonimo stabile/author fields; ordine cronologico per post | HIGH rischio outing/doxxing; disclosure e valutazione precisione timestamp dal professionista/founder, non nuova preferenza tracking |
| BP-03 piccolo gruppo/collusione | Inferire chi reagisce da conteggi o comportamento | Solo aggregati e propria reaction; nessun roster | MEDIUM; conteggi non garantiscono anonimato statistico, test timing/differencing non svolti |
| BP-04 staff malevolo/compromesso | Reveal indiscriminato / accesso sensibili | MFA, ruolo attivo, case claim, audit reveal; staff privo normale discovery/chat/photo | HIGH operativo: owner/sostituto reali, formazione/access review, detection abusi reveal non attivi per effetto del test |
| BP-05 autore ostile | Accuse, dati terzi, hate, contenuti minori/illeciti, link phishing in testo | Solo textContent, 280, quota 3/Tribe, report/hide/suspend/ban; no media/preview | BLOCKER pilot: procedure escalation e qualificazione DSA, canale esterno e motivazioni/ricorsi da completare; nessun filtro semantico/AI |
| BP-06 spammer multitribe | Aggirare effetto quota con molte membership | Quota atomica per Tribe, niente globale aggiunto | MEDIUM monitoraggio operativo e test carico; non introdurre tetto globale senza task/decisione |
| BP-07 utente bloccato dating | Leggere post anonimi della vittima nella Tribe comune | Feed non applica filtro author-based blocks per evitare oracle di deanonymizzazione; nessuna chat Bacheca | HIGH tradeoff safety/privacy da validare e spiegare; blocco dating non promessa di isolamento UGC totale |
| BP-08 retry/race/stale JWT | Doppio post/reazione, resurrection, uso dopo sanzione | Lock, nonce/receipt, validity window, eligibility server; race HTTP e test late nonce | LOW nel perimetro verificato; cambiare durata metadata richiede retest anti-replay |
| BP-09 purge/delete/hold | Perdere prova oppure conservare per sempre | Open report/hold proteggono, capture minima, pause/dry-run/replay | HIGH: open/review non hanno max TTL enforce; review_at solo promemoria. Owner/scadenze operative e policy finita da approvare, no purge cieco |
| BP-10 DB/backup exfiltration | Ricostruire mapping, testo da hash, venue membership | RLS contro client; least privilege, no log UGC intenzionali; export senza secrets | BLOCKER pilot contratti/accessi/backup/log/recovery; RLS non protegge da service role/admin |
| BP-11 cache/copie già ricevute | Testo resta dopo expiry/sanzione in DOM/copia esterna | Nuove read/react/report server filtrate, paint salta scaduti | MEDIUM: nessuna revoca remota di copie, feed UI ricarica su apertura/mutazione/retry; **nessun timer/push autonomo di rimozione già resa** in mountBoard. Validare aspettativa 24 h e sanzioni su schermo aperto; possibile task timer/refresh, non fatto qui |
| BP-12 workload retention | Tutti candidati board sotto lock globale | Job idempotente, scope fisso, OFF staging | MEDIUM: wrapper 026 loop senza batch_size/LIMIT per board_posts/reports; misura/batching prima scala pilot, non dichiarare load test completato |

Non emergono nuovi secret esposti o nuove API peer di identità dalla lettura effettuata. Restano verifiche privacy/operational sopra: il GO BACHECA-01 non copre automaticamente gli scenari d'inferenza, le garanzie di schermo già aperto o la sufficienza del notice-and-action.

## Delta del data map core per la baseline integrata

Sostituisce soltanto le descrizioni staging obsolete, senza riscrivere lo stato main del 10 ottobre: AGE020 stato/dichiarazione/versione server senza DOB; CONSENT021 record separato active/revoked/challenge/eventi e preference=NULL alla revoca, nessun ALL fallback; 022 last_checkin_at/sender_checkin NULL e check-in proprio 90 min; 023 retention centralizzata/OFF, hold/evidence; 024 RIGHTS 15 categorie più 3 Bacheca; 025 staff dedicato RBAC/MFA e queue completa; 026 dati sopra. Foto restano PHOTO-01/02 invariate.

Nessuna promessa che ogni inferenza dating sia coperta dal solo consenso preference: gender, foto, match, messaggi, membership e UGC possono essere altamente personali. Nessun KYC/documento/GPS/rubrica/advertising ID aggiunto. Provider/font self-host sono integrati nel candidato staging, non presumibilmente già pubblicati in main. Inbox manuale e backup/log esterni rimangono separati dal delete app. Legal review deve includere questi delta, non soltanto il form consenso.
