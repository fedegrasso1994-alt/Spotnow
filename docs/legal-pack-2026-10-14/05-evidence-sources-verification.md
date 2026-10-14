# Evidenze, fonti e verifiche del Final Legal Pack

14 ottobre 2026. Dossier audit/documentation only sul branch `codex/bacheca-priv-01-legal-pack`, derivato da `2db1a75cf300851842ed6acea42e901eeabdc34e` (tree `fa1b5bc4f8910def535eae401cfb42037183cb82`). Main locale/remoto documentati `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Nessuna nuova attestazione del deploy produzione.

## Evidenze interne e grado di certezza

| Ambito | Fonte versionata | Fatto e limite |
|---|---|---|
| Founder | [Decision sheet](../soma-pre-pilot-decision-sheet-2026-10-06.md) + decisioni successive nel contratto | Italia/italiano, 18+, 2 università/>200, Federico/recapito, least privilege e venue QR-only approvati; sufficienza legale non approvata |
| Produzione PHOTO | [DONE](../soma-photo02-operational-done-2026-10-10.md), [PHOTO-01](../soma-photo01-implementation-2026-10-07.md) | Stato e test di quei task, non nuovo audit live o promessa di backup/restore |
| AGE/CONSENT/RETENTION | [Staging report](../soma-age-consent-retention-staging-report-2026-10-10.md), migrations020–023 | Implementazione e test staging; default candidate/placeholder, non produzione |
| RIGHTS | [Contratto/inventario](../soma-rights01-contract-2026-10-11.md), 024 e026 | Coverage I/E/V, receipt tecniche7d, export18categorie candidate; procedure manuali ancora aperte |
| MODERATION | [Design](../soma-moderation01-design-2026-10-12.md), 025–026 | RBAC/MFA e caso/sanzioni, non staff operativo o DSA completo |
| BACHECA | [Report GO](../soma-bacheca-01-staging-report-2026-10-14.md), [evidence](../soma-bacheca-01-authenticated-evidence-2026-10-14.json), 026 | Smoke Auth/MFA/HTTP/browser con soli sintetici, 312 test della suite; anonimato diretto e lifecycle nel perimetro, non prova assoluta anti-inferenza o QA fisico |
| PROVIDER | [Remediation](../soma-provider01-remediation-2026-10-11.md), [manual MC01–35](../soma-provider01-manual-checklist-2026-10-11.md) | Configurazioni cloud osservate11ottobre e gap; non convertite in fatti correnti non verificati |
| Recovery | [Backup runbook](../soma-provider01-backup-restore-runbook-2026-10-11.md), [INCIDENT drill](../soma-incident01a-drill-report-2026-10-11.md) | Distinzione DB/bytes Storage, design/drill locale; cloud restore e riapplicazione eventi non dimostrati |
| Font/analytics | index.html, public/fonts, release guard e provider report | Font self-host nel candidato, nessun SDK advertising/analytics nuovo; config vendor esterna separata |

Sono stati riletti anche `src/bacheca.js`, `src/bacheca-ui.js`, `src/user-rights.js`, schema023–026 e test Bacheca. Nessun contenuto reale di foto/chat/report, nessuna credenziale amministrativa o inbox personale letto per questo dossier. Nessuna nuova fixture o sonde diagnostiche deployate.

### Verifica nuova limitata

API pubblica settings del solo Supabase staging `zjinjtkekmaqtxsuyvho`, usando la normale chiave pubblica già configurata, restituisce `mailer_autoconfirm=false`: **Confirm email ON**, account creati0. Nessun valore chiave/token salvato nel dossier. Questo probe non certifica tutti gli altri parametri Auth.

Staging cleanup/scheduler OFF, retention paused, baseline3 account/3 profili/39 oggetti, zero untracked/current missing e3 review storici sono evidenze dell'ultimo smoke14 ottobre: non nuove letture amministrative in questo task. Non modificati, non riattivati. Nessun accesso GCP; progetto Luigi escluso, OAuth Soma eventuale solo rare-array-510414-d9 con check ID e preavviso prima modifiche.

## Fonti ufficiali consultate il 14 ottobre 2026

Consultazione di fonti pubbliche, nessuna trasmissione di dati utenti. Riassunti brevi e domande al professionista, non consulenza definitiva né citazioni estese.

| Fonte | Uso nel dossier / limite |
|---|---|
| [GDPR — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) | Quadro per minimizzazione, condizioni/diritti, sicurezza, trasferimenti, DPIA. Le basi e l'applicazione concreta restano da decidere professionalmente |
| [Garante — elenco trattamenti soggetti a DPIA](https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9058979) | Screening su dati altamente personali, contesto, scala e combinazioni; non conclusione automatica da numero200 |
| [EDPB — Consent Guidelines05/2020](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en) | Riferimento consegnato al professionista per scelta separata/prova/revoca; pagina ufficiale consultata, non pretesa analisi integrale del PDF |
| [EDPB — Rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en) | Procedura accesso/esercizio diritti e dati terzi, da applicare professionalmente; UI parziale non limita i diritti |
| [EDPB — Data breaches](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en) | Distinguere incidenti/violazioni e decisioni documentate basate sul rischio. Tempi/canali devono essere completati e validati prima pilot |
| [Commissione — DSA policy](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act), [FAQ](https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers) | Checklist reporting/decisioni/rimedi e obblighi differenziati; non qualificazione giuridica di Soma o esenzione generalizzata |
| [Commissione — DSA database legal notice](https://transparency.dsa.ec.europa.eu/page/legal-information) | Distinguere decision reasons e possibili obblighi/esenzioni della trasmissione al database; niente dati personali nel database pubblico se applicabile; nessuna iscrizione o invio eseguiti |
| [DSA — testo EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng) | Riferimento per verifica professionale; lettura automatizzata del testo integrale bloccata da controllo JavaScript, non aggirato. Nessuna conclusione articolo-per-articolo da fonte non letta |

Contenuto di documenti vendor e fatti commerciali non riconsultato qui: usare la checklist provider e raccogliere versioni/copie contrattuali attuali in registro privato. Non inventati DPA, meccanismi di trasferimento, prezzi, piani effettivamente attivati, certificazioni o SLA.

## QA del pacchetto

Controlli documentali: 8 draft con avvertenza esatta; 25 schede LP con 6 campi; 9 aree readiness con 5 dimensioni; 30 azioni con owner/fase/evidenza; link locali risolti; nessun file runtime incluso; nessun marker credenziale/chiave privata nei documenti nuovi. Questo scan delimitato non è una nuova scansione completa di history/cloud secrets.

Suite richiesta da AGENTS: **312/312 PASS**, build/typecheck PASS, release guard PASS (37 asset e 9 font locali). Esiti e hash dei documenti in `verification.json`. Non aggiunti test runtime per un task di sola documentazione. Il commit finale del dossier è il tip del branch dedicato; nessun merge main né deploy.

### Gate della consegna

GO per iniziare la review sul prodotto reale documentato e con gap evidenti. NO-GO per pubblicare i draft o aprire il pilot; nessun sign-off professionale ancora ricevuto. Risposte LP e manual action devono produrre remediation e poi preflight fresco/rollout autorizzato, non una sostituzione silenziosa delle policy in produzione.
