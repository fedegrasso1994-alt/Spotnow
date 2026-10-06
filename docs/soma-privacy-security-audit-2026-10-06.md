# Soma — Step 1: Privacy + Security Technical Audit

Data: 6 ottobre 2026. Progetto reale: `qlucwdjcjomwyziegxrn`. Sito: https://spot-now-alpha.vercel.app/.

## CRITICAL SECURITY ISSUE FOUND

**SEC-01 — preferenza di dating leggibile dagli altri utenti autorizzati a vedere un profilo.** La tabella `public.profiles` concede SELECT a `authenticated` su tutte le colonne; la policy `profiles_read` limita le righe con `spot_private.can_view_profile(id)`, ma non nasconde `preference`. Un membro di una Tribe può interrogare direttamente il profilo di un altro membro visibile e riceverne la preferenza. Non serve che la UI la mostri.

Evidenza del 6 ottobre: query READ ONLY sul progetto reale → privilegio di colonna TRUE, policy e definizione di visibilità corrispondenti alle migrazioni. Riproduzione separata in PGlite, con migrazioni 001–013 e soli utenti sintetici → `otherPreferenceReadable: true`. Nessuna preferenza individuale reale letta. **CRITICAL SECURITY ISSUE**: esposizione non necessaria di un dato che, combinato col genere, può permettere inferenze sensibili. Nessuna correzione applicata. Soluzione proposta in Q/SEC-01.

Un secondo problema di minimizzazione è confermato: le RPC di Ora restituiscono `checked_in_at` ed `expires_at` esatti anche dopo la sostituzione visiva con “Qui ora”. Riproduzione sintetica → `exactTimestampsReturned: true`. Non è un bypass della scadenza, ma la rimozione del testo non equivale alla rimozione del dato trasmesso.

## A. Executive Summary

**NO-GO privacy/security per un pilot aperto a utenti reali, fino alla chiusura dei punti rossi di Q.** È un giudizio tecnico di prontezza, non una certificazione né la prova di un incidente già avvenuto.

Protezioni presenti: RLS pubblica, dati social/moderazione in schema privato, foto private, controlli server su blocchi/sospensioni/cancellazioni, timestamp check-in server, idempotenza di messaggi e report, validazione età in database, cancellazione collegata al JWT del chiamante. Queste protezioni non eliminano l'esposizione delle colonne profilo, gli abusi delle API autorizzate, la retention indefinita e i limiti operativi.

Il pilot attuale tratta profili e preferenze dating, luoghi frequentati, interessi reciproci e conversazioni. Non risultano GPS, advertising ID, analytics marketing, riconoscimento facciale o push. Il proprietario ha indicato Federico Grasso come responsabile persona fisica e `somadatingapp@gmail.com` come recapito: dichiarazione da convalidare e rendere operativa, senza presumere una società. Il cambio di nome a Soma non sostituisce l'identificazione del titolare.

### Perimetro ed evidenze

- Letto `AGENTS.md`; nessun refactor, test nuovo o correzione.
- Analizzati frontend reale/demo/admin, SDK/config, migrazioni 001–013, entrambe le Edge Function, storage, CI e script.
- Ricostruito il catalogo finale locale: 6 tabelle pubbliche + 10 private, tutte con RLS; 36 funzioni applicative, tutte SECURITY DEFINER con `search_path=''`; nessuna view/materialized view né trigger applicativo custom nel modello ricostruito. Le FK generano trigger interni.
- Verificato oggi sul progetto reale: nessuna tabella pubblica senza RLS; nessuna tabella privata direttamente SELECT per anon/authenticated; accesso alla colonna preference; helper visibilità; Tribe activity_window NULL; vincolo 90 minuti; bucket privato 8 MiB JPEG/PNG/WebP; provider e impostazioni sessione. Query in `BEGIN READ ONLY`/`ROLLBACK`, senza DDL/DML o lettura di contenuti personali. L'editor mantiene stato diagnostico di query; non è una migration né modifica ai dati applicativi.
- Distinzione esplicita: il catalogo completo e tutti i percorsi adversarial sono verificati localmente; non è stata confrontata byte per byte l'intera configurazione cloud con tutte le migrazioni. Non eseguito un pentest distruttivo/di carico in produzione.
- Evidenze del 5 ottobre, non ricontate oggi: regione progetto Irlanda/eu-west-1, 5 account anonimi, 2 file foto orfani, schema Auth IP/user-agent, piano senza backup progetto. Sono evidenze datate, non conteggi correnti garantiti.
- In questo audit: 157 test PASS, build PASS, typecheck PASS. Le prove sintetiche extra sono comandi temporanei, non nuovi test nel repository.
- Nessun secret/token stampato; nessun messaggio, foto o preferenza reale esportato. Nessun invio email, login di prova con nuova identità, blocco, sospensione o cancellazione di persone reali.

## B. Architecture Relevant to Privacy/Security

`main.js` sceglie app reale, demo o moderazione. `live.js` coordina sessione, onboarding, QR, Ora, Tribe e profilo; `live-social.js` coordina dettagli, Spot, match/chat e polling. `backend.js` usa il client Supabase ufficiale iniettato da `supabase-client.js`; il browser interroga direttamente Auth/PostgREST/Storage/Functions. Vercel distribuisce asset statici: non riceve ordinariamente il corpo delle chat attraverso un backend Vercel.

La sicurezza effettiva è nelle RLS, grant, helper privati e RPC SECURITY DEFINER. Le 48 schede UI, i bottoni disabilitati e i timeout client sono UX/performance, non autorizzazione server. Demo e fixture simulano funzionalità e non provano la loro esistenza reale.

`supabase/functions/delete-account` valida il bearer con Auth e usa la service role solo sul server; `photo-assets` valida identità, proprietà della foto corrente e policy, oppure un percorso backfill riservato a service_role. `supabase/config.toml` dichiara verify_jwt=true per entrambe. Non è stata letta la service key né ricontrollato oggi il toggle gateway cloud.

## C. Personal Data Map

La tabella copre i 13 campi richiesti per ogni famiglia, incluse le assenze rilevanti. **SP** = Supabase; **VE** = Vercel/CDN; **GO** = Google OAuth; **GF** = Google Fonts; **EM** = servizio email integrato Supabase + casella destinatario; **LO** = dispositivo/browser. Provider/admin possono accedere nei limiti dei propri ruoli: “privato” non significa escluso il gestore. “Altri autorizzati” significa discovery in Tribe condivisa secondo filtro/blocchi/stato account, o partner match secondo la specifica API. Retention indefinite descrivono il codice, non nuove scelte autorizzate. Esiti di cancellazione si riferiscono al percorso riuscito; limiti in H.

| Dato | Raccolta/generazione | Finalità tecnica attuale | Dove conservato | Tabella/bucket/provider | Chi legge | Chi modifica | Mostrato ad altri | Retention verificabile | Cancellazione account | Terzi destinatari | Pilot | Rischio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nome profilo | Onboarding/modifica | Riconoscimento profilo | DB/RAM | public.profiles | Proprietario/altri autorizzati/admin | Proprietario/admin | Sì | Ultimo valore senza TTL | DELETED | SP; destinatari profilo | REQUIRED | MEDIUM |
| Età 18–120 | Onboarding/modifica | Gate e presentazione | DB/RAM | profiles.age | Proprietario/altri autorizzati/admin | Proprietario/admin | Sì | Ultimo valore senza TTL | DELETED | SP; destinatari profilo | REQUIRED | MEDIUM |
| Data di nascita | NON raccolta | Nessuna | Assente | Nessuna | Nessuno | Nessuno | No | N/A | UNKNOWN: assente | Nessuno | NOT NEEDED | LOW |
| Email e identità OAuth/email | Accesso/verifica | Account e recupero | Auth/sessione | auth.users/identities | Proprietario/Auth/admin; non discovery | Auth/proprietario tramite flussi provider | No nel profilo app | Nessun TTL app; log separati | DELETED Auth; log UNKNOWN | SP/GO/EM | REQUIRED | HIGH |
| Telefono | Helper SMS presente ma provider OFF | Non usato nel flusso | Non raccolto dalla UI | Campo Auth potenziale non popolazione verificata | Auth/admin se fornito fuori flusso | Provider/Auth | No | NOT VERIFIABLE FROM REPOSITORY | UNKNOWN | SP se flusso futuro | NOT NEEDED | LOW |
| UUID account/provider IDs/stato anonimo | Auth signup | Identificazione e autorizzazione | Auth/DB/sessione | auth.users/identities; FK | Utente/server/admin; UUID profilo agli autorizzati | Auth; FK gestite server | UUID trasmesso alle API | Vita account; log separati | DELETED; log UNKNOWN | SP/GO | REQUIRED | HIGH |
| Metadata Google: nome/foto/email/claim | OAuth | Sessione Auth; non profilo app automatico | Auth/sessione | user_metadata | Proprietario/Auth/admin | Provider/Auth; metadata utente non autorità RLS | Non nella discovery | Nessun TTL dedicato verificato | DELETED Auth; GO separato | SP/GO | QUESTIONABLE per campi eccedenti | HIGH |
| Foto corrente + percorso UUID | Upload/modifica | Riconoscimento obbligatorio | Storage/DB/RAM | profile-photos; profiles.photo_path | Proprietario/altri autorizzati/admin; bearer URL | Proprietario via upload/profilo; server | Sì | Finché eliminata; nessun TTL file | DELETED cartella normale | SP; destinatari foto | REQUIRED | HIGH |
| Preview120/thumbnail480/detail1600 | Client/Edge conversione | Caricamento veloce | Storage/DB/RAM | photo_assets; .thumb.jpg/.detail.jpg | Stessa autorizzazione foto corrente | Proprietario preview; Edge varianti | Sì | Nessun TTL; cache distinta | DELETED cartella/asset DB | SP; destinatari foto | REQUIRED secondo prestazioni attuali | HIGH |
| Foto vecchie/upload orfani | Sostituzioni/interruzioni | Residui senza funzione corrente | Storage/asset | profile-photos/photo_assets | Proprietario cartella/admin | Upload e server | Non servite normalmente come foto corrente | Nessuna pulizia automatica | DELETED normale; annidati UNKNOWN | SP | NOT NEEDED | HIGH |
| EXIF/metadati file | File fornito dall’utente | Nessuna finalità EXIF app | Originale/Storage metadata | profile-photos | Chi può ottenere originale/admin | File d’origine; converter ri-encoda varianti | Possibile nell’originale | Come originale | DELETED normale; copie UNKNOWN | SP; destinatari originale | NOT NEEDED | HIGH |
| Genere M/F | Onboarding/modifica | Filtro/presentazione | DB/RAM | profiles.gender | Proprietario/altri autorizzati/admin | Proprietario/admin | Via API; non sempre etichetta UI | Ultimo valore senza TTL | DELETED | SP; destinatari profilo | REQUIRED nel filtro attuale | HIGH |
| Preferenza M/F/ALL: genere desiderato | Onboarding/modifica | Filtro discovery | DB | profiles.preference | Proprietario/server; anche altri via SELECT diretto | Proprietario/admin | Non UI, ma esposta via API | Ultimo valore senza TTL | DELETED | SP; lettori API autorizzati | REQUIRED filtro; divulgazione NOT NEEDED | HIGH |
| Professione/corso ≤80 facoltativo | Onboarding/modifica | Presentazione | DB/RAM | profiles.occupation | Proprietario/altri autorizzati/admin | Proprietario/admin | Sì | Ultimo valore senza TTL | DELETED | SP; destinatari profilo | QUESTIONABLE | MEDIUM |
| Luogo ID/nome/indirizzo | Gestore + QR | Identificare comunità | DB/UI | venues | Utenti sulle venue attive; anon preview con QR; admin | Gestore DB | Sì | Nessun TTL luogo | RETAINED: luogo condiviso | SP; VE se URL | REQUIRED | LOW da solo/HIGH associato |
| QR/token venue | Gestore/scansione/link | Riconoscimento ingresso | DB/URL/storage browser | venue_codes; draft | Gestore; chi copia QR; server | Gestore | QR pubblico nel luogo | Stabile fino a rotazione; draft senza TTL | RETAINED token condiviso; draft rimosso | SP/VE; EM se redirect | REQUIRED | MEDIUM |
| Check-in user/venue/checked_in_at/expires_at | RPC check_in | Presenza Ora90min | DB/RAM | public.checkins | Proprietario tabella; altri via RPC Ora; admin | Solo RPC/server | Qui ora UI; timestamp esatti API | Una riga/utente: resta scaduta fino a sovrascrittura/delete | DELETED | SP; utenti Ora autorizzati | REQUIRED live; retention scaduta QUESTIONABLE | HIGH |
| Tribe e last_checkin_at/storico luoghi | Ogni check-in | Comunità persistente | DB | tribe_memberships/settings | Server/admin; appartenenza inferibile dalla lista | check_in/server | Appartenenza sì; last_checkin_at no | Una riga/utente/luogo, ultimo timestamp; activity_window NULL | DELETED | SP; altri membri inferiscono | REQUIRED membership; timestamp QUESTIONABLE | HIGH |
| Spot inviati e ricevuti | send_spot | Reciprocità per luogo | DB | spot_private.interests | Server/admin; mittente flag; reciprocità da match | RPC/server | Flag al mittente; destinatario via match | Senza TTL; coppia+luogo unica | DELETED entrambe direzioni | SP; partner match | REQUIRED | HIGH |
| Match + luogo/data/primo messaggio | Reciprocità/server | Conversazione persistente | DB/RAM | public.matches | Partecipanti autorizzati/admin | RPC/server | Solo partecipanti | Senza TTL anche senza chat | DELETED se uno elimina | SP; partner | REQUIRED | HIGH |
| Messaggi/corpo/UUID/mittente/data/nonce | send_message | Chat e retry idempotente | DB/RAM | public.messages | Partecipanti autorizzati/admin | RPC insert; nessuna UI edit | Partner chat | Senza TTL; lettura100 non retention | DELETED intera conversazione anche messaggi partner | SP; destinatario | REQUIRED | HIGH |
| Bozze messaggi/report/nonce | Digitazione/retry | Recupero locale errore | RAM/input | Map JS/DOM | Browser corrente | Utente/client | Solo dopo invio | Vita pagina; reset/successo | DELETED stato corrente; altri browser UNKNOWN | LO prima invio; SP al submit | REQUIRED retry; bozze QUESTIONABLE | MEDIUM |
| Block coppia/timestamp | Blocco | Esclusione reciproca | DB | public.blocks | Autore/server/admin | Autore INSERT/DELETE; RPC | Non lista pubblica; inferibile | Senza TTL | DELETED entrambe FK | SP | REQUIRED | HIGH |
| Report motivo/dettagli/status/review/nonce | Segnalazione | Safety e revisione | DB | spot_private.reports | Moderatori/RPC/admin | Autore crea; moderatore status | No agli altri utenti | Senza TTL; max10/h non retention | DELETED se autore o target elimina | SP/gestore | REQUIRED | HIGH |
| Sospensione/ban account/motivo/date/revoca | Moderatore | Interdire account | DB | suspensions | Server/admin; proprio stato all’utente | Moderatore/server | Esclusione inferibile | Senza TTL; revoca non elimina | DELETED | SP/gestore | REQUIRED | HIGH |
| Ruolo e audit amministrativo/nota/date | Gestore/moderate_report | Autorizzazione e accountability | DB | moderators/moderation_audit | Server/admin | Gestore ruolo; RPC audit | No | Senza TTL; limit100 UI non retention | DELETED actor/audit legato a report eliminati | SP/gestore | REQUIRED | HIGH |
| Marker cancellazione UUID/started_at | begin_account_deletion | Quarantena e retry | DB | account_deletions | Server/admin; proprio stato | Edge/server | Profilo escluso | Finché delete termina; nessun worker | DELETED cascata Auth; RETAINED se errore | SP | REQUIRED | HIGH |
| Sessioni/JWT/refresh/eventuali provider token | Login/rinnovo | Persistenza login | Auth/localStorage | auth.sessions; SDK session | Browser/Auth/admin; bearer sensibile | Auth/SDK | No | Access3600s; timeout totale/inattività0 | DELETED locale al logout; bearer valido fino expiry; copie UNKNOWN | SP/GO | REQUIRED; provider token QUESTIONABLE | HIGH |
| IP/user-agent/metadati rete/login | Richieste provider | Sicurezza/operatività rete | Provider/Auth log | SP/VE/GO/GF/EM | Provider/admin secondo ruolo | Provider | No | Retention provider NOT VERIFIABLE FROM REPOSITORY | RETAINED/UNKNOWN: nessun purge app | SP/VE/GO/GF/EM per richieste pertinenti | REQUIRED rete; conservazione QUESTIONABLE | HIGH |
| Device/browser/viewport/history ID match/Tribe | Layout/navigazione/PWA | Responsive e history | Browser/RAM | history.state/CSS/UA | Browser corrente | Client/browser | No invio analytics rilevato | Vita pagina/history secondo browser | UNKNOWN vecchie history; stato app reset | LO; UA richieste provider | REQUIRED layout; no hardware ID | MEDIUM |
| Errori tipo/orario + Edge stage/error.message | Errori runtime/Edge | Diagnostica | RAM/log SP | diagnostics max30; Edge console | Browser corrente/provider/admin | Client/server | Errori sanitizzati UI | RAM vita pagina; cloud UNKNOWN | RAM DELETED; log RETAINED/UNKNOWN | LO; SP Functions | QUESTIONABLE dettaglio errore | MEDIUM |
| Cookie/localStorage/sessionStorage | Auth/QR/invito/provider | Persistenza e flussi | Browser | Dettaglio K | Browser/SDK; origine stessa | SDK/client/provider | No | K; sessione/draft senza TTL app | Parziale: sessione/draft sì, flag invito resta | LO/SP/GO per Auth | REQUIRED Auth/QR; invito QUESTIONABLE | HIGH sessione |
| Analytics/pixel/replay/fingerprint/ad ID | NON rilevati | Nessuna | Assenti nel codice/bundle | Nessun SDK | Nessuno app | Nessuno app | No | N/A; dashboard provider distinta | UNKNOWN: assenti app | Nessuno app | NOT NEEDED | LOW |
| Notifiche push/subscription/device token | NON implementati | Nessuna attuale | Assenti | Nessuna tabella/SW push handler | Nessuno app | Nessuno app | No | N/A | UNKNOWN: assenti | Nessuno app | NOT NEEDED privacy-core; requisito lancio proprietario | LOW ora/HIGH futuro |
| Backup/export/copied photo/chat | Infrastruttura/cache/destinatari | Ripristino o copie tecniche | Provider/browser/copiate | DB/Storage/cache/export esterni | Provider/admin/destinatario secondo copia | Provider/admin | Possibili copie lato destinatario | Copertura e durata copie UNKNOWN; Free dato storico | UNKNOWN; nessun purge backup app | SP/VE/LO; export provider non verificati | REQUIRED continuità; copie eccedenti QUESTIONABLE | HIGH |


Nessun campo dedicato a orientamento sessuale o vita sessuale, ma preferenza, genere, interazioni e chat possono rivelarli. Nessuna DOB, GPS, galleria aggiuntiva o allegato chat implementati. `phone_verified` osservato nei nomi metadata Auth il 5 ottobre non dimostra raccolta di un numero. Nessuna nuova retention è stata scelta in questo documento.

## D. Location / Check-in / Tribe Data Flow

1. **QR:** `qr.js` accetta UUID/link appartenenti all'app; scanner legge la camera localmente. Non si carica il video su server. Chi copia il token può usarlo da remoto: il formato valido non prova presenza fisica.
2. **Venue recognition:** `venue_preview` associa token attivo a luogo e restituisce ID/nome/indirizzo + conteggi, anche ad anon. Non crea check-in. Token temporaneo in `sessionStorage`, draft token/proprietario in localStorage, e possibile parametro `venue` nel redirect OAuth/email.
3. **Login/signup:** nuovo percorso reale richiede Google o email prima del profilo/check-in. Nessuna creazione anonima automatica nel flusso normale; provider anon ON e helper legacy restano disponibili.
4. **Onboarding:** upload della propria foto e varianti, poi upsert profilo proprio con età/genere/preferenza/nome/occupazione e updated_at. Upload può precedere un profilo completo: Auth account e file possono esistere prima del gate età.
5. **Check-in:** `check_in(token)` usa `auth.uid()`, account idoneo, profilo e token reale. Scrive user_id, venue_id, checked_in_at=ora server, expires_at=+90min. UPSERT su user_id sovrascrive la presenza precedente; il client non può impostare i timestamp. UPSERT membership(user,venue) con last_checkin_at server.
6. **Ora:** elenco autorizzato se il chiamante ha presenza attiva nel luogo; target presenti, compatibili col filtro, non bloccati/sospesi/deleting/anon. UI “Qui ora”, nome/foto/età/occupazione; API continua a fornire checked_in_at/expires_at. La scadenza è verificata anche server, non solo dal timer UI.
7. **Dopo90min:** il filtro `expires_at > now()` esclude il profilo da Ora. Nessun job DELETE: check-in scaduto resta in DB. Il target può apparire nella Tribe del luogo, senza timestamp di visita nelle RPC Tribe.
8. **Tribe:** membership creata da un check-in valido; activity_window realmente NULL, quindi permanente finché account elimina o il luogo viene disattivato/setting cambia. Nessuna funzione Lascia Tribe nella UI. Una scansione basta a mantenere appartenenza.
9. **Rientro:** sessione persistita recupera profilo; check-in ancora attivo mantiene expires_at originale. Se scaduto/assente si entra in Tribe. Nuova scansione rinnova la presenza; aprire lo scanner interrompe l'eventuale recupero del luogo e attende un QR nuovo.

**LOCATION PRIVACY RISK:** non c'è uno storico completo di tutte le scansioni, ma membership di tutti i luoghi e ultimo last_checkin_at per luogo formano uno storico persistente di luoghi associati, con ultimo momento noto al gestore. Il check-in attuale/scaduto conserva l'ultima presenza; Spot/match conservano luoghi e date di interazione. Polling/scraping può costruire uno storico esterno degli utenti presenti. Non si può affermare che il QR dimostri dove fisicamente fosse una persona.

Necessario: user/venue e scadenza per Ora, relazione user/venue per Tribe e luogo dell'interesse. Potenzialmente minimizzabile: checked_in_at degli altri nell'API; check-in scaduti; precisione last_checkin_at se activity_window rimane NULL; timestamp duplicati di Spot; durata draft QR e copie URL/log. Eliminare il dato necessario al timer richiede progettare un contratto API compatibile: proposta, non modifica.

## E. Sensitive / Special Category Data

| Elemento | Valutazione e livello di evidenza |
|---|---|
| Genere + preferenza M/F/ALL | SPECIAL CATEGORY / LEGAL REVIEW REQUIRED: possibile inferenza di orientamento sessuale; il genere da solo non prova orientamento. Campo desiderato e genere combinati aumentano il rischio. |
| Spot ricevuti/inviati, match e comportamento | SPECIAL CATEGORY / LEGAL REVIEW REQUIRED: coppie, reciprocità, luoghi e orari possono rivelare preferenze intime anche senza campo esplicito. |
| Chat, report e occupazione liberi | SPECIAL CATEGORY / LEGAL REVIEW REQUIRED: possono contenere salute, vita sessuale, religione, etnia, politica; non sono categorie che l'app chiede esplicitamente. Accuse di reati nei report richiedono valutazione separata. |
| Foto e luoghi | SPECIAL CATEGORY / LEGAL REVIEW REQUIRED per informazioni rivelate/inferibili e contesto. Non risultano face recognition, template biometrici o identificazione biometrica automatica. Una normale foto non equivale automaticamente a quel trattamento biometrico. |
| Profilazione | Filtro dating e relazioni sono trattamento applicativo; non è stato trovato ranking/AI/profiling pubblicitario. Non confondere assenza analytics con assenza di dati sensibili. |

La classificazione è un'analisi di rischio, non l'accertamento dell'orientamento di persone reali né una scelta autonoma di basi GDPR. Le categorie con protezione particolare includono salute, orientamento/vita sessuale e biometria usata per identificare: [Commissione europea](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en). Condizioni applicabili, consenso ove necessario, prova/ritiro, DPIA e informazione devono essere convalidati in legal review.

## F. Authentication & 18+

| Area | Stato reale / limite |
|---|---|
| Google | IMPLEMENTED: `signInWithOAuth`, URL HTTPS controllata, recupero sessione; provider Enabled. Normal login usa identità esistente; linkIdentity separato per vecchi profili temporanei. Nome consenso Soma salvato nel task precedente, non modificato qui. |
| Email | IMPLEMENTED a livello SDK/UI (`signInWithOtp`, magic link/verifyOtp), provider Enabled e conferma email ON. SMTP personalizzato assente nella verifica odierna precedente: il template/UI non garantisce consegna al pubblico. Nessuna email inviata per questo audit. |
| Anonimo | Helper `enterAnonymously` presente, provider ON, ma flusso normale non lo chiama. `has_account` esclude gli anonimi da check-in/Tribe/Spot/chat/upload/profilo. Account anonimi residui osservati il5ottobre, non ricontati. |
| Altri provider | Phone, Apple, SAML, Web3 e provider social elencati OFF. La dashboard non recupera l'elenco custom provider per un errore: eventuali custom provider NOT VERIFIABLE FROM REPOSITORY/config corrente. Passkey/OAuth Server non dimostrati abilitati solo perché c'è il link menu. |
| Password | Nessun flusso password nella UI app corrente. Non confondere il menu password Auth con un feature app implementata. |
| Sessione | persistSession/autoRefresh/detectSessionInUrl ON; localStorage del SDK. Oggi: JWT3600s, single-session OFF, timebox/inactivity0, refresh replay ON/reuse10s. Configurazione sessioni estese non disponibile sul Free. |
| OAuth | Nessun flowType impostato dall'app; default SDK implicit nel codice SDK già esaminato. Valutare PKCE e lifecycle token senza rompere redirect/installata; non presumerlo attivo. |
| Logout | SDK signOut senza scope: default global, reset UI/RAM foto e rimozione sessione locale; refresh revocati, JWT già emesso valido fino expiry. [Supabase signout](https://supabase.com/docs/guides/auth/signout). |

**18+ classification: PARTIAL.** `domain.validProfile`, form e `backend.saveProfile` richiedono un intero almeno18; `profiles.age` ha CHECK18–120 nel DB. Un valore17 o121/NULL non può essere salvato bypassando la UI. L'utente può però dichiarare18 pur essendo minorenne; il numero è modificabile e non cresce automaticamente come una DOB. Non esiste confronto con età Google, documento o verifica anagrafica. Auth account e upload possono avvenire prima del profilo. La soglia dichiarata è applicata, l'età reale non è verificata. Incoerenze plausibili entro18–120 non vengono rilevate. La misura proporzionata per il pilot richiede decisione safety/legal, non raccolta automatica di documenti in questo task.

## G. Safety & Moderation

| Funzione | Stato | Evidenza tecnica e limite |
|---|---|---|
| Block user | IMPLEMENTED | `report-prompt`, `backend.block`, `block_profile`, blocks/RLS: esclusione in entrambe direzioni. Insert/delete diretti dei propri blocchi restano grant; non è presente UI sblocco. |
| Report user | IMPLEMENTED | 5 motivi, dettagli≤1000, blocco opzionale, nonce idempotente; RPC private report e rate10/h, lock per autore. |
| Report message/content specifico | PARTIAL | Dalla chat si segnala il profilo. Nessun message_id/photo-id/snapshot o selezione del singolo contenuto nel report. I dettagli liberi non sostituiscono prova strutturata. |
| Delete Account | IMPLEMENTED | Conferma + Edge JWT + purge Storage e cascade; cloud end-to-end e sottocartelle non provati. H. |
| Logout | IMPLEMENTED | SDK revoca e reset locale; limiti JWT/copie già ricevute in F/H. |
| Suspend user | IMPLEMENTED | Moderatore privato, RPC, audit, `has_account/can_discover/can_use_match`; stato proprio e retry/revoca. |
| Ban duraturo / evasione | PARTIAL | La sospensione resta senza scadenza finché revocata, ma riguarda quell'account. Nessuna protezione contro nuova identità/account Google. Non introdurre fingerprinting indiscriminato. |
| Admin moderation | PARTIAL | Ruolo server effettivo; lista ultime100, review/dismiss/suspend/revoke; manca coda completa, escalation/notifica al gestore, procedura urgente e ricorso raggiungibile. |
| Rimozione bloccati da Ora/Tribe | IMPLEMENTED | SQL filtra blocks reciproci nei discovery/RLS; test di entrambi i contesti. Non cancella snapshot già scaricati. |
| Rimozione Spot | PARTIAL | `send_spot/can_discover` negano nuovi interessi; UI discovery nasconde. Le righe interessi preesistenti persistono; non c'è inbox pubblica interessi né ritiro. |
| Rimozione Match/Chat | IMPLEMENTED come interdizione | RLS e RPC negano lettura/invio tramite can_use_match; match/messaggi restano DB fino a delete. Dopo eventuale sblocco API possono tornare utilizzabili: non si deve promettere distruzione del match al block. |
| Due utenti bloccati accedono ai dati reciproci | IMPLEMENTED interdizione nuove letture | Discovery, profilo/foto correnti e conversazione protetti da RLS/RPC. Signed URL già rilasciata e copie possono restare utilizzabili; non recuperabili i contenuti già ricevuti. |
| Report ripetuti | IMPLEMENTED parzialmente contro abuso | Nonce deduplica retry, max10/h; nuovi nonce consentono nuove segnalazioni della stessa persona. Coda non deduplica accuse come casi unici. |
| Spam/abuso | PARTIAL | Auth ha limiti provider, report10/h, DB evita doppio Spot coppia/luogo e doppio nonce; nessun rate server per messaggi/Spot/upload/scraping o quota cumulativa foto. CAPTCHA oggi OFF. |
| Notifiche ad app chiusa | ABSENT | Nessun PushManager/subscription, handler push, webpush sender o tabella endpoint. Polling nella pagina aperta non è push. |

## H. Account Deletion

Percorso: conferma UI → POST `delete-account` → getUser(bearer) → begin_account_deletion(authenticatedUUID) → lista/rimozione Storage in pagine100 → prepare_account_deletion → auth.admin.deleteUser → logout/reset/redirect. Ignora target_user/user_id manipolato nel body. Nessuna riautenticazione recente imposta; possedere una sessione valida consente l'azione con confirm=true.

| Categoria | Esito percorso riuscito | Residui/identificatori e motivo tecnico |
|---|---|---|
| Auth user/identities | DELETED | API Auth deleteUser; Google account esterno non eliminato. Cloud cascade sessioni/provider copie non collaudati qui. |
| Profilo/nome/età/genere/preferenza/occupazione | DELETED | FK profilo→Auth ON DELETE CASCADE. Nessuna anonimizzazione di questi campi. |
| Foto originali/vecchie/thumb/HD piatte | DELETED | Purge intera cartella UUID prima di Auth. Errori interrompono il flusso. |
| Foto in sottocartelle | UNKNOWN | RLS consente path proprietario anche annidato; list(id) non è ricorsivo. Purge può fallire/rimanere incompleto; non provato cloud. |
| Preview/photo_assets | DELETED | FK user→profile cascade, insieme agli asset DB; copie browser separate. |
| Tribe membership/ultimo storico per luogo | DELETED | Cascade dal profilo; venue/QR condivisi RETAINED, non dati dell'account cancellato. |
| Check-in | DELETED | Cascade dal profilo, compresa riga scaduta. |
| Spot inviati e ricevuti | DELETED | Cascade entrambe FK della coppia. |
| Match/chat/messages | DELETED | Cascade match se uno elimina; spariscono anche messaggi del partner. Nessuna chat separata oltre match/messages. |
| Block | DELETED | Cascade sia blocker sia blocked. |
| Report propri o ricevuti | DELETED | prepare elimina per reporter_id o target_id. Segnalazioni di altre persone sul bersaglio spariscono anch'esse. |
| Moderation records/ruolo/sospensioni | DELETED | Audit actor o collegato a report rimosso; ruolo e sospensione eliminati. Perdita evidenze safety da valutare. |
| Marker cancellazione | DELETED se completata / RETAINED se interrotta | FK Auth; marker conserva UUID/started_at finché retry termina. Nessun worker server di completamento trovato nel repo. |
| Notifiche | UNKNOWN: assenti | Nessun archivio push implementato da cancellare. |
| Session/token | DELETED locale previsto; residui UNKNOWN | signOut/cascade Auth; bearer già emesso fino expiry. Altri browser e Google session non purgati dal codice. Nessuna promessa di logout globale istantaneo. |
| localStorage/sessionStorage | Parzialmente DELETED / RETAINED | SDK sessione rimossa se logout esegue; draft/token QR rimossi. Flag installazione resta; admin sessione separata non cancellata esplicitamente dalla UI normale. |
| RAM immagini/bozze/dati derivati UI | DELETED locale | Reset/change account/ricaricamento. Altri client, screenshot, download e history UNKNOWN/RETAINED secondo browser. |
| IP/Auth audit/Functions/Vercel/Google/email log | RETAINED/UNKNOWN | Nessun purge nel delete app; eventuale UUID/IP/URL possono restare secondo retention provider non verificata. |
| Backup/export/copie destinatario | UNKNOWN | Non inventariati globalmente, non purgati dall'app; DB backup non include byte Storage. |
| Anonymized | Nessuna categoria dimostrata ANONYMIZED | La cancellazione è eliminazione/cascata, non un pipeline di anonimizzazione verificato. |

Gli oggetti foto orfani osservati il5ottobre dimostrano un rischio di residui, non un conteggio attuale. Sostituzione foto non elimina il file precedente; upload parziali possono precedere il profilo. Un orphan per utente Auth senza profilo non è ricercabile soltanto dalla lista profili. Report cancellati e delete parziali devono essere trattati separatamente: la quarantena evita visibilità indebita ma non completa la cancellazione.

## I. Database / RLS Security

### Tutte le tabelle applicative

| Schema.tabella | RLS/grant finale e autorizzazione | Rischio/limite |
|---|---|---|
| public.profiles | SELECT/INSERT/UPDATE authenticated; profiles_read(can_view_profile), insert/update proprie con account idoneo e oggetto foto | SEC-01: tutte le colonne leggibili sulle righe consentite. updated_at impostabile dal client, non prova visita. |
| public.venues | SELECT authenticated con active; anon solo preview QR | Lista venue attive enumerabile, non lista persone. Nessuna scrittura client. |
| public.checkins | SELECT proprio, nessun insert/update/delete client; check_in SECURITY DEFINER | RPC Ora rivelano timestamp degli altri attivi; scadenza90 enforce server. |
| public.blocks | SELECT/INSERT/DELETE propri; insert account idoneo | API diretta permette blocco per UUID esistente senza stesso controllo discovery della RPC; è azione sul proprio blocco, non scrittura profilo altrui. Nessun rate complessivo. |
| public.matches | SELECT can_use_match; nessuna scrittura client diretta | Solo partecipanti idonei; non TTL dopo90min, persistente per prodotto. |
| public.messages | SELECT can_use_match; insert via send_message | Solo partner, lunghezza e nonce; niente E2EE/rate messaggi. |
| spot_private.venue_codes | RLS, no grant anon/auth su tabella | Token copia del QR abilita preview/ingresso. |
| spot_private.tribe_settings | RLS, no grant diretto | NULL attività → membership non scade. |
| spot_private.tribe_memberships | RLS, no grant diretto | Ultimo timestamp permanente per luogo; RPC espongono appartenenza. |
| spot_private.interests | RLS, no grant diretto | Solo send_spot/server; persistono dopo block fino delete. |
| spot_private.reports | RLS, no grant diretto | Report via RPC, moderatore legge proiezione; evidenza specifica contenuto assente. |
| spot_private.suspensions | RLS, no grant diretto | Stato/revoca via helper e moderazione; niente anti-evasione multiaccount. |
| spot_private.moderators | RLS, no grant diretto | Ruolo non ottenibile inserendo dati dal client. |
| spot_private.moderation_audit | RLS, no grant diretto | Creazione RPC role-check; rimozione durante delete. |
| spot_private.account_deletions | RLS, no grant diretto | Begin/prepare service_role-only; quarantine interrogata negli helper. |
| spot_private.photo_assets | RLS, no grant diretto | Preview/save/status/photos RPC con proprietà/visibilità; payload base64 personale. |

Le 16 tabelle del modello finale hanno RLS; la verifica reale odierna conferma zero tabelle pubbliche senza RLS e zero tabelle private direttamente leggibili da anon/auth. Non sono stati ispezionati byte per byte tutti gli eventuali oggetti creati manualmente nel cloud: un drift review completo resta necessario in Q.

### Policy, RPC, SECURITY DEFINER, triggers/views

Policy attuali: profiles_read/insert/update; venues_read; checkins_read_own; blocks_read/insert/delete_own; matches_read; messages_read; Storage photos_insert_own/photos_read_allowed. Le policy sono permissive per operazione autorizzata; nessuna policy “all=true” nel set applicativo esaminato. Il proprietario/service_role può bypassare RLS per le operazioni server; normale authenticated non riceve tale ruolo dall'app.

Le 36 funzioni finali comprendono:

- Account/moderazione: has_account, can_write_profile, my_account_state/status, is_moderator, moderation_reports, moderate_report, suspend_profile, begin/prepare_account_deletion.
- Discovery: tribe_member, can_discover, can_view_profile, check_in, venue_preview, my_tribes, location_people e versioni page/photos_page.
- Social: send_spot, express_interest legacy (ora rifiuta chiedendo luogo), can_use_match, my_matches e versioni page/photos_page, send_message due overload, block_profile, report_profile due overload.
- Foto: can_view_photo, save_my_photo_preview, photo_asset_status, pending_photo_assets, store_photo_assets e store_photo_assets_hd.

Tutte dichiarano search_path vuoto e nomi qualificati, positivo contro risoluzione ambigua. Grant espliciti anon solo venue_preview; funzioni amministrative begin/prepare e backfill/store limitate a service_role; moderazione pubblicamente callable da authenticated ma con controllo ruolo nel corpo. Helper privati eseguono sotto owner quando chiamati dalle RPC. Non si presume che SECURITY DEFINER sia sicuro da solo: l'input e il chiamante vengono valutati per funzione.

Non risultano custom trigger o views nelle migrazioni; cascata/constraint sono FK/trigger interni. Oggetti extra cloud, cron, webhooks e default grant fuori dal set applicativo: NOT VERIFIABLE FROM REPOSITORY senza inventario cloud completo.

### Matrice di abuso

| Tentativo authenticated | Esito dal modello/test | Distinzione |
|---|---|---|
| Profili fuori Tribe/filtri, anon target, sospeso/deleting/block | Negati | RLS server, non soltanto UI. Preferenza dei profili visibili resta esposta. |
| Enumerare tutti utenti globalmente | Non dimostrato consentito | Può enumerare tutte le righe autorizzate nelle Tribe condivise, non l'intero Auth DB. |
| Tribe non propria / last_checkin privato | Negati | Getter privato revocato; discovery verifica membership. |
| Check-in altrui diretto | Negato | RPC Ora restituiscono timestamp attivi; nessun last_checkin Tribe restituito. |
| Spot ricevuti o di terzi direttamente | Negati | Tabella privata; flag propri e match possono rivelare reciprocità. |
| Match/chat/message di non partecipante | Negati | RLS/helper; test tentativo terzo e send manipolato. |
| Scrivere profilo/check-in/message altrui | Negati | Profilo proprio con RLS; check-in ora server; send usa auth.uid(). |
| Foto fuori visibilità/current path | Negate nuove letture | Signed URL emessa prima e copie non revocate istantaneamente. |
| Aggirare block/sospensione/delete | Negato nuove richieste autorizzate | Snapshot cache e JWT logout sono rischi differenti, non prova bypass helper. |
| Aggirare90min impostando timestamp | Negato | Nessun write checkins client; vincolo90 server; match/Tribe persistenti non sono aggiramento Ora. |
| Falsificare presenza usando token QR copiato | Consentito se QR valido e account idoneo | Ingresso remoto entro regola attuale. Nessuna verifica fisica, anti-replay/freshness QR. |
| Scraping API consentite/Spot/chat spam | Parzialmente non limitato | UI pagina48 non è rate limit, RPC legacy e direct SELECT restano disponibili. |

Non provata SQL injection nelle RPC PL/pgSQL: input tipizzati e query non concatenate con payload client. Non trovata E2EE: gestore DB può leggere messaggi. Se una URL firmata passa a terzi, il bearer URL diventa mezzo di accesso fino scadenza; non è anonimizzazione.

### Keys / secrets / configuration

Scansionati133 file tracciati: nessun valore sb_secret reale né JWT service_role trovato. `.env.example` contiene placeholder; `.env.local` contiene solo nomi VITE_SUPABASE_URL, VITE_SUPABASE_PUBLIC_KEY, VITE_GOOGLE_ENABLED nella verifica senza stampa valori. Publishable/anon key client è intenzionale e richiede RLS; guard client rifiuta secret/service-role. Edge legge service_role da ambiente server, non VITE. Config Vercel/.vercelignore esclude env, Git, docs, test, Supabase e moduli dalla pubblicazione statica; release guard PASS.

| Tipo/area | File | Rischio residuo / azione consigliata |
|---|---|---|
| Chiave pubblica client | .env.example, supabase-client.js, bundle | Non secret; mantenere RLS e grant corretti. |
| Service role e token deploy | Edge env; runtime CLI/server | Nessun valore trovato nel client; inventariare/ruotare accessi con procedura separata, non leggere/stampare qui. |
| Credenziali OAuth Google/SMTP | Config cloud, non sorgenti app | NOT VERIFIABLE FROM REPOSITORY; nessuna estrazione di secret. |
| Secrets Git storici | Storia Git, esclusi/non tracciati | Nessuna revisione forense completa; aggiungere secret scanning della storia/CI in Step2. |
| Bundle/toolchain/CDN | lockfile, CI, vercel.static.json | Nessun SAST/SCA completo qui; non certificata assenza di vulnerabilità delle dipendenze. |

## J. Storage / Photos

Bucket reale `profile-photos` privato, limite8388608byte/file e MIME JPEG/PNG/WebP. `validatePhoto` verifica MIME, firma e decodifica quando supportata, limite40MP client; bypassabile via API. `optimizePhoto` mira1600px/WebP ma restituisce originale se piccolo≤320KiB, non conveniente, API non supportata o errore. **EXIF/GPS dell'originale non garantiti rimossi.** `photoVariants` ri-encoda120/480/1600 JPEG; Edge ridimensiona/decodifica e controlla24MP, dimensione8MiB. Varianti ri-encodate non mantengono l'EXIF del file sorgente.

Path upload UUID proprietario/random UUID; no overwrite client normale. Storage policy consente insert solo cartella UID e account idoneo, ma non richiede profilo completo né valida magic bytes server prima della conservazione originale. MIME dichiarato può essere manipolato. Conversione non equivale a validazione di tutti gli upload diretti e non è moderazione contenuti/malware. WebP viene decodificato prima del controllo pixel finale: limiti memoria/dimensioni e decompressione richiedono test mirati per evitare DoS. Nessuna quota cumulativa oggetti per utente.

Lettura: proprietario cartella; agli altri solo foto corrente e varianti registrate, se discovery o match consentiti. Altri non hanno accesso generalizzato alla cartella vecchie foto. URL firmate30s; cache applicativa firme20s; Blob RAM64/16MiB con lease e reset su sessione/block. Varianti caricate con cacheControl3600: durata firma non equivale alla durata dei pixel già ricevuti. I byte cache non sono revocati remoto dal block.

Sostituzioni creano nuovi oggetti senza delete precedente; upload varianti parallelizzato può lasciare file se uno fallisce. Preview DB vincola formato/lunghezza data URI ma non prova semanticamente che corrisponda alla foto: `save_my_photo_preview` accetta anteprima fornita dal proprietario. Valutare server-authoritative per consistenza/content abuse senza regressione preload. Endpoint usa getUser, current photo e RPC status; backfill user token negato. CORS* da solo non bypassa JWT, ma va valutato nell'hardening.

## K. Cookies / Tracking / Local Storage

La classificazione A–D è tecnica e non sceglie automaticamente regime di consenso/ePrivacy.

| Strumento / chiave | Classe | Finalità e creazione | Durata/provider |
|---|---|---|---|
| SDK `sb-<projectref>-auth-token` | A. STRICTLY NECESSARY | Login/rinnovo; sessione serializzata, possibili token provider secondo SDK | LO/SP; nessun TTL localStorage app; JWT3600s rinnovabile, logout rimuove. |
| `spot-now-moderator-session` | A | Sessione separata pannello gestore, al login admin | LO/SP; logout admin; non rimossa esplicitamente dalla cancellazione UI normale. |
| `spot-onboarding-venue-v1` | A | Token QR + owner per ripresa onboarding/OAuth | LO; nessun timestamp/TTL; rimosso a completamento/nuovo ingresso/delete. |
| `spot-pending-qr` sessionStorage | A | Continuazione venue durante ingresso/redirect | LO; sessione scheda/browser e rimozioni esplicite; session restore può conservarlo. |
| `spot-now-install-invitation-v2` | A tecnico UX, necessità da valutare | Flag popup Home già mostrato dopo match | LO; persistente senza TTL, non eliminato con account. Non marketing. |
| history.state/URL | A | Screen/Tribe/match e parametro QR nel redirect | LO/VE/SP per URL; lifetime browser; reset non cancella tutta la storia. |
| CacheStorage `spot-now-offline-v1` | A | SW install: solo offline.html, non profili/chat/token | LO; fino pulizia SW/browser. Il nome interno resta vecchio per compatibilità. |
| Blob/prefetch/signed URL RAM | A | Rendering immagini autorizzate | LO;64/16MiB ed eviction/reset, firme20s/30s. Non IndexedDB. |
| Diagnostics eventi type/at max30 | A tecnico diagnostica | Error/online/offline nella pagina | LO; vita pagina; non SDK analytics/crash esterno. |
| Cookie app first-party | D. UNKNOWN per cookie eventuali provider | Nessun document.cookie o SDK cookie app trovato; Auth usa localStorage | Nomi/durate effettivi Set-Cookie cloud non inventariati integralmente. Non dire “zero cookie” globalmente. |
| Cookie Google login e dashboard provider | D | Autenticazione/provider su rispettivi domini; dashboard gestore separata dall'app utenti | Nomi/durate/scopi NOT VERIFIABLE FROM REPOSITORY. Non copiare cookie/sessioni per l'audit. |
| Google Fonts remoto | A rendering; terzo dati rete | Caricamento font prima del login | GF; IP/UA/richiesta rete; retention esatta non verificata. Non Google Analytics. |
| IndexedDB app | Assente | Nessun uso rilevato | CacheStorage browser può avere implementazione interna diversa; non un DB personale progettato dall'app. |
| Analytics/attribution/heatmap/replay/pixel | B/C assenti | Nessun pacchetto/script runtime identificato | Dashboard/log hosting non automaticamente analytics app; injection cloud UNKNOWN. |
| Fingerprinting/ad identifiers | C assente | UA per iOS/install e viewport non generano ID hardware | Nessun hash fingerprint o advertising ID rilevato. |

Esaminare gli strumenti equivalenti ai cookie senza presumere che localStorage sia esente da analisi: [Garante, linee guida cookie](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876). Nessun banner creato.

## L. Third-party Providers

| Provider realmente presente | Funzione/dati ricevuti | Codice/config | Necessario al pilot | Regione / trasferimenti |
|---|---|---|---|---|
| Supabase | Auth/email/ID, DB completo profili/relazioni/chat/moderazione, Storage foto, Functions conversione/delete, log/IP/UA | supabase-client.js, backend.js, config.toml, Edge e migrazioni | Sì nell'architettura corrente | eu-west-1 Irlanda verificato5ottobre, non ricontrollato oggi. Esclusività SEE di supporto/log/Functions/subfornitori NOT VERIFIABLE FROM REPOSITORY. |
| Vercel/CDN | Hosting statici, IP/UA/URL QR e log richieste; non backend ordinario del corpo chat/foto | vercel*.json, deploy script | Sì per hosting attuale, sostituibile | Deploy precedente eseguito iad1 USA, dato build non prova regione di tutti i dati utenti. CDN globale/retention/contratti NOT VERIFIABLE FROM REPOSITORY. |
| Google OAuth | Login, identità OAuth, email/nome/foto metadata, richieste di consenso/accesso | provider google in backend/admin, dashboard | Sì nel flusso scelto, email alternativa | Regione effettiva/trasferimenti/DPA applicabili NOT VERIFIABLE FROM REPOSITORY. |
| Google Fonts | Richieste CSS/font, metadati rete e browser | index.html domini fonts.googleapis.com/gstatic.com | No: self-host possibile preservando grafica | Regione/retention esatte NOT VERIFIABLE FROM REPOSITORY; analisi terzo/extra-SEE. |
| Servizio email integrato Supabase | Email destinatario, link/OTP e metadati invio | signInWithOtp/verifyOtp; SMTP custom OFF nella verifica precedente odierna | Solo se si mantiene login email | Non identificato provider SMTP esterno specifico; NON presumere Resend/SendGrid. Subfornitore/paese NOT VERIFIABLE FROM REPOSITORY. |
| Provider email dell’utente | Messaggio di autenticazione ricevuto | Flusso email | Condizionale al login email | Non controllato, dipende dalla casella; non inventariare Gmail come unico destinatario. |
| GitHub | Repository/CI, codice, log job; nessun upload ordinario contenuti utenti | .github/workflows/ci.yml | Sviluppo, non runtime pilot | Contratti/account/regione NON verificati; CI usa placeholder chiave e backend sintetico. |

Figma, ChatGPT/Claude e strumenti creativi non sono SDK runtime o destinatari automatici dei dati degli utenti nel codice. Non introdurli nel data flow solo perché usati per sviluppo. Nessun provider AI/error monitoring/marketing/push trovato.

Legal review: accordi responsabili/subfornitori, ruoli delle parti, trasferimenti extra-SEE e misure applicabili; non è stata verificata firma/applicabilità DPA/SCC. Regione DB europea non dimostra che tutto il trattamento resti SEE: [Supabase GDPR](https://supabase.com/docs/guides/security/gdpr-compliance).

## M. Logging / Admin

Frontend usa textContent per nomi, chat, report e note; errori filtrati da `errors.js`, test impediscono URL firmate/SQL nella UI. Diagnostics registra solo type/at max30, non payload di chat o email. Nessun console.log runtime frontend personale rilevato. Script di test/load possono loggare output sintetico: non vanno usati contro dati reali senza sanitizzazione.

`photo-assets` console.error registra stage e error.message o code: non stampa esplicitamente bearer, ma messaggi provider possono includere percorsi/UID/oggetti. Da minimizzare con codici controllati. Delete-account restituisce errori generici senza logging payload esplicito. Vercel e SP mantengono log infrastrutturali non coperti da diagnostics; parametri QR/URL possono entrarvi. Non letti log reali contenenti chat/email/token.

Pannello `?admin=1` è caricabile pubblicamente ma non concede ruolo. `is_moderator/moderation_reports/moderate_report` verificano tabella ruolo privata e account idoneo. Note≤1000 e audit server; sessione separata localStorage. Non richiesto AAL2/MFA nel controllo RPC, né reauth recente per azioni gestore. Contatto pubblico/supporto/ricorsi non presenti nell'app. Account personale gestore e gestione recovery/processo escalation da formalizzare; codice non prova nessuna MFA abilitata sull'account gestore.

HTTPS/HSTS, DENY, nosniff e Referrer-Policy erano verificati nel task pubblicazione odierno; CSP del repository limita frame-ancestors/object-src/base-uri, non script-src/connect-src/default-src. Positive le protezioni presenti, non una CSP completa contro XSS. Admin può leggere/gestire i dati entro poteri server: accessi provider/team, log di consultazione ed elenco autorizzati da verificare operativamente.

## N. Data Minimization Opportunities

| Dato/area | Azione proposta | Compatibilità da preservare |
|---|---|---|
| Preferenza e updated_at degli altri | REDUCE: proiezione pubblica minima, preference privata | Lettura/modifica proprio profilo e filtri server. |
| Timestamp Ora altrui | REDUCE / DERIVE INSTEAD OF STORE/TRANSMIT dove possibile | Ora90 e refresh alla scadenza; no modifica automatica timer. |
| Check-in scaduto | SHORTEN RETENTION | Rientro Tribe deve funzionare senza vecchia riga. |
| last_checkin_at per luogo | REDUCE / SHORTEN RETENTION | Membership permanente scelta; decidere se serve precisione o attività futura. |
| Spot sender_checkin+created_at | DERIVE INSTEAD OF STORE | Reciprocità per luogo; sender_checkin attuale contiene tempo Spot, non prova visita. |
| Chat/match/report/audit | KEEP con SHORTEN RETENTION dopo decisione | Non inventare TTL; evidenze abusi/diritti da validare. |
| Foto correnti/varianti | KEEP | Variante funzionale è comunque dato personale. |
| Foto vecchie/orfane/EXIF | REMOVE, con pulizia race-safe/grace deliberata | Non cancellare foto in uso o upload in commit. |
| Genere/preferenza | KEEP privati quanto necessario + legal review | Niente nuovo campo orientamento o inferenze extra. |
| Occupazione, cognome, telefono, DOB | Occupazione QUESTIONABLE/facoltativa; altri NOT NEEDED | Non raccogliere informazioni extra senza esigenza. |
| Google metadata/token provider | REDUCE | Nessuno scope aggiuntivo; conservare solo ciò che serve alla sessione/identità. |
| Anon legacy/account incompleti | REDUCE / SHORTEN RETENTION | Migrazione identità/match da valutare prima di rimozione. |
| Draft QR/history/log URL | SHORTEN RETENTION / REDUCE | Recupero onboarding/OAuth, senza logging dei token. |
| Font remoti | REMOVE richiesta al terzo, mantenere stessi font | È proposta futura; design immutato in questo audit. |
| IP/UA/log/backup | KEEP minimo operativo, SHORTEN RETENTION dove applicabile | Incident response/ripristino e retention legale da concordare. |
| Analytics/ad ID/AI/GPS | REMOVE/NOT NEEDED: non aggiungerli | Nessun requisito core pilot li richiede. |
| Push futuro | KEEP solo se requisito confermato, payload minimo | Endpoint privati, permesso, revoca/logout/block/delete prima dell'aggiunta. |

## O. Test Coverage

**157/157 PASS**, zero fail/skip. Log locale: `/tmp/soma-privacy-security-tests-2026-10-06.log`. Nessun test aggiunto o modificato.

| Suite esistente | Copertura effettiva |
|---|---|
| adversarial-database, tribe-database, load-scaling | PGlite migrazioni complete; isolamento terzi, Tribe fuori membership, anon/sospensione/delete/block, interessi per luogo, scadenza precisa, nonce/rate report e paginazione. |
| account-deletion | VM Edge mock: JWT assente/invalid, target manipolato ignorato, conferma, dry-run, errore Storage senza falso successo. Non vera cancellazione cloud. |
| photo-assets / photo-assets-auth | Accesso varianti, proprietà, anon/backfill negati, grant, asset cascade; decoder/transform sintetici. Non scanner malware/EXIF ogni fallback o fuzz sistematico. |
| backend, reliability | Public-key guard indiretta, chiamate QR senza timestamp client, profilo proprio/foto valida, errori sanitizzati, timeout/concorrenza/cache reset. Alcuni test verificano helper legacy, non che la UI li usi. |
| navigation, live-social | Recupero account, QR fresh/no replay, history/chat/draft, race/logout, blocchi/report UI, idempotenza, XSS testo, caricamento foto e modali. DOM simulato, non telefono reale. |
| QR/scanner | Token/link ammessi, sessione camera e QR invalidi; non prova di presenza fisica. |
| restore | Ripristino DB sintetico PGlite in istanza separata e RLS. Non backup produzione o foto Storage. |
| PWA/viewport/dialogs/avatar/detail-photo | Manifest/icone/offline, keyboard/layout/logica foto e install; non push o collaudo fisico iPhone/Android. |

Rischi NON coperti come requisito negativo: negare SELECT preference di altro membro; non trasmettere timestamp preciso Ora; drift cloud completo; rate chat/Spot/upload/scraping; nested purge e worker retry; revoca signed URL/cache; EXIF anche bypass API; limiti/decompressione malformed-image; comportamento SMTP pubblico; AAL2/admin; token provider/session XSS; log/backup reali; minore che dichiara18; percorso diritti/retention; tutti i sistemi e browser fisici.

Test da aggiungere SOLO Step2 dopo scelta della correzione: matrice own-profile vs public-projection (REST/RPC/foto), contratto timestamp Ora, limiti paralleli/idempotenza sui server, purge foto vecchie/annidate e fallimenti intermedi, sospensione/block con bearer già firmato, no metadata EXIF API, decoder malicious/oversized, provider JWT expired/revoked, enforcement MFA admin se scelto, purge/retention job e restore DB+Storage, account Google/email reale sacrificabile e due telefoni consenzienti. Le due prove sintetiche odierne confermano il problema esistente; non modificano la suite per farla fallire.

## P. Legal Review Required

Nessuna base giuridica GDPR, consenso obbligatorio, durata o trasferimento legale è stato scelto autonomamente. Nessuna Privacy Policy/Terms/Cookie Policy è stata prodotta.

Da risolvere prima dell'apertura reale: titolare persona fisica Federico Grasso e contatto effettivo; finalità, dati necessari e responsabilità; art.6 e condizioni applicabili alle inferenze/categorie particolari; informazione prima della raccolta; prove/ritiro ove applicabile; retention per ogni finalità e gestione copie; esercizio diritti e contatto; contratti responsabili/subfornitori e trasferimenti; valutazione DPIA e DPO se pertinente; minori e misure proporzionate; safety/UGC e applicabilità degli obblighi di piattaforma; eventuali accuse di reati nei report; accesso del gestore/venue e procedure incident response.

Decisioni di prodotto “nessun Lascia Tribe” e “nessun ritiro Spot” non sono state cambiate. Non è stato stabilito che la legge imponga quei bottoni specifici; non si deve neppure presumere che Elimina account esaurisca ogni diritto/ritiro applicabile. Il consenso OAuth a Google non equivale ad informazione/consenso per tutte le finalità del dating.

Le informazioni mancanti sono vere dipendenze di Step2: numero/locali/durata e criteri del pilot, canale di assistenza attivo, decisioni di retention per categoria, autorizzati/moderatori, disponibilità gestione urgente/ricorsi, procedure cancellazione/esportazione, inventario accordi/trasferimenti, budget/obiettivi backup/ripristino e piano collaudo telefoni. Non sono state inventate risposte; nessun questionario è necessario per riconoscere SEC-01.

## Q. Prioritized Action Plan

Ogni soluzione qui è una **proposta**, non implementazione o autorizzazione a cambiare schema/RLS/API. Difficoltà e regressione sono stime tecniche LOW/MEDIUM/HIGH; attività legal/operative richiedono validazione competente. La priorità non equivale ad affermare che ogni misura tecnica sia prescritta dalla legge.

### 🔴 CRITICAL BEFORE PILOT

#### SEC-01 — proiezione pubblica dei profili / preferenza privata

- **Problema:** SELECT di tutte le colonne su profili visibili rivela preference.
- **Rischio concreto:** un membro della Tribe raccoglie preferenze/inferenze che la UI non mostra, anche via REST manipolato.
- **File:** migrations/001,007,009,011–013; src/backend.js, live.js; tests/adversarial-database/backend.
- **Oggetti:** profiles; profiles_read; can_view_profile/can_discover; getter proprio e discovery RPC.
- **Attuale:** RLS per riga corretta, nessuna separazione privata/pubblica per colonna.
- **Soluzione:** progettare getter autenticato del proprio profilo completo e proiezione discovery minima; revocare broad SELECT o introdurre contratto equivalente sicuro. Non basta togliere il campo dalla UI né revocare una colonna mentre resta grant SELECT a livello tabella. Coordinare upsert().select(), Storage e vecchi client. [Supabase column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security).
- **Difficoltà:** MEDIUM.
- **Regressione:** HIGH, perché cambia accesso profilo/contratto condiviso; matrice owner/discovery/match/upload necessaria.

#### PRIV-01 — valutazione categorie particolari e informazione agli utenti

- **Problema:** dati dating/inferenze e luogo trattati senza flussi pubblici/documentazione operativa convalidati.
- **Rischio concreto:** pilot raccoglie dati ad alto impatto senza chiarezza su trattamento, diritti e misure applicabili.
- **File:** index.html; src/live.js, report-prompt.js; futura documentazione non creata qui.
- **Oggetti:** profiles.preference/gender, interests, matches, messages, tribe_memberships; nessun registro eventuale consenso nel set attuale.
- **Attuale:** login/onboarding, nessuna informativa o prova/ritiro di consenso specifico implementati.
- **Soluzione:** legal review finalità/basi/condizioni e DPIA; poi progettare soltanto i flussi e la documentazione necessari, con titolare/contatto corretti e prova/versionamento se richiesti. Non introdurre banner o consenso generico come sostituto dell'analisi.
- **Difficoltà:** HIGH (dipendenza legal e prodotto).
- **Regressione:** MEDIUM, possibili cambi onboarding/gestione dati da collaudare separatamente.

#### SAFE-01 — piano minori e gestione urgente degli abusi

- **Problema:** gate PARTIAL, report contenuto non specifico, assistenza/escalation non esposte.
- **Rischio concreto:** minorenne autodichiarato18 o contenuto abusivo rimane senza risposta efficace e documentata.
- **File:** domain.js, backend.js, report-prompt.js, admin.js; migrations/001,003,006,009.
- **Oggetti:** profiles.age, reports/suspensions/moderators, report_profile/moderate_report.
- **Attuale:** CHECK18–120, report profilo e sospensione account; nessuna verifica età reale né procedura urgente verificata.
- **Soluzione:** definire misura proporzionata per il pilot e percorso sospensione/seguito delle segnalazioni minore, referente e canale urgente. Una procedura manuale piccola ma verificata è possibile; non imporre KYC/documenti senza decisione. Collaudare enforcement server con due account di prova consentiti.
- **Difficoltà:** MEDIUM/HIGH a seconda del metodo scelto.
- **Regressione:** MEDIUM.

#### OPS-01 — responsabilità, retention e procedure dati formalizzate

- **Problema:** nessuna retention applicativa complessiva e procedure/accordi non verificati.
- **Rischio concreto:** conservazione indefinita di relazioni/luoghi e risposte incoerenti a diritti/incidenti.
- **File:** modello migrazioni001–013, delete-account, docs operazioni-pilota; configurazioni provider.
- **Oggetti:** checkins, tribe_memberships, interests, matches/messages, reports/audit, Auth/Storage/log/backup.
- **Attuale:** permanenza fino delete/cambio, contatto dichiarato solo nei documenti interni; contratti/regione completa non verificati.
- **Soluzione:** owner operativo identificato, inventario destinatari/DPA/trasferimenti, retention approvata per finalità e procedura diritti/incidenti. Poi tradurre le decisioni in lifecycle job/test Step2, senza durate arbitrarie.
- **Difficoltà:** MEDIUM/HIGH.
- **Regressione:** HIGH per eventuali purge/TTL, LOW per sola definizione operativa.

### 🟠 IMPORTANT BEFORE PILOT

#### LOC-01 — timestamp e storico location minimo

- **Problema:** API Ora espone timestamp esatti; check-in scaduto e ultimo per luogo restano.
- **Rischio concreto:** ricostruzione orari/frequentazione tramite scraping o accesso gestore e conservazione non necessaria.
- **File:** src/live.js/backend.js; migrations/007,010–013.
- **Oggetti:** location_people*; checkins; tribe_memberships; interests.sender_checkin.
- **Attuale:** UI Qui ora, dati API precisi; no cleanup; membership permanente.
- **Soluzione:** decidere quali timestamp sono realmente necessari e progettare proiezione API/refresh rispettando90min e compatibilità; lifecycle check-in scaduti e minimizzazione last_checkin dopo retention approvata. Non dedurre dal precedente requisito solo visivo l'autorizzazione a cambiare il contratto.
- **Difficoltà:** MEDIUM.
- **Regressione:** HIGH su scadenze/rientro; test timer/server e Tribe obbligatori.

#### ABUSE-01 — rate limit, scraping e QR condivisi

- **Problema:** limiti solo parziali; QR statico trasmissibile, RPC legacy non paginate.
- **Rischio concreto:** raccolta massiva membri, spam chat/Spot, costi e ingresso remoto abusivo.
- **File:** backend.js, qr.js; migrations/007,009,011–013; configurazioni Auth.
- **Oggetti:** send_spot/send_message, location_people/my_matches e versioni page, venue_codes/check_in, Storage insert.
- **Attuale:** report10/h, nonce/unicità; UI48; CAPTCHA OFF/anon ON; nessuna freshness fisica del QR.
- **Soluzione:** limiti server per identità/operazione con retry idempotente, quota upload, audit RPC legacy e decisione su rotazione/freshness QR e limiti appartenenza. Auth anon da mantenere/disabilitare dopo valutazione legacy; niente GPS aggiunto automaticamente.
- **Difficoltà:** MEDIUM/HIGH.
- **Regressione:** MEDIUM/HIGH, rischio bloccare utenti legittimi o vecchi flussi.

#### PHOTO-01 — validazione server, EXIF e quota upload

- **Problema:** client bypassabile; originale/metadata non normalizzati sempre, nessuna quota cumulativa.
- **Rischio concreto:** EXIF location, contenuto falso/abusivo o decompressione che consuma risorse.
- **File:** photo.js, optimize-photo.js, photo-variants.js, backend.js, photo-assets/index.ts; migrations/001,009,012,013.
- **Oggetti:** photos_insert_own/profile-photos/photo_assets; generator/store/status.
- **Attuale:**8MiB e MIME, variante ri-encodata, original fallback; WebP limit finale dopo decode.
- **Soluzione:** progettare validazione/normalizzazione server e limiti pre-decode, dimensioni/quote; EXIF assente in ogni percorso; considerare controllo contenuti e preview server-authoritative, mantenendo upload/onboarding e velocità.
- **Difficoltà:** MEDIUM/HIGH.
- **Regressione:** HIGH, pipeline foto e memoria/browser già delicate.

#### PHOTO-02 — ciclo vita foto vecchie/orfane e copie cache

- **Problema:** sostituzioni/commit falliti lasciano file, firma breve non revoca pixel.
- **Rischio concreto:** dati non più necessari accessibili al proprietario/admin o copie persistenti non documentate.
- **File:** backend.js, live.js, photo-memory.js; Edge photo-assets/delete-account; migrations/012–013.
- **Oggetti:** profiles.photo_path, photo_assets, Storage originals/variants e URL firmate.
- **Attuale:** nessun cleanup; cartella piatta rimossa solo al delete; cacheControl3600.
- **Soluzione:** inventario riferimenti e purge race-safe dopo commit/grace deciso, quote, lifecycle orphan/incompleti; valutare cache header e comunicarne i limiti senza promessa di recupero screenshot.
- **Difficoltà:** MEDIUM.
- **Regressione:** HIGH se si elimina immagine ancora referenziata/in decodifica.

#### DELETE-01 — completamento cancellazione e conservazione evidenze

- **Problema:** niente worker retry; nested purge non dimostrato; report/audit eliminati insieme all'account.
- **Rischio concreto:** account in quarantena indefinita, foto annidate residue, perdita evidenze abuso.
- **File:** delete-account/index.ts; src/live.js; migrations/008–009; account-deletion tests.
- **Oggetti:** account_deletions, prepare_account_deletion, Storage, Auth, reports/moderation_audit.
- **Attuale:** retry affidato all'utente, lista non ricorsiva, purge report sia autore sia bersaglio.
- **Soluzione:** completamento idempotente server o procedura operativa verificata, gestione cartelle e failure step; legal decision sui residui/evidenze e retention; collaudo cloud di account sacrificabile separatamente autorizzato.
- **Difficoltà:** MEDIUM/HIGH.
- **Regressione:** HIGH (cancellazioni irreversibili e FK).

#### AUTH-01 — hardening sessioni/admin e drift cloud

- **Problema:** bearer localStorage, CSP incompleta, admin senza requisito AAL2, cloud completo non confrontato.
- **Rischio concreto:** XSS/furto sessione o account gestore compromesso; oggetti extra possono divergere dal modello.
- **File:** supabase-client.js, admin.js, errors.js, vercel.static.json, config.toml e migrazioni helper/moderazione.
- **Oggetti:** Auth session/provider, is_moderator/moderate_report, grant/default privileges/RLS e config Edge.
- **Attuale:** implicit default, JWT3600, sessioni no timeout; textContent e role server positivi.
- **Soluzione:** valutare PKCE/CSP compatibile/MFA gestore e recovery, reauth azioni sensibili, inventory/diff cloud completo incl cron/functions/default grant e session behavior. Non cambiare chiavi/scope/piani in audit.
- **Difficoltà:** MEDIUM.
- **Regressione:** MEDIUM/HIGH, soprattutto OAuth/installata/font/immagini.

#### MOD-01 — segnalazione contenuti, coda e canale assistenza

- **Problema:** target profilo senza evidenza del contenuto, solo ultime100 e refresh manuale.
- **Rischio concreto:** segnalazioni importanti perse dalla coda o non verificabili dopo delete.
- **File:** report-prompt.js, live-social.js, admin.js; migrations/003,006,009.
- **Oggetti:** reports, report_profile, moderation_reports, moderation_audit.
- **Attuale:**5motivi/nonce/limite, no message_id/photo snapshot, no alert/ricorso.
- **Soluzione:** contratto report contenuto necessario, coda paginata o processo manuale che garantisca tutti i pending, referente/contatto e retention evidenze approvata; non dare ai gestori accesso indiscriminato alle chat.
- **Difficoltà:** MEDIUM.
- **Regressione:** MEDIUM.

#### BACKUP-01 — backup/ripristino verificati DB e Storage

- **Problema:** nessuna copertura operativa completa dimostrata; Free senza backup progetto in evidenza5ottobre.
- **Rischio concreto:** perdita/indisponibilità dati, restore DB senza foto o ripristino che reintroduce dati cancellati.
- **File:** docs/operazioni-pilota.md, tests/restore.test.js; configurazione Supabase/provider.
- **Oggetti:** DB/Auth/Storage/export/log di purge; nessuna nuova tabella proposta necessariamente.
- **Attuale:** restore sintetico DB, nessun restore cloud+Storage provato.
- **Soluzione:** obiettivi RPO/RTO realistici, copie cifrate/accesso protetto/retention approvata, backup foto separato, restore isolato e trattamento cancellazioni dopo restore. Database backup non contiene i byte Storage: [Supabase backups](https://supabase.com/docs/guides/platform/backups).
- **Difficoltà:** MEDIUM.
- **Regressione:** HIGH per restore errato; LOW per piano/check senza mutazioni.

#### EMAIL-01 — affidabilità accesso email

- **Problema:** provider email ON ma servizio default non garantisce login pubblico affidabile.
- **Rischio concreto:** nuovi utenti non entrano e recupero account fallisce.
- **File:** src/live.js/backend.js; dashboard SMTP/templates.
- **Oggetti:** Auth OTP/magic link e configurazione email, nessuna tabella app.
- **Attuale:** SMTP custom OFF, template generici; configurazione non modificata.
- **Soluzione:** SMTP affidabile con mittente verificato e dati/provider inclusi in legal review, oppure esplicita scelta di non offrire email nel pilot; collaudo invio/deliverability senza loggare OTP. Default ha restrizioni di destinatari/limiti: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Difficoltà:** LOW/MEDIUM.
- **Regressione:** MEDIUM sul login; niente cambi automatici di provider.

#### LOG-01 — dati rete, log, Google metadata e browser draft

- **Problema:** dettagli error.message/URL QR e copie provider, metadata Google eccedenti, font esterni prima login.
- **Rischio concreto:** UID/location/token incidentalmente nei log, destinatari non necessari e dati senza durata.
- **File:** photo-assets/index.ts, diagnostics.js, live.js, install-app.js, index.html, supabase-client.js.
- **Oggetti:** log Functions/CDN/Auth; user_metadata/session; draft/sessionStorage/cache; nessuna tabella legale nuova qui.
- **Attuale:** frontend diagnostic minimale; Edge errore grezzo; draft no TTL; font remoti; provider token possibili secondo SDK.
- **Soluzione:** logging a codici controllati, redazione URL/ID/token, inventario retention provider; scadenza draft, minimizzazione metadata/token; font self-host stessi asset/design in task separato.
- **Difficoltà:** LOW/MEDIUM.
- **Regressione:** MEDIUM per recupero onboarding/Auth, LOW per logging/font ben collaudati.

#### PUSH-01 — requisito messaggi ad app chiusa

- **Problema:** push assente malgrado requisito di lancio espresso dal proprietario.
- **Rischio concreto:** utenti non vedono nuovi messaggi; introdurre push senza privacy design esporrebbe endpoint/contenuto dating.
- **File:** public/sw.js, live-social.js, install-app.js; futura Edge/backend dedicati ancora assenti.
- **Oggetti:** nessuna tabella subscription o funzione push oggi.
- **Attuale:** polling solo pagina; nessuna consegna ad app chiusa.
- **Soluzione:** feature separata dopo autorizzazione schema/API: subscriptions private, opt-in e payload generico, delivery/retry/deduplica, revoca su logout/block/delete, test OS/browser reali. Non confondere manifest/installazione con push funzionante.
- **Difficoltà:** HIGH.
- **Regressione:** MEDIUM/HIGH su SW/sessioni/piattaforme. È blocker di prodotto per scelta del proprietario, non affermazione di obbligo privacy generale.

### 🟢 CAN WAIT UNTIL AFTER PILOT

- Suddivisione live.js/live-social.js/backend.js, conversione framework o design system: nessun refactor necessario per correggere la proiezione privata con patch mirata.
- Dashboard safety avanzate/automazioni aggiuntive, purché il processo minimo urgente e la coda completa siano già operativi.
- Export self-service, purché una procedura umana verificata gestisca già i diritti nei termini applicabili; il diritto non può attendere.
- Apple login, analytics marketing, advertising, AI/ranking, GPS/fingerprint, DOB/telefono aggiuntivi: non necessari al pilot, nuova valutazione prima di introdurli.
- Multiregione/certificazioni volontarie, oltre al backup/ripristino minimo concordato: non promettere disponibilità assoluta o perdita dati impossibile.

## Verifica finale e limiti

- **Nessun file runtime modificato.** Hash dei115 file sorgenti/config/test/script/migrazioni e AGENTS rilevati all'inizio confrontati a fine audit.
- **Nessuna migration creata. Nessuna modifica ai dati/schema del database. Nessuna RLS modificata.** Query cloud esclusivamente READ ONLY e ROLLBACK; dati sintetici solo in PGlite effimero.
- **Nessuna policy legale generata. Nessun test aggiunto/modificato.** Unici nuovi artefatti del task: questo report e screenshot dei risultati di catalogo `docs/soma-audit-permessi-2026-10-06.png`.
- Test157/157 PASS; build PASS; typecheck PASS; controllo release PASS. Build rigenera solo output dist ignorato, non sorgenti né release online. Nessun deploy effettuato in questo task.
- Stato critico messo all'inizio del report e non corretto. Le modifiche preesistenti al task (brand/Qui ora/documentazione) restano intatte e non sono attribuite a questo audit.
- Non eseguiti: purge di persone reali, rate/load test produzione, pentest browser di utenti reali, lettura foto/chat/preferenze reali, verifica forense intera storia Git/dipendenze, copia secret, invio email/push, acquisti/upgrade, firma DPA, definizione basi/retention, prova telefoni fisici o restore cloud.

Evidenze principali: `supabase/migrations/001–013`, `src/backend.js`, `src/live.js`, `src/live-social.js`, moduli foto/Auth/report/admin/PWA, `supabase/functions/{delete-account,photo-assets}/index.ts`, `supabase/config.toml`, `vercel.static.json`, CI e suite attuale. Evidenze storiche datate: `docs/audit-privacy-safety-pilot-2026-10-05.md`. Le informazioni fuori portata restano **NOT VERIFIABLE FROM REPOSITORY**, non vengono promosse a conformi.
