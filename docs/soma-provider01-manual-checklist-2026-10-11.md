# PROVIDER-01 — checklist esterna di chiusura

11 ottobre 2026. Owner: Federico Grasso; supporto tecnico e professionista privacy da assegnare nominalmente. Questa checklist non autorizza modifiche, acquisti, nuove integrazioni o export di produzione. Evidenze di account/contratti in registro privato con accesso ristretto, non nel repository pubblico. Mai password, recovery code, bearer, cookie, SMTP password, client secret o URL signed. Screenshot redatti; metadati/contatori sufficienti quando possibile.

Legenda: **VERIFIED** riscontro disponibile, **PARTIAL** parte confermata, **OPEN — MANUAL CHECK** restante da verificare. Stato verificato non equivale a valutazione legale positiva. Durate provider registrate separatamente da design7/30giorni dell'app.

## Verifiche già disponibili

| Check | Stato | Evidenza / limite |
|---|---|---|
| DB produzione / regione | VERIFIED | Console11ottobre: Irlanda eu-west-1, piano Free |
| Backup di progetto nel piano | VERIFIED: assenti | Console: Free non include project backups; non prova assenza di ogni backup esterno |
| Servizio SMTP | VERIFIED: default | Custom SMTP OFF; nessun fornitore custom selezionato |
| Auth provider | VERIFIED | Google/Email ON; Phone/altri mostrati OFF; anonymous/linking ON, conferma email ON |
| CAPTCHA / Auth hooks | VERIFIED | CAPTCHA OFF; Hooks pagina vuota; webhook DB/integrations diversi ancora OPEN |
| Storage limiti / INSERT | VERIFIED parziale | Bucket profile-photos, UI8MB, tre MIME; photos_insert_own WITH CHECK false, nessun write fatto |
| Hosting/piano/Analytics | VERIFIED parziale | Vercel Ready/Hobby, Web Analytics ancora da abilitare; team integrations non ispezionate |
| MFA Vercel | PARTIAL: avviso negativo | Console dice single-factor; setup/recovery/SSO e accessi completi da owner |
| GitHub visibilità/accesso connector | VERIFIED | Public, main; connector in uso admin/maintain/push, altri accessi OPEN |
| Sorgente/release | VERIFIED nel perimetro | Nessun SDK advertising/analytics/push; no secret pattern; build locale senza source map |
| Test baseline main | VERIFIED | 235/235 + build/typecheck/release PASS; 257 staging restano sul branch separato |

## Controlli manuali richiesti

| ID | Servizio / controllo | Stato | Owner / dipendenza | Evidenza necessaria per chiudere |
|---|---|---|---|---|
| MC-01 | Supabase entità contraente, piano e DPA applicabile | OPEN | Federico + professionista; PRV02 | Accordo/versione/accettazione, contatto breach, categorie dating autorizzate e ruoli |
| MC-02 | Supabase lista subprocessor / trasferimenti | OPEN | Professionista; MC01 | Servizi pertinenti, paesi log/backup/CDN/support, SCC/adequacy/TIA, notifica cambi |
| MC-03 | Supabase account/team/PAT/service-role | OPEN | Federico; PRV04 | Membri/ruoli/MFA/recovery/tokenscope/expiry/nominativi, nessun valore dei token |
| MC-04 | Backup DB/Auth e bytes Storage | OPEN / BLOCKER | Federico + tecnico; budget/INCIDENT | Inventario copie esistenti, RPO/RTO approvati, retention/cifratura, owner, copertura Storage separata |
| MC-05 | Restore + cancellazioni dopo restore | OPEN / BLOCKER | Tecnico + professionista; MC04/RIGHTS | Prova sintetica staging DB+foto+ledger, schema/secrets/cron OFF, cancellazioni riapplicate e zero replica non autorizzata |
| MC-06 | Bucket public flag / policy SELECT corrente | PARTIAL | Tecnico; PRIVACY/PHOTO baseline | Metadato public=false e definizione predicate esatta; prova sintetica RLS futura, non download foto reali |
| MC-07 | CDN foto / cache / delete | OPEN | Tecnico + vendor; PRV06/RIGHTS | Regione/cache/invalidation/log, durata URL e copia residua; conferma bytes dopo delete con sintetici |
| MC-08 | Edge region orchestrator/normalizer/cron | OPEN | Tecnico; PRV06/PHOTOcompat | Header x-sb-edge-region di tutte le chiamate sintetiche, configurazione enforcement supportata, failover/outage e minimizzazione |
| MC-09 | Auth log DB vs log esterno | OPEN | Federico + tecnico; RETENTION | Setting Write audit logs to database, TTL di ciascuna copia, campi IP/UA/payload, accessi/export; nessuna assunzione erase da deleteAuth |
| MC-10 | Gateway/DB/Storage/Edge statement/body logs | OPEN | Tecnico; INCIDENT | Verbosity, schema campi, log TTL effettivo del piano, export/drain, fixture redatta senza token/UGC |
| MC-11 | pg_cron / pg_net / Vault | OPEN | Tecnico; INCIDENT/PHOTOcompat | Accessi/queue/response/run_details TTL, no credential in log, cifratura/custodia Vault e rotazione senza valori |
| MC-12 | Custom SMTP pilot | DECISIONE FOUNDER APPROVATA / BLOCKER | Federico + tecnico; budget/PRV03 | Default escluso; selezione separata, checklist SMTP privacy/delivery e test staging; nessun provider scelto o attivato |
| MC-13 | Email sender/template/delivery/tracking | OPEN | Federico + tecnico; MC12/professionista | Branding, sender verificato, SPF/DKIM/DMARC se applicabili, nessun pixel/open tracking, destinatari/rate/SLA/log/delete policy, prova con inbox controllata |
| MC-14 | Google OAuth scope / audience / branding | OPEN | Federico + tecnico; professionista | Cloud client scope minimo, audience/stato pubblicazione, redirect esatti, support email e Privacy URL, accessi/MFA/recovery; no secret |
| MC-15 | Google OAuth claims/token copie | OPEN | Tecnico; MC14/RIGHTS | Dati realmente ritornati con fixture, campi nome/avatar non necessari, provider-token persistence e revoca; ruolo/transfer professionista |
| MC-16 | Google Fonts rimozione remota | VERIFIED repository / deploy OPEN | Tecnico; PRV07 | Stessi 9 WOFF2/OFL self-hosted, release guard e demo pre/post accesso PASS; produzione non deployata, trace Auth staging/live successiva |
| MC-17 | Gmail account e termini | OPEN / BLOCKER | Federico + professionista; PRV08 | Tipo account/piano/accordi, ruoli e dati sensibili, localizzazione/retention/export, non presumere DPAWorkspace su Gmailconsumer |
| MC-18 | Gmail MFA/recovery/deleghe/inoltri/device | OPEN / BLOCKER | Federico + sostituto nominativo | Owner-only access, account individuali, recovery verificato, nessun inoltro/backup superfluo, accessi/revoche documentati |
| MC-19 | Gmail labels/retention/hold/diritti | OPEN | Federico + professionista; RIGHTS/MODERATION | Categorie separate, minimizzazione allegati, TTL/hold auditabile, trash/sent/archive/inbox/export coperti, test ricezione futuro |
| MC-20 | Vercel MFA/recovery/team/token | PARTIAL / BLOCKER | Federico; PRV04 | Risolvere avviso single-factor, MFA effettiva per amministratori, recovery e revoca; non “skip” o account condivisi |
| MC-21 | Vercel Pro per pilot | DECISIONE FOUNDER APPROVATA / MANUAL ACTION | Federico; billing | Hobby escluso dal pilot reale; upgrade Pro prima apertura, budget e conferma piano effettivo; nessun acquisto effettuato |
| MC-22 | Vercel DPA/subprocessor/residency | OPEN | Federico + professionista; PRV02 | Versione applicabile, lista TrustCenter pertinente, transfer/remote support/securitycertifications/breach, costiopzioni residency |
| MC-23 | Vercel environment variables | OPEN | Federico + tecnico; PRV12 | Soli nomi/target Production/Preview/Dev e tipo secret; niente serversecret in VITE_ o Vercel static build; chiavepublic non secret |
| MC-24 | Vercel request/CDN/security/runtime/build logs | OPEN | Federico + tecnico; PRV05 | Campi IP/UA/URL/query/body/cookie, TTL/accessi; distinguere sito statico da runtimefunctions; no copia dati nei ticket |
| MC-25 | Vercel integrations/analytics/drains/webhook | PARTIAL | Federico + tecnico; PRV12 | Lista installazioni e scopes; Analytics non abilitata confermata, altre integrazioni/team/drains assenti da provare |
| MC-26 | Deploy retention / source marker / preview auth | OPEN | Tecnico + Federico; PRV13 | Config retention per status/protecteddeploy, artifact hash→sourcecommit, accesso preview e cancellazione copy non necessaria; non redeploy qui |
| MC-27 | Domini / DNS / TLS | PARTIAL | Federico + tecnico; PRV12 | Domini effettivi/default/custom/registrar se presente, owner/TLS/DNS security; non inventare registrar del sottodominio vercel.app |
| MC-28 | GitHub piano/DPA/data location | OPEN | Federico + professionista | Accordo applicabile all'account/prodotto standard/Actions/npm, subprocessor/transfer, delete/export/certification/breach; non assumere Enterprise |
| MC-29 | GitHub MFA/accessi/apps/secrets/actions | OPEN | Federico + tecnico; PRV09 | Collaboratori/apps/PAT/deploykeys/MFA/recovery, secrets **nomi/scopes** soltanto; branch policies/CI permissions e actionpin SHA |
| MC-30 | Git history/artifacts/issue privacy | OPEN | Tecnico; PRV09 | Scansione privata history completa, no fixture reale/screenshot/token in publicrepo/fork/issue; Actions log/artifact/cache TTL e remove prova sintetica |
| MC-31 | Supply chain npm/Deno | OPEN | Tecnico; PRV09 | Lockfile provenance/vulnerability/review, hash WASM, nessun fetch decoder da browser o invio immagini a registry, token install/CLI minimi |
| MC-32 | Figma / Codex / strumenti AI sviluppo | OPEN | Federico + professionista se dati reali | Account/piano/accessi/history/retention/training/settings/backup/contratti; solo codice e sintetici, nessun UGC reale trasferito |
| MC-33 | Secret hygiene locale/export operatori | PARTIAL | Federico; PRV14 | 11file diagnostici privati mode owner-only confermati, ACL/backups dispositivo e retention/revoke credenziali da completare |
| MC-34 | Network pubblico e bundle live | OPEN | Tecnico; PRV13 | Runner ENOTFOUND e webfetch non disponibile: verifica da ambiente affidabile senza account, freshheader/source maps/bundlehash, non modificare DNS per forzare audit |

## Aggiornamento remediation / decisioni founder

- MC-04/05: raccomandazione tecnica Supabase Pro con backup DB e Storage separati; runbook candidato redatto, NON backup/restore attivi o testati. RPO/RTO e retention copie da INCIDENT/professionista; upgrade manuale.
- MC-20: MFA amministratori obbligatoria; configurazione/recovery ancora MANUAL ACTION.
- MC-17/18/19: Gmail = amministrazione + workflow manuale supporto/diritti/safety, non dipendenza runtime/API/SMTP prodotto. Adeguatezza contrattuale consumer/Workspace, MFA e retention restano aperte.
- MC-35 **HIGH — MANUAL ACTION**: Vercel Data Preferences letta il 11ottobre, “Improve models with my data” **ON**. Raccomandato Opt-Out team/progetto; nessun toggle salvato. Evidenza futura owner/data/config redatta, verifica dopo upgrade; opt-out non retroattivo.
- Tutte le checklist DPA/subprocessor/residency/transfer/breach/delete/access aggiornate nel report remediation. Nessuna conclusione legale sostituisce la verifica professionale.

Runbook: `soma-provider01-remediation-2026-10-11.md`, `soma-provider01-backup-restore-runbook-2026-10-11.md`, `soma-provider01-smtp-runbook-2026-10-11.md`.

## Accettazione della chiusura

Per ogni MC: data, persona verificatrice, descrizione/config reale, riferimento a evidenza privata redatta, esito, scadenza/riesame. Il professionista registra separatamente conclusioni sui ruoli, contratti, trasferimenti e durate: non trasformare VERIFIED tecnico in APPROVATO LEGALE.

PROVIDER-01 resta NO-GO al pilot finché backup/copertura restore, accordi/transfer, accessi/MFA, Gmail sicurezza/adeguatezza e decisioni email/piano sono aperti. HIGH restanti risolti o motivati e validati. Nessuna nuova retention applicata in produzione. Questo audit non chiude AGE/CONSENT/RETENTION produzione, RIGHTS, MODERATION, INCIDENT o push readiness.
