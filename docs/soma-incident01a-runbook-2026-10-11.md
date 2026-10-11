# INCIDENT-01A — runbook operativo candidato

Scope: 15 scenari nell'inventario, tabletop e test locali/sintetici. Nessuna modifica runtime/produzione né test distruttivo provider. Decisioni operative sono proposte, non reperibilità/SLA o approvazione legale. Bacheca/Cupido esclusi.

## Ruoli e contatti

Federico Grasso: referente founder, propone owner incident e autorizza azioni conseguenti; assegnazione tecnica formale/canale recovery ancora da completare. 1 sostituto previsto: nome, reperibilità, formazione e accessi **DA COMPLETARE**. Non concedere automaticamente Supabase/GitHub/Vercel/service role al moderatore. Account personali, MFA/recovery e least privilege; nessun account condiviso.

Recapito pubblico `somadatingapp@gmail.com`, per support/privacy/safety/ricorso, non SMTP runtime. Non è l'unico canale valido se proprio Gmail/account Google è compromesso: definire recapito alternativo privato pre-pilot, senza acquistare nuovo provider. Nessuna email inviata/lettura personale. Tecnico recovery/professionista privacy e contatti vendor di piano in uso: assegnare/verificare in registro privato, nessun support SLA inventato.

## Processo dalla rilevazione alla chiusura

1. **Intake:** ID incidente, detection UTC e fonte. Distinguere prima segnalazione, conferma ragionevole e awareness del breach; registrare correzioni/timeline senza riscrivere storia. Non pubblicare identità/contenuti nei GitHub issue.
2. **Triage:** dati/sistemi plausibili, C/I/A, esposizione attiva?, utenti/record stimati e confidence. P0 attivo → contenimento immediato da persona autorizzata; non aspettare logs completi. Se nessuno reperibile, escalation alternativa e ritardo registrato: gap reale, non promessa24/7. Candidate target interni: acknowledgement P0 entro15min e assessment entro1h **durante copertura definita**, ancora non approvati/garantiti.
3. **Contain:** scegliere server boundary coerente con incidente, fermare scritture/purge che aggravano danno; salvare evidenza minima se compatibile con urgenza. Photo pause non blocca dati social. Dashboard front-end o QR non bastano se API/cached client restano accessibili.
4. **Evidence:** UTC/request-ID/component/error/status/commit/policy/action e count; identità/path solo in registro privato ristretto quando necessari. No valori Art9/chat/foto/token/OTP/signedURL/query/DBdump nei logs ordinari. Evidenza eccezionale minima, cifrata, accessi auditabili, hold motivato/review e durata professionale; non una copia indefinita fuori retention.
5. **Scope/eradication:** actor/key/privilege e accessi aggiunti, dati esfiltrabili vs effettivamente provati, intervalli e copie/log/cache. Da macchina/account sano revocare compromessi e correggere a task mirato; test cross-user/gates. Non fidarsi di strumenti/pipeline compromessi per attestare la loro sicurezza.
6. **Assess breach:** referente + professionista documentano rischio/obblighi, inclusa perdita/disponibilità senza esfiltrazione. Non trattare72h come tempo per aspettare; awareness distinta da chiusura indagine. Per autorità: valutare notifica entro72h dalla conoscenza salvo rischio improbabile; rischio elevato può richiedere comunicazione senza ingiustificato ritardo agli interessati. Informazioni incomplete possono essere integrate; decisione/non-notifica motivata comunque registrata. Nessuna notifica automatica né termini legali scelti dal software. [EDPB](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en).
7. **Recovery:** seguire runbook DB/Storage separati; safe state, schema/release point, deletion/revoca/ban successivi, crypto/hash/integrità, zero side effects non autorizzati. Un restore successo tecnicamente non autorizza da solo riapertura.
8. **Reopen:** owner tecnico + founder con evidenza gate; professionista segue misure/comunicazioni. PHOTO: nuovo epoch/canary → prove reali → admission → cleanup → scheduler ultimo. Discovery/chat se coinvolti richiedono i propri test/gate, non ereditano GO foto.
9. **Close:** causa confermata o limiti investigazione, impatto residuo, misure, recovery effettivo, comunicazioni decise, retry/account rights, follow-up owner/date, scadenza evidenze. Non dichiarare zero perdita o no breach senza prova.

## Contenimento tecnico: ciò che esiste

Le chiamate seguenti sono **riferimenti per operatore autorizzato, NON eseguite qui sul cloud**. Usare interfacce service-only protette, operatore sano e incident evidence ID. Non copiare raw secret, non eseguire runner produzione con modalità predefinite sperando siano read-only.

- `photo_cutover_set('pause', operator_id, evidence_ref)`: nuovo epoch, phase PAUSED, execute/scheduler OFF e stop cron foto esistente. Blocca upload/replace e anche avvio delete-account foto: effetto sui diritti da registrare, retry minimo/manuale da owner, non cancellazione silenziosa. Non spegne discovery/chat, non annulla richieste Storage già in volo e non cancella current/review.
- `photo_cutover_set('execute_off', ...)`: ferma collector/scheduler foto conservando fase/admission corrente. Operazioni già claimmate/in volo vanno riconciliate; non assumere drain dal solo flag.
- `photo_cutover_status()` + inventory/review/queue/private reference checks: confermare effetto gate/cron, writer/job già partiti, zero perdita current. Unknown/review preservati, niente purge per timeout. Rileggere stato dopo ogni azione; se API offline non confermare contenimento raggiunto.
- `photo_cutover_scheduler_configure(project_ref,false)`: richiede ruolo/claim/header auth coerenti con progetto e secret corrente; spegne execute oltre scheduler. Rotazione credenziali ha dipendenze Edge/Vault/cron: verificare ciascuno prima di riattivare. Non usare chiavi publishable come secret. Non effettuare rotazioni account in questo task. [Tipi e privilegi chiavi](https://supabase.com/docs/guides/getting-started/api-keys).
- `privacy_retention_config(..., paused:=true)` e cron privacy OFF: **solo staging 023**, non RPC disponibile prod. Rileggere status e operation eligibility; pause non annulla purge già commit. Non applicare020–023 per gestire incidente in produzione senza rollout separato.
- Accesso compromesso: revoke membro/role/session/PAT/deploy key/integration/OAuth scope pertinenti con owner sano; enum delle sessioni/ruoli e audit di persistenza. Pubblicare frontend innocuo non risolve backend/service-role compromesso. Nessun kill switch generale è implementato da questo documento.

## Outage e retry

Diagnosticare prima endpoint/ref/config, DNS, TLS, Auth/API/Storage, status vendor e secondo ambiente indipendente. ENOTFOUND locale non prova outage globale. Sonde read-only minimali senza dati personali/query/token nei report. Evitare retry indefiniti, ricarica ripetuta di upload, account duplicati o ignore del request-ID. Foto: retry con contratto idempotente esistente, riconciliare unknown, preservare current. Email/Auth: no login bypass e no fallback SMTP default pilot. Vercel down può lasciare client/cache e API attive; non equiparare sito irraggiungibile a sicurezza dei dati.

## Recovery e rollback

Riferimento: `soma-provider01-backup-restore-runbook-2026-10-11.md`. RPO/RTO candidati24h/4h o configurazione più stretta ancora da founder/costi/test, non metriche ottenute nei drill di2s. Backup bytes Storage separato; mai recuperare originali eliminati, copie canonicali solo necessarie, manifest/hash/versione consistenti.

Ripristino offline/quarantena: snapshot può riportare gate OPEN e dati cancellati/revocati; pause **prima dell'accesso**, job/Vault/network isolati prima di restore provider. Clone fisico Supabase può avviare cron/net appena completato: preferire restore logico isolato e verificato; stop se isolamento non dimostrato. Non importare produzione nel normale staging. [Avvertenza provider](https://supabase.com/docs/guides/platform/clone-project).

Nessun rollback distruttivo schema, nessun writer PHOTO-01 post017, nessun ritorno a vulnerabilità SEC/LOC o a release pre-AGE/CONSENT dopo futuro rollout. Se ultima build sicura non è compatibile, mantenere servizio/percorso in pausa e forward-fix autorizzato. Eseguire upload/replace/delete canary e core (Profilo/Ora/Tribe/Spot/match/chat), quota/inventory, authenticated scheduler e TTL prima della riapertura pertinente. Copie client già ricevute non cancellabili retroattivamente.

## Comunicazione e registro privato

Messaggio operativo candidato: servizio/percorso interessato, inizio e stato corrente, istruzioni utili senza leak, prossimo aggiornamento con owner. Non dire “tutto sicuro” o “dati non coinvolti” prima di verifica. Notifica breach ≠ aggiornamento outage. Nessun invio al Garante/provider/utenti autorizzato in questo task; la comunicazione reale richiede istruzione esplicita e revisione pertinente.

[Procedura italiana Garante](https://garanteprivacy.it/data-breach): verificare modulo/canale e rappresentanza col professionista prima del pilot. Nel registro privato conservare versioni valutazione, motivazione (anche non notificato), approvazioni/invio/acknowledgement e aggiornamenti. Non assumere autorevole una deadline interna; mantenere clock awareness per scadenze applicabili.

Template registro in `soma-incident01a-register-template-2026-10-11.md`: **schema vuoto**, non registro di un incidente reale. Repo pubblico ospita solo procedure/evidenze aggregate sintetiche. Durata registro/evidenze e safety hold da validare, distinta da7/30giorni dei log tecnici.

## Gate pre-pilot ancora aperti

1. Owner/sostituto incidenti nominativi, reperibilità/canale alternativo e tabletop umano con handoff.
2. MFA/recovery/least privilege verificati per cloud/GitHub/Google/support, safe workstation e revoca/rotazione provata con credenziali sintetiche in ambiente separato.
3. Alert/contact delivery verso owner e backup, log TTL/accesso e scope investigazione verificati; non introdurre provider nuovo tacitamente.
4. Backup DB e Storage attivi con expiry, restore cloud sintetico e RPO/RTO misurati; deletion/revoca replay e isolamento cron/Vault provati.
5. Contenimento server del core social e utenti cached, rollback compatibile e ripristino esercitati; PHOTO pause parziale già provata localmente.
6. AGE/CONSENT/RETENTION preflight/rollout separato, policy professionale e purge pause/hold/runbook effettivamente operativi.
7. Professionista nominato, canale notifica/criteri/ruoli/retention registro e provider breach commitments validati.

**GO per preparazione INCIDENT-01A e prossimo collaudo staging mirato; NO-GO per dichiarare risposta operativa/pilot pronta.** Nessun test locale sostituisce restore provider, tick cron live, recapito umano o accessi reali. Lo stato DONE di PHOTO-01/02 non viene riaperto.
