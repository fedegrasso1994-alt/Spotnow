# Fase A pre-Bacheca — chiusura smoke autenticato

13 ottobre 2026. Branch `codex/pre-bacheca-phase-a`, baseline precedente `6d3d1b7`. Solo staging `zjinjtkekmaqtxsuyvho`, nessun deploy/migration/merge main/produzione. Nessun coding Bacheca, nessuna modifica PHOTO-01/02 o nuovo provider.

## Autorizzazione e isolamento

Confirm email OFF confermato dall'API prima di signup. Toggle cambiato esclusivamente dal founder; non modificato dall'agente. Cinque fixture sintetiche temporanee: due utenti e tre staff per MFA/claims/RBAC. Auth normale signup/password, nessuna service-role/admin key. Password, JWT e TOTP generati localmente in contesto privato mode600; nessun valore riportato qui o versionato. Canary server limitato ai cinque UID tracciati; nessuna admission globale, execute/scheduler OFF. Venue sintetica, nessun QR/foto/contenuto reale usato.

## Smoke reale: risultati

| Area | Prova | Esito |
|---|---|---|
| Auth | Signup/login normali per tutte e cinque le fixture; nuovi login per letture successive | PASS |
| AGE | Stato mancante e dichiarazione assente non consentono check-in; età mancante invalida; 17 restricted; 18 eligible | PASS |
| Consent | Challenge/accept; revoca idempotente anche con nuova operation; preferenza cancellata, discovery/new Spot negati; chat e RIGHTS preservati; nuovo consenso esplicito ripristina uso dating | PASS |
| Profilo/foto | Profili dopo AGE/consenso, upload JPEG sintetici reali, download canonical/thumb/detail con JWT normale | PASS |
| Ora/Tribe/QR | Peer attivo in Ora, membership; peer sintetico scaduto escluso da Ora ma presente in Tribe con tre varianti scaricabili; nuovo QR ripristina Ora | PASS |
| LOC | Chiavi legacy checked_in_at/expires_at restano null, nessun timestamp preciso peer | PASS |
| Spot/match/chat | Interesse reciproco, match, messaggi A/B, nonce replay, lettura dopo nuovo login, chat dopo revoca | PASS |
| RIGHTS | 15 sezioni owner-only A/B, esclusione email/occupazione peer/token/security fields; JSON Blob realmente scaricato e riletto, foto propria scaricabile; repeat uguale; target_user peer negato | PASS |
| Restricted RIGHTS | Account sospeso/banned mantiene proprie pagine account/profile/moderation; note staff escluse; delete banned consentito | PASS |
| PHOTO lifecycle | File invalido rifiutato, foto corrente immutata; valid retry; nuovo draft non sostituisce la corrente finché pubblicato; vecchia foto ancora leggibile durante grace; delete rimuove tutte le varianti | PASS |
| Moderation | MFA TOTP reale su tre staff, USER/aal1 negati; 152 report keyset, minimizzazione; due claims concorrenti un vincitore e replay; warn/suspend/ban e revoca ruolo su JWT esistente | PASS |
| MFA browser | Login/password e TOTP tramite pannello staging locale: “Ruolo e MFA verificati dal server”; logout | PASS |
| MFA removal | Unenroll reale invalida precedente sessione aal2; RIGHTS preservato | PASS |
| Delete/cascade | Banned B delete, report/restrizione correlata e release ADMIN senza report; tutti gli altri account eliminati tramite Edge normale | PASS |
| Dopo delete | Per tutti i cinque JWT: Auth403, RIGHTS403, delete retry401; nessun account riutilizzabile | PASS |

Sono prove API/SDK con JWT/Auth/Storage reali, più login/MFA nel browser; non si spaccia questo smoke per un collaudo completo su dispositivi fisici. Export JSON via Blob normale del modulo RIGHTS, non un file persistente sul server. JPEG è il formato di upload live di questo smoke; JPEG/PNG/WebP e pathological/failure rimangono coperti dalla suite PHOTO già approvata, non dichiarati come nuovi upload PNG/WebP in questa fase.

Il runner è stato ampliato con age-smoke, phase-core, tribe-plan/tribe-smoke, post-delete e recovery phase-consent-finish. Corrette aspettative iniziali del runner sul contratto esistente: dichiarazione assente restituisce stato non eligible, chiavi LOC legacy null anziché assenti, revoca discovery produce diniego42501, Auth di utente eliminato403 anziché401. Nessuna modifica runtime necessaria. Queste interruzioni del test sono documentate; ogni controllo corretto è stato verificato prima del GO.

## Cleanup e invarianti finali

Normale delete di tutte le cinque fixture. Solo dopo verifica Auth/profile/Storage/jobs assenti e writer settled/purged, rimosse le receipts tecniche delle sole fixture disposable e la venue sintetica, con guard staging/fence/hold e transazione. Nessun purge del patrimonio storico o modifica alla retention PHOTO-02. Canary svuotato e phase PAUSED.

Conteggi finali fixture **0**: Auth users/sessions/MFA factors; profili; eligibility/age events; consent state/events/challenges; check-in/Tribe; Spot/interests/match/messages/blocks; validated_photos/photo_assets/photo_legacy/photo_upload_accounts; Storage; ledger/quota/jobs; moderation roles/role events/reports. Nessun export persistente. Password/JWT/TOTP e piani SQL privati temporanei rimossi, logout browser, preview arrestata e schede agent chiuse. Logs provider Auth/Edge possono conservare metadata delle chiamate secondo la relativa policy; non si dichiara la cancellazione dei log infrastrutturali.

Baseline preservata: **3 account, 3 profili/foto correnti, 39 oggetti Storage, zero current missing**. Tre review storici preservati, zero unknown inattesi. Le sei copie storiche fuori dalle proiezioni già documentate non sono trattate automaticamente come orphan né cancellate. Zero nuovi oggetti/residui di questa prova.

PHOTO **PAUSED**, cleanup **OFF**, scheduler **OFF**, canary_users **0**, retention **paused**, cron attivi **0**. Confirm email **OFF all'ultimo controllo**: **il founder può ora riattivarlo manualmente**; non è stato riattivato dall'agente.

## Test e contratto

Suite completa: **293/293 PASS**, fail/skip0; `node --test --test-concurrency=2 tests/*.test.js` (34,1s). Build e typecheck PASS. Release guard36asset/font9 PASS, nessun font remoto nel bundle. Questa prova non aggiunge claim di trace rete esaustivo prima/dopo login. Il log aggregato smoke registra37 PASS (separati dai293 test automatici; include signup/login e verifiche HTTP, non presentato come37 casi unitari distinti).

Il contratto Bacheca recepisce tutte le decisioni founder: revoca dating separata, 280 caratteri/testo soltanto, 3 post/giorno/utente/Tribe, ❤️ 👀 😂 🔥 una attiva modificabile/rimuovibile aggregata, 24h pubbliche/purge al primo ciclo con report/hold, nessuna riapparizione automatica dopo sospensione. **FOUNDER-APPROVED TECHNICAL BASELINE — LEGAL VALIDATION PENDING**. Nessuna decisione founder sostanziale residua; diritti/UGC/anonimato/retention/evidence restano da validare professionalmente prima del pilot.

**Fase A: DONE tecnico. GO al coding Bacheca MVP nello staging sulla baseline integrata.** Non GO al pilot, rollout produzione o validazione legale. Ripristinare Confirm email ON manualmente per l'ambiente ordinario; eventuali future fixture richiedono nuovamente un flusso Auth autorizzato.

Evidenze private aggregate: `.local/phase-a/auth-mfa.png`, `.local/phase-a/auth-cleanup.png`; nessun secret nel report/repository. Main resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287` e produzione invariata.
