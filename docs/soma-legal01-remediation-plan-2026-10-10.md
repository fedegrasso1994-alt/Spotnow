# Soma — piano tecnico remediation pre-pilot LEGAL-01

10 ottobre 2026. **Solo piano, nessuna implementazione o modifica produzione.**
Baseline audit approvata: commit `7d4868a0c290add2612818fa3e14a63f0a8fd3cd`,
[audit](soma-legal01-audit-2026-10-10.md) e
[data map](soma-legal01-data-map-2026-10-10.md).
Main produzione resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
Il piano è versionato sul branch documentale `codex/legal01-audit`.

Assunzioni: servizio 18+, pilot Italia/italiano, 2 università e >200 registrati,
OPTION B founder già approvata, Cupido fuori pilot, Bacheca non implementata.
PHOTO-01/02 DONE: nessun cambiamento decoder, limiti, canonicali, quota, grace,
draft, cache o policy review/purge. Nessuna nuova durata dell'audit adottata.
Privacy Policy/Terms definitivi non scritti. Piano ≠ autorizzazione a eseguirlo.

## Contratto comune e criteri di esecuzione

Ogni task ha scope e commit distinti; realizzare una modifica per volta. I task
sono separabili, non privi di dipendenze. Prima di ciascuna implementazione:
segnalare schema/RLS/API e compatibilità, presentare gate/rollback, approvazione
delle decisioni pertinenti, staging con sole fixture sintetiche. Poi test,
build/typecheck, versione GitHub, preflight e autorizzazione produzione separati.
Non modificare migration 001–019 già applicate. Le migration sotto sono
**candidate**, non file SQL creati: numero assegnato solo quando ordine/contratto
sono approvati e branch integrato, senza prenotare ora i numeri 020–026.

**Matrice autorizzazioni trasversale, proprietari distinti:**
- AGE-01 possiede prova/stato 18+; CONSENT-01 possiede purpose/condizione applicabile;
  MODERATION-01 possiede warning/suspension/ban e autorizzazioni moderatore.
- Un predicato dedicato al trattamento dating combina Auth, età, condizioni
  applicabili, blocchi/stato account. Non sostituire indiscriminatamente
  `has_account()` in ogni funzione: oggi serve anche moderazione/operazioni.
- Owner deve poter raggiungere stato proprio, supporto/report, access/export,
  revoca, logout e delete anche se manca conferma 18+, consenso o è sospeso/banned,
  salvo limiti specifici motivati anti-abuso. Dati da mostrare e identità da
  verificare restano minimizzati; queste eccezioni non riaprono discovery/chat.
- Account moderatore dedicato non deve creare un profilo dating, fornire foto o
  accettare il trattamento dating per gestire i casi. Auth+ruolo+requisiti
  sicurezza amministrativi separati; nessuna dipendenza dalla preferenza.
- Ogni gate protegge sia il chiamante sia il target/partner dove pertinente,
  tutte RPC legacy ancora eseguibili, reads e writes. Nascondere una UI non basta.
- La revoca/restrizione concorrente a upload o invio si serializza alla
  pubblicazione/commit; bytes già ricevuti non revocabili retroattivamente.
  Non cancellare writer incerti né resettare ledger foto per far passare test.

**Eccezione foto strettamente necessaria:** AGE/CONSENT/MOD possono richiedere
un gate di autorizzazione prima nuovo upload/attach/lettura peer: dimostrarne
necessità e limitarsi ai predicati server/caller. Non riaprire processing o
lifecycle; riusare PHOTO-02 per failure/cleanup/delete. L'account preprofile deve
poter attestare 18+ prima del primo upload senza dipendenza circolare con
`profiles.photo_path NOT NULL`. OWN export/delete e cleanup server continuano.

Rollback di un gate privacy: sospendere la funzione interessata o mantenere
codice compatibile, **non** tornare a una RPC legacy che aggira le nuove regole.
Rollback retention: interrompere scheduler; un purge riuscito non è reversibile
semplicemente disattivando un flag. Restore richiede INCIDENT-01 e reapply erasure.

## Ordine consigliato e dipendenze

| Ordine | Task / milestone | Rischio | Dipendenze dure |
|---|---|---|---|
| 0 | LEGAL-GATE-00: decisioni professionali e matrice policy, non codice | BLOCKER | Audit approvata; founder/professionista |
| 1 | PROVIDER-01: inventario/config/accordi, prima parte read-only | BLOCKER/HIGH | Accesso ai contratti/config da owner, nessun upgrade implicito |
| 2 | INCIDENT-01A: logging/alert/runbook + backup/restore staging di baseline | BLOCKER/HIGH | PROVIDER-01, budget/RPO/RTO approvati |
| 3 | AGE-01 | BLOCKER/HIGH | OPTION B confermata; LEGAL-GATE-00 per efficacia/gestione minori |
| 4 | CONSENT-01, solo ramo approvato dal professionista | BLOCKER/HIGH | LEGAL-GATE-00 + PROVIDER-01 condizioni dati + AGE gate ownership |
| 5 | MODERATION-01 | BLOCKER/HIGH | Identità sostituto/ruoli e policy azioni; guard AGE/CONSENT integrabili |
| 6 | RIGHTS-01 | BLOCKER/HIGH | Policy evidenze/hold MOD, matrice CONSENT, delete PHOTO-02 esistente |
| 7 | RETENTION-01 | BLOCKER/HIGH, distruttivo | Parametri approvati + MOD hold + RIGHTS/erase + INCIDENT restore |
| 8 | DISCOVERY-01 e CLIENT-PRIVACY-01 | HIGH / MEDIUM | Policy rischio QR/counts, matrice gate stabilizzata |
| 9 | INCIDENT-01B: drill finale sulla release risultante | BLOCKER/HIGH | Tutti i nuovi schemi/workflow, non un nuovo task runtime cumulativo |
| 10 | PILOT-VERIFY-01 + documenti pubblici approvati | BLOCKER | Tutti i gate e decisioni pertinenti chiusi |

LEGAL-GATE-00 e inventari non richiedono di aspettare tutte le implementazioni;
il calendario professionale procede durante hardening. Non mettere in produzione
CONSENT senza condizione convalidata o RETENTION con parametri non approvati.
MOD/RIGHTS possono preparare procedure mentre si chiude la review, ma i loro
contratti di conservazione devono essere fissati prima del purge. Nessun ciclo:
prima scelta hold/copie, poi workflow RIGHTS, infine applicazione TTL RETENTION.

## AGE-01 — enforcement 18+ e ingresso

Finding: L01-02; dipendenza operativa L01-05.

**A. Scope.** OPTION B: età numerica 18–120 e dichiarazione esplicita “Dichiaro di
avere almeno 18 anni”, versione/prova minima. Gating prima Auth nel percorso UI
per chi dichiara <18; prova autenticata prima primo upload/profilo/check-in/dating.
Login Google non dimostra età. Garantire server enforcement della dichiarazione,
non una verifica indipendente dell'età reale; niente DOB/KYC/stima volto/documenti.

Percorsi: home/QR-preview→pre-check→Google/email→ritornoOAuth→attestazione
server→profilo/foto→check-in; rientro account esistente; modifica età; account
Auth senza profilo/legacy anonimo; report underage→restrizione cautelativa MOD.
La preview anon aggregata va valutata separatamente, non inventare un gate di
età per ogni richiesta HTTP/IP al sito. Negare UI prima Auth riduce raccolta,
ma non prova che un client ostile non possa invocare Auth direttamente: account
Auth appena creato non conferisce accesso al dating prima prova server.

Utente che dichiara <18: nessun onboarding dating/upload; non persistire DOB o
identità del minore per sola statistica. Se Auth/profilo esiste già, percorso
restrizione/contatto e cancellazione con tutela minima approvata; non lasciare
il profilo in discovery e non trasformare il solo cambio input in ban perpetuo.
Report underage non è automaticamente accertamento: decisione e ricorso MOD.

**B. File/schema/RPC.** Esistenti: `src/domain.js`, `src/live.js` (solo hook),
`src/backend.js` (facciata), `index.html` (solo UI necessaria in task futuro),
`profiles`, Auth; `can_write_profile`, `can_discover`, `can_view_profile`,
`can_use_match`, `check_in`, `send_spot`, `send_message`, discovery/match legacy
(inclusa `express_interest` ancora eseguibile, se confermata nel catalogo del rollout).
Nuovi candidati: `src/age-gate.js`, modulo backend eligibility,
private `age_attestations`/stato corrente, RPC `my_eligibility` e
`attest_adult` idempotente own-only; per autorizzazione upload
`spot_private.photo_account_active` o gate wrapper comune, senza decoder changes.

**C. Migration.** Additiva: registro/prova versionata minimale, RLS/private grants,
predicati/guard in RPC e policy profilazione/publish; CHECK age18–120 esistente
si conserva. Backfill degli account esistenti in `confirmation_required`,
**non** attestazioni finte né default accepted. Censimento read-only preliminare,
canary consentito in staging, riattestazione progressiva proposta con gate
server; scelta rollout e impatto sugli esistenti da approvare. Nessun purge/mass
suspension/deletion automatico degli account reali come data migration.

**D. Dipendenze.** Contratto comune; efficacia/legal review di OPTION B, MOD per casi e
ricorsi; RIGHTS disponibile anche restricted; prova indipendente da profilo/foto.

**E. Rischio.** BLOCKER/HIGH: bypass API, dati raccolti prima gate, blocco account
esistenti o moderatori, circolarità foto. Non promettere assenza assoluta minori.

**F. Test.** 17/18/120/121, string/frazioni/null; checkbox non selezionata; version
mismatch/retry; OAuth callback e account preprofile; client che salta UI e
API dirette/legacy; modifica age via REST; target underage/restricted escluso;
account legacy senza prova non abilitato; upload già in corso al cambio stato;
OWN rights/report/logout/delete sempre raggiungibili; moderatore senza profilo;
Foto/Ora 90 minuti/Tribe/Spot/match/chat regression; migrazione dry-run/backfill
idempotente e rollback non permissivo.

**G. Decisioni.** Professionista: sufficienza/proporzionalità di OPTION B e trattamento
prima attestazione, prova/durata, rifiuto/minore/errori e ricorsi. Founder:
rollout esistenti, testo versione e flusso limitato di riattestazione,
owner/tempi gestione underage. 18+ e nessun KYC già scelti, non da riaprire.

**H. Ordine.** 3: primo gate applicativo; nessuna attivazione produzione senza
coverage server e preflight delle dipendenze foto strettamente necessarie.

## CONSENT-01 — condizioni dati dating, versioni e revoca

Finding: L01-01 e L01-04. Non sostituisce il task futuro di pubblicazione dei testi approvati.

**A. Scope.** Tradurre la decisione professionale su finalità/base Art. 6 e
condizione Art. 9 in contratti tecnici. Non chiamare il gate “consenso obbligatorio”
prima di tale decisione e non creare accettazioni generiche o pre-selezionate.
Due rami: consenso esplicito se convalidato; altra condizione se convalidata,
con configurazione/finalità/informazione appropriate e nessun consenso fittizio.
L'informativa, Terms, dichiarazione 18+ e consenso sono registri/atti separati.

Mappa esatta da sottoporre al professionista:

| Dati/campi | Trattamento attuale | Questione da chiudere |
|---|---|---|
| `profiles.preference` M/F/ALL + `gender` | Filtro discovery/matching | Possibile rivelazione orientamento/vita sessuale; condizione/finalità e revoca |
| `interests` sender/recipient/venue e timestamp | Interesse romantico, reciprocal Spot | Inferenze sulle relazioni anche senza preference pubblica |
| `matches` user_a/user_b/venue/date | Relazione reciproca, accesso chat | Dati dating e relazione di entrambe le persone |
| `messages.body`/sender/match/date | UGC, possibile intimità/dati terzi | Non ogni messaggio è Art. 9; gestione contenuti sensibili e diritti di terzi |
| `checkins`/membership venue/last_checkin | Presenza/comunità combinabile con relazioni | Venue può rivelare categorie sensibili; non ogni luogo automaticamente Art. 9 |
| Foto, nome, età, occupation | Profilo riconoscibile, testo libero | Classificazione nel contesto, inferenze; normale foto non automaticamente biometria |
| Report/details/note moderation | Safety, accuse/terzi | Finalità distinta; categorie particolari ed eventuali accuse da review, non un consenso omnibus |

Non sono nuove raccolte. Cupido/Bacheca/AI/marketing/push esclusi: eventuali
permessi/opt-in separati in task futuri, non inclusi nell'accettazione dating.

**B. File/schema/RPC.** Candidati `src/privacy-consent.js`, modulo backend consent;
hook `live.js`/`backend.js`, schermata/profile controls minimi solo in futuro.
Private catalogo versioni/finalità `privacy_purposes` + `privacy_events` e stato
corrente derivato/verificato server. RPC own-only get/record/withdraw; helper
`can_process_dating(person,purpose)` con purpose IDs approvati. Integrare profile
write, discovery/Spot/match/chat e read foto peer via helper esistenti, **tutte**
proiezioni legacy, non solo nuovo frontend. Schema current Auth/profile resta
compatibile; niente campo consenso altrui esposto nella discovery.

Raccolta tecnica se richiesta: informazione/versione visibile prima inserimento
preference/upload dati pertinenti; prova autenticata prima persistenza/proiezione.
Le scelte compilate prima gate restano transitorie, non inviate al backend.
Sessione nuova/esistente devono ricevere lo stesso stato server; non fidarsi di
localStorage o `raw_user_meta_data` modificabile dal client come prova autorevole.

Revoca transazionale: registra evento, aggiorna stato purpose, invalida capacità
pertinenti e ricontrolla al commit di write/publish. Ramo dating generale propone
stop nuova discovery/Spot/match/chat peer per revocante e verso revocante;
ramo purpose più stretto limita solo quel trattamento, se prodotto sostenibile.
Chi può ancora leggere chat preesistenti e con quale condizione **va deciso**,
non lasciare un default permissivo. Own stato/rights/safety/withdraw/delete
restano. No match/message/publish nuovo dopo revoca committed; writer foto
in-flight può richiedere cleanup PHOTO-02, mai timeout-purge. Gestione dati già
raccolti (erase/restrizione/hold) secondo decisione professionale + RIGHTS/RETENTION,
non “withdraw = delete account” automatico né promessa annullare tutto il passato.

Audit minimo candidato: actorUID, purposeID, versione/hash testo, azione
accept/withdraw, timestamp server, operationID retry. Nessun IP/GPS/device
fingerprint o copia chat per dimostrare una scelta. Immutabilità e stato coerente
in transazione; accesso own limitato e ops autorizzato; retention/cascade dell'
evidenza da approvare, non indefinite “per sicurezza”.

**C. Migration.** Additive purpose/version/events/stato, grants/RLS e gate;
backfill `unrecorded`, **mai** consenso dedotto dal login, uso app o vecchia
preference. Versioni immutabili; nuova richiesta solo quando cambio materiale
approvato la richiede. Approvazione condizione e rollout prima attivazione.
Se non si sceglie consenso, implementare solo il contratto di condizione/finalità
convalidato; non generare un ledger di opt-in inesistenti.

**D. Dipendenze.** LEGAL-GATE-00, PROVIDER-01 contratti dati sensibili, AGE-01,
matrice MOD/RIGHTS di eccezioni e conservazione. RETENTION utilizza gli stati,
non determina la base giuridica. Documento/versione professionale disponibile.

**E. Rischio.** BLOCKER/HIGH: consenso invalido, impossibilità reale ritiro,
modifiche estese di accesso, lockout, legacy bypass, interpretazione Art. 9 errata.

**F. Test.** Ramo approved/notconfigured fail-safe; accettazione non predefinita;
version scoping/nonce/idempotenza; withdraw retry/in altri dispositivi; RPC diretta
con sessione vecchia; sender/recipient gates e own exceptions; API writes in
race con revoca, upload→publish; metadata client non autorevoli; scopes separati
camera/18+/Terms; export/deletion della prova e legal hold; nessuna preference
peer o timestamp precisi reintrodotti; moderatore dedicato non costretto al dating.

**G. Decisioni.** Professionista: classificazione/finalità/basi/condizioni, libertà
ed effetti della revoca e trattamento storico, evidenza/retention. Founder:
funzioni disabilitate per purpose, processo di reattivazione/esistenti, sostenibilità
servizio senza un trattamento. Nessuna decisione Art. 6/Art. 9 presa nel piano.
Riferimento per review: [EDPB consenso](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en).

**H. Ordine.** 4, solo dopo decisione professionale; progettazione oggi possibile,
nessun codice “consent=true” adottato automaticamente.

## RETENTION-01 — lifecycle non foto, parametrico e verificabile

Finding: L01-03, L01-07, L01-08 e L01-10.

**A. Scope.** Motore separato dalla photo-lifecycle: dry-run/candidate→claim→
recheck→purge batch con scheduler autenticato OFF iniziale, stop/resume,
lease/idempotenza, audit minimo e manual review di stati incerti. Non usa le
finestre dell'audit come default già autorizzati; configurazione incompleta
blocca **attivazione** e produce segnalazione operativa, non legalizza retention
indefinita. Nessun job foto modificato, nessuna logica dei 90 minuti cambiata.

| Categoria | Parametro da approvare | Eleggibilità/recheck e rischio |
|---|---|---|
| Check-in | buffer dopo expires_at | Delete solo ultima riga ancora scaduta al commit; check-in rinnovato non eliminato; non cancella Tribe |
| Precisione last_checkin/Spot stamp | modalità/granularità e termine precisione | Subtask distinto da membership/TTL, helper activity-window e legacy auditati; mai inferire expiry Tribe |
| Spot non reciproco | TTL non ricambiato da created_at | Escludere reciproco/match/hold al commit; decisione su reinvio/reset interest_sent, race con nuovo Spot |
| Match senza chat | tempo dall'evento definito | Confermare zero messaggi, recheck primo invio/first_message_at; niente delete se chat nasce in parallelo |
| Chat inattiva | inactivity/evento + preavviso se approvato | Definire last-message vs lettura/sessione; non aggiungere read receipts/storico attività superfluo; purge coerente messaggi/match, diritti entrambi/hold |
| Moderation/report | durata da chiusura caso per gravità + hold | Nessun purge open/appeal/hold; separate evidenze minime già approvate da raw report, rilascio hold autorizzato |
| Log/cron/inbox/backup | TTL per categoria e copia | Solo store controllabili; config provider/verifica manuale altrove, no promessa delete con DB app soltanto |

**B. File/schema/RPC.** Nuovo modulo `supabase/functions/privacy-retention/`,
modulo condiviso retention e test, private `retention_rules`, `retention_runs/jobs`,
hold del caso definito da MOD. Tabelle checkins/interests/matches/messages/reports/audit;
RPC service-only candidate/claim/finish + dry-run. SQL riferimento: migration
007/009 per social e membership, 014 per proiezioni Ora, 015 per RLS profili;
nuove migration additive, senza modificare questi file applicati. Nessun helper che accetta UID
arbitrario da normale utente. Eventuale indice match/last-message senza duplicare
body o persistere letture utenti se non necessarie. UI solo avviso approvato in
subtask distinto, nessuna introduzione automatica ritiro Spot/lascia Tribe.

**C. Migration.** Additive registry policy/approval IDs, job/evidenza minima e
indici, poi funzioni per singola categoria. Separare RETENTION-01A check-in,
01B Spot, 01C match/chat, 01D moderazione/log; un subtask per volta. State/date mancanti
in dataset legacy non diventano retroattivamente una data inventata: classificare
manual review/exclusioni; TTL configurati ma disabled finché dry-run approvato.
Nessun purge reale come backfill migration. Eventuale modifica last_checkin
presentata come migration specifica e compatibile, non nascosta nel cleanup.

**D. Dipendenze.** Parametri LEGAL-GATE-00, MOD hold/appeal policy, RIGHTS prove
access/erase, INCIDENT restore/pause e PROVIDER capability. CONSENT withdrawal
mapping; schema non foto stabile. Nessuna dipendenza da riaprire PHOTO-01/02.

**E. Rischio.** BLOCKER/HIGH: distruzione irreversibile, race, perdita chat/evidenze,
reintroduzione al restore. Durata proposta non è decisione né mandato di purge.

**F. Test.** Confini esatti/±1ms, timezone/serverclock; lock/recheck renew-checkin,
reciproco Spot, primo messaggio, appeal/hold/export in corso; batch>200/grandi
code, skip non eleggibili, doppio run, crash e ripresa, retry Storage non foto
solo se pertinente; log redaction; scheduler autenticato/OFF/ON/pausa; expiry check-in
mantiene 90 minuti e Tribe; dry-run non scrive/cancella contenuti; esistenti invalidi
in review, nessuna perdita current foto/ledger/quota; restore/tombstone prova.

**G. Decisioni.** Durate/eventi/eccezioni per categoria, product effetto reinvio/
inattività/messaggi partner, hold e comunicazioni; legal review necessità,
retention consensi e evidenza; founder approva manifest aggregato iniziale prima
purge, owner errori e tempi intervento. Nessuna durata accettata ora.

**H. Ordine.** 7; prima checkins dopo gate, poi social, infine casi/log secondo
schema stabilizzato. Rollout con scheduler OFF, scope sintetico e dry-run live,
abilitazione categoria per categoria autorizzata.

## RIGHTS-01 — access/export/erase e prova completezza

Finding: L01-04, L01-08 e L01-10.

**A. Scope.** Workflow richieste accesso/rettifica/portabilità ove applicabile/
revoca/delete, distinto dalla sola UI del profilo. Procedura manuale sicura minima
può precedere self-service. Identità verificata, registro caso, owner/scadenze,
redazione terzi, consegna protetta, esito e conferma limitata alle copie controllate.
Non rinominare “portabilità” ogni accesso e non esportare indiscriminatamente dati
safety o testi di terzi. Non richiedere documento per default via email.

Delete: riusare endpoint e queue PHOTO-02 per account/foto, verifica ledger,
riserva/job/Storage oltre social/Auth/consent/age/casi nuovi. Non creare un
secondo deleter foto. Conclusi tecnici di 7 giorni restano secondo contratto esistente;
qualsiasi dato safety mantenuto ha finalità/condizione approvata, hold ristretto,
scadenza/riesame e referenze non pendenti. Pseudonimizzazione non “anonimizzazione”.

**B. File/schema/RPC.** `src/backend.js` (facciata),
`supabase/functions/delete-account/index.ts` e helper `prepare_account_deletion`;
nuovo modulo backend/admin diritti e runbook; opzionale
`supabase/functions/user-rights/`, own-state/RPC export autorizzate, private
`rights_requests/export_jobs` se automatizzazione approvata. Tabelle data map
incluse Auth/identities via server, profile/tribe/interests/match/messages/blocks,
registri foto e nuove policy, moderation case approvato. Nuovi hooks in
`prepare_account_deletion` per le **nuove** tabelle, non cambiamento al processing
foto. Eventuale bucket export privato **se necessario** con ACL/TTL; mai export
pubblico o artifacts GitHub contenenti utenti. Nessun nuovo provider scelto.

**C. Migration.** Nessuna per procedura manuale iniziale; additive request/export
metadata e grants solo se endpoint implementato. FK/cascade/hold nuove tabelle
espliciti. Se evidenze safety devono sopravvivere delete, modifica mirata del
prepare/fk concordata MOD, con minimizzazione e prova; non trattenere copie
chat “nel dubbio”. Non affidare erasure solo alle FK se hold richiede lifecycle diverso.

**D. Dipendenze.** Provider copie, policy casi di MOD, AGE/CONSENT eccezioni own,
regole RETENTION approvate per TTL export/casi, INCIDENT recovery. Procedura owner
avviabile prima degli automatismi; definire hold prima schema, quindi no ciclo con il purge.

**E. Rischio.** BLOCKER/HIGH: export a estranei, esposizione dei dati del partner, perdita evidenze,
false promesse cancellazione globale, account bloccato senza diritti.

**F. Test.** Impersonation/manomissione UID/IDOR, account token diverso, verifica identità
proporzionata, completezza export per categoria e redazione chat/report/terzi,
no signedURL riusabile senza scadenza, failure/retry del job/accesso concorrente a delete,
cleanup export ripetuto; delete account sintetico con tutti nuovi record/casi,
verifica Auth/social/files/ledger/quote, no orphan/FK pendenti; dati mantenuti con elenco
motivato, scadenza hold; banned/withdrawn/agepending può esercitare diritti.

**G. Decisioni.** Professionista: perimetro access/portabilità, dati terzi, prove
identità e tempi applicabili, safety/obblighi dopo cancellazione. Founder: operatore/canale,
manualmente o endpoint, consegna/registro, TTL exports e testi conferma.

**H. Ordine.** 6 prima purge RETENTION; ritest delete dopo ciascuna nuova tabella,
non lasciare compliance delle nuove entità al solo vecchio test PHOTO-02.

## MODERATION-01 — coda completa, ruoli e decisioni

Finding: L01-05 e L01-08.

**A. Scope.** Superare limite ultimi 100 con queue completa paginata per cursore
stabile/ID, filtri pending/status/priority, assegnazione e follow-up. Account
moderatore personale dedicato per Federico/sostituto, MFA e autorizzazione minima;
non credenziali condivise e non service role nel browser. Caso di report senza
accesso automatico tutte chat, testo necessario e limitato al caso se la legal review approva.

Azioni distinte `warn` (comunicazione e receipt/stato), `suspend` temporanea,
`ban` durevole, `revoke`/appeal/close. Ban blocca servizi dating lato server, non
impedisce ricorso/delete/rights. Non equivale erase, non promette prevenzione
ricreazione altri account senza scelta proporzionata anti-evasione. Nessuna
esportazione ruoli/lista utenti alle venue.

**B. File/schema/RPC.** `src/admin.js`, `src/report-prompt.js`, backend facciata;
nuovi moduli moderation queue/actions, private cases/actions/assignments/roles
o estensione mirata reports/audit/suspensions. RPC `moderation_reports_page`,
`claim_case`, `moderate_case` con operationID e permessi per azione;
`is_moderator`, state/helper business/can_use_match, sotto ownership del contratto comune.
Eventuale messaggio report reference non apre un endpoint chat unrestricted.

**C. Migration.** Additive indici di paginazione/stato casi/capacità dei ruoli/azioni e audit
append-only minimale, no note accessibili peers. Backfill report preserva ID/stato/date,
non assegna owner fittizio. RPC legacy con limite 100 può restare durante un rollout compatibile, ma non
coda operativa finale. Azioni/riesami non sovrascrivono storia precedente;
policy conservazione/hold è input a RIGHTS/RETENTION. Creare/modificare ruoli account
reali solo in task autorizzato, con prova di revoca.

**D. Dipendenze.** Founder nominativo/schedule/mailbox e professionista procedure/
evidenze/ricorso, PROVIDER Auth/MFA/accessi, AGE underage e restrizioni CONSENT;
la decisione case hold precede RIGHTS/RETENTION. La UI admin deve funzionare senza
profilo dating/consenso/foto e dopo che il moderatore esce dalla app personale.

**E. Rischio.** BLOCKER/HIGH: casi invisibili, privilegi larghi, abuso delle azioni di ban,
modifiche concorrenti ed esposizione di accuse. Niente ML/autoban di default.

**F. Test.** Coda con 101/201/migliaia di casi sintetici, nessun item perso/duplicato tra pagine
con nuove segnalazioni, cursore/filtri/priorità dei pending; due operatori claim sullo stesso caso,
nonce retry/doppia azione, non moderatore/ruolo ristretto vietato, revoca accesso con JWT
precedente, MFA requisito se deciso; warn/suspend/ban/revoke e scadenza della sospensione,
privacy di peer e reporter, review underage/appeal, case evidence accesso minimo, delete
reporter/target/moderatore senza residui o perdita non concordata; retention audit.

**G. Decisioni.** Owner+sostituto nome/orari/formazione/least privilege, triage/
priorità/tempi realistici, modalità warning/comunicazioni/ricorso, criteri ban/
sospensione, hold/retention e accesso ai contenuti. Professionista qualifica obblighi
applicabili/diritti delle parti; nessun 24/7 imposto/presunto.

**H. Ordine.** 5; primi subtask queue/ruoli, poi warn/suspend/ban/evidenza;
questi ultimi non sono un singolo patch trasversale senza review.

## PROVIDER-01 — inventario e configurazioni verificabili

Finding: L01-06 e L01-10.

**A. Scope.** Per ogni provider: servizi effettivi, dati e finalità, regioni,
accessi, subprocessor, DPA/versione applicabile, retention di contenuti/log/backup,
cancellazione e configurazioni privacy. Prima inventario read-only, poi modifiche
separatamente autorizzate. Nessun nuovo provider, acquisto o upgrade implicito.

Inventario iniziale da verificare:

- Supabase: DB, Auth, Storage, Edge, cron, log e backup.
- Vercel: hosting/CDN, request log, deploy e analytics se effettivamente attivi.
- Google: OAuth (scope/claim/redirect/branding) e Fonts.
- SMTP: identificare il servizio realmente configurato, senza presumere il fornitore.
- Gmail: casella unica supporto/privacy/safety/ricorsi.
- GitHub/CI: sorgenti ed evidenze aggregate; nessun export personale nei report.

Copie browser e copie conservate dagli utenti sono mappate separatamente.
Cupido, Bacheca e provider futuri non sono trattamenti attivi. Eventuali servizi
push già configurati vanno verificati, senza dedurli da una feature pianificata.

**B. File/schema/RPC.** Checklist provider e registro evidenze; lettura di
`src/supabase-client.js`, `index.html`, service worker effettivo, SDK/config,
`supabase/config.toml`, configurazione Vercel e script deploy/CI. Dashboard e
contratti per MFA/recovery, ruoli, log, backup e OAuth. Nessuna RPC nuova prevista.
Hosting locale dei font, se approvato, appartiene a CLIENT-PRIVACY-01.

**C. Migration.** Nessuna per inventario e contratti. Un eventuale purge dei log
appartiene a RETENTION-01; capacità provider e disponibilità del piano vanno
verificate prima di progettare automatismi.

**D. Dipendenze.** Owner con accesso alle configurazioni/accordi e professionista
per ruoli, trasferimenti e trattamento dei dati dating. Alimenta CONSENT,
RIGHTS, RETENTION e INCIDENT. Un DPA pubblicamente disponibile non dimostra
che sia quello applicabile o accettato dall'account.

**E. Rischio.** BLOCKER/HIGH: copie non note, configurazioni e retention presunte,
accessi persistenti e costi non approvati.

**F. Test/evidenze.** Matrice completa con data, operatore e prova priva di segreti;
network check sintetico home/login/foto/chat; verifica di analytics inattesi;
prove autorizzate di MFA/recovery/revoca, ricezione della casella supporto e
configurazioni delete/export/log/backup. Nessuna comunicazione inviata in questo task.

**G. Decisioni.** Professionista: accordi, ruoli, trasferimenti, subprocessor e
condizioni applicabili. Founder: accessi autorizzati, budget, SMTP/supporto,
configurazioni e font locali/remoti. Il solo DB in Irlanda non garantisce SEE-only.

**H. Ordine.** 1, prima di condizioni dating e recovery; ricontrollo finale dopo
le eventuali modifiche autorizzate e prima del pilot.

## INCIDENT-01 — logging minimo, alert e recupero

Finding: L01-06 e L01-10.

**A. Scope.** Due milestone: 01A prepara osservabilità/runbook e verifica recovery
di baseline; 01B ripete il drill sulla release finale. Eventi minimi: codice
errore, request/operation ID, componente, stato, tempo e conteggi. Non registrare
chat, foto, token o QR nei log ordinari. Alert su failure delete/retention,
writer review/unknown, orphan/missing e mancata esecuzione scheduler; owner,
sostituto, deduplicazione, presa in carico ed escalation espliciti. Riusare
l'osservabilità PHOTO-02, senza cambiare il lifecycle.

Runbook: classificazione, contenimento/pausa, impatto, evidenze minimizzate,
ripristino e valutazione professionale delle notifiche. Eventuali pause del
dating sono distinte dai controlli foto; preservare diritti/delete quando sicuro.
Nessuna promessa di zero incidenti o zero perdita di dati.

Recovery: backup DB/Auth/schema e **byte Storage separati**; segreti/configurazioni
non nei report pubblici. Restore solo di fixture sintetiche in ambiente isolato,
con cron, accessi outbound e segreti disabilitati **prima** dell'import, per
impedire che job restaurati richiamino la produzione. Non copiare JWT o dati
reali. Riconciliare ledger/Storage prima di ammettere upload o cleanup e
riapplicare cancellazioni/revoche pertinenti; stati incerti mai purgati per età.

**B. File/schema/RPC.** Runbook incident/backup/restore, script staging recovery,
redazione log e configurazione alert. `src/diagnostics.js` oggi locale in RAM;
hook server dedicati e adapter della summary PHOTO-02 solo se necessari.
Query health read-only; eventuali eventi incident/registro replay delle
cancellazioni privati e service-only. Nessun provider esterno introdotto.

**C. Migration.** Potrebbe non servire per procedure e alert provider. Se necessario,
registro minimo incident/erasure replay con grants e retention approvati.
Non creare un audit personale perpetuo; un hash non rende automaticamente anonimi
identificativi o tombstone. Retention backup distinta dai 7 giorni dei metadata foto.

**D. Dipendenze.** PROVIDER, budget/RPO/RTO e copertura owner. Per 01B: RIGHTS,
CONSENT, MOD e RETENTION finali. Recovery di baseline prima dei task distruttivi.

**E. Rischio.** BLOCKER/HIGH: alert senza responsabile, leak nei log, restore di
dati cancellati, job duplicati o ledger incoerente. Costi e provider nuovi
richiedono autorizzazione separata.

**F. Test/evidenze.** Payload sintetici per redazione log; alert errore/scheduler,
deduplicazione e presa in carico; tabletop su accesso indebito/minore/delete;
restore DB + varianti foto sintetiche, checksum, RPO/RTO misurati, replay di
cancellazioni/revoche e hold. Cron isolato non invoca API produzione; stati
incerti preservati. Regressioni dei flussi core dopo restore.

**G. Decisioni.** Founder: budget e RPO/RTO realistici, responsabili/finestre,
canali alert e destinazione backup. Professionista: valutazione breach/notifiche,
evidenze e retention incident. Nessun termine legale deciso dal codice.
La [documentazione Supabase sui backup](https://supabase.com/docs/guides/platform/backups)
distingue backup DB e byte Storage: il recupero va verificato per entrambi.

**H. Ordine.** 2 per 01A, 9 per 01B. Logging/alert e drill sono subtask distinti.
Nessuna fault injection in produzione autorizzata da questo piano.

## Task complementari per i finding residui dell'audit

### LEGAL-GATE-00 — decisioni prima del codice

- **A. Scope:** fissare finalità, condizioni Art. 9, 18+, retention, hold, diritti
  e provider con il professionista, incluso screening DPIA ed eventuale necessità
  di valutazione ulteriore; senza conclusioni DPIA o documenti pubblici definitivi.
- **B. File:** decision sheet, data map, registro approvazioni senza dati personali.
- **C. Migration:** nessuna.
- **D. Dipendenze:** founder e professionista.
- **E. Rischio:** BLOCKER, implementare ipotesi legali non validate.
- **F. Verifiche:** matrice completa, contraddizioni risolte, approvazioni versionate.
- **G. Decisioni:** condizioni legali al professionista, scelte prodotto al founder.
- **H. Ordine:** 0. Audit approvato non significa durate o basi già approvate.

### DISCOVERY-01 — anti-abuso QR/discovery e conteggi

- **A. Scope:** mitigare crawling, abuso e uso remoto di QR condivisi; valutare
  conteggi piccoli. Nessuna geolocalizzazione introdotta.
- **B. File/RPC:** hook scanner/QR, `venue_preview`, `check_in`, discovery/Spot/
  messaggi; modulo server dedicato ai limiti.
- **C. Migration:** eventuali contatori privati/grants/RPC. Rotazione QR solo
  se scelta e autorizzata; nessuna riscrittura automatica dei QR attuali.
- **D. Dipendenze:** AGE/CONSENT/MOD e policy di rischio founder.
- **E. Rischio:** HIGH, stalking/abuso e limiti che bloccano utenti normali.
- **F. Test:** burst/retry/concorrenza, bypass legacy, inferenze sui piccoli
  conteggi e blocchi; Ora 90 minuti e polling preservati.
- **G. Decisioni:** soglie, prova di presenza, aggregati e rischio QR accettabile.
- **H. Ordine:** 8. Limiti, aggregati e QR in subtask distinti.

### CLIENT-PRIVACY-01 — font, storage browser e CSP

- **A. Scope:** stessi font eventualmente locali, TTL dei draft/QR, cambio utente,
  logout/cache e CSP compatibile; nessun redesign.
- **B. File:** `index.html`, asset font/header Vercel, modulo draft storage;
  hook auth/cache solo se strettamente necessari.
- **C. Migration:** nessuna.
- **D. Dipendenze:** PROVIDER, licenze font e decisioni sui TTL.
- **E. Rischio:** MEDIUM, XSS/dati persistenti e regressioni OAuth/scanner.
- **F. Test:** confronto visivo, richieste font, CSP/eventi/OAuth/scanner,
  reload/TTL/cambio account/logout; policy cache PHOTO-02 invariata.
- **G. Decisioni:** font locali, criteri draft e rischio delle copie client. Questi subtask coprono i finding
  browser/font/CSP dell’audit; non riaprono le regole cache PHOTO-02.
- **H. Ordine:** 8. Font, draft e CSP come tre subtask separati.

### PILOT-VERIFY-01 — gate di apertura

- **A. Scope:** verifica cumulativa e operatività Italia/2 università/>200 utenti;
  pubblicazione di testi professionali approvati solo in un task successivo.
- **B. File:** checklist release, report ed eventuali hook informativi approvati.
- **C. Migration:** nessuna di preflight; ogni fix resta un task separato.
- **D. Dipendenze:** BLOCKER chiusi, HIGH mitigati/validati, drill e sostituto operativo.
  Se le notifiche restano requisito di lancio, verificarle in un task prodotto
  distinto: questo piano non ne implementa il delivery.
- **E. Rischio:** BLOCKER, confondere test passati con prontezza operativa/legale.
- **F. Test:** dataset sintetico completo, suite aggiornata/build/typecheck,
  telefoni reali quando disponibili, richieste diritti/minori/ricorsi, restore,
  preflight produzione read-only e rollout successivo autorizzato a gate.
- **G. Decisioni:** GO founder/professionista, calendario/copertura/stop/contatti.
  Cupido e Bacheca esclusi.
- **H. Ordine:** 10. Nessun GO pilot automatico derivato da questo documento.

## Registro dei parametri e definizione di completamento

Ogni task registra scope/versione, owner, baseline/release, approvazioni,
manifest migration, risultati staging, rischio residuo e rollback. Evidenze
personali rimangono private: nessun export di utenti in GitHub.

Restano da approvare: durate check-in/social/casi/log/export/backup/prove;
condizioni dating e revoca; rollout account esistenti; warning/sospensioni/ban,
ricorsi/hold/accesso alle evidenze; RPO/RTO/budget; limiti e rischio QR/discovery.
Le decisioni PHOTO-02 già approvate (grace 5 minuti, draft 24 ore, quota 128 MiB,
max 2 draft pronti, cache 60 secondi, metadata conclusi 7 giorni, review senza
purge automatico) restano invarianti, non parametri da riaprire.

Criteri per chiudere ogni futura implementazione:

1. Scope/schema/RLS/API dichiarati e decisioni pertinenti approvate.
2. Modulo identificabile, inventario legacy e compatibilità sicura; nessun refactor estraneo.
3. Test unitari/Postgres/RLS e journey staging con race/retry/failure;
   cancellazione di ogni nuova entità verificata.
4. Test/build/typecheck passati e codice versionato prima del rollout.
5. Dry-run/preflight e rollback; produzione e purge separatamente autorizzati.
6. Evidenze e limiti espliciti; GO tecnico distinto dal GO legale/operativo al pilot.

**Verifica di questo task documentale:** 235/235 test PASS; build e typecheck PASS.
Nessun nuovo test perché non cambia comportamento. Solo questo piano aggiunto:
nessun codice, migration, configurazione provider o dato modificato.
Nessuno dei task runtime avviato. Prossimo passo consigliato: PROVIDER-01 read-only
insieme alla predisposizione di LEGAL-GATE-00; primo fix applicativo AGE-01 dopo
le decisioni pertinenti, preceduto dalla baseline operativa INCIDENT-01A.
