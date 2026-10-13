# Bacheca MVP — contratto tecnico candidato, da approvare prima del coding

13 ottobre 2026. Solo design. Nessuna migration/tabella/RPC/UI Bacheca esiste a seguito di questo documento. Nessuna base giuridica scelta. Cupido, poll, Pulse, share card, media upload e notifiche sofisticate esclusi.

## Perimetro già fissato dal founder

Dentro Tribe → Persone | Bacheca; post brevi, anonimi verso altri utenti, autore internamente tracciabile; reactions, report, integrazione moderation, expiry24h, delete/suspend/ban e retention dedicata. Tribe membership persistente, nessuna registrazione di visita alla Bacheca equivalente a storico dei movimenti.

## Decisioni tecniche proposte per approvazione

| Decisione | Proposta MVP | Motivazione / gate |
|---|---|---|
| Audience | Solo membri della stessa Tribe; server Auth+18+/account attivo; niente requisito check-in Ora attivo | Nessun cross-Tribe o inferenza di presenza; membership non location history |
| Revoca dating | Bacheca non legge dating preference e non usa consenso dating come autorizzazione automatica UGC. Proposta: accesso generico rimane possibile se gli altri gate sono soddisfatti | Decisione founder da confermare; conseguenze del flusso app e validazione professionale separate |
| Contenuto | Testo semplice, massimo500caratteri; niente HTML/media/link preview | Limite candidato, non implementato; render textContent e test XSS |
| Pubblicazione | Massimo3post attivi/Tribe e10nuovi post/24h/account, prenotazione atomica; operation UUID/client nonce per retry | Parametri candidati centralizzati, non limiti già approvati |
| Reactions | Un tipo semplice, una reaction/account/post; toggle idempotente con revision/opID; peers vedono solo conteggio e propria reaction | Nessun roster dei reagenti o mapping utente esterno |
| Anonimato peer | Nessun author UUID/name/avatar/profile link, nessun pseudonimo stabile cross-post, nessun reaction roster | L'anonimato è verso i peer, non verso Soma; testo può identificare chi scrive |
| Expiry | expires_at fissato server=created_at+24h, non rinnovabile con edit/retry; niente edit nel MVP, delete proprio consentito | Filtro server di ogni read/react/report nuovo dopoexpiry; frontend timer solo cosmetico |
| Delete/autore ban | Delete account/post elimina subito visibilità e dati prodotto ordinari; sospensione/ban nascondono i post attivi e bloccano nuove scritture/reactions | Reversal non ripubblica automaticamente contenuti hidden da moderation o expired |
| Record scaduti | Purge ordinario al primo job riuscito, candidato massimo24h dopoexpiry; no indefinite copies; paused/outage osservabili | Durata fisica candidata da founder/professionista, distinta dalla visibilità24h già fissata |
| Ricorso/report | Report entro vita visibile; moderation conserva reference e categoria, held evidence minima solo con hold esplicito/review/TTL | Policy ricorsi/report postexpiry e durata legale da validare |

Le proposte numeriche500/3/10 e purge24h non sono autorizzazioni d'implementazione. Il founder può modificarle prima di approvare il contratto. Nessun fallback ALL o uso delle preferenze per ranking di contenuto.

## Modello dati candidato

Moduli dedicati UI/API/domain, evitando nuova logica nei file grandi. Schema solo in futura migration dopo025, numero da riservare al coding.

- Post: id casuale, tribe_id, testo semplice, created_at/expires_at server, stato visible/author_deleted/moderation_hidden/expired, revision. Author mapping in schema privato con FK Auth e RLS; nessun author nella proiezione peer.
- Reaction: post_id, owner privato, operation/revision per toggle, unique(owner,post). Risposta aggregata count/my_reaction; non REST select diretto delle righe peer.
- Operation receipts: owner/op/fingerprint/stato minimo e retention breve; nessun testo nel payload audit ordinario, namespace separato dalle receipts PHOTO.
- Report subject: tipo post/reaction, reference UUID; non adattare artificiosamente il profilo come target del post. Actor/reporter e author solo server e staff autorizzato al caso.
- Safety evidence: case/hold riferimento, campi strettamente necessari approvati e review/expiry, fuori prodotto; mai copia integrale automatica di feed/chat/foto. Dati UGC indispensabili per safety vanno progettati separatamente: il modello attuale reason/status da solo non è prova testuale del post.

Scope minimo di dati, indici `(tribe_id,created_at,id)` per keyset e expiry/stato, ownership FK/referenze delete definite senza dangling refs. Nessun location/checkin/session metadata nei post o nelle reactions.

## API e autorizzazioni candidate

- list_posts(tribe,cursor,limit): verifica Auth/age/active/membership su ogni richiesta, filtra expiry e visibility server; fields id,text,created_at,expires_at,reaction_count,my_reaction,can_delete. Nessun author in response/header/log/cache.
- create_post(tribe,text,operation): check server, quota/rate atomicamente sotto lock, replay esatto; nessuna pubblicazione senza owner valido.
- delete_my_post(post,operation): owner-only, idempotente, disponibile anche restricted/revoked per cancellare dati propri; mai permettere delete peer.
- react(post,desired_state,operation): check membership/eligibility/livepost, account epost locks in ordine coerente condelete/purge.
- report_post(post,reason,operation): reference valido, details limitati e minimizzati; no access all'autore tramite risposta. Report/blocco policy deve essere definita senza esporre author_uuid come oggetto di blocks peer.
- own rights: nuove sezioni posts/reactions/report propri, mapping owner solo a se stesso; esclusioni di terzi e notes staff mantenute. Nessun token/security metadata incluso.
- moderation: RBAC+verified factor+AAL2 esistenti, case claim/revision/op; resolve author solo quando necessario a un caso, access auditato e risposta minimizzata. Nessun accesso automatico chat/preferences/location.

RLS/proiezioni/grants difendono REST diretto, join, filtri/ordinamento/count e stale JWT, non solo UI. Private mapping non disponibile nemmeno a staff con SELECT generico. Feed cache owner/Tribe scoped con invalidazione e no shared-cache leak; niente CDN pubblico di contenuti UGC.

## Lifecycle e concorrenza

Consistenza tra create/react/read, report/hold, delete/autore/suspend/ban, purge e rights: lock account/post e ricontrollo condizioni dopo attesa. Nessun purge di held evidence; nessun hold implicito permanente di tutto il feed. Writer/retry receipts distinguono operazione conclusa e incerta; no timeout che autorizzi cancellazione indiscriminata.

Delete account non lascia account utilizzabile, post/reaction/author mapping/derivati ordinari. Report ed evidence solo nella misura esplicitamente held, con retention/review. Conteggi reactions ricostruibili dalla sorgente o aggiornati atomicamente, mai account resurrected da retry. Expiry non estesa da sospensione/reversal.

## Riutilizzo e dipendenze reali

AGE/has-account/membership, MODERATION RBAC/claim/sanzioni, RIGHTS owner/export/delete, RETENTION policy/dry-run/pause, safety hold/audit e retry opID riutilizzabili. Servono estensioni esplicite ai subject report, categorie retention,15sezioni RIGHTS, delete callbacks e audit capability. PHOTO-01/02 non cambia; Bacheca non ha media nel MVP.

Il consenso dating versionato esistente non costituisce automaticamente copertura per UGC; testi e basi da professionista. SMTP/push/analytics non sono dipendenze del coding Bacheca staging sintetico. Staff/pilot readiness restano gate prima degli utenti reali.

## Acceptance suite prima GO MVP

1. Member A può leggere/scrivere Tribe1, non Tribe2; nonmember/anon/missing18/17/restricted/suspended/banned denied.
2. Contratto approvato per revoked dating rispettato senza leggere preferenza.
3. REST/join/filter/export/reaction/report non rivelano author/roster; test A/B/staff e visibilitàheld.
4.500 boundary, HTML/XSS safe, rate/quota concurrent, nonce same/different payload.
5. Expiry24h esatta, stale page/new react denied, default purge configurabile/dry-run/paused/hold.
6. Delete post/account concorrente a create/react/report/read; retry dopo errore; doppio purge/worker restart; derived counts coerenti.
7. Warn/hide/suspend/ban/reversal, staff revoca/MFA, claim concorrente, notes non export.
8. RIGHTS restricted/revoked e Bacheca export con redazioni terzi; hold evidence solo minima approvata.
9. Zero fixture/orphan dopoprove; scheduler OFF fino gate; nessuna dipendenza/debug pubblica.
10. Core onboarding/Profilo/Ora/Tribe/Spot/match/chat/PHOTO/diritti e rete font locale preservati.

## Gate di approvazione

Prima coding: baseline integrata e smoke Auth/SQL completi; tre sonde ritirate o isolate con evidenza; founder approva decisioni candidate di questa pagina. Prima pilot: professionista valida UGC/privacy/retention/moderation/diritti e documenti coerenti. GO tecnico candidato non è approvazione legale né autorizzazione rollout.


## FOUNDER DECISIONS REQUIRED

La navigazione **Tribe → Persone | Bacheca** e il perimetro anonimo, reactions/report, moderation, expiry prodotto 24h, delete/suspend/ban, safety hold e retention dedicata sono approvati. Non vengono riaperti. Le seguenti scelte sono ancora candidate; nessuna è implementata.

| Domanda concreta | Opzioni | Raccomandazione | Impatto privacy/safety |
|---|---|---|---|
| Un membro maggiorenne che revoca il consenso dating può continuare a usare la Bacheca? | A: sì, senza usare le preferenze; B: sola lettura; C: accesso sospeso | A: separare UGC da dating, mantenendo gli altri gate account/membership | Evita consenso aggregato; trattamento UGC e condizioni restano da validare professionalmente |
| Quali limiti iniziali di scrittura adottiamo? | A: 500 caratteri, 3 post attivi/Tribe, 10 nuovi/24h/account; B: 300 caratteri, 1 attivo/Tribe, 5/24h/account | A, con parametri centralizzati e prenotazioni server atomiche | Limita spam e carico moderazione; il limite globale impedisce abuso cross-Tribe |
| Quale reaction semplice mostriamo? | A: un cuore, solo conteggio e propria reaction; B: un pollice, stessi dati | A; una reaction per account/post, toggle idempotente | Nessun elenco reagenti o collegamento pubblico al profilo; non crea Spot o match |
| Quando eliminare fisicamente un post scaduto non soggetto a hold? | A: entro 24h dall'expiry; B: primo job dopo expiry, target entro 1h | B: minimizzazione più rapida, job osservabile e sospendibile | Expiry visibile resta 24h in entrambi; durata fisica e safety evidence da validare professionalmente |
| Una sospensione revocata deve ripubblicare post ancora non scaduti? | A: no, l'autore può crearne uno nuovo; B: sì, salvo contenuto nascosto dalla moderazione | A: riduce riapparizioni inattese e semplifica sicurezza | Non riapre post scaduti né contenuti rimossi; informazione comprensibile nel futuro flusso sanzione |

Il testo semplice senza allegati/link preview è la proposta tecnica minima per i post brevi. Nessuna nuova acquisizione foto, nessuna modifica PHOTO-01/02. Report di post visibili e hold espliciti sono nel perimetro; tempi dei ricorsi, durata/base dei safety hold e disclosure dell'anonimato sono **LEGAL VALIDATION PENDING**, non decisioni legali prese dal software.

**Stato contratto: CANDIDATE — FOUNDER DECISIONS REQUIRED — LEGAL VALIDATION PENDING.** Non utilizzare la dicitura founder-approved finché le scelte sostanziali sopra non sono confermate. L'approvazione tecnica non sostituisce la validazione professionale pre-pilot.
