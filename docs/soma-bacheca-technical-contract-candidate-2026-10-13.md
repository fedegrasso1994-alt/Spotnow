# Bacheca MVP — contratto tecnico approvato dal founder

13 ottobre 2026. Solo design. Nessuna migration/tabella/RPC/UI Bacheca esiste a seguito di questo documento. Nessuna base giuridica scelta. Cupido, poll, Pulse, share card, media upload e notifiche sofisticate esclusi.

## Perimetro già fissato dal founder

Dentro Tribe → Persone | Bacheca; post brevi, anonimi verso altri utenti, autore internamente tracciabile; reactions, report, integrazione moderation, expiry24h, delete/suspend/ban e retention dedicata. Tribe membership persistente, nessuna registrazione di visita alla Bacheca equivalente a storico dei movimenti.

## Decisioni founder approvate

| Decisione | Baseline MVP | Motivazione / gate |
|---|---|---|
| Audience | Solo membri della stessa Tribe; server Auth+18+/account attivo; niente requisito check-in Ora attivo | Nessun cross-Tribe o inferenza di presenza; membership non location history |
| Revoca dating | Bacheca non legge dating preference e non usa consenso dating come autorizzazione automatica UGC. Accesso Bacheca rimane possibile se gli altri gate sono soddisfatti | Decisione founder approvata; validazione professionale separata |
| Contenuto | Testo semplice, massimo 280 caratteri; niente HTML/media/link preview | Limite approvato, non implementato; render textContent e test XSS |
| Pubblicazione | Massimo 3 nuovi post al giorno per utente per Tribe, prenotazione atomica; operation UUID/client nonce per retry | Limiti approvati centralizzati; nessun limite globale cross-Tribe aggiunto autonomamente |
| Reactions | ❤️ 👀 😂 🔥; una reaction attiva/account/post, modificabile e rimovibile; operazioni idempotenti con revision/opID; peers vedono solo aggregati e propria reaction | Nessun roster dei reagenti o mapping utente esterno |
| Anonimato peer | Nessun author UUID/name/avatar/profile link, nessun pseudonimo stabile cross-post, nessun reaction roster | L'anonimato è verso i peer, non verso Soma; testo può identificare chi scrive |
| Expiry | expires_at fissato server=created_at+24h, non rinnovabile con edit/retry; niente edit nel MVP, delete proprio consentito | Filtro server di ogni read/react/report nuovo dopoexpiry; frontend timer solo cosmetico |
| Delete/autore ban | Delete account/post elimina subito visibilità e dati prodotto ordinari; sospensione/ban nascondono i post attivi e bloccano nuove scritture/reactions | A fine sospensione nessun post torna automaticamente visibile; nuovi post solo quando eligible; i vecchi seguono expiry/retention normale |
| Record scaduti | Purge fisico al primo ciclo retention utile dopo expiry; report aperto o safety hold sospendono il purge; nessuna conservazione indefinita per default; paused/outage osservabili | Regola founder approvata; hold/review e retention dedicate da validare professionalmente |
| Ricorso/report | Report entro vita visibile; moderation conserva reference e categoria, held evidence minima solo con hold esplicito/review/TTL | Policy ricorsi/report postexpiry e durata legale da validare |

Decisioni founder definitive ricevute per 280 caratteri, 3 post/giorno/utente/Tribe, quattro reactions e purge al primo ciclo utile. Questo documento non implementa Bacheca. Nessun fallback ALL o uso delle preferenze per ranking di contenuto.

## Modello dati da implementare

Moduli dedicati UI/API/domain, evitando nuova logica nei file grandi. Schema solo in futura migration dopo025, numero da riservare al coding.

- Post: id casuale, tribe_id, testo semplice, created_at/expires_at server, stato visible/author_deleted/moderation_hidden/expired, revision. Author mapping in schema privato con FK Auth e RLS; nessun author nella proiezione peer.
- Reaction: post_id, owner privato, kind tra ❤️ 👀 😂 🔥, operation/revision per cambio/rimozione, unique(owner,post). Risposta aggregata counts_per_kind/my_reaction; non REST select diretto delle righe peer.
- Operation receipts: owner/op/fingerprint/stato minimo e retention breve; nessun testo nel payload audit ordinario, namespace separato dalle receipts PHOTO.
- Report subject: tipo post/reaction, reference UUID; non adattare artificiosamente il profilo come target del post. Actor/reporter e author solo server e staff autorizzato al caso.
- Safety evidence: case/hold riferimento, campi strettamente necessari approvati e review/expiry, fuori prodotto; mai copia integrale automatica di feed/chat/foto. Dati UGC indispensabili per safety vanno progettati separatamente: il modello attuale reason/status da solo non è prova testuale del post.

Scope minimo di dati, indici `(tribe_id,created_at,id)` per keyset e expiry/stato, ownership FK/referenze delete definite senza dangling refs. Nessun location/checkin/session metadata nei post o nelle reactions.

## API e autorizzazioni da implementare

- list_posts(tribe,cursor,limit): verifica Auth/age/active/membership su ogni richiesta, filtra expiry e visibility server; fields id,text,created_at,expires_at,reaction_counts,my_reaction,can_delete. Nessun author in response/header/log/cache.
- create_post(tribe,text,operation): check server, quota giornaliera per utente/Tribe atomicamente sotto lock, replay esatto; nessuna pubblicazione senza owner valido.
- delete_my_post(post,operation): owner-only, idempotente, disponibile anche restricted/revoked per cancellare dati propri; mai permettere delete peer.
- react(post,desired_kind_or_null,operation): valida una delle quattro reactions o null per rimozione; check membership/eligibility/livepost, account epost locks in ordine coerente condelete/purge.
- report_post(post,reason,operation): reference valido, details limitati e minimizzati; no access all'autore tramite risposta. Report/blocco policy deve essere definita senza esporre author_uuid come oggetto di blocks peer.
- own rights: nuove sezioni posts/reactions/report propri, mapping owner solo a se stesso; esclusioni di terzi e notes staff mantenute. Nessun token/security metadata incluso.
- moderation: RBAC+verified factor+AAL2 esistenti, case claim/revision/op; resolve author solo quando necessario a un caso, access auditato e risposta minimizzata. Nessun accesso automatico chat/preferences/location.

RLS/proiezioni/grants difendono REST diretto, join, filtri/ordinamento/count e stale JWT, non solo UI. Private mapping non disponibile nemmeno a staff con SELECT generico. Feed cache owner/Tribe scoped con invalidazione e no shared-cache leak; niente CDN pubblico di contenuti UGC.

## Lifecycle e concorrenza

Consistenza tra create/react/read, report/hold, delete/autore/suspend/ban, purge e rights: lock account/post e ricontrollo condizioni dopo attesa. Nessun purge di held evidence; nessun hold implicito permanente di tutto il feed. Writer/retry receipts distinguono operazione conclusa e incerta; no timeout che autorizzi cancellazione indiscriminata.

Delete account non lascia account utilizzabile, post/reaction/author mapping/derivati ordinari. Report ed evidence solo nella misura esplicitamente held, con retention/review. Conteggi reactions ricostruibili dalla sorgente o aggiornati atomicamente, mai account resurrected da retry. Expiry non estesa da sospensione/reversal.

## Riutilizzo e dipendenze reali

AGE/has-account/membership, MODERATION RBAC/claim/sanzioni, RIGHTS owner/export/delete, RETENTION policy/dry-run/pause, safety hold/audit e retry opID riutilizzabili. Servono estensioni esplicite ai subject report, categorie retention, sezioni RIGHTS, delete callbacks e audit capability. PHOTO-01/02 non cambia; Bacheca non ha media nel MVP.

Il consenso dating versionato esistente non costituisce automaticamente copertura per UGC; testi e basi da professionista. SMTP/push/analytics non sono dipendenze del coding Bacheca staging sintetico. Staff/pilot readiness restano gate prima degli utenti reali.

## Acceptance suite prima GO MVP

1. Member A può leggere/scrivere Tribe1, non Tribe2; nonmember/anon/missing18/17/restricted/suspended/banned denied.
2. Contratto approvato per revoked dating rispettato senza leggere preferenza.
3. REST/join/filter/export/reaction/report non rivelano author/roster; test A/B/staff e visibilitàheld.
4.280 boundary, HTML/XSS safe, 3 post/giorno/utente/Tribe con quota concurrent e cambio giorno/DST, nonce same/different payload; quattro reactions, cambio/rimozione e race.
5. Expiry24h esatta, stale page/new react denied, purge al primo ciclo utile, configurabile/dry-run/paused/report aperto/hold.
6. Delete post/account concorrente a create/react/report/read; retry dopo errore; doppio purge/worker restart; derived counts coerenti.
7. Warn/hide/suspend/ban/reversal senza ripubblicazione automatica, staff revoca/MFA, claim concorrente, notes non export.
8. RIGHTS restricted/revoked e Bacheca export con redazioni terzi; hold evidence solo minima approvata.
9. Zero fixture/orphan dopoprove; scheduler OFF fino gate; nessuna dipendenza/debug pubblica.
10. Core onboarding/Profilo/Ora/Tribe/Spot/match/chat/PHOTO/diritti e rete font locale preservati.

## Gate di approvazione

Prima coding: baseline integrata e smoke Auth/SQL completi; tre sonde ritirate o isolate con evidenza; contratto founder approvato, smoke autenticato integrato completato. Prima pilot: professionista valida UGC/privacy/retention/moderation/diritti e documenti coerenti. GO tecnico non è approvazione legale né autorizzazione rollout.


## FOUNDER DECISIONS REQUIRED

**Nessuna decisione founder sostanziale residua** per il perimetro MVP approvato in questa fase.

**FOUNDER-APPROVED TECHNICAL BASELINE — LEGAL VALIDATION PENDING**

- Revoca dating: blocca discovery/matching dating, non Bacheca se utente altrimenti eligible e non suspended/banned. Nessuna preferenza dating usata da Bacheca.
- Post: testo soltanto, massimo 280 caratteri, massimo 3 nuovi post al giorno per utente per Tribe. Niente immagini/video/allegati nel pilot.
- Reactions: ❤️ 👀 😂 🔥, una attiva per utente per post, modificabile/rimuovibile; esposizione aggregata, mai roster nominale.
- Expiry: invisibilità pubblica dopo 24h; purge fisico al primo ciclo retention utile successivo. Report aperto o safety hold esplicito può sospenderlo, con review/retention configurabile e nessuna conservazione indefinita di default.
- Sospensione: post invisibili, nessuna ripubblicazione automatica al termine; nuovi post solo quando eligible; vecchi post soggetti alla normale expiry/retention.

Il coding dovrà rendere deterministici i dettagli tecnici (limite Unicode, giorno civile Europe/Rome per quota e DST, retry/race) e documentarli; non deve introdurre limiti globali cross-Tribe o nuove scelte prodotto. I test dovranno coprire le quattro reactions e cambio/rimozione concorrenti, limite 280, quota giornaliera per Tribe e report aperti che differiscono il purge.

Restano gate professionali pre-pilot: trattamento UGC/anonimato peer, condizioni, diritti, retention di report/evidence e procedura ricorsi. Nessuna base giuridica o sufficienza legale scelta da questo contratto. Nessuna Bacheca implementata in questo task. Il GO al coding richiede anche il completamento dello smoke autenticato integrato staging.


Quota: contare nuove pubblicazioni riuscite per utente/Tribe nel giorno civile Europe/Rome. Retry della stessa operazione non consuma una seconda unità; failure non pubblicata non consuma quota; delete di un post pubblicato non azzera il contatore del giorno. Nessun limite di 3 post attivi distinto e nessun tetto globale cross-Tribe aggiunto. Contatori minimi separati dal contenuto e soggetti a retention dedicata. La sospensione del purge per report aperto deve avere stato/review osservabile, senza trasformarsi in conservazione indefinita automatica.
