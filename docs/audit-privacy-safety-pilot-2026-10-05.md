# Spot Now — audit privacy, safety e compliance del pilot

Data: **5 ottobre 2026**. Brand: **Spot Now**. Titolare dichiarato dal proprietario: **Federico Grasso**, persona fisica. Recapito dichiarato per privacy/assistenza: **somadatingapp@gmail.com**. Identità, disponibilità della casella, gestione delle richieste e inquadramento da convalidare prima del pilot. Nessuna società è stata presunta. Il recapito è registrato in questo audit: non sono stati modificati contatti nell'app, Google OAuth, provider o mittente SMTP, e non è stata inviata alcuna email.

## Esito e perimetro

**Il pilot con utenti reali non è ancora pronto sotto il profilo privacy/safety.** Esistono protezioni server utili, ma anche un'esposizione delle preferenze di dating, retention non definite e decisioni legali/operative aperte. Non risultano prove di una violazione già avvenuta: è stata verificata una possibilità di accesso non coerente con ciò che mostra l'interfaccia.

Questo è un audit tecnico, non una Privacy Policy, un contratto o una certificazione legale. Non sono stati modificati sorgenti, migrazioni, dati applicativi, provider, piani o decisioni di prodotto. Le query sul progetto reale sono state eseguite in transazioni `READ ONLY` con `ROLLBACK`, leggendo schema, autorizzazioni, nomi dei campi e conteggi, senza esportare foto, messaggi, preferenze individuali o credenziali. L'editor conserva una query diagnostica privata; non è una migrazione.

Fonti esaminate: frontend `src/`, `index.html`, PWA `public/`, migrazioni **001–013**, entrambe le Edge Function, script di manutenzione/pubblicazione, manifest, lockfile/SDK Auth installato, configurazioni Vercel/Supabase e CI. I documenti storici sono stati usati come contesto, non come prova di funzionalità attuali. Demo e fixture sono distinte dal prodotto reale.

Evidenze attuali:

- Commit locale: `38fa93dd0214afa6c784d6a2c74c217c3c27cda7`. HTML pubblico e bundle principale corrispondono alla build locale; HTTP 200.
- Supabase reale: regione **eu-west-1, Irlanda**, piano Free; Google/email abilitati, telefono/Apple e altri provider elencati disabilitati. Accessi anonimi e collegamento manuale ancora abilitati; CAPTCHA disabilitato.
- RLS attiva su tutte le sei tabelle pubbliche; zero tabelle `spot_private` direttamente leggibili da `anon`/`authenticated`; bucket foto privato, massimo 8 MiB per file.
- Campo `profiles.preference` leggibile da `authenticated` sulle righe autorizzate dalla policy; helper di visibilità basato sulle Tribe. Esposizione riprodotta con due utenti sintetici nello stesso luogo.
- `activity_window` realmente NULL; vincolo check-in realmente 90 minuti. **5 account Auth anonimi** residui e **2 oggetti foto non referenziati** da profili o varianti attuali.
- Sessioni: access token 3600 s, timeout totale e inattività a 0/“never”, rilevamento replay refresh token attivo, intervallo riuso 10 s.
- SMTP personalizzato OFF; template predefiniti. Dashboard backup: **Free Plan does not include project backups**.
- **22 test mirati passati** su autorizzazioni, Tribe, cancellazione, minore dichiarato, conversione foto e paginazione. Nessuna cancellazione/blocco/sospensione di persone reali effettuata. Questi test non sostituiscono il collaudo cloud della cancellazione né i telefoni fisici.
- Scansione di 133 file tracciati: nessun pattern di chiave `sb_secret_` reale o JWT `service_role` rilevato. Il controllo non equivale a una revisione forense di tutta la storia Git o degli account cloud.

## A. DATA MAP

### Legenda applicabile a tutte le righe

Le due tabelle seguenti si uniscono tramite l'ID: per ciascuna famiglia coprono **dato, momento, finalità, luogo, accesso, retention attuale, cancellazione, terzi, trasferimento e necessità**.

**SP** = Supabase Database/Auth/Storage/Functions e relativi subfornitori pertinenti. **VE** = Vercel/CDN. **GO** = Google OAuth. **GF** = Google Fonts. **EM** = servizio email integrato Supabase e provider della casella del destinatario. **LO** = dispositivo/browser. I dati applicativi vengono inviati dal browser direttamente a SP: VE non è un backend che riceve ordinariamente il corpo delle chat o delle foto. VE riceve invece le richieste al sito, comprese URL di ingresso e metadati di rete. Accessi tecnici amministrativi/provider restano possibili secondo permessi e contratti: “privato” non significa inaccessibile al gestore.

**T-SP** = archivio principale verificato in Irlanda; esecuzione Functions, log, assistenza e subfornitori non verificati come esclusivamente SEE. **T-VE/GO/GF/EM** = esclusività SEE non dimostrata; analisi dei trasferimenti necessaria. **T-LO** = nessuna trasmissione aggiuntiva prodotta dalla sola conservazione locale, salvo sincronizzazioni/backup gestiti dal browser/OS non controllati dall'app. Non sono assegnate basi giuridiche o nuove durate.

### A1. Raccolta, uso e accesso

| ID | Dato raccolto/generato | Quando e perché | Chi può accedere oggi | Necessità per il pilot |
|---|---|---|---|---|
| 01 | UUID utente, identità/provider, stato anonimo, email verificata e metadati Auth | Registrazione/accesso/collegamento; identificare l'account e recuperarlo | Utente nella propria sessione; backend e amministratori Auth. Email non inclusa nelle RPC di discovery | UUID/identità sì; metadati eccedenti da minimizzare |
| 02 | Nome nel profilo, 1–60 caratteri | Creazione/modifica; riconoscersi | Proprietario; utenti con visibilità di Tribe; partner via match; moderatore vede il nome del segnalato | Nome di presentazione sì, cognome legale non richiesto |
| 03 | Età intera 18–120; **nessuna data di nascita** | Creazione/modifica; filtro 18+ e presentazione | Proprietario, discovery e match; amministratori DB | Età/gate sì; DOB non necessaria al funzionamento attuale |
| 04 | Genere `M/F` | Creazione/modifica; presentazione e filtro | Proprietario; discovery; accesso diretto ai profili autorizzati | Funzionale alle regole attuali; revisione di minimizzazione |
| 05 | Preferenza `M/F/ALL`, default `ALL` | Creazione/modifica; scegliere chi mostrare | Proprietario, server; **anche utenti autorizzati a leggere la riga profilo via API** | Funzionale al filtro; divulgazione agli altri non necessaria |
| 06 | Corso di laurea/professione, testo libero ≤80 caratteri, facoltativo | Creazione/modifica; presentazione | Proprietario e utenti autorizzati alla discovery; amministratori | Facoltativo, non necessario ai flussi essenziali |
| 07 | Foto principale corrente, percorso con UUID/cartella, tipo/file e metadati Storage | Selezione/caricamento/modifica; riconoscimento del profilo | Proprietario; utenti autorizzati e partner via URL firmate; amministratori Storage/servizio conversione | Foto richiesta dal prodotto; metadati EXIF non necessari |
| 08 | Miniatura 480 px, copia dettaglio max1600 px, anteprima JPEG base64 120 px e timestamp asset | Upload/conversione; velocità di griglia e dettaglio | Stesse autorizzazioni della foto; anteprima inclusa nelle RPC autorizzate | Varianti utili alla performance; sono copie di dati personali |
| 09 | Foto vecchie, upload abbandonati o falliti e varianti precedenti | Sostituzione/interruzione; residui, non funzione intenzionale | Proprietario della cartella e amministratori; non servite normalmente agli altri come foto corrente | No, oltre un eventuale periodo di grazia da decidere |
| 10 | Token QR del luogo, nome/indirizzo/ID luogo | Scansione o link QR; anteprima e ingresso | Token noto a chi legge/copia il QR; mapping server privato; anteprima pubblica con token. Video camera solo locale | Token/luogo sì; non è GPS e non prova da solo la presenza |
| 11 | `user_id`, `venue_id`, `checked_in_at`, `expires_at` | Check-in/nuova scansione; Ora per 90 minuti | Riga diretta solo al proprietario; RPC Ora mostrano agli utenti autorizzati i timestamp dei presenti; backend/admin | Associazione e scadenza live sì; riga scaduta indefinita da minimizzare |
| 12 | Appartenenza Tribe per utente/luogo e `last_checkin_at` | Ogni check-in; mantenere la comunità del luogo | Tabella privata per backend/admin; altre persone inferiscono l'appartenenza vedendo il profilo nel luogo | Appartenenza sì secondo prodotto; timestamp esatto permanente da giustificare |
| 13 | Spot: mittente, destinatario, luogo, `created_at`, `sender_checkin` | Invio interesse; reciprocità nel medesimo luogo | Tabelle private; server restituisce al mittente il flag inviato; il match rivela reciprocità | Coppia/luogo sì; doppio timestamp e durata indefinita da valutare |
| 14 | Match: UUID, due utenti, luogo, creazione, primo messaggio | Reciprocità; aprire conversazione persistente | Solo partecipanti autorizzati; backend/admin | Sì; durata oltre inattività da stabilire |
| 15 | Messaggi: corpo ≤2000 caratteri, UUID, match, mittente, timestamp, nonce di retry | Invio; chat e deduplicazione | Partecipanti se match utilizzabile; backend/admin DB. Nessuna cifratura end-to-end implementata | Sì; nessun allegato chat nel codice |
| 16 | Bozze e chiavi retry chat/report, selezione profilo e liste | Digitazione/navigazione; recupero dopo errore nella pagina | Browser corrente; nessun invio della bozza chat prima del comando di invio | Bozze/retry utili; non serve persisterli sui server |
| 17 | Block: due UUID e timestamp | Blocco; escludere la coppia e impedirne la chat | Autore vede i propri blocchi; server/admin; il destinatario può inferire l'esclusione | Sì |
| 18 | Report: autore/bersaglio, categoria, dettagli ≤1000, creazione/stato/revisione/nonce | Segnalazione; revisione umana | Server/admin DB; moderatore via pannello vede target, motivo, dettagli, stato e sospensione, non una chat completa | Sì; contenuti/evidenze e durata da delimitare |
| 19 | Sospensione: utente, motivo, creazione/revoca | Moderazione; impedire uso del servizio | Server/admin; utente riceve il proprio stato | Sì per safety; non è verifica d'identità né blocco di future identità |
| 20 | Ruolo moderatore; audit attore/report/azione/nota/data | Assegnazione ruolo e azioni gestore; controllo amministrativo | Server e amministratori DB; ruolo verificato server, non autocertificato | Sì; nota e durata da limitare |
| 21 | Marker cancellazione `user_id/started_at` | Avvio eliminazione; mettere in quarantena i fallimenti parziali | Server/admin; proprietario vede “deleting” | Sì; serve completamento affidabile |
| 22 | Sessione Auth, access/refresh token, scadenze, UUID sessione, dati utente; eventuali token provider nel callback | Accesso/rinnovo; persistenza senza nuovo login | Browser e SP Auth; token bearer sensibili, non condivisi coi profili | Sessione sì; token Google eventualmente eccedenti da valutare |
| 23 | IP, user agent, eventi accesso/rinnovo/uscita e timestamp | Richieste/Auth; sicurezza/operatività provider | SP/VE/GO/GF/EM per le rispettive richieste; gestori dashboard secondo servizio | Rete inevitabile; conservazione va limitata. Schema Auth contiene IP/user_agent, valori non ispezionati |
| 24 | Diagnostica locale: tipo evento e orario, max30 | Errori/online/offline; stato rete | Solo memoria pagina; nessun monitor esterno configurato | Utile ma non essenziale; nessun testo chat/token registrato dal modulo |
| 25 | QR e UUID proprietario nel draft; token in sessionStorage; flag invito installazione | Onboarding/OAuth e primo match; continuità ingresso e invito Home | Browser corrente; QR anche nella URL di ritorno verso SP/VE | Stato temporaneo utile; durata indefinita del draft non necessaria |
| 26 | History state con schermata, Tribe ID o match ID; dati schermo/OS/browser per layout/installazione | Navigazione e rilevamento iOS/Home/tastiera | Browser; codice non invia questi rilevamenti a un servizio analytics | Funzionale; nessun ID hardware o fingerprint generato |
| 27 | Copie tecniche: cache HTTP, RAM immagini, offline, eventuali backup/log del provider | Rendering, hosting e infrastruttura | Dispositivo/provider/admin secondo copia | Cache statica utile; foto e backup richiedono lifecycle esplicito |

### A2. Archivi, tempi attuali, cancellazione e destinatari

| ID | Dove viene salvato | Quanto rimane **oggi** | Cancellazione attuale | Terzi / trasferimento |
|---|---|---|---|---|
| 01 | SP `auth.users/identities`; sessione LO | Nessuna retention applicativa definita | Eliminazione Auth al termine del flusso; copie/log separati non certificati | SP, GO per login Google, EM per email / T-SP, T-GO, T-EM |
| 02–06 | SP `public.profiles`; RAM UI | Ultimo valore fino a modifica/eliminazione, nessun TTL | Profilo in cascata con Auth; nessuna cronologia versioni applicativa | SP; utenti autorizzati / T-SP |
| 07 | SP Storage `profile-photos`, `profiles.photo_path` | Foto corrente fino a sostituzione; file precedente **non rimosso** dalla sostituzione | Tutta cartella utente nel normale delete-account | SP / T-SP |
| 08 | SP Storage `.thumb.jpg/.detail.jpg`; `spot_private.photo_assets` | Nessun TTL | Cartella Storage e asset DB in cascata; varianti precedenti non ripulite | SP / T-SP |
| 09 | SP Storage; possibili vecchi asset DB | Indefinito fino a cancellazione account; nessun job di pulizia nel repository | Delete-account per cartella; inventario manutenzione solo SELECT | SP / T-SP |
| 10 | `spot_private.venue_codes`; URL/browser draft | QR stabile finché non ruotato dal gestore; stato locale vedi 25 | Account non cancella il QR condiviso del luogo | SP; VE per URL; eventuale link email EM / T-SP, T-VE, T-EM |
| 11 | `public.checkins`, una riga per utente | **90 min di visibilità live, non 90 min di conservazione**. La riga scaduta resta finché nuovo check-in o delete | Nuova scansione sovrascrive; delete in cascata | SP / T-SP |
| 12 | `spot_private.tribe_memberships/settings` | Per luogo, ultimo timestamp sovrascritto; activity_window NULL, quindi nessuna scadenza | Delete account in cascata; nessun Lascia Tribe | SP; inferenza da altri membri / T-SP |
| 13 | `spot_private.interests` | Persistente per mittente/destinatario/luogo; nessun TTL | Cascata se viene cancellato uno dei profili; nessun ritiro Spot | SP / T-SP |
| 14 | `public.matches` | Persistente, anche senza messaggi; nessun TTL | Cascata se un partecipante elimina account; block/sospensione nascondono, non eliminano | SP / T-SP |
| 15 | `public.messages`; copie RAM dei due client | Indefinito fino a cascata eliminazione; 100 per lettura non è retention | Il delete di uno dei partecipanti elimina **l'intero match e tutti i messaggi**, anche dell'altro | SP; destinatario / T-SP |
| 16 | Mappe JS, input/DOM | Vita della pagina; retry rimosso dopo successo, reset su cambio account/logout | Reset dello stato; ricaricamento perde bozze | LO / T-LO; il report viene inviato solo al submit |
| 17 | `public.blocks` | Nessun TTL | Cascata account; API DB consente al proprietario cancellare i propri blocchi, UI sblocco assente | SP / T-SP |
| 18 | `spot_private.reports` | Nessun TTL, neppure dopo review/dismiss | Preparazione delete rimuove report se utente autore **o** bersaglio | SP / T-SP |
| 19 | `spot_private.suspensions` | Nessun TTL; revoca valorizza `revoked_at`, non rimuove | Preparazione delete rimuove la riga | SP / T-SP |
| 20 | `spot_private.moderators/moderation_audit` | Nessun TTL; pannello mostra ultime100, senza cancellare vecchie | Delete rimuove ruolo, audit dell'attore e audit legato ai report rimossi | SP / T-SP |
| 21 | `spot_private.account_deletions` | Finché delete non completa; nessuna scadenza/job di ripresa trovato | Cascata quando Auth user eliminato | SP / T-SP |
| 22 | SP Auth + LO localStorage sessione | Access token3600s rinnovabile; sessioni senza timeout totale/inattività configurato | Logout rimuove sessione locale e revoca tramite Auth; altri client/cache/log richiedono valutazione separata | SP, GO per token login / T-SP, T-GO, T-LO |
| 23 | Schema Auth, log provider/CDN, caselle email | Nessuna policy unificata nel progetto. Retention effettiva di ogni copia non verificata | Delete-account non contiene purge log provider/Auth audit | SP/VE/GO/GF/EM / rispettivi T-* |
| 24 | Array JS | Ultimi30 eventi durante pagina | Ricaricamento/distruzione pagina | LO / T-LO |
| 25 | LO localStorage `spot-onboarding-venue-v1`, `spot-now-install-invitation-v2`; sessionStorage `spot-pending-qr` | Draft senza timestamp/TTL; rimosso al completamento, cambio ingresso o delete. Invito installazione persistente; sessionStorage secondo vita scheda/browser | Vari eventi rimuovono draft/token; flag installazione non rimosso con account | LO; URL ingresso/redirect SP/VE, possibile EM / T-LO, T-SP, T-VE, T-EM |
| 26 | History state e memoria/CSS | Regole browser/session restore; nessuna pulizia completa storia implementata | Reset navigazione non dimostra cancellazione di tutte le vecchie voci browser | LO / T-LO |
| 27 | RAM foto max64 immagini/16MiB di Blob; cache HTTP browser/CDN; SW solo `/offline.html`; backup eventuali | URL foto firmate30s, cache URL applicativa20s; Blob fino a eviction/logout/reset. Conversione carica JPEG con cacheControl3600. TTL del token non è TTL di copie pixel/cache | App libera RAM su logout/cambio account/blocco; non elimina screenshot, download, cache OS o backup provider | LO, SP, VE per statici / T-LO, T-SP, T-VE |

**Assenti nel flusso attuale:** telefono/SMS (provider OFF; helper generico presente), DOB, Apple login, altre foto/gallery volontarie, GPS/geolocalizzazione browser, documenti d'identità, riconoscimento facciale/embedding, allegati chat, push/subscription/device push token, advertising ID, analytics/pixel/session replay/heatmap/marketing SDK e chiamate a modelli AI. “Assente” riguarda codice e configurazioni viste; non significa assenza di log infrastrutturali.

**Dati ricevuti in eccesso dal login Google:** nomi dei campi realmente presenti in Auth metadata: `avatar_url,email,email_verified,full_name,iss,name,phone_verified,picture,provider_id,sub`. Non sono stati letti i valori. `phone_verified` non dimostra raccolta di un numero; foto/nome Google ricevuti non equivalgono a uso automatico come profilo app. L'app richiede la propria foto e il proprio nome.

## B. PROVIDER MAP

| Servizio | Dati e motivo | Regione/trasferimenti verificabili | Privacy/DPA e configurazione | Necessità |
|---|---|---|---|---|
| Supabase | Tutti i dati DB/Auth/foto, JWT e metadati richieste; backend, foto e conversione | Progetto eu-west-1 Irlanda. Non dimostrata esclusività SEE per log, supporto, Functions e subfornitori | `src/supabase-client.js`, `supabase/config.toml`; [GDPR/residenza](https://supabase.com/docs/guides/security/gdpr-compliance), [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [subfornitori](https://supabase.com/legal/customer-resources/subprocessor-list). Applicabilità/formalizzazione DPA non verificata | Sì nell'architettura attuale |
| Vercel | File statici, IP/metadati HTTP, URL query QR, deploy e account gestore; hosting/CDN | CDN globale; nessuna garanzia SEE deducibile dai file di deploy | `vercel.static.json`, `scripts/deploy-production.sh`; [DPA](https://vercel.com/legal/dpa), [rete CDN](https://vercel.com/docs/cdn), [privacy](https://vercel.com/legal/privacy-notice). Impostazioni account e log drains non completamente ispezionate | Hosting sì, provider sostituibile |
| Google OAuth | Email/identificativo/nome/avatar e stato accesso; Google conosce l'accesso al client Spot Now | Trattamento internazionale possibile; regione non impostata nel codice | Provider Google ON; [privacy e trasferimenti](https://policies.google.com/privacy/frameworks). Nessuno scope aggiuntivo esplicito nel client; scope effettivo/branding/audience Console da verificare senza leggere secret | Sì al flusso scelto; nessuna chat/preferenza inviata intenzionalmente a Google dal codice |
| Google Fonts | Richieste CSS/font con IP e metadati HTTP già all'apertura; Bebas Neue/Inter | Posizione effettiva non determinata | Tre link remoti in `index.html`, confermati nell'HTML pubblico; [Google Fonts](https://fonts.google.com/faq), [privacy Google](https://policies.google.com/privacy) | **No come servizio remoto**: font distribuibili dal sito |
| Email integrata Supabase + casella destinatario | Email e link/codice accesso, possibile redirect del QR; recupero/login alternativo | Infrastruttura sender effettiva e retention non determinate; casella dipende dall'utente | SMTP custom OFF, template default. [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp) | Solo se mantenuta alternativa email. Sender predefinito inadatto a pilot aperto |
| GitHub/Actions | Sorgenti, SQL schema, test sintetici, build e identità sviluppatore | Regione per repository/CI non determinata | `.github/workflows/ci.yml`; nessun dato utenti necessario in repo. [Privacy GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) da includere nell'inventario operativo | Utile sviluppo; non destinatario ordinario dei dati app |
| Browser/OS/dispositivo | Sessione, memoria foto, QR camera locale, file selezionato, stato Home | Locale; cloud sync del dispositivo non controllata dall'app | Scanner e file picker; nessuna trasmissione dei frame camera individuata | Sì; non è un provider cloud scelto da Spot Now |
| Subfornitori infrastrutturali | Servizi scelti da SP/VE, secondo le operazioni effettive | Da verificare nei loro elenchi/DPA; non assegnare automaticamente tutti i dati a ogni società elencata | Non c'è un'integrazione diretta Cloudflare/AWS/AI nel frontend. Eventuali subfornitori non equivalgono a SDK app | Dipendono dai servizi principali |

Non risultano Stripe, Twilio/SMS attivo, Firebase/OneSignal/FCM, Apple auth, Google Analytics, Meta Pixel, PostHog, Sentry applicativo o provider AI nel prodotto. Gli strumenti di sviluppo/assistenti non sono una feature AI degli utenti. Un audit separato degli strumenti usati dal gestore va incluso nel registro operativo se ricevono dati personali.

La regione europea del database non risolve da sola la verifica dei trasferimenti; Supabase distingue esplicitamente DB/Auth/Storage da altri trattamenti. [Fonte Supabase](https://supabase.com/docs/guides/security/gdpr-compliance). Vercel usa una CDN distribuita globalmente. [Fonte Vercel](https://vercel.com/docs/cdn).

## C. SPECIAL CATEGORY DATA

**SPECIAL CATEGORY / LEGAL REVIEW REQUIRED**

| Dato/inferenza | Osservazione tecnica | Revisione richiesta |
|---|---|---|
| Genere + preferenza dating | Può rivelare/inferire orientamento sessuale; filtro e dati conservati anche senza scrivere un'etichetta “orientamento” | Classificazione, condizione art.9 e base art.6; minimizzazione e accessi |
| Spot e match | Interesse identificabile verso persone di un certo genere, associato a luogo e date | Valutare inferenze e durata; reciprocità non elimina la sensibilità |
| Testi chat/report/professione | Campi liberi possono contenere vita sessuale, salute, religione, etnia, opinioni politiche, dati di terzi o accuse | Gestione dati incidentali e accesso umano; anche art.10 se pertinente alle segnalazioni |
| Appartenenza/presenza in luoghi particolari | Luoghi religiosi, sanitari, politici ecc. potrebbero consentire inferenze; una palestra non è automaticamente un dato sanitario | Definire luoghi ammessi e rischio contestuale |
| Foto | Può mostrare caratteristiche o dati sensibili; nessun riconoscimento biometrico tecnico trovato | Non classificare automaticamente tutte le foto come biometria art.9; valutare contenuto e finalità |

La qualificazione legale va confermata; l'app non presenta un consenso specifico documentato per categorie particolari né un registro versionato del consenso. Un permesso camera, un login Google o il tap “Entra” non provano da soli tale condizione. Il riferimento alle categorie particolari è illustrato dal [Garante](https://www.garanteprivacy.it/home/diritti/cosa-intendiamo-per-dati-personali). Non è stata scelta una base giuridica durante questo audit.

## D. LOCATION / CHECK-IN DATA

1. **Scansione senza profilo/accesso:** legge un token del luogo e richiede `venue_preview`; ritorna luogo/indirizzo/conteggi, non crea ancora presenza. Salva temporaneamente il QR nel browser per il percorso di accesso.
2. **Utente autenticato con profilo:** `check_in` verifica il token stabile del luogo, imposta una riga `checkins` con ora server e scadenza +90min; crea/aggiorna l'appartenenza Tribe del luogo e il suo `last_checkin_at`.
3. **Rinnovo o nuovo luogo:** sovrascrive l'unica riga check-in dell'utente. Nella Tribe conserva una riga per ciascun luogo mai aggiunto, aggiornandone solo l'ultima visita. Non conserva una tabella di tutte le scansioni.
4. **Scadenza:** interrompe visibilità live; non cancella la riga, la Tribe, il timestamp privato o gli interessi.
5. **Ora:** RPC espone `checked_in_at/expires_at` dei presenti, UI minuti dal check-in. **Tribe:** RPC annulla i timestamp di presenza; appartenenza e assenza dalla lista Ora permettono comunque inferenze.

**Esiste quindi una memoria persistente dei luoghi frequentati e dell'ultima visita a ciascuno, ma non una cronologia completa di ogni visita nelle tabelle applicative.** Log di richieste/accessi, URL browser ed eventuali backup potrebbero aggiungere tracce: contenuto e retention non sono stati certificati.

Per mantenere una Tribe senza scadenza basta funzionalmente `user_id + venue_id`; il timestamp esatto non è necessario al filtro attuale con `activity_window=NULL`. Opportunità da valutare: togliere precisione o rimuovere l'ultimo timestamp, eliminare check-in scaduti dopo una durata definita, limitare la conservazione del QR browser e minimizzare query/log. Nessuna di queste modifiche è stata eseguita.

`sender_checkin` negli Spot nuovi è valorizzato a `now()` al momento dello Spot: **non va interpretato come prova di una visita fisica**. Il token QR può essere fotografato/condiviso e riusato da remoto; non è una verifica forte della presenza. Nessun GPS o storico coordinate è stato trovato.

## E. COOKIE & TRACKING

Classi tecniche richieste: **A** funzionale/necessario; **B** analytics; **C** marketing/profilazione di tracking; **D** non determinabile. Questa classificazione non decide automaticamente l'esenzione legale di ogni operazione dal consenso.

| Elemento | Classe | Contenuto e lifecycle |
|---|---|---|
| `sb-qlucwdjcjomwyziegxrn-auth-token` localStorage | A | Sessione SDK, token, dati Auth/metadata; persistSession:true. Rimossa al logout; SDK rinnova token |
| `spot-now-moderator-session` localStorage | A | Sessione separata gestore, stessi rischi bearer; logout pannello separato |
| Eventuali chiavi SDK di verifica/user storage | A, condizionale | SDK può gestire `-code-verifier`/`-user`; flusso predefinito corrente **implicit**, non PKCE impostato. Non dichiarate tutte presenti nel dispositivo |
| `spot-onboarding-venue-v1` localStorage | A | Token QR + owner UUID, nessun TTL; non nome/foto/bozza profilo |
| `spot-pending-qr` sessionStorage | A | Token temporaneo; cancellato su completamento/varie uscite; durata scheda gestita browser |
| `spot-now-install-invitation-v2` localStorage | A, funzionale UX | Valore “shown”; evita inviti ripetuti. Non strettamente necessario alla chat; valutare trattamento tecnico |
| History state, RAM bozze/foto/liste/diagnostica | A | Identificativi rotte, contenuti temporanei; non invio a marketing |
| Cache Storage SW `spot-now-offline-v1` | A | Solo pagina offline statica; nessun caching app di API/Auth/chat/foto |
| Cookies scritti dal codice Spot Now | Assenti | Nessun `document.cookie`, SDK SSR/cookie storage o cookie custom trovato |
| Cookie prima risposta home | Assenti nella risposta verificata | Nessun header `Set-Cookie`; non è prova per ogni risposta/provider/OS |
| Cookie login Google, sicurezza/infrastruttura eventuali | D | Domini terzi, non letti né inventariati per valori/scadenze individuali |
| Google Fonts | A per rendering; trasferimento remoto evitabile | Richieste a domini Google; non è Google Analytics e non prova tracking marketing |
| Analytics, pixel, heatmap, replay, crash SDK esterno, advertising | B/C assenti dal codice/bundle verificato | Nessun pacchetto/script relativo; injection/account provider non completamente verificati |

**Preferenze dating e filtro profili non sono un pixel marketing:** restano un trattamento di dati personali da valutare, indipendentemente dalla classe cookie.

Nessun banner è stato aggiunto. La scelta di banner/informazione va fatta sul reale uso di cookie e strumenti equivalenti, comprese operazioni browser, secondo le [linee guida del Garante](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876), senza assumere che localStorage sia escluso dalla revisione.

## F. SAFETY STATUS

| Funzione | Stato | Verifica e limiti |
|---|---|---|
| Block user | IMPLEMENTATA | UI dettaglio/chat, RPC e RLS; coppia esclusa. Dati non cancellati, copie già ricevute non recuperabili |
| Report user | IMPLEMENTATA | Cinque motivi, dettagli, blocco opzionale, retry idempotente, max10/h per autore; limite applicativo e coda privata |
| Report messaggio/contenuto specifico | PARZIALE | Da chat si segnala il profilo; **nessun message_id, snapshot/evidenza o comando per singolo messaggio**. Dettagli liberi non sono una segnalazione strutturata del contenuto |
| Delete account | IMPLEMENTATA | Conferma, funzione server identità JWT, Storage e cascade; verifica cloud end-to-end ancora da completare |
| Logout | IMPLEMENTATA | Revoca Auth/rimozione sessione locale, reset UI e RAM foto; non purge di browser history, cookie Google, screenshot o altri client già aperti |
| Suspend/ban account | PARZIALE | Sospensione/revoca di quel profilo implementate e server-enforced; niente verifica identità, ban evasione o blocco nuova identità |
| Esclusione bloccati Ora | IMPLEMENTATA | SQL e RLS per entrambe le direzioni, test sintetici |
| Esclusione bloccati Tribe | IMPLEMENTATA | Stessi vincoli, compreso accesso foto; test sintetici |
| Esclusione bloccati Match | IMPLEMENTATA | `can_use_match` e pagine match; nasconde senza cancellare |
| Esclusione bloccati Chat | IMPLEMENTATA | Lettura/invio server negati; UI polling. Test server; un messaggio già letto può restare su un altro client fino al refresh |
| Moderazione | PARZIALE | Pannello ruolo server, note/audit, ultime100 segnalazioni. Nessuna notifica gestore, coda completa paginata/SLA/escalation/ricorso implementati |
| Supporto/privacy raggiungibile | ASSENTE nell'app | Nessun link pubblico o flusso richieste trovato; nome titolare qui non crea un canale di assistenza |
| Gate 18+ | PARZIALE | UI + DB rifiutano età dichiarata <18; **autodichiarazione**, modificabile. Auth account può esistere prima del gate |

### Autenticazione e minori

Si registra un'età, non la nascita, ed è modificabile da Modifica profilo o API propria entro il vincolo18–120. Non sono presenti documento, stima età, verifica identità o controllo dell'età dell'account Google. Un minorenne non può salvare il valore17, ma può dichiarare18 e aggirare il controllo. Può inoltre creare un account Auth Google/email/anonimo senza completare il profilo, poiché il gate è nella tabella profili e non nella registrazione Auth. La soglia del servizio18+ non va confusa con le regole sul consenso digitale dei minori: decisione legale e safety aperta, nessuna age verification aggiunta.

## G. ACCOUNT DELETION STATUS

Flusso effettivo: conferma UI → Edge Function `delete-account` → valida JWT e usa soltanto l'utente autenticato → `begin_account_deletion` (quarantena) → lista/rimuove file della cartella → `prepare_account_deletion` → `auth.admin.deleteUser` → logout e ritorno home.

| Oggetto | Esito atteso nel percorso riuscito | Cosa resta/limite |
|---|---|---|
| Profilo | Delete Auth fa cascade sul profilo | Nessun soft-delete applicativo del profilo previsto |
| Foto originali, mini/HD e vecchie | Rimozione cartella Storage prima del delete Auth | Errori interrompono, resta marker e serve riprovare |
| Asset base64 DB | Cascade dal profilo | Eventuali copie già ricevute/cache non cancellate dal server |
| Tribe/check-in | Cascade dal profilo | Luogo e QR condivisi restano, perché non sono l'account |
| Spot inviati/ricevuti | Cascade per entrambe le FK profilo | Non solo quelli inviati dall'utente |
| Match/chat | Cascade del match; tutti i suoi messaggi | Anche messaggi dell'altro partecipante spariscono dal DB app |
| Report | Rimossi se autore o target è l'utente | Perdita anche delle segnalazioni ricevute da altri |
| Audit moderazione | Rimossi per actor o report interessato | Può sparire la traccia della gestione dell'abuso; revisione necessaria |
| Sospensione/ruolo moderatore | Rimossi dalla preparazione | Niente registro anti-evasione pseudonimizzato separato |
| Account Auth/identità | API admin deleteUser | Sessioni/identità collegate secondo provider; collaudo cloud completo non effettuato qui |
| Auth audit, log SP/VE/GO/email | **Non purgati dal codice applicativo** | Retention e trattamento provider da chiarire; non promettere cancellazione di ogni traccia |
| Backup | Nessun backup progetto incluso nel Free verificato | Non equivale a provare assenza di copie interne provider; eventuali export esterni non inventariati |
| Browser di altri utenti | Nessuna cancellazione remota dei pixel/testo già ricevuti | Refresh rispetta RLS; screenshot/download/copie non revocabili |

**Fallimento parziale:** il marker esclude il profilo da discovery/chat, permette retry ed evita un falso successo. Non è stato trovato un job server che completi automaticamente i delete interrotti: logout o abbandono possono lasciare dati in quarantena indefinitamente.

**Caso limite da collaudare:** Storage RLS autorizza cartelle sotto UUID anche con eventuali sottocartelle inserite direttamente via API; la funzione lista solo il primo livello e non ricorre nelle sottocartelle. La normale app carica file piatti, ma il purge completo non è dimostrato per oggetti annidati.

La cancellazione non richiede riautenticazione recente: un bearer valido basta dopo conferma della richiesta. Non esiste self-service esportazione dati né procedura applicativa per richieste di accesso/restrizione/opposizione; un percorso umano può gestirle, ma deve essere definito.

## H. SECURITY ISSUES

### H1 — CRITICAL BEFORE PILOT: preferenze dating esposte sulle righe profilo

`grant select on public.profiles to authenticated` autorizza tutte le colonne. `profiles_read` usa `spot_private.can_view_profile(id)`, che ammette profili della Tribe condivisa secondo i filtri/blocchi. Quindi un membro può richiedere direttamente `gender,preference,updated_at` su un altro profilo autorizzato, anche se le RPC di lista e la UI non espongono `preference`.

Prova: due persone fittizie fanno check-in allo stesso QR in PGlite con tutte le migrazioni; il primo utente legge il campo preferenza dell'altro. Live: privilegio di colonna TRUE, policy e helper corrispondenti. Nessuna preferenza reale letta. **RLS protegge le righe, non nasconde automaticamente le colonne.** Da progettare accesso proprio completo e discovery con soli campi necessari. Nessuna correzione applicata.

### H2 — IMPORTANT BEFORE PILOT: scraping e abuso

- Le48 schede UI non sono una protezione anti-scraping. API diretta profili e vecchie RPC `location_people/my_matches` restano disponibili senza paginazione; il paginato può essere iterato.
- QR stabile, condivisibile e membership permanente permettono a chi ottiene il QR di accedere alla Tribe da remoto. Non è un bypass RLS, ma amplia il perimetro di utenti autorizzati.
- Nessun limite server per Spot, messaggi, enumerazione/signed URL o quota totale upload per account trovato. Il limite8MiB è **per file**, non una quota per utente.
- Auth ha limiti per IP verificati (login/signup30/5min, anon30/h, verifica token30/5min, refresh150/5min). Non coprono tutte le operazioni dating/chat.
- CAPTCHA OFF e anon ON, non necessari al percorso attuale. Non sono stati cambiati.
- L'impossibilità di ritirare Spot e di lasciare Tribe resta una decisione di prodotto; non va usata per ignorare eventuali richieste sui dati.

### H3 — IMPORTANT BEFORE PILOT: upload, copie e revoca

Controlli positivi: MIME/size bucket, firma iniziale e decoder client, percorsi proprietario, current-photo e permessi server nel converter, backfill service_role-only. Limiti: la validazione client può essere saltata con API; MIME dichiarato non prova contenuto; nessun controllo malware/contenuto inappropriato/volti/minori trovato. Derivati sono ri-encodati, ma l'originale può essere caricato senza conversione se piccolo o se l'ottimizzazione fallisce: **rimozione EXIF/GPS non garantita**. Nuove foto e vecchie copie richiedono retention e gestione upload falliti.

Firmare una URL per30s limita nuove richieste con quel token, non elimina immagini già scaricate. Cache header3600 delle varianti, memoria e HTTP cache sono copie da distinguere. Bloccare un utente non recupera screenshot; altre schede già aperte possono mostrare dati fino al refresh. Nessuna promessa di revoca istantanea di tutti i pixel.

### H4 — IMPORTANT BEFORE PILOT: sessioni e accesso amministrativo

Il client usa localStorage bearer, sessione senza timeout totale/inattività e flow SDK implicit; valuta hardening OAuth/PKCE e protezione da XSS. UI usa textContent per testi utente e sanitizza errori; non trovata esecuzione intenzionale del contenuto chat. CSP pubblica protegge frame/object/base-uri, ma non contiene `script-src/connect-src/default-src`: non è una CSP completa contro XSS. HTTPS/HSTS, DENY e nosniff sono presenti.

`signOut()` usa lo scope globale predefinito: revoca i refresh token anche delle altre sessioni, ma un access token già emesso può restare valido fino alla scadenza (qui3600s). Le policy consultano UID/account/blocchi, non l'esistenza della sessione Auth per ogni richiesta. Non promettere quindi revoca istantanea di un bearer copiato al logout; blocco/sospensione/cancellazione applicativi applicano invece i propri controlli server. [Comportamento documentato da Supabase](https://supabase.com/docs/guides/auth/signout).

L'upload via Storage richiede account non anonimo/non sospeso/non in cancellazione, ma non un profilo già completo: serve caricare la foto prima di salvare il profilo. Il gate18+ della tabella profili non è quindi una verifica d'età dell'account Auth o di tutti gli upload diretti via API.

Ruolo gestore privato con controllo server e sessione distinta: positivo. Il progetto mostra un solo membro Owner; `?admin=1` non assegna privilegi. MFA obbligatoria della sessione moderatore non richiesta nel codice, account gestore dedicato e recovery da organizzare. Non sono state lette service key/secret Google o cambiate credenziali. JWT gateway ON nei file funzione; i test verificano anche getUser/RPC, non soltanto il gate.

### H5 — IMPORTANT BEFORE PILOT: cancellazione, evidenze e continuità

Purge audit/report con account, nessuna ripresa automatica delete, nested Storage e purge log non dimostrati; vedere G. Backup/ripristino DB **e foto** non predisposti nel piano Free verificato. Mancano alert esterni; ultimo pannello100 report non è una coda operativa completa. La privacy include disponibilità e integrità, non solo riservatezza.

### Protezioni effettivamente presenti

Tabelle private revocate ai normali utenti; RLS pubblica; insert/update profilo solo proprio e account idoneo; check-in con ora server; coppie match e messaggi autorizzati; esclusione reciproca block/sospensioni/delete; idempotenza messaggi e report; foto private e varianti autorizzate; conversione amministrativa non eseguibile dagli utenti; nessuna chiave server rilevata nel bundle sorgente verificato. CORS `*` delle funzioni non rende da solo accessibili dati protetti: serve comunque un JWT/autorizzazione valida, ma va valutato nell'hardening.

## I. DATA MINIMIZATION OPPORTUNITIES

| Priorità | Opportunità, senza implementazione |
|---|---|
| Immediata | Non divulgare la preferenza privata agli utenti di discovery; revisione colonne/API |
| Prima pilot | Definire retention per check-in scaduti, ultimo timestamp per luogo, Spot, match/chat, report/audit, anon e cancellazioni parziali; niente numeri arbitrari |
| Prima pilot | Pulire foto sostituite/abbandonate con riferimenti e periodo di grazia concordato; trattare varianti come foto personali |
| Prima pilot | Garantire eliminazione metadati non necessari dalle immagini caricate, anche nei percorsi fallback |
| Prima pilot | Ridurre metadati Google ricevuti/conservati e non persistere token provider oltre necessità verificata |
| Prima pilot | Rimuovere la dipendenza remota Google Fonts mantenendo il design; riduce terzi già prima del login |
| Prima pilot | Dare scadenza al draft QR e non inserirlo in log/analytics. Non introdurre GPS/fingerprint/analytics per compensare controlli mancanti |
| Prima pilot | Valutare anon ON e account residui rispetto all'attuale login obbligatorio; nessuna rimozione automatica ora |
| Da validare | Ridurre precisione dei timestamp mostrati agli altri e non riutilizzare location/Spot per analisi extra senza nuova valutazione |
| Da validare | Mantenere professione facoltativa e informare sui campi liberi; non chiedere cognome, telefono, documenti o DOB senza esigenza motivata |
| Quando push sarà progettato | Payload generico, endpoint privati, permesso richiesto dopo scelta, cancellazione su logout/delete; oggi non esistono questi nuovi dati |

## J. ITEMS REQUIRING LEGAL REVIEW

Non vengono determinate basi giuridiche, durate o obblighi specialistici autonomamente. Da convalidare: identità/contatto del titolare Federico Grasso; finalità e necessità; art.6 e condizioni art.9 per preferenze/inferenze; eventuale art.10 per accuse; informazione utenti e consenso/ritiro ove applicabile; retention e copie; diritti/esportazione; DPA e trasferimenti; rischi minori; valutazione DPIA e necessità DPO; classificazione e obblighi safety del servizio, eventuale DSA; accordi con i luoghi senza accesso improprio ai membri.

Il Garante richiede che l'informazione preceda la raccolta e identifichi il titolare: **Spot Now è il nome del servizio, non sostituisce Federico Grasso** come soggetto dichiarato responsabile. [Indicazioni del Garante](https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258). Non è stata ancora redatta tale informazione.

La valutazione deve risolvere espressamente due punti: appartenenza Tribe senza funzione Lascia Tribe e Spot non ritirabili, rispetto alle richieste/consensi applicabili; conservazione o eliminazione di evidenze di abuso quando un autore/bersaglio elimina l'account. Non si presume che la legge imponga un pulsante specifico, né che Elimina account esaurisca tutti i diritti.

Informazioni ancora mancanti: disponibilità/gestione e pubblicazione del recapito privacy approvato; dimensione/locali/categorie del pilot; stato contrattuale/DPA applicabile; durata per ciascuna finalità; autorizzati/ruoli; procedura ricorsi/urgenze/data breach; backup e termini ripristino; impostazioni e retention provider fuori dal repository. Il proprietario ha confermato assenza di società, nome Federico Grasso e recapito somadatingapp@gmail.com; le altre informazioni non sono state inventate.

## K. PRIORITY LIST

### CRITICAL BEFORE PILOT

1. **Chiudere H1:** preferenze dating leggibili da altri utenti via profilo diretto. Verificare sia REST diretto sia RPC e foto, senza perdere lettura del proprio profilo.
2. Validare trattamento di preferenze/inferenze e categorie particolari, informazione prima della raccolta ed eventuale consenso con prova/ritiro. Non basta il login Google.
3. Formalizzare titolare Federico Grasso, contatto raggiungibile, destinatari/DPA/trasferimenti e retention. Solo dopo questa analisi preparare documenti legali e flussi necessari.
4. Definire gate minori e procedura per segnalazioni urgenti/abusi; collaudare due account reali consenzienti, blocco e sospensione. Il solo numero18 non verifica età reale.

### IMPORTANT BEFORE PILOT

1. Minimizzazione location/timestamp, foto vecchie/EXIF, anon residui e QR browser; nessuna modifica alle regole prodotto senza nuova decisione.
2. Rate limit server, quota upload, scraping/QR condivisi, copertura delle RPC legacy.
3. Cancellazione reale con account sacrificabile e verifica DB/Auth/Storage/copie; retry automatico o procedura operativa, sottocartelle, evidenze abusi e log.
4. Backup cifrati/ripristino separato di database e Storage, accessi protetti e allarmi; nessun acquisto eseguito.
5. Fonte locale dei font, hardening sessioni/OAuth/CSP e account amministrativo dedicato.
6. Report contenuti specifici/evidenze, coda completa, referente/contatto/tempi e contestazione; può esserci una procedura manuale definita, non serve presumere tutte le automazioni.
7. Configurare SMTP affidabile o decidere di non offrire email al pilot: default verificato non è adatto a utenti esterni. [Documentazione Supabase](https://supabase.com/docs/guides/auth/auth-smtp).
8. Push ad app chiusa: **assente**, pur richiesto come condizione di lancio dal proprietario. Prima di aggiungerlo, includere subscription/device endpoint e provider nell'audit e collaudare rifiuto, logout, blocchi e delete.

### CAN WAIT UNTIL AFTER PILOT

1. Dashboard avanzate e automazioni safety oltre una procedura manuale affidabile; non rinviare gestione urgente o risposte sui dati.
2. Self-service export se è già disponibile una procedura umana verificata per i diritti; non rinviare il diritto stesso.
3. Nuovi provider Apple, analytics/marketing, fingerprint, AI/ranking e dati aggiuntivi: non necessari, richiederebbero nuova valutazione.
4. Certificazioni volontarie e infrastruttura multiregione oltre la continuità minima scelta per il pilot.

## Riferimenti tecnici e limiti del collaudo

Fonti codice principali: `src/backend.js`, `src/live.js`, `src/live-social.js`, `src/report-prompt.js`, `src/admin.js`, `src/supabase-client.js`, `src/diagnostics.js`, `src/photo-memory.js`, `src/optimize-photo.js`, `src/photo-variants.js`, `src/scanner.js`, `src/install-app.js`, `public/sw.js`; migrazioni001–013 e `supabase/functions/delete-account/index.ts`, `supabase/functions/photo-assets/index.ts`. SDK installato Auth: default flow implicit, sessione serializzata nel localStorage, token URL rimossi dal callback; non è stato ispezionato un bearer reale.

Documentazione provider: [Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs) descrive eventi e due archivi distinti; [backup](https://supabase.com/docs/guides/platform/backups) chiarisce che database e oggetti Storage vanno trattati separatamente. Il periodo visibile dei log in dashboard non prova cancellazione di tutte le copie. Non si assegna “24h” a ogni log né “30s” a ogni foto.

Prova locale eseguita: query sintetica `SELECT gender,preference,updated_at` da membro autorizzato verso altro profilo → lettura consentita. Test mirati22/22 PASS; log tecnico locale `/tmp/spot-privacy-audit-tests.log`. Evidenza dashboard solo schema/conteggi: `docs/privacy-audit-permessi-2026-10-05.png`. Nessun payload personale inserito nel report.

Non effettuati: distruzione cloud di un account, invii email/push a utenti, load test produzione, sospensioni reali, modifica provider, esportazione backup reale, lettura credenziali, test fisici iPhone/Android, verifica forense di tutti i log/contratti o certificazione legale. Aree non accessibili completamente restano esplicitamente “da verificare”, non promosse a conformi.
