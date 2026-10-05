# Verifica di prontezza — 5 ottobre 2026

## Esito

Base utilizzabile per collaudi controllati. Lancio pubblico non dichiarato pronto: notifiche obbligatorie ma assenti, backup/ripristino cloud da predisporre, alternativa email con SMTP OFF, documenti e gestione operativa da convalidare, collaudo fisico aperto. Le prove automatiche non garantiscono assenza assoluta di incidenti.

Questionario completo: `questionario-lancio.md`, 52 decisioni/domande. Le regole già approvate nel README restano ferme. Nessuna risposta privata o email personale è riportata qui.

## Verifiche

- Baseline: 134 test passati, typecheck, build e controllo release riusciti.
- Regressione riprodotta: una foto caricata in ritardo in una scheda rimossa poteva rientrare in memoria dopo logout. Correzione locale: il ricordo dei pixel appartiene alla sessione di inizio del caricamento. Il test nuovo fallisce prima della correzione e passa dopo. Suite aggiornata: 135 test passati.
- Correzione e protezioni HTTP sono **pubblicate** dopo autorizzazione esplicita del proprietario. Il precedente blocco della revisione automatica riguardava la pubblicazione durante l’audit: l’autorizzazione successiva ha consentito il deploy.
- npm audit delle 11 dipendenze di produzione: 0 vulnerabilità note riportate dal registro; non è una certificazione del codice.
- Simulazione PostgreSQL locale: 10.000 utenti, 2.000 match, 20.000 messaggi; Tribe 21,6 ms/49 record, match 5,6 ms/49, chat 2,9 ms/100. Tempi senza rete, non percentili di utenti reali; nessun carico sintetico sulla produzione.
- Sito HTTPS: home, manifest, service worker, icone e offline HTTP 200. HSTS presente, worker no-cache. Header di protezione iframe/object/base URL/MIME/referrer pubblicati e verificati sulla risposta HTTP dell’alias pubblico. Il deploy passa esplicitamente il percorso di vercel.json alla CLI.
- API pubblica con sola chiave pubblica: profili, pagine Tribe, match e anteprime respinti HTTP 401/codice 42501. Nessun dato personale letto.
- Database live, sole SELECT: 6/6 tabelle pubbliche con RLS; 0 tabelle private leggibili direttamente da anon/authenticated; bucket foto privato; pagine Tribe/match non eseguibili da anon; conversione amministrativa non eseguibile dagli utenti; 0 miniature mancanti su profili attivi; indice deduplicazione messaggi presente.
- Supabase: Site URL pubblico corretto e redirect pubblico/admin configurati; Google risponde con redirect di autorizzazione. Non certifica il completamento OAuth da parte di un nuovo collaudatore esterno.
- SMTP dashboard: Enable custom SMTP OFF. L'email di assistenza non configura l'invio delle email automatiche. Configurare SMTP oppure decidere di non esporre l'alternativa email al lancio.
- Backup dashboard: Free Plan does not include project backups, confermato oggi. Nessun upgrade acquistato, nessuna esportazione dei dati reali, nessun ripristino sopra la produzione.
- Google Cloud Audience: errore di caricamento dopo un tentativo di ripresa; stato pubblico/test non verificato oggi. Serve accesso riuscito da un Google esterno non già invitato. Questo errore della console non dimostra un guasto del login dell'app.
- Push: nessun listener push/notificationclick o sottoscrizione; messaggi aggiornati con polling nell'app aperta. Notifiche non attive.
- Interfaccia: non risultano link a informativa/condizioni o assistenza pubblica. Non sono stati inventati documenti legali.

## Condizioni per dichiarare il lancio pronto

| Area | Da verificare/completare |
|---|---|
| Push | Messaggio confermato → notifica una sola volta → chat corretta; schermo bloccato, Android/iPhone Home, permesso negato, blocco/logout/cancellazione, destinatario corretto |
| Google | Nuovo collaudatore esterno e account esistente; QR mantenuto; annullamento e recupero |
| Email | Mittente e consegna reale, oppure alternativa rimossa con decisione esplicita |
| Continuità | Backup database + foto, accessi protetti, ripristino isolato, perdita dati e tempi dichiarati, alert |
| Moderazione/supporto | Contatto raggiungibile, frequenza coda, casi urgenti, sostituto, recupero amministratore |
| Documenti/dati | Identità del servizio, informative/condizioni convalidate e accessibili, conservazione, richieste sui dati |
| Telefoni | Camera, libreria/HEIC, Google, tastiera/invio, PWA/sessione, aggiornamento e push fisici |
| Cancellazione cloud | Account sacrificabile, conferma al momento dell'azione, verifica Auth/dati/foto |
| Capacità | Pubblico atteso, budget, staging, latenza/errori/costi reali e alert |

## Fonti

- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- WebKit Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

Un backup database non comprende da solo gli oggetti Storage. Su iPhone la prova push deve riguardare una web app Home con sistema compatibile. Non sono stati cambiati piani, audience Google o impostazioni SMTP durante l'audit.

## Aggiornamento: ingresso senza lampeggio QR

La pagina iniziale ora mostra soltanto un’apertura neutra mentre si recuperano sessione e account. Gli utenti con profilo completo entrano in Ora o Tribe senza passare per l’introduzione QR; il recupero fallito offre Riprova. Senza sessione, l’introduzione appare dopo la verifica. I nuovi check-in richiedono sempre una scansione. Quattro prove aggiunte per sessione lenta, profilo lento, errore e assenza di sessione: 139 test passati, typecheck, build e controllo release riusciti. Pubblicata dopo autorizzazione esplicita. Alias pubblico verificato HTTP 200: HTML e bundle corrispondono alla build locale; introduzione QR inattiva inizialmente e apertura neutra attiva.

Release definitiva: https://spot-hmifn6mh1-fedegrasso1994-1482.vercel.app — alias https://spot-now-alpha.vercel.app/. Nessun abbonamento o impostazione di autenticazione modificato.

Sincronizzazione GitHub autorizzata esplicitamente dal proprietario dopo la pubblicazione Vercel: correzioni, test e rapporto vengono conservati nel repository collegato. Il precedente blocco riguardava l’assenza di autorizzazione al commit e push su main.
