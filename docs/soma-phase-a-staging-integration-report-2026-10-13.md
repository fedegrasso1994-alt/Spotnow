# Fase A pre-Bacheca — integrazione e collaudo, stato intermedio

13 ottobre 2026. Da checkpoint `194da83`. Branch `codex/pre-bacheca-phase-a`; main/produzione invariati. Non è implementazione Bacheca né autorizzazione rollout.

## A1 — baseline unica

Merge autorizzato di `codex/incident-01a` (include PROVIDER repository-side) sulla linea checkpoint→MODERATION→RIGHTS→AGE/CONSENT/RETENTION. Nessun conflitto; non duplicati commit AGE/RIGHTS/PROVIDER. Due parent conservati nella storia GitHub, nessun force push/main merge.

Sorgenti runtime PHOTO, tutte migration001–025 e CSS prodotto/admin identici alla baseline checkpoint. Modifiche runtime dell'integrazione sono esclusivamente quelle PROVIDER già approvate: font stessi WOFF2 self-hosted, index link locale, CSP font e release/network guard; nessun decoder o lifecycle foto modificato. Nessuna nuova migration, nessun deploy produzione/staging Edge operativo, nessuna modifica Auth. I test INCIDENT locali e runbook sono ora nello stesso branch delle feature privacy/safety.

### Test

**293/293 PASS**: baseline284 +5provider +3incident +1nuovo rehearsal integrato. Comando `node --test --test-concurrency=2 tests/*.test.js`; build/typecheck PASS, release guard font/artifact PASS. La prima suite unificata prima del nuovo test aveva292/292 PASS. Nessun test cancellato/skip o limite PHOTO ampliato.

Nuovi file test: `tests/phase-a-integration.test.js`, `tests/staging/phase-a-integrated.sql`. Quest'ultimo ricrea due identities senza password/sessioni, attesta17→18/25, accetta consenso via challenge, prepara registry foto virtuali, profili/QR/Ora/Tribe/Spot reciproco/match/chat/RIGHTS15sezioni/revoca/chat esistente/Spot negato/retention dry-run/delete prodotto. Tutto in transazione con rollback, nessuna foto Storage reale scritta.

### Staging reale — risultati e limiti

Tre rehearsal SQL eseguiti sul Postgres reale: phase-a-integrated + rights-fixtures + moderation-fixtures, tutti rollback, nessun errore finale. Copertura:

| Flusso | Evidenza nuova | Limite |
|---|---|---|
| Onboarding18+/consenso/revoca | RPC SQL server17negato/18ammesso/challenge/revoca e null preference | Non login/onboarding browser reale |
| Profilo/Ora/Tribe/Spot/match/chat | Rehearsal core SQL positivo, chat dopo revoca e nuoviSpot negati | Foto virtuali, non rendering/download live |
| Rights access/export/delete |15sezioni owner-only core+restricted/revoked/anonymous/deleted SQL | Non download export via browser/Edge delete reale |
| Moderation/report/suspend/ban | Rehearsal151casi/claims/ban/RIGHTS/delete SQL; suite completa suspend/expiry/reversal/hold | MFA JWT simulato nel SQL, non nuovo enrollment Auth reale |
| Retention | Dry-run/paused e rollback SQL + suite idempotence/holds/race | Scheduler globali OFF; nessun purge globale |
| PHOTO lifecycle | Suite PHOTO invariata PASS, publication registry nel SQL | Nessun nuovo uploadJPEG/PNG/WebP/Storage con Auth reale in questo task |
| Auth | API settings200, Confirm email ON; unsigned moderation/new+legacy401 | **Smoke signup/login/MFA normale pending**: casella controllata/conferma fixture ancora da organizzare |
| Font | Integrità/font/CSP/release e testprovider PASS | Trace browser dopo login reale integrato pending |

I rehearsal SQL non bypassano Auth per far passare lo smoke normale: sono un livello distinto, dichiarato. I precedenti smoke Auth/Edge dei singoli blocchi restano evidenze storiche, non sostituti della nuova checklist completa richiesta.

### Integrità finale

Rehearsal ripristina baseline:3account/3profili/39oggetti, PHOTO PAUSED/retentionpaused, fixture SQL0/roles0/reports0/objectsfixture0. Nessuna nuova fixture Auth permanente, password/token generati0, nessun contenuto reale usato. Scheduler/cleanup baselineOFF mantenuti; Confirm email ON riscontrato API, non modificato.

Baseline storica non significa ambiente vuoto:3reviewwriter e6oggetti precedenti fuori proiezioni ledger/validated preservati, mai purge pertimeout. Nuove fixture sono isolate da prefixff300/ff310/ff320, senza riusare proprietari vecchi. Nessun cleanup storico autorizzato implicitamente.

## A2 — diagnostiche

Audit completo nel [piano ritiro](soma-phase-a-edge-retirement-plan-2026-10-13.md). Tutte3 classificate **RETIRE**: photo01-preflight, photo01-bounded-bench, photo01-verification. Fonte: Code e Settings live, backup tecnici privati/hash, nessuna invocazione.

Le prime2 hanno filtro Auth+metadata.synthetic, non service-only, e codice laboratorio/percorsi baseline precedenti ai decoder attuali. La terza è service-only tramite credential/provider-RPC, ma non più necessaria. Nessuna funzione operativa dipende da queste3; generatore storico verification deve essere considerato ritirato insieme alla sonda, non un deploy da rieseguire automaticamente.

**Ritiro non ancora eseguito**: attende conferma action-time per cancellazione permanente delle sole3funzioni staging. Nessun toggle/sorgente/deploy modificato. Non chiamare le sonde per stressareworker o leggere dati; ne è già verificata la logica necessaria per classificazione.

## A3 — contratto Bacheca

Creato [contratto tecnico candidato](soma-bacheca-technical-contract-candidate-2026-10-13.md), da approvare prima coding: audience/18+/membership, anonimato peer, author mapping privato, reactions aggregate, post24h, purge distinto, reportsubject/hold/evidence, access/export/delete, locks/rate/retry, capability staff e test.

Restano proposte esplicite per founder: accesso dopo revoca dating,500caratteri,3postattivi/10postgiorno, reaction semplice, purge candidato24h dopo expiry, ban/reversal visibility. Nessuna scelta giuridica, nessuna migration o modulo Bacheca implementati.

## Gate e stato

- GO baseline sorgente integrata e suite unificata.
- PASS smoke SQL reale con rollback.
- PENDING smoke Auth/MFA/browser/upload/Edge/Storage reali dell'ambiente integrato, preservando Confirm email ON: serve casella/fixture normale controllata, non nuove chiavi admin o disattivazione globale.
- PENDING conferma ritiro3sonde e verifica10→7/missing endpoint/invarianti.
- PENDING approvazione contratto tecnico Bacheca.

**Fase A non ancora chiusa; NO-GO al coding Bacheca finché i gate pending non sono soddisfatti.** Si evita una falsa chiusura basata sui soli test locali o su smoke storici. Richieste di informazioni/conferma già presentate al founder; il prompt ricevuto termina dopo la classificazione “B. KEEP BUT ISOLATE”, eventuali requisiti successivi restano da acquisire.

Nessuna produzione/main/Auth/billing o nuova integrazione provider. Report/test/design e merge sono versionati sul branchdedicato; integrazioneGitHub iniziale `1870cc4`, SHA finale verificabile nella storia/risposta. Nessun lavoro di coding Bacheca iniziato.
