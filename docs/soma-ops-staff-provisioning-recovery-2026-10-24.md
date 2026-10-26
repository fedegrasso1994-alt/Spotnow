# Staging staff — provisioning, revoca e recovery

> Stato corrente26ottobre: provisioning live staging completato.
> [Report finale](soma-final-staging-staff-provisioning-2026-10-25.md): entrambi i
> ruoli attivi, canary revoke/regrant/logout e nuovo login/MFA PASS. Le indicazioni
> sotto di stato BLOCKED/ruoli assenti descrivono checkpoint storici, non lo stato
> attuale. Recovery corrente usa055 e il processo owner autorizzato documentato.


> Aggiornamento 25 ottobre: migration055 staging applicata. Il contratto corrente
> di sessione/revoca è [staff session hardening](soma-staff-session-revocation-2026-10-25.md).
> Le sezioni sotto che descrivono il limite dei vecchi JWT sono evidenza storica
> pre-055, non la policy corrente. Nessun ruolo reale ancora assegnato.
> Dopo ogni primo grant/regrant: nuovo login dopo il grant + MFA; il vecchio
> AAL2 pre-grant non basta. Non attendere un TTL come alternativa al nuovo guard.

Perimetro: solo `zjinjtkekmaqtxsuyvho`, schema attuale025/051/052/053. Questo è un processo operativo, non una nuova API o una delega cloud. Nessuna procedura di questo documento è stata eseguita su account reali. Stato: **provisioning e recovery umano live BLOCKED**, test SQL locali PASS nel report Phase A.

## Ruoli effettivi

`spot_private.moderation_roles` è privata/RLS. `spot_private.moderation_role()` verifica a ogni chiamata: ruolo attivo, Auth user esistente/non-anonimo/non-banned, fattore MFA verified e claim provider `aal2`. Il browser non può attribuirsi ruolo o AAL2. `moderation_role_set` richiede ADMIN, non permette di cambiare il proprio ruolo, usa lock e operation_id/idempotenza e scrive `moderation_role_events`.

| Capacità | ADMIN | MODERATOR |
|---|---|---|
| `admin_analytics_dashboard`, `ops_health`, `ops_recent` | Sì con MFA | No |
| Code/review/casi moderation autorizzati | Sì | Sì con MFA e limiti del caso |
| Assegnazione/revoca ruolo | Sì, su altra identità | No |
| `moderation_action`: ban/release/reopen | Sì | No |
| Warn/suspend/claim/review/hold | Secondo caso/revisione/claim | Secondo caso/revisione/claim |
| Dati grezzi DB, cloud consoles, service-role | Non concessi dal ruolo app | Non concessi dal ruolo app |

ADMIN non è un ruolo analytics-only. Non grantarlo a un semplice analista. Le identità staff attive sono escluse dalle ordinarie capacità prodotto dai gate esistenti025; non trasformare profili personali in staff. Il ruolo non richiede profilo, foto, Tribe, consenso dating o bypass dell'onboarding prodotto.

## Passi manuali minimi per sbloccare il provisioning

1. Federico designa due **nuove** identità dedicate staging e i rispettivi titolari/custodi MFA. Usare caselle controllate per conferma/recovery; indirizzi e credenziali non vanno inseriti in Git. Un account per persona, nessuna credenziale condivisa. Se il sostituto non è ancora individuato, non fingere che un account sintetico senza custode costituisca copertura operativa.
2. Titolare esegue signup e conferma email nel normale Auth staging. `Confirm email` resta ON; nessun global toggle, account di amici o utente esistente promosso. Per il pannello staff attuale serve login **email/password**: un account solo Google/passwordless non è automaticamente pronto. Il titolare deve impostare la propria password tramite il normale percorso Auth autorizzato, senza passarla in chat.
3. Enrollment MFA del titolare tramite client Supabase autenticato nel contesto staging: `auth.mfa.enroll({factorType:'totp',friendlyName:...})`, scansione QR privata, quindi `auth.mfa.challengeAndVerify({factorId,code})` e `auth.mfa.getAuthenticatorAssuranceLevel()` → aal2. Password, QR/TOTP seed, codici e recovery material restano al titolare. **Il pannello attuale effettua challenge su fattore già enrolled ma NON offre enrollment/reset-password**: non indicarlo come schermata da cui si può completare questo passo. Serve il setup Auth personale tramite strumento locale fidato/autorizzato o una successiva piccola superficie operativa di enrollment da approvare; nessun fattore viene fabbricato in SQL.
4. Comunicare solo i due UUID, ruoli, titolari e conferma enrollment. Operatore cloud autorizzato verifica nel solo staging: nuove identità nominate, email confermata, non anonymous/banned, MFA verified, nessun profilo/dato prodotto, nessun grant pregresso. Il controllo tecnico non sostituisce la verifica del custode. Se qualunque dato non torna: STOP.
5. Primo ADMIN: con zero ADMIN, RPC non può auto-bootstrapparsi. Owner sano approva e rivede una transazione nominativa sulle sole tabelle025, bloccata con `pg_advisory_xact_lock(hashtextextended('moderation-roles',25))`. Verifiche: staging/ref espliciti, UUID nominato, fattore verified, nessun ADMIN attivo concorrente, opid unico e identità dei titolari comprovata. Inserire `moderation_roles` e `moderation_role_events` atomicamente. Nessun SQL eseguibile con UUID precompilati viene fornito o lanciato prima della nomina. Il caso operativo privato collega opid, owner cloud reale, approvazione, target, before/after e ora; il row actor dell'app da solo non autentica chi usa la console.
6. ADMIN con autentico AAL2 esegue `moderation_role_set(target_user: MODERATOR_UUID, new_role:'MODERATOR', operation_id: UUID_UNICO)` mediante client autenticato. Stesso opid per retry identico. Nessuna service key nel browser. Verificare evento, ruolo e isolamento Analytics/health. Un MODERATOR non si promuove né assegna altri ruoli.
7. Live gate da fare dopo provisioning: ADMIN AAL1 negato → challenge reale → dashboard/health ammessi; MODERATOR AAL1 negato → challenge reale → coda ammessa e dashboard/health negati; revoca da ADMIN sano → RPC diretta della sessione precedente negata → logout/relogin ancora negato. Regrant intenzionale solo dopo controllo sessioni/recovery sotto. Non pubblicare screenshot di MFA o dati della coda.

**Aggiornamento24ottobre, successivo a528360d:** founder ha nominato due nuove identità staging e ha assunto la custodia MFA di entrambe. Preflight read-only: due account confermati, non anonimi/banned, senza profili, ruoli o fattori. UUID/config restano nel file locale ignorato. [Setup locale dedicato](../tools/staff-mfa/README.md) preparato per enrollment/challenge umani, senza grant o nuovo deploy. **STOP attuale:** enrollment e nuovo login MFA reali ancora da eseguire dal titolare. Non leggere credenziali locali di vecchie fixture o riutilizzare i loro fattori. I passaggi AuthSDK sopra descrivono le API necessarie, non uno smoke umano già completato né un invito a incollare credenziali in DevTools/chat.

## Revoca immediata e limite JWT

Da ADMIN sano/AAL2 su altra identità:

`moderation_role_set(target_user: UUID_ESATTO, new_role:'REVOKED', operation_id: UUID_UNICO)`.

Controllare evento e diniego su `moderation_review_queue`, dashboard/health e tentativi role-set con la sessione ancora aperta. `active=false` impedisce il privilegio anche con claim aal2 precedente. Logout/relogin non ripristina il ruolo. Revocare separatamente gli accessi cloud se presenti, senza attribuirli implicitamente al ruolo Soma.

**Limite dimostrato:** lo schema verifica AAL2 e presenza di un fattore verified, non lega il token a una specifica versione di grant/fattore o a una sessione revocata. Se lo stesso UUID viene riabilitato prima della scadenza di un vecchio access JWT aal2, quel token può tornare autorizzato. La revoca dei refresh token / logout non prova l'invalidazione istantanea di ogni access JWT stateless. Non promettere il contrario, non ridurre TTL e non cambiare le API in questo task.

## Recovery senza backdoor

| Caso | Procedura autorizzata | Gate / evidenza |
|---|---|---|
| MFA perso, nessun sospetto di compromissione | ADMIN sano revoca il ruolo. Account recovery con provider/owner e verifica identità fuori chat; reset del solo fattore coinvolto tramite procedura Auth amministrativa autorizzata, sessioni revocate; enrollment/challenge di nuovo fattore dal titolare | Per ripristinare lo stesso UUID attendere che **tutti** i vecchi JWT privilegiati possano essere considerati scaduti, con TTL massimo/sessioni precedenti e clock skew verificati. Se non dimostrabile, non regrantare lo stesso UUID; usare nuova identità fidata |
| Account compromesso | Revoca ruolo immediata da identità sana; evidenza minima e verifica grant derivati. Revoca sessioni/credenziali/provider tramite owner autorizzato; precedente UUID mantiene ruolo revocato | Recupero raccomandato su nuova identità dedicata + MFA umano verificato. Nuovo grant auditato: nessun vecchio JWT del precedente UUID può usarlo. Il test locale dimostra separazione, non sostituisce recovery cloud |
| Accesso dimenticato / ruolo revocato per errore | Verifica motivo/identità con owner e registro opid. Per login/password usare canale Auth personale ufficiale | Nessun ripristino automatico perché un utente lo richiede; regrant da ADMIN/AAL2 con opid nuovo e cautela JWT sopra. Se revoca intenzionale resta negato |
| Nessun ADMIN sano / primo ADMIN | Owner cloud nominativo verificato, verifica identità e intervento controllato sulle strutture esistenti con audit esterno e opid | Nessuna email speciale, parametro frontend, fattore SQL fittizio, MFA globale OFF o secret condiviso. STOP finché owner/custode sconosciuto |

`moderation_role_set` non consente auto-revoca: usare altro ADMIN sano o owner cloud autorizzato per un unico ADMIN compromesso. Non assegnare un secondo ADMIN solo per simulare ridondanza; un MODERATOR non è recovery-admin. Nessun nuovo account/provider/recovery endpoint viene introdotto. Gli interventi provider reali e il test umano lost-device restano **NON ESEGUITI**.

## Prove disponibili e limiti

Test PostgreSQL embedded, schema attuale: grant/retry/audit, AAL1 negato, fattore mancante/unverified negato, ruoli separati, revoca ADMIN e MODERATOR con claim precedenti, nuovo contesto login simulato, impossibilità di regrant dal revocato e recovery su diverso principal. Il test espone anche la riautorizzazione dello stesso UUID se si regranta mentre un vecchio JWT sarebbe ancora valido.

Le chiamate sono RPC SQL reali con claims/fattori sintetici **locali**. Non sono nuovi login Auth cloud, firme/JWT provider, MFA TOTP fisico, revoca sessioni provider o recupero dispositivo reale. Nessun account cloud creato o preservato da questo task; zero grant staging effettuati.
