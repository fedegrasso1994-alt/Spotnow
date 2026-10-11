# PROVIDER-01 — remediation pre-pilot

11 ottobre 2026. Baseline audit `515facd`, branch `codex/provider-01-audit`. Produzione/main invariati. Nessun acquisto, modifica account, SMTP, export reale o nuovo provider. PHOTO-01/02 e AGE/CONSENT/RETENTION non modificati. Decisioni founder approvate ≠ validazione professionale. Il report audit originale resta storico.

## Esito repository

Google Fonts sostituito da **self-host degli stessi file ufficiali WOFF2**: Bebas Neue 400, Inter 400/500/600/700/800, tutti i subset Unicode e font-display swap originali. Nove asset, hash/provenienza in `soma-fonts-manifest-2026-10-11.json`, licenze OFL incluse. Nessuna modifica a styles.css, logo, componenti, layout o business logic. Le font face sono copiate dalla risposta ufficiale, con soli src locali. Non dipendiamo più dal cambio futuro della versione servita da Google.

`font-src 'self'` nelle due configurazioni Vercel limita solo le font; nessun connect-src nuovo che possa interrompere Auth/Storage. Efficace dopo un futuro deploy autorizzato, non sulla produzione corrente. Il release guard già usato da CI/deploy verifica stylesheet, bundle, presenza/licenze e integrità font. L'helper HAR accetta un elenco esplicito di origin e rifiuta terze parti non approvate senza stampare token/query. Non è un monitor runtime né prova che tutti i flussi live siano stati catturati. Ogni futuro host deve essere giustificato e approvato; Google OAuth è distinto da Google Fonts.

Verifica browser locale demo: pagina iniziale e percorso sintetico onboarding/prodotto; inventario asset font/CSS solo localhost, famiglie calcolate Inter/Bebas Neue. Non effettuato login reale né accesso a dati/email personali. Verifica di login staging reale e network dopo futuro deploy resta nella checklist. Nessuna nuova dipendenza npm/runtime.

## Vercel: decisione e riscontro

**Vercel Pro prima del pilot: DECISIONE FOUNDER APPROVATA; upgrade/billing MANUAL ACTION.** Admin MFA obbligatoria; precedente avviso single-factor rimane aperto finché Federico verifica MFA/recovery per tutti gli amministratori. Nessun cambio automatico.

Console team, lettura 11 ottobre: Hobby; Data Preferences → **Improve models with my data = checked/ON**. Nessuna modifica effettuata. Azione consigliata: team Opt-Out/OFF, salvare manualmente e verificare eventuale override progetto Soma. Registrare data, owner, screenshot redatto; ricontrollare dopo upgrade. Non presumere che il piano cambi una preferenza già esplicita. La documentazione indica Hobby/trial Pro opt-in, paid Pro opt-out di default; opt-out vale per dati futuri, non ritira quelli già condivisi. Non esclude ogni uso per sicurezza/miglioramento prodotto e non garantisce zero retention o trattamento solo SEE. [Fonte Vercel](https://vercel.com/changelog/updates-to-terms-of-service-march-2026).

Non attivare Agent/v0/AI Gateway/Analytics/Speed Insights per questa remediation. ZDR di servizi AI distinti non è una garanzia per il sito statico. Telemetry attuale: build/deployment/account/CDN/security del provider, non analytics advertising del prodotto; campi e TTL effettivi restano MANUAL CHECK. Ridurre IP/UA/query dove configurabile, distinguendo obblighi security da diagnostica. Non loggare messaggi, preferenze, foto, signed URLs o bearer.

## Supabase: minimo consigliato

**Raccomandazione tecnica: Pro**, mantenendo DB eu-west-1; non upgrade eseguito né approvazione billing implicita. Free corrente non è una baseline recovery adeguata: assenza di project backup verificata nell'audit e possibile pausa per inattività. Pro evita la pausa automatica e offre backup DB giornalieri con finestra rolling di 7 giorni; **non include backup dei bytes Storage**. Nessun piano elimina ogni downtime/perdita dati. [Backup](https://supabase.com/docs/guides/platform/backups), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Pro + backup Storage governato + restore provato è il minimo candidato. Compute, connessioni, egress, Storage, log e limiti Edge vanno dimensionati con carico di oltre 200 utenti/due università, non solo dal numero iscritti. Verificare budget e alert quota prima del pilot. Se INCIDENT-01 richiede RPO DB inferiore a 24h, valutare **PITR add-on** con conferma costi; non acquistato. PITR non risolve da solo la copertura foto. Non aumentare memoria/decoder PHOTO né introdurre replica originale.

## Email/Auth e Gmail

Default SMTP Supabase escluso dal pilot per decisione founder; custom SMTP **non scelto né integrato**. Requisiti e piano di test nel runbook SMTP. Google OAuth/anonymous linking ed email restano invariati; staging può continuare a usare il percorso di test attuale entro i limiti del servizio default. Nessun test mail reale effettuato qui. [Limiti del servizio default](https://supabase.com/docs/guides/auth/auth-smtp).

`somadatingapp@gmail.com` compare come recapito supporto/privacy/safety/ricorso e contatto amministrativo. Classificazione **b) account/amministrazione + c) workflow manuale**, NON a) dipendenza runtime Soma; nessun Gmail API/SMTP Gmail nel codice. Un mailto apre il client dell'utente: non rende Gmail backend dell'app. Il trattamento manuale delle richieste resta nel data map e richiede sicurezza/retention/ruolo contrattuale da validare; non presumere DPA Workspace per un account consumer. Nessuna email personale letta. Casella: MFA, recovery, accesso nominativo ristretto, label distinte, no inoltri automatici/backup indiscriminati, test ricezione e procedure diritti prima del pilot.

## Contratti e trasferimenti: checklist aggiornata

Per ogni riga registrare in evidenza privata: entità/piano/servizio, versione DPA o accordo applicabile, subprocessor pertinenti e paesi, regione di dati/log/backup/supporto, SCC/adequacy e valutazione trasferimenti, impegni breach, TTL/delete/export, amministratori/MFA/revoca. **Ruolo e sufficienza giuridica: PROFESSIONAL REVIEW REQUIRED.** La regione DB non dimostra localizzazione di tutte le copie.

| Provider effettivo | DPA/subprocessor e trasferimenti | Config/retention/delete/access da chiudere |
|---|---|---|
| Supabase DB/Auth/Storage/Edge | [DPA](https://supabase.com/legal/dpa), [subprocessors](https://supabase.com/legal/customer-resources/subprocessor-list); confermare versione/servizi e trasferimenti | Pro decisione billing, Ireland DB, Edge/CDN/log region effettiva, backup DB e Storage separati, IP/UA log TTL, team MFA/service roles, restore e delete copie |
| Vercel hosting/CDN/deploy | [DPA](https://vercel.com/legal/dpa), [subprocessors](https://vercel.com/legal/sub-processors); contratti/residency/log/support extra-SEE da verificare | Pro manuale, MFA, Data Preferences OFF, preview/deploy/log TTL, integrations/drains, env scope, billing alert |
| Google OAuth | [Privacy](https://policies.google.com/privacy), [Cloud terms](https://cloud.google.com/terms); non presumere ogni accordo Cloud applicabile a OAuth | scope minimo, audience/branding/redirect, claims/token copie, revoke/delete, console MFA, ruoli da professionista |
| Gmail manuale | Accordo concreto consumer/Workspace da accertare; subprocessor/region/SCC se applicabili, non attribuire DPA inesistente | MFA/recovery/deleghe, mailbox/sent/trash/export TTL e safety hold, minimizzazione allegati, accesso sostituto nominativo |
| GitHub repository/Actions | [DPA](https://docs.github.com/en/site-policy/privacy-policies/github-data-protection-agreement), [subprocessors](https://docs.github.com/en/site-policy/privacy-policies/github-subprocessors); piano/ruolo/transfer da confermare | public repo solo codice/sintetici, accessi/MFA/secrets scopes, history scan, artifact/cache/log TTL, branch protection |
| Google Fonts | Dipendenza runtime rimossa dal candidato; solo download sviluppo ufficiale/OFL | futuro deploy e network staging/live da validare, nessuna chiamata font necessaria a login |
| Figma/Codex/altri strumenti sviluppo | Accordi e data controls del piano concreto da verifica manuale; fuori runtime prodotto | solo codice e sintetici; no dati dating/UGC reali, accessi, retention/training settings e copie sviluppo |
| npm/Deno supply chain | Distribuzione dipendenze in sviluppo/build, non backend immagini | lock/provenienza, credenziali minime, nessun dato utente inviato; registrare accessi/tool telemetry |

Nessun SMTP provider, advertising SDK, analytics provider, image provider, push vendor o registrar custom nuovo introdotto. CDN Vercel/Supabase e infrastruttura/subprocessor non vanno duplicati come integrazioni dirette non riscontrate.

## Remediation aperta e gate pilot

| Priorità | Azione / owner | Evidenza per chiusura |
|---|---|---|
| BLOCKER | Federico: Vercel Pro, MFA; Supabase piano/recovery budget | configurazione reale/piano, MFA e recovery testati, nessun segreto in repo |
| BLOCKER | tecnico + Federico: DB/Storage backup e restore | runbook eseguito con sintetici, RPO/RTO misurati, expiry copie, scheduler isolati |
| BLOCKER | Federico + professionista: provider contratti/transfer e Gmail adeguatezza | accordi applicabili, ruoli/trasferimenti validati, retention e accessi |
| BLOCKER | Federico: scegliere poi custom SMTP con autorizzazione separata | checklist SMTP e delivery/reset/login/signup staging PASS |
| HIGH | Federico: Data Preferences Vercel OFF | ON osservato → cambio manuale verificato team/progetto |
| HIGH | tecnico: log/CDN/backup/admin copia inventory | campi/TTL/region/delete verificati per servizio, no sensibili nei log |
| MEDIUM | tecnico: font candidate deployment e network login | release guard PASS + trace sintetica prima/dopo login; nessun remote font |

**GO alla remediation repository; NO-GO alla chiusura PROVIDER-01/pilot** finché i blocker esterni non sono risolti. I due nuovi runbook sono design operativo, non backup già attivi, durate approvate o test restore già superati. Nessun rollout AGE/CONSENT/RETENTION incluso; INCIDENT-01 dovrà approvare obiettivi e prove. Main/produzione e PHOTO restano invariati.

## Verifiche finali repository

240/240 test PASS (235 baseline + 5 test font/network/CSP/integrità); build, typecheck, release guard e diff whitespace PASS. Asset osservati nel browser prima e dopo accesso Google **simulato demo**, entrambi font/CSS locali. Nessun Auth live testato. `src/`, `supabase/`, icone e service worker identici a `515facd`; nessuna migration, decoder, cache foto o policy lifecycle modificata. Il CSP non cambia i flussi rete Auth.

File modificati/versionati in questo task:

- `docs/soma-fonts-manifest-2026-10-11.json`
- `docs/soma-provider01-backup-restore-runbook-2026-10-11.md`
- `docs/soma-provider01-manual-checklist-2026-10-11.md`
- `docs/soma-provider01-remediation-2026-10-11.md`
- `docs/soma-provider01-smtp-runbook-2026-10-11.md`
- `index.html`
- `public/fonts/LICENSE-bebasneue.txt`
- `public/fonts/LICENSE-inter.txt`
- `public/fonts/bebas-neue-441b026df205d289.woff2`
- `public/fonts/bebas-neue-a724a4b6a8844a50.woff2`
- `public/fonts/fonts.css`
- `public/fonts/inter-46dd4cdca58c26ae.woff2`
- `public/fonts/inter-8db00ff46c67b22c.woff2`
- `public/fonts/inter-a28eb6d3ccb534ae.woff2`
- `public/fonts/inter-a2e2c783ca6f9c20.woff2`
- `public/fonts/inter-aebf2ab4a4ce6810.woff2`
- `public/fonts/inter-c940764593d0fe5d.woff2`
- `public/fonts/inter-fccca918fea40089.woff2`
- `scripts/check-release.mjs`
- `scripts/check-third-party-runtime.mjs`
- `tests/provider-fonts.test.js`
- `vercel.json`
- `vercel.static.json`
