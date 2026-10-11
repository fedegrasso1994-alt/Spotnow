# RIGHTS-01 — contratto tecnico e coverage access/export

11 ottobre 2026. Branch staging, nessun rollout né modifica main. Decisione founder aggiornata: non è richiesto zero metadata istantaneo. Dati prodotto ordinari eliminati; safety evidence solo sotto hold esplicito; receipts necessarie per integrità/idempotenza/anti-replay/lifecycle consentite temporaneamente, minimali, senza contenuti utente, senza uso discovery/analytics/personalizzazione. Questa è una decisione tecnica founder, non validazione legale.

## Technical receipts PHOTO-02 dopo successo delete

Fonte: bootstrap `supabase/cutover/prepare.sql`, migrations017–019, normale `finish_photo_account_cleanup`, smoke autenticato del report RIGHTS. Cinque tipi osservati, una riga per tipo per fixture nel precedente smoke. Nessuna nuova raccolta. Tabelle private con RLS e revoke authenticated/anon; non restituite da discovery né da `my_rights_page` dopo delete. Non sono anonime: UUID e chiavi sono correlabili con conoscenze esterne.

| Tabella | Campi esatti nello schema attuale | Scopo / contenuto residuo |
| --- | --- | --- |
| photo_lifecycle_sets | photo_path, user_id, request_id, lease_token, state, writer, reserved_bytes, created_at, not_before, completed_at, claim_token, claim_until, retries, error_code, evidence, manifest, last_attempt_at, review_reason, review_since, review_operator, review_evidence, review_quota_exempt, reconcile_attempts | Tombstone purged/settled, UUID/path casuali, fencing, stato tentativi e prova conclusione. Dopo account cleanup manifest=NULL, reserved_bytes=0, claim_token/claim_until=NULL. Non contiene preview, pixel, nome, età, profilo, preferenza, venue o chat. Eventuali error/review/evidence sono diagnostica operatore; nessun contenuto utente autorizzato |
| photo_cleanup_accounts | user_id, state, created_at, completed_at, error_code, claim_token, claim_until, retries | Esito delete completato e retry sicuro; error e claim azzerati al successo |
| photo_cutover_attempts | path, user_id, lease, protocol, writer, manifest, evidence, created_at, completed_at | Fence contro writer legacy/tardivi e prova settled. Manifest tecnico se presente: path/bytes/SHA-256 di oggetti, non bytes foto. Hash può consentire verifica di una copia già nota, non ricostruzione immagine; non è anonimizzazione |
| photo_cutover_deletions | user_id, completed, created_at | Barriera deletion/retry e prova assenza writer pendenti |
| photo_cutover_audit | id, action, owner_id, path, previous_path, operator_id, evidence_ref, epoch, created_at | Eventi tecnici PUBLISH/RESOLVE/cutover. Identificatori operatore e riferimento evidenza, non contenuti prodotto; chiavi precedenti identificano operazioni foto, non contenuto né luogo |

Altre ricevute possibili, non osservate per le due fixture: `photo_review_audit(operation_id,path,lease,action,payload,actor,created_at)` con payload parametri tecnici review (non snapshot foto/profilo); `photo_lifecycle_anomalies(path,code,first_seen,resolved_at)`. Conclusi seguono purge7giorni; unresolved review non è un delete completato e richiede riconciliazione esplicita, non timeout. Test e log non dichiarano successo delete se oggetti/writer incerti restano. Gli operatori devono usare reason/evidence_ref opachi e non incollare dati prodotto nelle colonne testuali; questa regola non sostituisce una validazione strutturale di ogni nota futura.

Foto canonical/detail/thumb, preview nei registry/assets, jobs e copie DB prodotto vengono rimossi dal normale cleanup. Zero quota attiva dopo successo. Non rimangono nome/email/età/occupation/genere/preferenza/location/testo/foto nei cinque tipi osservati. Le receipts consentono collegare un UUID cancellato a operazioni tecniche e orari, **non ricostruire sostanzialmente il profilo** da sole. Non promettere irreversibilità del collegamento o erase fisico provider.

### Retention e verifica

`photo_metadata_purge()`019 chiama wrapper018 poi purge017. Ordine: audit cutover eleggibile → deletions completate → attempts settled → review audit conclusi → lifecycle purged e cleanup completed. Condizione stretta `< clock_timestamp()-7 days`: soglia di eleggibilità, cancellazione al successivo ciclo riuscito, non timer esatto al secondo. Foto corrente, Auth vivo dove richiesto e writer unknown impediscono il purge protetto; policy coerente con integrità, non autorizzazione a retention indefinita dopo successo.

019 audit path usa il set purged o attempt concluso prima che sia cancellato;017 elimina tombstone/completed receipts. Anomalie risolte vengono cancellate da `scan_photo_lifecycle()` dopo7giorni. Collector autenticato chiama scan e metadata purge solo con execute permit; scheduler PHOTO operativo esistente invoca il collector. Staging resta PAUSED e non promette purge wall-clock mentre OFF. In caso di pausa/outage il purge riparte al successivo ciclo; governare ritardo tramite osservabilità/INCIDENT. Nessuna modifica scheduler in questo task.

Test nuovo sullo **stesso SQL001–024**: normale delete sintetico crea i cinque tipi, nessun campo prodotto, manifest/claim/quota azzerati; con timestamp sintetici a7giorni meno1minuto le cinque righe restano, a7giorni più1minuto spariscono tutte; secondo purge idempotente; foto/profilo B preservati. Altri test PHOTO proteggono current/unknown e purge Storage. Non si è atteso7giorni reali né alterato staging/produzione: prova deterministica del job SQL, integrata con precedente delete Auth/Storage cloud.

## Coverage contro data inventory completo

Fonte completa: `soma-legal01-data-map-2026-10-10.md`, integrata con020–023 staging. I=incluso automatico; E=escluso motivatamente dal JSON; V=validazione professionale/procedura manuale, non diniego di accesso. Nessuna categoria V è considerata legalmente esclusa per il solo fatto di essere privata.

| Categoria inventario | Stato / percorso / motivazione |
| --- | --- |
| Account UUID/email/stato creato | I account; delete Auth normale |
| Identità/metadati Google/provider | V dettaglio identità tramite canale manuale; non raw Auth metadata automatico |
| Sessioni/JWT/refresh/password/secret | E credenziali e bearer; V dati access/security non segreti in risposta manuale |
| Telefono | I campo account se presente; nessun SMS/provider presunto |
| Nome, età, genere, professione | I profile; nessuna DOB/KYC raccolta |
| Preferenza dating corrente | I profile propria; revoca cancella, nessuna ricostruzione storico |
| AGE stato/metodo/versione/eventi | I age/age_history; E fingerprint tecnici e nonce interni |
| CONSENT stato/versione/eventi | I consent/consent_history; E challenge/token/hash di autorizzazione |
| Originale input/EXIF/header | E nessuna copia persistente nella pipeline; buffer transitorio non archivio esportabile |
| Canonical/detail/thumb/preview | I photos metadata; V binary export completo. Download canonicale autenticato verificato da helper, non nuova feature UI. Preview/copie rappresentazioni stessa foto, non nuovi contenuti |
| Ledger/quote/jobs/hash/review/cutover | E lease/manifest/fencing dal JSON; V dati personali tecnici pertinenti al caso senza segreti/terzi; retention receipts sopra |
| Venue/QR | I venue propria in checkins/tribes/matches; E QR segreto e directory venue non dato proprio |
| Check-in e Ora | I checkins propri conservati; Ora derivato senza archivio distinto, no timestamp altri |
| Tribe | I tribes; nessun last_visit/last_checkin_at dopo022 |
| Spot inviati | I spots; incoming non ricambiati V per tutela terzi, nessun diniego generale |
| Match | I matches propri, senza dati privati partner |
| Messaggi inviati | I messages body propri |
| Messaggi ricevuti/conversazione contestuale | V tutela diritti terzi/context; non esportati automaticamente. Non significa esclusione legale categorica |
| Blocchi | I blocks effettuati; V blocchi ricevuti per safety/terzi |
| Report | I reports inviati reason/status/date; V dettagli liberi, report ricevuti, identità terzi |
| Sospensioni/moderation | I moderation stato/date; V note/ragioni/azioni/audit/ruolo moderatore e terzi |
| Safety hold/evidence023 | V accesso caso per caso; hold esplicito minimo separato; nessun discovery; durata/review legale non approvata |
| Retention policies/runs/privacy logs023 | E configurazione globale/aggregati non riferibili; V qualsiasi evento effettivamente riferibile. AGE/CONSENT audit inclusi sopra |
| Inbox supporto/privacy/safety/Gmail | V workflow manuale distinto, app delete non cancella email |
| Diagnostica client RAM | E nessun archivio server; type/time sessione effimera; V se successivamente raccolta in ticket |
| Provider Auth/Edge/CDN/Vercel/cron logs IP-UA | V minimizzazione/redazione e accesso presso provider; nessun token/log grezzo nell'export |
| Analytics/marketing/push | E assenti dal perimetro implementato; dashboard telemetry eventualmente presente V tramite PROVIDER |
| Draft QR/flag install/history/cache browser | E stato dispositivo effimero/non archivio utente server; V se copia effettiva richiesta. Logout reset non prova erase di history/cache HTTP esterna |
| Export scaricato/screenshot/copie peer | E nessun controllo remoto su copie già ricevute, non nuovo backup Soma |
| Backup/restore/copie operatori | V procedure PROVIDER/INCIDENT, retention e reapply deletion da validare; non dichiara immediate erase |
| Cupido/Bacheca/AI/rubrica/GPS/ad ID/KYC/biometria | E non implementati, nessun dato da esportare |

## Contratto operativo invariato e gate

RPC024 owner-only/staging-only,15sezioni, pagination100, export10k record/8MiB fail explicito; non snapshot transazionale. Sessione owner verificata per pagina, nessun export di altro UID, restricted/revoked consentiti, delete nega accesso. Contenuti ricevuti/protetti e provider/binary non coperti dalla UI automatica sono marcati V, non ignorati. Gate legale pre-pilot deve definire canale completo, verifiche identità, redazioni, termini e motivazioni con professionista. Nessuna Privacy Policy/Terms finale prodotta.

GO tecnico alla chiusura del perimetro RIGHTS-01 implementato e inventariato se suite completa passa; **non** GO conformità legale, pilot, o rollout. Nuova decisione risolve il precedente blocker receipts; PHOTO-02 invariata. Nessuna autorizzazione implicita ad attivare024 in produzione.
