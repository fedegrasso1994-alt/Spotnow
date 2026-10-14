# Soma — BACHECA-PRIV-01 / Final Legal Pack

14 ottobre 2026 · dossier interno v 0.1 · baseline `2db1a75cf300851842ed6acea42e901eeabdc34e`.

**GO alla consegna per review professionale; NO-GO a pubblicazione, rollout o pilot.** Nessuna validazione legale ricevuta. Tutti i draft recano `DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH`. Non sono testi da collegare nell'app né attestazioni di conformità.

Owner founder: **Federico Grasso**, persona fisica indicata dal founder; recapito approvato ** somadatingapp@gmail.com**. Nessuna società, sede/indirizzo o DPO presunto. Identità/recapiti da verificare professionalmente. Pilot previsto:** Italia, italiano, 18+, 2 università, >200 registrati**, crescita progressiva senza tetto massimo inventato. Venue solo QR/recruiting generale, nessun dato individuale o accesso staff. Cupido, poll, Pulse, share card e media Bacheca esclusi.

## Percorso di lettura e consegna

1. [Documento unico per il professionista: 25 decisioni](02-final-legal-decision-pack.md).
2. [Data map Bacheca e threat model](01-bacheca-privacy-safety.md), da leggere insieme alla [data map core storica](../soma-legal01-data-map-2026-10-10.md); il delta staging nel presente dossier prevale sulle descrizioni storiche di feature assenti.
3. [Retention, diritti, moderazione e checklist DSA](03-lifecycle-rights-moderation-dsa.md).
4. [Manual action uniche, readiness, blocker e roadmap](04-manual-actions-readiness-roadmap.md).
5. [Fonti, evidenze e verifiche del dossier](05-evidence-sources-verification.md).
6. Draft non validati: [Privacy](drafts/privacy-policy.md), [Terms](drafts/terms-of-service.md), [Community](drafts/community-guidelines.md), [Retention interna](drafts/retention-policy.md), [Incident/data breach](drafts/incident-data-breach-procedure.md), [Moderation](drafts/moderation-procedure.md), [Rights](drafts/rights-request-procedure.md), [DPIA screening/draft](drafts/dpia-screening.md).

Inviare il dossier e i riferimenti versionati al professionista scelto solo con successiva autorizzazione founder; questo task non trasmette documenti a terzi. Accordi vendor, schermate account, registro casi e incidenti reali si custodiscono separatamente con accesso ristretto, mai in GitHub pubblico. Le domande e le lacune fanno parte della consegna: non occorre fingere chiusi i manual check per consultare il professionista.

## Stato della baseline, non una versione unica già pubblicata

- Produzione/main documentati: `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`, PHOTO-01/02 operativi. Nessuna nuova verifica live di produzione in questo task.
- Baseline staging integrata: migrations 020–026, AGE/CONSENT/RETENTION/RIGHTS/MODERATION/BACHECA, remediation font/provider e supporto incidenti. GO tecnico non significa policy o rollout approvati.
- Ultimo smoke Bacheca: cinque fixture eliminate; 3 account/3 profili/39 oggetti baseline, zero untracked/current missing, tre review storici preservati. PHOTO staging PAUSED, cleanup/scheduler OFF, retention paused e board policies OFF, secondo evidenza del 14 ottobre.
- **Confirm email ON**, nuova verifica API read-only del 14 ottobre in questo task, senza account creati o configurazioni salvate. Il resto dei gate staging deriva dall'ultimo smoke, non da un nuovo controllo amministrativo live.
- Solo documentazione in questo branch. Nessun runtime, Auth, migration, nuovo provider, merge main o deploy. Nessuna attività GCP: eventuale OAuth Soma solo `rare-array-510414-d9`; **Luigi è escluso**.

La review deve restituire decisioni nominative/versionate e task di remediation, non un generico “GDPR compliant”. Le sezioni “proposta” non attivano scadenze o nuove raccolte e non scelgono basi giuridiche.
