# Soma — AGE-01 / CONSENT-01 / RETENTION-01: audit mirato e design staging

10 ottobre 2026. Stato: DESIGN, non implementato. Solo documentazione aggiunta.
Nessuna connessione al DB produzione, migration eseguita o deploy in questo task.

Baseline runtime: `main`/`origin/main` `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`,
ricontrollata con fetch. Il branch di design deriva dall'audit documentale
`5f60a5d87e42b551db72b72d8b552ba56c9e56f9`; i suoi scostamenti da main sono solo docs.
Riferimenti: [audit LEGAL-01](soma-legal01-audit-2026-10-10.md),
[data map](soma-legal01-data-map-2026-10-10.md),
[piano remediation](soma-legal01-remediation-plan-2026-10-10.md).

## 0. Decisioni e perimetro

App 18+; preferenze dating trattate tecnicamente come dati altamente sensibili
potenzialmente Art. 9; consenso esplicito separato/versionato da sottoporre al
professionista. Niente storico persistente degli spostamenti. Durate sotto:
**default di DESIGN per test sintetici, non policy legale o autorizzazione al purge reale**.
Cupido e Bacheca esclusi. PHOTO-01/02 non riaperte: decoder, limiti, canonicali,
quota, cache e cleanup restano invariati. Possibile sola dipendenza necessaria:
predicati di autorizzazione upload/publication/lettura peer, con regression test.

Design e implementazione sono milestone distinte. Questo report chiude audit e
design e dà il gate per la futura implementazione staging, non dichiara eseguiti
collaudi di nuove funzioni. Tre subtask/commit sequenziali, nessun refactor generale.

## A. Audit tecnico mirato — comportamento corrente

### A1. Raccolta, persistenza e autorizzazioni

| Oggetto | Raccolta/codice | Persistenza e uso attuale | Gap |
|---|---|---|---|
| Età | `index.html` #inAge, `src/live.js` checkProfileValid/startProfile, `src/domain.js` validProfile | `public.profiles.age`, intero 18–120, CHECK in 001; backend.saveProfile fa upsert | Non DOB, non verifica indipendente, nessuna attestazione separata |
| DOB | Nessun campo di data nascita nel flusso attuale; nessuna colonna applicativa | Non raccolta | Non aggiungere DOB persistente per soddisfare un test |
| Stato account | `src/live.js` loadAccount/checkAccountStatus; `my_account_state`, `has_account` (009) | Auth non anonimo; controlli sospensione/delete | Nessun age/consent gate; Google non prova età |
| Preferenze | #onboarding: setPref → state.profile.preference → backend.saveProfile | `profiles.preference` NOT NULL, M/F/ALL; `gender` M/F | Nessuna prova o revoca consenso; ALL non equivale a non consenso |
| Lettura profilo | backend.getProfile: select `*` del proprio ID | RLS `profiles_read` self-only (015) | OWN può leggere preference; peer non possono selectarla direttamente |
| Discovery | can_discover (009), location_people (014), location_people_page (014), wrapper foto (013), visible_profiles (015) | `mine.preference` confrontata con `target.gender`; pagina ottimizzata legge preference direttamente | Modificare solo can_discover non protegge tutte le pagine |
| Match/Spot | send_spot (007), can_use_match (009), my_matches (002), my_matches_page (011), wrapper foto (013) | Spot usa discovery e reciprocità; match una coppia, persistente anche dopo Ora | my_matches_page ha guard espliciti e non delega tutta la policy a can_use_match |
| Chat | backend.messages legge tabella, send_message a 2/3 argomenti (009) | RLS messages_read/matches_read → can_use_match; nonce retry, lock match | Nessun age/consent gate. Coprire entrambe le overload, anche client vecchi |
| Foto | can_view_photo (012/017), photo_account_active (016), upload/finish/publication e trigger PHOTO-02 | Foto private; peer via discovery o match; preprofile può caricare | Serve solo gate stretto; evitare ciclo profilo obbligatorio prima foto |
| Check-in | scanVenue → check_in (007), ownCheckIn via RLS | `public.checkins`: una riga per user, venue e timestamp; rinnovo sovrascrive; durata 90 minuti | Scadere dalla UI non elimina la riga |
| Tribe | check_in upsert; tribe_member (007), my_tribes/venue_preview (011), pagina (014) | `spot_private.tribe_memberships(user_id,venue_id,last_checkin_at)`; activity_window NULL = membership permanente | Precisione del passaggio conservata per ogni venue |
| Spot timestamp | send_spot (007) | interests PK sender/recipient/venue, `created_at`, `sender_checkin=now()` | Quest'ultimo non serve alla reciprocità attuale; può duplicare informazione luogo/tempo |
| Moderazione | report_profile (009), moderate_report/moderation_reports (006) | reports pending/reviewed/dismissed, reviewed_at; suspensions e moderation_audit | Nessun TTL/hold completo; reviewed non significa necessariamente caso risolto |
| Diagnostica | `src/diagnostics.js` | RAM, max 30 eventi tipo/ora; non inviata | Non trasformare il TTL 7 giorni in nuova raccolta |
| Security/provider log | Auth, Edge, cron/pg_net, Vercel | Copie e retention dipendono dai provider | Durate/configurazioni non provate dal codice; nessun purge universale via DB |
| Delete | backend.deleteAccount, Edge delete-account, prepare_account_deletion (008), PHOTO-02 | Cascade social/Auth; preparazione elimina report/audit/sospensioni/ruoli; foto con queue/ledger | Nuove tabelle devono seguire delete; preservare percorso anche se age/consent non attivi |

Fonti SQL: 001, 002, 003, 006, 007, 008, 009, 011–019. Non usare come baseline
la durata di 1 ora di 001/002: 007/009 sostituiscono i relativi comportamenti.
`express_interest` legacy è già un rifiuto controllato (007), non un writer da riattivare.

### A2. Esposizioni e dati senza scadenza

- Preference: table read solo SELF; filtri server/OPS. Nessuna proiezione peer
  corrente restituisce preference. Il risultato filtrato può comunque permettere inferenze.
- Presence peer: LOC-01 mantiene checked_in_at/expires_at NULL nelle RPC legacy;
  la propria riga check-in contiene i timestamp necessari. Non regredire questo contratto.
- Nessun GPS: venue tramite QR. Non esiste una tabella dello storico completo
  check-in, ma membership per venue + ultimi timestamp e relazioni possono ricostruire contesto.
- Ultimo check-in scaduto, membership Tribe, interests, matches e messages oggi
  non hanno purge temporale. Anche report/audit/sospensioni non hanno TTL applicativo.
- Blocchi e ruoli non sono candidati automatici ai TTL social: hanno finalità diversa.
- Foto seguono già PHOTO-02. Account Auth senza profilo e log provider sono altri
  lifecycle, da inventariare senza estendere implicitamente questo blocco.

Nessun nuovo censimento live effettuato: quantità/fatti produzione restano quelli
verificati nella baseline LEGAL-01, non risultati di un nuovo preflight.

## B. Design AGE-01

### B1. Dato minimo e macchina di stato

Mantenere età numerica 18–120 + checkbox separata “Dichiaro di avere almeno 18 anni”.
Server autorevole per la **dichiarazione**, non certificazione dell'età reale.
Niente DOB persistente, documento, KYC o analisi foto.

`age_status`: confirmation_required / eligible / restricted. Registro privato
`account_eligibility` (UID, stato, method, statement_version, attested_at,
revision). method = self_declared_age. Registro eventi minimo per attestazione/
restrizione, operation ID idempotente; niente IP, DOB, copia foto o valore 17
per statistiche. `profiles.age` resta dato di presentazione, non prova autonoma.

Età mancante, non intera, fuori range o dichiarazione assente → nessuna eleggibilità.
<18 → onboarding negato; se sessione/profilo esistente, restrizione server e
percorso assistenza/delete. Non autorizzare un ban perpetuo con un semplice input.
Nessun bypass cambiando user_metadata, profilo, JWT o preferenza ALL.
Per una sessione eligible che invia una nuova dichiarazione <18, la RPC deve
committare restricted e restituire un risultato controllato: non fare RAISE dopo
l'update, perché il rollback annullerebbe la restrizione. Input formalmente
invalido non è automaticamente prova di minore: nessuna nuova attestazione,
nessun onboarding con dato invalido, percorso di correzione senza falsa certificazione.

**DOB mancante/invalida:** il percorso numerico non richiede DOB, quindi la sua
assenza non è un errore se età e dichiarazione sono valide. Non accettare un
payload DOB vuoto/invalido come prova alternativa. Se si adotta in futuro
l'input DOB, parser server rigoroso, calcolo calendario (non giorni/365), data
futura/leap-day testati e nessuna persistenza/log della DOB; decisione separata.
I test DOB di questo blocco verificano il rifiuto di tale scorciatoia, non introducono un nuovo campo.

### B2. Flusso e gate

Pre-check client prima OAuth dove possibile; attestazione autenticata prima di
upload, preference/profilo o check-in. Auth creato tramite API non basta a fare dating.
RPC `my_privacy_state` e `attest_adult(age,statement_version,operation_id)` own-only.
La revisione server deve restare coerente con profiles.age; direct REST insert/
update non può fabbricare attestazione né cambiare il dato in modo incoerente.
Per aggiornamento età, RPC idempotente con gli stessi controlli; grant diretti
sul campo age limitati o trigger di enforcement equivalente da testare.

Predicati separati: account autenticato, age eligible, consent valido, accesso
moderatore. Non aggiungere tutti i gate indiscriminatamente a has_account.
Age gate chiamante **e target/partner** per profile publish, check_in, discovery,
conteggi, Spot, match, chat e foto peer. OWN stato, supporto/safety, revoca,
export/delete/logout rimangono accessibili; account admin non richiede profilo dating.

Client: nuovo modulo age-gate, hook minimi live/backend, boot fail-closed; stato
non disponibile non apre dating. Poll/resume controllano revision e azzerano
liste/chat/prefetch personali quando cambia. Non affidarsi alla cache del client.

Esistenti: backfill confirmation_required, mai eligible dedotto da profiles.age.
Profilo preservato ma non distribuito finché l'attestazione non è completata;
nessuna foto eliminata. In staging simulare login/rinnovo vecchie sessioni.
Rollout e impatto sugli utenti reali saranno approvati separatamente.

## C. Design CONSENT-01

### C1. Finalità/versioni e schema minimo

Purpose candidato `dating_preferences`: raccolta e uso preference per discovery/
matching, con inferenze derivanti da gender e relazioni da sottoporre al professionista.
Questa singola checkbox non dimostra copertura legale di tutti i dati intimi in
chat, report o venue: Art. 6, condizione Art. 9, granularità e libertà restano da validare.

Catalogo privato `consent_versions`: purpose, versione immutabile, testo/hash,
status draft/validated, ambiente, required_since e riferimento review.
Staging: testo chiaramente marcato **PLACEHOLDER — NON VALIDATO — SOLO TEST**,
attivabile solo su progetto staging allowlistato. Produzione non può attivare una
versione draft. Checkbox non preselezionata, distinta da 18+, Terms e informativa.

`consent_state`: UID/purpose, active/revoked (assenza = missing), version,
revision, changed_at. `consent_events`: UID/purpose/version/text_hash,
action accept/revoke, server_timestamp, operation_id. Unicità per retry,
immutabilità per client, grants/RLS privati, own RPC limitata. Niente preferenza,
IP/device/location nel trail. Retention della prova da validare; non perpetua.

RPC own-only `accept_dating_consent(version,operation_id)`,
`revoke_dating_consent(operation_id)` e `my_privacy_state`.
Nuova versione materiale richiesta → stato derivato renewal_required finché
nuova accettazione; non riscrivere una vecchia prova. Modifica editoriale non
implica automaticamente nuova richiesta: regola e versione materiality approvate.

### C2. Preference e revoca

**Proposta tecnica: cancellare il valore, non congelarlo.** Rendere
profiles.preference nullable; NULL significa nessuna preferenza utilizzabile,
mai ALL. Restano i valori M/F/ALL solo con consenso corrente e stato age valido.
Preference resta self-only nel contratto 015; nessun consenso/versione peer.
Account esistenti partono missing, mai active derivato dall'uso precedente.
In staging il backfill minimizzante azzera le preferenze delle fixture senza
prova; per produzione la transizione/cancellazione deve essere presentata e
autorizzata separatamente. Nessuna registrazione di consenso retroattivo.

Salvataggio via RPC dedicata o trigger equivalente obbligatorio anche per REST
legacy. Impedire persistenza senza consenso; nessun bypass facendo upsert name/
photo/preference in un vecchio frontend. Accettazione non ricostruisce il dato
cancellato: nuova scelta esplicita. Version mismatch blocca il filtro; nessuna
preference caricata dal client in anticipo e inviata prima della prova server.

Revoca in una transazione: evento idempotente, stato/revision aggiornati,
preference=NULL, invalidazione accessi dating. Doppia revoca non duplica eventi
né fallisce. Retry con operation ID riusato per un'azione diversa viene rifiutato.

Design staging fail-closed: no discovery/nuovi Spot/match/chat peer per revocante,
né profilo proposto ad altri. Non usare vecchi Spot per creare nuovi match.
Dati social preesistenti non vengono cancellati tutti alla revoca: restano
inaccessibili al dating e passano a RIGHTS/retention approvati. Lettura delle
chat pregresse e mantenimento/restrizione dei dati derivati richiedono una scelta
professionale distinta; non nascondere questa conseguenza in un semplice toggle.
OWN stato/prova, safety, supporto, export/delete continuano. La revoca non è delete account.

Una vecchia richiesta accept può arrivare dopo revoke: operation ID da solo non
basta. Accept/save includono expected_revision e una challenge server monouso
legata a versione/azione; revoke invalida le challenge precedenti. Solo un nuovo
atto consapevole ottenuto dopo revoca può riattivare. Revoke ripetuta resta
idempotente, anche se arriva da una scheda con revision vecchia.

Eventuale necessità safety di trattenere un valore specifico richiede hold
motivato e accesso ristretto al caso, non una copia congelata universale.

### C3. Concorrenza, RLS e foto

Serializzare attestazione/revoca, profile publish, check_in e social write con
lock degli owner in ordine UID deterministico, poi lock coppia/match. Auditare
l'ordine esistente (send_message oggi prende il match prima dei controlli) per
evitare deadlock. Reads controllano gli stati server anche con JWT vecchio;
una risposta già inviata non si può ritirare retroattivamente.

Paginated RPC ottimizzate e conteggi devono applicare il gate esplicito anche
quando non chiamano can_discover/can_use_match. RLS matches/messages e Storage,
visible_profiles, legacy RPC e overload incluse nel manifest. Funzioni service-only
non diventano accessibili ad authenticated. Ownership e search_path restritti.

Foto: aggiungere solo il predicato necessario prima admission/finish/publish e
nuova autorizzazione peer. Condividere le protezioni di publication/delete già
esistenti; non aggiungere un lock esterno con ordine opposto al photo_owner_lock.
Write già partita → pubblicazione negata se non più eligible, cleanup PHOTO-02;
unknown mai purgato per timeout. Foto corrente preservata; OWN/delete/collector
non dipendono da consenso dating. Decoder e limiti non cambiano.
Signed URL/cache già consegnati rimangono una limitazione dichiarata, non una
promessa di revoca istantanea dei byte.

## D. Design RETENTION-01

### D1. Configurazione

Registro privato versionato `retention_policies`: categoria, durata/unità,
evento iniziale, batch, hold rule, enabled, review_status, ambiente, approved_ref.
Default centralizzati in un solo manifest SQL/config leggibile; job legge sempre
la versione dal DB, non duplica costanti in UI/Edge. Valori modificabili solo da
operatore service autorizzato e auditati. Scheduler distinto PHOTO-02, OFF iniziale.

| Categoria | Default design | Evento/candidatura | Protezioni |
|---|---|---|---|
| Check-in scaduto | eliminazione entro 24 h dalla scadenza | expires_at passato; avviare purge presto, senza attendere l'intero limite | Mai attivo/rinnovato; hold specifico solo se necessario e approvato |
| Spot non ricambiato | 90 giorni | created_at dell'interesse | Nessun reciproco/match/hold; lock coppia condiviso con send_spot |
| Match senza chat | 90 giorni | matches.created_at | first_message_at NULL **e** zero messages; lock match e ricontrollo primo invio |
| Chat inattiva | 12 mesi di calendario | ultimo messaggio, non ultima lettura | Nessun invio recente/hold/export protetto; avviso opzionale e preavviso configurabile |
| Report concluso | 180 giorni | closed_at semantico da introdurre | Non pending/appeal/hold/sospensione attiva dipendente dal caso |
| Log diagnostico persistente, se esiste | 7 giorni | evento | Nessuna nuova telemetria implicita; RAM attuale resta transitoria |
| Log security controllabile | 30 giorni | evento | Incident hold specifico; copie provider configurate/verificate separatamente |

12 mesi = interval calendario, non 365 giorni. 24 h/90/180/7/30 sono durate
esplicite; timezone server e confini testati. Lo scheduler può fallire: il limite
fisico 24 h non è garantito dal solo cron. Proporre tick 5 minuti, purge dei
check-in già scaduti, alert su ritardo/violazione SLA e pausa raccolta se non
recuperabile. Visibilità Ora scade sempre a 90 minuti, indipendentemente dal purge.
Non promettere che un guasto non possa violare un obiettivo fisico di cancellazione.

Config assente/non approvata → esecuzione categoria OFF e alert, non retention
indefinita dichiarata lecita. Per fixture staging, design defaults abilitabili
solo con target staging esplicito; nessuna attivazione produzione derivata da seed.

### D2. Location minimization e dipendenze Tribe

1. Purge ultima riga check-in scaduta con lock user e recheck expires_at/version.
   Check-in concorrente che rinnova preservato. Tribe non viene eliminata.
2. Eliminare la precisione persistente di `tribe_memberships.last_checkin_at`:
   migration rende nullable; codice smette di aggiornarla; backfill minimizzante
   solo staging. Membership resta coppia user/venue senza timestamp di visita.
   Helper/pagine/counts diventano membership-only; verificare activity_window NULL
   come gate. Una finestra non NULL causa NO-GO, non perdita implicita di funzionalità.
   Deprecare la capacità non usata della finestra di attività; non rimettere date
   fittizie. Drop colonne rinviato a pulizia compatibile separata.
3. `interests.sender_checkin` reso nullable e non scritto: nella logica attuale
   send_spot controlla reciprocità per venue, non usa quel timestamp. Conservare
   created_at solo per TTL dell'interesse, distinto da prova di presenza.
4. Venue nel match/Spot e appartenenza Tribe sono contesto del prodotto, non
   storico di passaggi; permettono comunque inferenze sui luoghi. Niente nuova
   tabella eventi check-in, joined_at o audit purge contenente venue/user/time.

Non è una promessa “nessun dato di luogo”: conservare Tribe multi-venue significa
conservare associazioni ai luoghi. Founder/professionista devono confermare questo
confine. Se si richiede assenza anche delle associazioni, serve decisione prodotto
su Tribe: non la implementare implicitamente.

### D3. Job, hold e ripresa

Nuovo modulo `supabase/functions/privacy-retention/`, RPC service-only
inventory/dry_run/claim/execute/status/pause, private runs/jobs e hold minimali.
Dry-run non cancella né modifica record business; può registrare solo conteggi e
versione policy nel registro operativo. Distinguere read-only puro dal dry-run auditato.

Batch limitati, lease e token fencing, claim SKIP LOCKED, transazione per batch
con recheck policy/version/hold/stato. Pause blocca nuove esecuzioni; un batch già
committato non si annulla. Rendere breve il batch in corso e misurare tempo pausa.
Doppio worker/retry dopo commit → stesso receipt aggregato, nessuna seconda cancellazione.

Lock ordine comune a writer/hold/delete/retention. Prima purge chat ricontrollare
ultimo messaggio; nuovo invio e purge serializzati. Decidere se eliminare il match
assieme alla chat: proposta sì per non lasciare una conversazione vuota ambigua,
con avviso opzionale, conseguenza prodotto da approvare. Delete account resta
prioritario; jobs che perdono target terminano no-op, non ricreano account.

Hold: case ID e scope autorizzato, motivo codificato, review date, actor minimo;
nessuna chat duplicata nel log. Reviewed report non è closed: backfill review_required
per casi incerti; non inferire chiusura da reviewed_at. Reports legati a sospensione,
ricorso o incident restano esclusi. Hold rilasciato manualmente con audit.
Questo sottoblocco richiede contratto safety di MODERATION-01, senza implementare
qui queue completa/ban/ruoli. Finché manca, purge moderation resta OFF.

Receipt purge aggregato: run ID, policy versione, categoria, cutoff, conteggi,
esito/codice e tempo; niente UUID/venue/preferences/chat nel report pubblico.
Target IDs privati temporanei solo se necessari al retry/hold; loro TTL separato
da approvare. Non creare un nuovo storico personale attraverso la cleanup queue.

Provider log/Auth/cron/CDN/mailbox: inventario PROVIDER-01 necessario. Non cancellare
Auth audit con SQL non supportato né promettere TTL provider controllati dal cron.
Security e diagnostic sono categorie distinte; foto metadata 7 giorni invariati.

## E. Schema, migration e moduli candidati

Nomi/numero proposti, non creati o applicati; ricontrollare collisioni staging.
Non cambiare migration 001–019. Ogni file sarà un commit/task distinto.

| Candidato | Cambiamenti | Compatibilità e dipendenze |
|---|---|---|
| 020_age_eligibility.sql | account_eligibility/events; own RPC; gate age; profile age enforcement; backfill confirmation_required | SELF/safety/delete/admin separati; Auth preprofile valido per attestazione |
| 021_dating_consent.sql | version/state/events; nullable preference; accept/revoke/save RPC o guard; tutte discovery/match/messages/counts | Client vecchio riceve errore controllato, mai bypass; nessun consenso inventato |
| 022_location_minimization.sql | last_checkin_at/sender_checkin nullable; check_in/helper/pagine aggiornati; minimizzazione valori staging | Solo activity_window NULL; mantiene 90 minuti/membership/Spot; irreversibilità precisione esplicita |
| 023_privacy_retention.sql | policy registry, runs/jobs/hold, indici due, claim/purge/pause service-only | OFF iniziale; moderation closure/hold sotto subtask specifico prima purge report |
| Eventuale integrazione safety | closed_at/hold/report relation e rispetto prepare_account_deletion | Schema minimale separato, da approvare; non retention automatica di tutte le accuse |

Client nuovi: age-gate, dating-consent e privacy-state/backend dedicati;
hook minimi `src/live.js`, `src/backend.js`, `src/domain.js`, `src/live-social.js`,
`index.html` per checkbox e revoca necessarie, senza redesign.
Server: helper autorizzazioni, privacy-retention, update guard/RLS/RPC e hook delete
per nuove entità; foto solo predicati necessari. `has_account` resta base Auth,
non un omnibus che renda moderazione/delete dipendenti dal dating.

FK nuove prove/stati verso auth.users con cascade dove approvato. Prove da mantenere
post-delete solo dopo scelta motivata, separata e con TTL; non inventare eccezione.
Export dei dati nuovi richiesto a RIGHTS-01, anche se account restricted.

Rollback staging: pause retention; gate compatibili fail-closed. Non rollback di
preference/precisione cancellata; non restaurare dati revocati con un dump.
Staging ricreabile con fixture sintetiche, scheduler/outbound OFF prima restore.
Nessun rollback distruttivo PHOTO-02.

## F. Test previsti e sequenza staging

### F1. Matrice automatica

| Gruppo | Casi minimi e prove |
|---|---|
| AGE | 17 no; 18 sì; 120/121/frazioni/null; DOB payload invalido/mancante non accettato come prova; età numerica valida senza DOB ammessa; checkbox/version mismatch; REST/user_metadata/JWT vecchio bypass; eligible→restricted; update età coerente; admin senza dating; own delete/report disponibili |
| CONSENT | missing/accept/revoke/revoke ripetuta; operation ID conflict; accept tardivo dopo revoke/challenge invalida; nuova versione materiale; placeholder produzione vietato; preference NULL e nessun fallback ALL; direct REST + RPC legacy; caller/target esclusi; lookup preference non eseguito senza gate; zero consenso/preference nei peer payload |
| Race privacy | revoca vs Spot/primo messaggio/check_in/profile publish; restriction vs upload; ordine lock/timeout/deadlock; nessuna write dopo commit restrizione; foto current preservata, unknown rispettati |
| RETENTION | confini esatti/±1 unità; mese/leap/timezone; dry-run; eligible/noneligible; renewal checkin; reciproco Spot/match/first message; chat appena attiva; report pending/appeal/hold/sospensione; pause/doppio worker/retry/crash/ripresa; version change claim; delete concorrente; receipt senza PII |
| Location | dopo purge Ora vuota ma Tribe presente; no precisione membership/Spot nuova o legacy; niente nuovo event log; activity_window non NULL blocca migration; payload LOC-01 sempre null |
| Core | Profilo/edit/reentry, QR/rinnovo 90 minuti/polling, Ora/Tribe foto/pagine, Spot/match/chat/refresh/retry, blocco/report e delete con tutte nuove tabelle; quota e lifecycle PHOTO-02 invariati |
| Security/performance | RLS anon/auth/SELF/peer/ops, permission escalation, service-only, client vecchi, >200 utenti/multi-venue, query plan/indici e batch bounded; zero originali/foto reali |

Nuovi candidati test: age-eligibility.test.js, dating-consent.test.js,
privacy-retention.test.js, privacy-gates-database.test.js e fixture staging dedicate.
Harness PGlite esistente carica migration fino a 019: estenderlo nel task test,
non chiamare questi test “reali Supabase”. PostgreSQL staging separato con due
sessioni/connessioni per race vere, Auth/Storage e browser per journey completano la prova.

### F2. Esecuzione futura

1. Inventario read-only dello staging `zjinjtkekmaqtxsuyvho`; schema 001–019,
   PHOTO-02 operativo/testabile, nessun dato reale importato; censire e preservare
   eventuali review note senza confonderle con fixture nuove.
2. Manifest diff/schema/RLS/API e gate; branch implementazione dedicato,
   ambiente positivo allowlistato, segreti staging, scheduler retention OFF.
3. AGE da solo: test automatici, migration staging, preprofile/17/18/bypass/delete.
4. CONSENT da solo: placeholder, proof/revoke/races e client vecchio; test core.
5. Minimizzazione location: activity_window gate e fixture multi-venue;
   verificare membership dopo eliminazione check-in senza usare last_checkin.
6. RETENTION: dry-run sintetico prima; abilitare per categoria su fixture;
   report/log solo dopo closure/hold e store verificati. Job scheduler autenticato,
   pausa/ripresa e doppio worker reali. PHOTO-02 scheduler non cambiato.
7. Delete totale fixture nuove, verificare Auth/social/nuovi registri/Storage/
   ledger/quota e zero orfani; rollback operativo e restore sintetico controllati.
8. Test/build/typecheck, evidenze aggregate, commit e push. Nessun merge main
   o produzione dedotto dal GO staging. Futuro preflight produzione separato.

## G. Rischi e stop gate

- Dichiarazione non certifica età reale; nessun test dimostra assenza di minori.
- CONSENT solo preference potrebbe non coprire inferenze di relazioni/chat/venue;
  validazione professionale obbligatoria prima utenti reali.
- Paginated RPC/contatori, RLS diretto e endpoint legacy possono aggirare un helper
  modificato isolatamente: inventory/test contract completi obbligatori.
- Revoca comporta limitazioni funzionali e dati derivati da governare; non usare
  un consenso di test per dichiarare validità legale.
- Tribe conserva associazioni ai luoghi: se il requisito vieta anche queste,
  NO-GO al design location prima della decisione prodotto.
- TTL check-in 24 ore è SLO di purge con alert, non garanzia in caso di outage.
  Log provider e backup fuori app richiedono configurazioni/evidenze specifiche.
- Purge match/chat irreversibile; safety hold e lock condivisi indispensabili;
  reviewed report non concluso automaticamente.
- Nuove prove possono diventare storico superfluo: scope e TTL del trail da validare.
- Stop staging se dati reali, collisioni schema, deadlock, bypass, perdita foto,
  hold non rispettati, cleanup orphan o regressioni delete. Mai aggirare PHOTO-02.

## H. Decisioni ancora da validare

Professionista: Art. 6/Art. 9/finalità e granularità, libertà/effetti revoca,
lettura chat pregresse e dati derivati; testo/prova/versioning e retention eventi;
sufficienza 18+ e gestione errori/minori; durate e safety hold, chiusura casi,
provider/log/backup e limiti della promessa “non storico location”.
Riferimenti per la review, non approvazioni del design:
[EDPB consenso](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf),
[EDPB age assurance](https://www.edpb.europa.eu/system/files/2025-04/edpb_statement_20250211ageassurance_v1-2_en.pdf).

Founder: confermare cancellazione preference alla revoca; restrizione chat peer
proposta in staging e nuova scelta alla riaccettazione; membership senza date ma
persistente; effetto purge chat+match e avviso/preavviso; rollout account esistenti;
owner/alert e copertura per violazione SLO. Le durate restano design defaults,
non vengono richieste come nuove policy definitive in questo task.

## I. Gate e verifiche del presente task

**GO al primo subtask implementativo AGE-01 in staging**, con soli sintetici e
schema/RLS/API dichiarati sopra. GO al prototipo CONSENT e motore RETENTION con
placeholder/default centralizzati e purge solo sintetico. Non è GO legale al pilot.
**NO-GO** all'attivazione purge moderation/provider non classificati e a qualsiasi
rollout produzione prima di gate professionali, decisioni funzionali e collaudo.

Stato effettivo: audit/design completati; nessuna nuova migration/code/test
implementati. Suite esistente 235/235 PASS; build PASS; typecheck PASS.
Le prove della matrice F sono previste, non ancora eseguite sulle nuove funzioni.
Solo questo documento aggiunto sul branch `codex/age-consent-retention-design`.
