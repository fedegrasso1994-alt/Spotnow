# ADMIN staging — correzione QR e singolo enrollment

Baseline272a135691db4504ead27f0c80957272d3aabbfe, branch staging. Approvazione
founder: solo ADMIN nominato, rimozione del singolo TOTP incompleto identificato,
un nuovo enrollment, verifica MFA/AAL2 e nuovo login. Nessun ruolo, nessuna
operazione MODERATOR, main o Production. Credenziali e codici gestiti dal titolare.

## Correzione e controlli

Il setup locale rifiutava il formato SVG valido con prologo XML/commento standard
prima della radice. Normalizzazione corretta, radice SVG e namespace verificati
dal DOMParser browser, esclusi DTD/entity/PI, rendering sempre con immagine e non
innerHTML. Test specifico usa XML senza dati MFA reali, inclusa forma SDK dataURI.

Preflight read-only: il solo fattore ADMIN indicato è ancora TOTP unverified,
nessun verified, nessun ruolo. Nessun secret/token/password letto. Il setup
effettivamente servito è limitato a un account ADMIN, Supabase staging esatto;
MODERATOR escluso dalla configurazione corrente e da ogni richiesta Auth.

Il titolare accede personalmente al setup locale. Il pulsante di riparazione:

- ricontrolla UID e fattori via Auth; richiede un solo fattore, ID esatto,
  tipo TOTP/stato unverified e AAL1;
- usa il normale `auth.mfa.unenroll({factorId})`, poi ricontrolla assenza;
- non esegue DELETE SQL o reset globale; nessuna escalation MFA/ruolo;
- prenota prima del nuovo enrollment un marker locale0600 con creazione atomica
  esclusiva; una sola prenotazione, nessun reset automatico, nessun contenuto
  personale/secret nel marker. Reload/concorrenza nel nuovo tool non autorizzano
  un altro tentativo. Il controllo governa questo tool, non l'intera API Auth;
- in caso di failure/esito incerto si ferma mostrando solo fase, codice Auth e
  status; niente messaggi grezzi provider, QR o sessioni nei log/report;
- dopo enrollment riuscito conserva il QR soltanto nel browser del titolare,
  che completa challenge, logout, nuovo login e challenge AAL2. Nessuna lettura
  della pagina privata da parte dell'agente.

Richiedere AAL1 evita che la cancellazione si estenda a un fattore verificato
contemporaneamente: [Auth richiede AAL2 per unenroll verified](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll).
Se fattori/stato/sessione differiscono dalle precondizioni, STOP. Nessun fallback
o cancellazione di fattori aggiuntivi. Chiudere vecchie schede prima del setup
nuovo; non usare client paralleli per aggirare il singolo tentativo operativo.

## Prove e stato live

**13/13 targeted PASS;796/796 full PASS;build e typecheck PASS.** Inclusi formato
XML, esclusione MODERATOR, delete soltanto sul target unverified/AAL1, diniego per
verified/altro UID, singolo tentativo anche dopo failure, Auth error redatto,
claim locale concorrente e persistente, normale secondo login/challenge.
Sono prove automatiche/fake Auth dichiarate, non collaudo umano già eseguito.
[Evidenza](evidence/ops-phase-a/staff-mfa-admin-repair.json).

**Rimozione/enrollment live e secondo accesso: IN ATTESA del login/interazione
personale del titolare.** La pagina locale aggiornata è pronta; apertura richiesta
nel pannello browser (queued) e istruzioni inviate. L'agente non recupera la
sessione del browser per sostituirsi al titolare. Nessuna mutazione Auth eseguita
dall'agente o attestazione di MFA completato in questa preparazione.

Postcheck predisposto in file locale ignorato: vecchio fattore assente, un solo
TOTP verified, nessun unverified/ruolo, booleani AAL2 e nuova sessione dopo
preflight. Non restituisce token, session ID, seed, OTP, email o dati MODERATOR.
Eseguirlo dopo la conferma del titolare; il secondo login/logout resta anche
evidenza del flow locale umano. Fino ad allora non dichiarare il gate chiuso.

File modificati: controller/UI/server locale, test e README del tool, questo
report/evidenza. Zero modifiche src/app, migration/RLS/API prodotto, Edge, config
globale Auth, PHOTO, scheduler, main o Production. Config e marker `.local/`
ignorati; nessuna password/sessione/QR salvata dal tool. Nessun grant ruoli.
