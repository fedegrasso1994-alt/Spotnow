# SOMA — Legal Pack: materializzazione v1.1 verificata

Aggiornato: 3 novembre 2026. Branch esclusivo `codex/soma-schema-v2-staging`.

**Stato: 12/12 testi presenti. Sei trascrizioni mancanti completate dalle fonti PDF del titolare; sei file precedenti preservati byte per byte.** Non è un GO legale, tecnico, di pubblicazione o di pilot.

## Fonti e verifica

Le fonti ricevute in questa sessione sono i **12 PDF originali**, 116 pagine complessive, nella cartella fornita dal titolare. Sono state controllate leggibilità/struttura, presenza di testo in ogni pagina e stabilità SHA-256 su rilettura. Il manifest identifica nome, dimensione, pagine, checksum PDF, estrazione, file target e confronto.

Lo ZIP `SOMA_LegalPack_v1.1_verified_source.zip` non è stato fornito: non si attesta una corrispondenza con quello ZIP, un manifest esterno o una firma digitale. I checksum qui sono calcolati sui PDF effettivamente ricevuti; non autenticazione indipendente dei testi. Gli originali non sono stati modificati o aggiunti al repository.

- [Manifest delle 12 fonti e checksum](sources/v1.1/source-manifest.json)
- [Rapporto di integrità, diff e preservazione](15_V11_MATERIALIZATION_REPORT_2026-11-03.md)

## Documenti v1.1

| File | Destinazione | Operazione in questa materializzazione |
|---|---|---|
| [01_PRIVACY_POLICY.md](01_PRIVACY_POLICY.md) | Testo candidato utenti con note/checklist interne | Preservato; differenza di ordine estrattivo nella tabella PRIV-04 riportata, non riscritta |
| [02_TERMS_AND_CONDITIONS.md](02_TERMS_AND_CONDITIONS.md) | A: Terms candidati agli utenti; B: checklist interna | Importato integralmente, PDF 11 pagine |
| [03_ONBOARDING_LEGAL_COPY.md](03_ONBOARDING_LEGAL_COPY.md) | Copy candidato e istruzioni interne | Preservato; confronto normalizzato corrispondente |
| [04_COMMUNITY_SAFETY_GUIDELINES.md](04_COMMUNITY_SAFETY_GUIDELINES.md) | A: regole candidate agli utenti; B: controlli interni | Importato integralmente, PDF 5 pagine |
| [05_RETENTION_POLICY.md](05_RETENTION_POLICY.md) | Politica operativa interna, checklist B separata | Importato integralmente, PDF 10 pagine |
| [06_RIGHTS_REQUEST_PROCEDURE.md](06_RIGHTS_REQUEST_PROCEDURE.md) | Procedura interna, checklist B separata | Importato integralmente, PDF 9 pagine |
| [07_MODERATION_REPORTING_APPEALS.md](07_MODERATION_REPORTING_APPEALS.md) | Procedura e checklist interne | Preservato; confronto normalizzato corrispondente |
| [08_DPIA.md](08_DPIA.md) | Valutazione interna | Preservato; confronto normalizzato corrispondente |
| [09_INCIDENT_RESPONSE.md](09_INCIDENT_RESPONSE.md) | Procedura e checklist interne | Preservato; confronto normalizzato corrispondente |
| [10_AGE_ASSURANCE_ASSESSMENT.md](10_AGE_ASSURANCE_ASSESSMENT.md) | Assessment e checklist interni | Preservato; confronto normalizzato corrispondente |
| [11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md](11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md) | Matrice interna, checklist B separata | Nuovo file integrale, PDF 19 pagine incluse le ultime righe PROV-07/08/09 |
| [12_DSA_CLASSIFICATION.md](12_DSA_CLASSIFICATION.md) | Assessment interno, tabella operativa B separata | Importato integralmente, PDF 7 pagine |

Le sezioni A/B e i metadati dei sei nuovi file sono contenitori editoriali, non clausole aggiunte. Il testo fonte è conservato in blocchi verbatim per mantenere ordine, tabelle, righe e ID originali; solo i salti pagina diventano righe vuote. La verifica roundtrip confronta l'intero flusso di caratteri visibili, non un riassunto.

**Non pubblicare automaticamente alcun file completo:** i PDF contengono stati candidati, note redazionali, valutazioni e controlli interni. Nei nuovi Terms/Community la checklist è separata in B, ma anche A conserva gli indicatori editoriali originali. Nei sei documenti precedenti, note e allegati interni restano volutamente intatti. Questo task non crea una versione pubblica né modifica i documenti approvati.

## Register canonico v1.2 e ID locali

- [Master v1.2](13_LEGAL_CONTROL_REGISTER.md): rinvia alle parti A–F, ai supplementi criteri e alla riconciliazione v1.2.
- Inventario verificato: **145 ID originali unici**, **100 P0 / 45 P1**; parti A20, B18, C23, D26, E28, F30. Criteri e priorità non sono stati riscritti.
- [Riconciliazione e integrazioni](13_REGISTER_V12_RECONCILIATION.md): **X-01–X-10**, esattamente dieci, mantenute separate dai 145 ID. I riferimenti esistenti a ID/famiglie sono stati verificati; non sono controlli inventati dalle checklist PDF.
- Le checklist fonte hanno namespace separati nel manifest (`TERMS-PDF`, `SAFE-PDF`, `RET-PDF`, `DSR-PDF`, `PROV-MX`, `DSA-PDF`, e quelli dei PDF già presenti). Le etichette originali nei testi non sono rinumerate. `DSR-01` di una checklist non diventa automaticamente `DSR-01` del register; lo stesso vale anche quando l'etichetta sembra coincidere con un criterio DSA.
- Il master incorpora il criterio tramite rinvii; le vecchie parti non sono copie riscritte integralmente in v1.2. Si applicano i precedenti override identificati, senza nuove valutazioni in questo task.

## Gerarchia e limiti

Resta la gerarchia documentale del master v1.2: diritto applicabile, decisioni approvate del titolare, PDF v1.1 completi, riconciliazione esplicita v1.2, criteri legacy non confliggenti e implementazione come evidenza osservata. Nessun PASS/FAIL tecnico o legale è ricalcolato qui.

I precedenti preflight e i paragrafi di stato storico della riconciliazione descrivono la materializzazione allora incompleta. Lo stato corrente di disponibilità è questo README con il manifest e il rapporto; i loro contenuti storici non sono cancellati. La differenza estrattiva della Privacy resta visibile nel rapporto e il file è preservato.

Prossima fase non avviata: eventuali confronti/audit o remediation richiedono un incarico separato. **Nessun codice, database, provider, flag, deployment, main o Production modificato da questa materializzazione.**
