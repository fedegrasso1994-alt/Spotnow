# SOMA — Materializzazione delle sei fonti legali mancanti v1.1

3 novembre 2026. **SOLO DOCUMENTAZIONE: nessuna remediation, audit tecnico o autorizzazione di pubblicazione/pilot.**

## 1. Provenienza e baseline

Il titolare ha fornito direttamente12 PDF dalla cartella `Desktop/LEGAL SOMA`, in risposta alla richiesta della fonte mancante. Questi file, non una ricostruzione da vecchi Markdown, sono stati usati per la trascrizione. Lo ZIP `SOMA_LegalPack_v1.1_verified_source.zip` e un manifest di checksum attesi esterno non sono disponibili: non viene dichiarata una verifica contro quello ZIP, una firma o un'origine autenticata indipendente. SHA-256 significa checksum dei byte PDF ricevuti, verificato stabile con rilettura.

Branch: `codex/soma-schema-v2-staging`. Il remoto era avanzato a `52a914f2d4dd1e68768683a969619cf97cc96cf7` con documentazione nuova e sei trascrizioni già presenti. È stato eseguito il solo fast-forward di quel branch. Questa è la baseline protetta dell'intervento; nessun file dei sei già materializzati è stato riscritto. Main/origin-main restano `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

## 2. Verifica delle fonti

- 12 PDF distinti,116 pagine complessive; nessun PDF cifrato o illeggibile; struttura letta con `PdfReader(strict=True)`, testo non vuoto in ogni pagina, nessun carattere di sostituzione U+FFFD nell'estrazione.
- 61 pagine dei sei PDF da materializzare renderizzate e ispezionate in6 contact sheet; Provider include19pagine e tutte le righe finali della checklist. Gli originali non sono stati modificati, copiati in Git o pubblicati.
- Estrazione `pypdf` in modalità layout; versione e hash dell'estrazione riportati nel manifest. Nessuna parafrasi, traduzione, nuova clausola o correzione delle decisioni contenute nei PDF.
- Nei nuovi file ogni carattere visibile del testo estratto è presente, nello stesso ordine, nei segmenti A+B. Controllo roundtrip per documento con normalizzazione NFKC, spazi/ZWSP/BOM/soft-hyphen solo per il confronto. I salti pagina sono resi come righe vuote; colonne, elenchi, etichette e testo sono preservati in blocchi verbatim. Non si dichiara identità binaria fra PDF e Markdown.

## 3. Le sei materializzazioni

| File | Fonte PDF | Pagine fonte | Corpo A / checklist B | Operazione |
|---|---|---:|---|---|
| [02_TERMS_AND_CONDITIONS.md](02_TERMS_AND_CONDITIONS.md) | Soma - Terms & Conditions.pdf | 11 | A pp.1–10; B pp.11 | Sostituzione integrale del testo legacy v1.0 con fonte v1.1 |
| [04_COMMUNITY_SAFETY_GUIDELINES.md](04_COMMUNITY_SAFETY_GUIDELINES.md) | Community & Safety Guidelines di SOMA.pdf | 5 | A pp.1–4; B pp.5 | Sostituzione integrale del testo legacy v1.0 con fonte v1.1 |
| [05_RETENTION_POLICY.md](05_RETENTION_POLICY.md) | Soma Retention Policy.pdf | 10 | A pp.1–9; B pp.10 | Sostituzione integrale del testo legacy v1.0 con fonte v1.1 |
| [06_RIGHTS_REQUEST_PROCEDURE.md](06_RIGHTS_REQUEST_PROCEDURE.md) | SOMA – Rights Request Procedure v1.1– Pilot.pdf | 9 | A pp.1–8; B pp.8–9 | Sostituzione integrale del testo legacy v1.0 con fonte v1.1 |
| [11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md](11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md) | SOMA – Provider _ Processor _ International Transfer Matrix (3).pdf | 19 | A pp.1–18; B pp.18–19 | Nuovo file |
| [12_DSA_CLASSIFICATION.md](12_DSA_CLASSIFICATION.md) | SOMA — Valutazione della classificazione ai sensi del Digital Services Act.pdf | 7 | A pp.1–6; B pp.6–7 | Sostituzione integrale del testo legacy v1.0 con fonte v1.1 |

Terms e Community sono testi candidati agli utenti: B resta esclusivamente interna. Retention, Rights, Provider e DSA sono documenti interni anche nella sezione A. Gli indicatori di stato e le note originali sono conservati, non promossi a copy pubblicabile. La separazione delle checklist non autorizza la pubblicazione di A senza il relativo gate. Nei sei file precedenti non sono state spostate sezioni o cancellate note.

## 4. Checksum completi

Manifest machine-readable: [sources/v1.1/source-manifest.json](sources/v1.1/source-manifest.json). Contiene anche byte, pagine, hash estratto/normalizzato/segmenti, percorsi originali e namespace delle checklist.

| Fonte originale | SHA-256 PDF | File repository | SHA-256 file repository |
|---|---|---|---|
| Soma - Privacy Policy (1).pdf | `649308c0d7df0ba016c2354da778e57870a5779b9034437fd53416bd6759f40d` | `01_PRIVACY_POLICY.md` | `3b98ce7b927f1b22d030b9a44b75d7c761f51060ded68a626db78b073a8aa1ea` |
| Soma - Terms & Conditions.pdf | `29fd0eb2316323156d26a5424878227a76da97f69fe5cc3cea188927481b7f05` | `02_TERMS_AND_CONDITIONS.md` | `c891a9d563342f16f49975477f9ca33f98aad6bbd69eb4ea3d381a3d0f8a96a9` |
| SOMA – Onboarding Legal Copy v1.1 – Pilot.pdf | `4bcbb292248fc5b550a16659f5be6ac8fc2fff6efd5dedb374019fd6b5f2781c` | `03_ONBOARDING_LEGAL_COPY.md` | `371588fae7f8f6ace1721c7504ea0a7c219b5422d59fa155987c9ef611619cfb` |
| Community & Safety Guidelines di SOMA.pdf | `f4ef34fbf66e6ce13a3632d15df36876a0540d9c438e218e21e1e6d21c732316` | `04_COMMUNITY_SAFETY_GUIDELINES.md` | `c8f72e1cabe8dab1739051f4061ff778f3199e795be41cea8d281f012ad0ea80` |
| Soma Retention Policy.pdf | `79d86ddb44b23f4fbf676186b3e999e953bf673c625407f8bd34b20c35a7d0e3` | `05_RETENTION_POLICY.md` | `fc77353b1e277fd4db6a06c52544485639a667f3b4d9440ca4837213fa234929` |
| SOMA – Rights Request Procedure v1.1– Pilot.pdf | `339eb507e1af339aad503d6342e22a33eb4adf6ba966a233e1b53421e564d39c` | `06_RIGHTS_REQUEST_PROCEDURE.md` | `bcb8c7571daaac0c089ec7092a12eb82b9f4edb22c1a95f7fa4dc14a01e253a9` |
| SOMA – Moderation _ Reporting _ Appeals Procedure v1.1 – Pilot.pdf | `9cfc9973b7013673ca38dfafaddd5afc3e8ddc04c8720c3c04c5a198be45713d` | `07_MODERATION_REPORTING_APPEALS.md` | `f316b5dea572a3dc60bf66a9cffb4c6976964414d56c65475cccee93d0a4ce89` |
| SOMA – Data Protection Impact Assessment (DPIA).pdf | `a84a7eb8e0c0fec68fe0beb0461a140918a67e56c866c811dff1123a726c4220` | `08_DPIA.md` | `143b9342f3f70a9b3b30488a294b12eda8dc3a807d8e92c4c1a0ca20bae43fc3` |
| SOMA – Incident Response & Personal Data Breach Procedure v1.1 – Pilot.pdf | `c7c106bcfe201de2c39532439a985caa63ed1a22caea0d10adab30a3c257b1d7` | `09_INCIDENT_RESPONSE.md` | `c65061e882df1035d873ad12e8e19ac570e258c005f540c007f752232f649e38` |
| SOMA – Age Assurance Assessment v1.1 – Pilot.pdf | `7ad12e2971534afc589a4431af46bd77e78f817d3ac9e58aa40194a6306dc612` | `10_AGE_ASSURANCE_ASSESSMENT.md` | `d6878a6b268f3244a3a50ebca025482d90947517e05a43376ddc85507881c294` |
| SOMA – Provider _ Processor _ International Transfer Matrix (3).pdf | `cb931877eed629087dbbc190e5c90610f28c67bc0420fdf787e54f76d0c88e15` | `11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md` | `5268d322b4c9462f11bfa1d539dea89ed6063a176da8f03577792a60a48840c6` |
| SOMA — Valutazione della classificazione ai sensi del Digital Services Act.pdf | `87292fa14e7085b06b6c971dfa829d16ad1b491db62074ab6b81d6e17af80a21` | `12_DSA_CLASSIFICATION.md` | `532a04dcfa27b1abedc902ff2ac106891020b0cc8a8b3cb40d11ee6c4e8dda55` |

## 5. Sei file precedenti preservati e diff fonte/repo

| File | Diff byte rispetto a52a914f | Confronto testo visibile PDF/repo |
|---|---|---|
| `01_PRIVACY_POLICY.md` | **Nessuno**, SHA invariato | **Solo formattazione/ordine estrattivo: sei celle e resto documento verificati; file invariato** |
| `03_ONBOARDING_LEGAL_COPY.md` | **Nessuno**, SHA invariato | Corrispondente dopo normalizzazione di spazi/caratteri invisibili |
| `07_MODERATION_REPORTING_APPEALS.md` | **Nessuno**, SHA invariato | Corrispondente dopo normalizzazione di spazi/caratteri invisibili |
| `08_DPIA.md` | **Nessuno**, SHA invariato | Corrispondente dopo normalizzazione di spazi/caratteri invisibili |
| `09_INCIDENT_RESPONSE.md` | **Nessuno**, SHA invariato | Corrispondente dopo normalizzazione di spazi/caratteri invisibili |
| `10_AGE_ASSURANCE_ASSESSMENT.md` | **Nessuno**, SHA invariato | Corrispondente dopo normalizzazione di spazi/caratteri invisibili |

**Privacy — sola formattazione, contenuto informativo integralmente preservato.** La pagina12 del PDF è stata renderizzata e confrontata con la riga PRIV-04 del repository (righe462–480). Le sei celle — ID, evidenza, gap, criterio di chiusura, tipo e stato — coincidono dopo normalizzazione dei soli spazi/caratteri invisibili. In particolare sono preservati `europe-west1`, `Resend canary` e `subfornitori/regioni e meccanismo Capo V`: la differenza del confronto piatto deriva esclusivamente dall'ordine di lettura fra colonne e dall'a capo delle parole. Sostituendo solo questa riga con un riferimento comune, il resto dell'intero documento coincide al confronto normalizzato. Nessuna differenza sostanziale rilevata; nessuna riscrittura della Privacy. Il manifest conserva i due hash piatti diversi, gli hash delle sei celle e il metodo di verifica, senza fingere identità binaria fra PDF e Markdown.

Gli altri cinque testi precedenti corrispondono al confronto normalizzato. **Tutti e sei** sono byte-identici alla baseline52a914f: il controllo di preservazione è separato dal confronto con i PDF.

## 6. ID canonici e checklist locali

Inventario canonico verificato esclusivamente nei file `13_REGISTER_PART_A.md`…`13_REGISTER_PART_F.md`:

| Part | ID unici |
|---|---:|
| A |20|
| B |18|
| C |23|
| D |26|
| E |28|
| F |30|
| **Totale** |**145**|

Priorità originali:100 P0/45 P1; nessun ID cancellato, aggiunto o rinumerato. Il master v1.2 rinvia a tutte le parti, ai tre supplementi criteri e alla riconciliazione. Sono presenti esattamente **X-01…X-10**:10 integrazioni distinte, non un rimpiazzo o un incremento occulto del conteggio145. Riferimenti a controlli/famiglie e link locali verificati. I criteri delle parti, dei supplementi e delle X non sono stati modificati; nel master sono cambiati soltanto metadati di disponibilità e rinvii al risultato di materializzazione.

| Documento fonte | Namespace locale | Etichette originali della checklist (non righe canoniche nuove) |
|---|---|---|
| `01_PRIVACY_POLICY.md` | `PRIV-PDF` | PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, PRIV-06 |
| `02_TERMS_AND_CONDITIONS.md` | `TERMS-PDF` | TERMS-01, TERMS-02, TERMS-03, TERMS-04, TERMS-05, TERMS-06 |
| `04_COMMUNITY_SAFETY_GUIDELINES.md` | `SAFE-PDF` | SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, SAFE-06 |
| `05_RETENTION_POLICY.md` | `RET-PDF` | RET-01, RET-02, RET-03, RET-04, RET-05, RET-06, RET-07, RET-08 |
| `06_RIGHTS_REQUEST_PROCEDURE.md` | `DSR-PDF` | DSR-01, DSR-02, DSR-03, DSR-04, DSR-05, DSR-06, DSR-07, DSR-08 |
| `07_MODERATION_REPORTING_APPEALS.md` | `MOD-PDF` | MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07, MOD-08, MOD-09, MOD-10 |
| `09_INCIDENT_RESPONSE.md` | `INC-PDF` | INC-01, INC-02, INC-03, INC-04, INC-05, INC-06, INC-07, INC-08, INC-09 |
| `10_AGE_ASSURANCE_ASSESSMENT.md` | `AGE-PDF` | AGE-01, AGE-02, AGE-03, AGE-04, AGE-05, AGE-06 |
| `11_PROVIDER_PROCESSOR_TRANSFER_MATRIX.md` | `PROV-MX` | PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, PROV-06, PROV-07, PROV-08, PROV-09 |
| `12_DSA_CLASSIFICATION.md` | `DSA-PDF` | DSA-03, DSA-04, DSA-05 |

Le etichette originali sono preservate anche quando il PDF le spezza su due righe. Il manifest le qualifica con il namespace della fonte. Nessuna checklist è stata unita al register per uguaglianza testuale dell'ID; nessun nuovo mapping sostanziale/giuridico è stato inventato. Gli ID in fonti e checklist non entrano nel parser dei145. Un eventuale mapping semantico futuro deve essere esplicito, non una rinumerazione del testo approvato.

## 7. Diff dell'intervento

- 5 file legacy aggiornati integralmente:02,04,05,06,12.
- 1 file aggiunto:11ProviderMatrix.
- 6 file precedenti01,03,07,08,09,10:nessun diff.
- README aggiornato con presenza12/12, provenienza/checksum, destinazione utenti/interna, differenza Privacy e nessuna autorizzazione al pilot.
- Master v1.2:solo metadati di materializzazione e riferimenti al manifest/rapporto; criteri/ID/priorità/integrazioni invariati.
- Aggiunti questo rapporto e il manifest delle fonti. Non modificati SOT prodotto, partiA–F, criteri, riconciliazione, preflight storico, audit o piano preesistenti.

Le diciture di stato incomplete nei vecchi preflight e nella riconciliazione restano evidenza storica. README/master distinguono ora lo stato corrente senza cancellare tale provenienza. La presenza completa non è una verifica dei controlli tecnici e non cambia il NO-GO pre-pilot.

## 8. Verifiche finali e Git

| Controllo finale | Esito |
|---|---|
| Correzione formale master, riga4 | Rimossi soltanto due spazi finali; testo, criteri, ID e priorità invariati. |
| `git diff --check` | PASS dopo la correzione; nuovo controllo prima di commit/push. |
| Fonti e checksum |12PDF/116pagine riletti, SHA-256 corrispondenti al manifest;12file target presenti con checksum corrispondenti. Nessun confronto con ZIP o manifest esterno non forniti. |
| Sei nuovi documenti | PASS roundtrip completo dei segmenti fonte A+B; nessuna omissione, fonte19pagine Provider completa. |
| Sei documenti precedenti | PASS preservazione byte rispetto a52a914f; cinque confronti diretti e Privacy equivalente per celle e resto del testo. |
| Registerv1.2 |145ID unici,100P0/45P1,10X-01…X-10 senza duplicati/omissioni; link e riferimenti verificati. Parti, criteri e riconciliazione invariati. |
| ID delle checklist PDF | Namespace locali separati, nessuna importazione per omonimia nei145ID. |
| Suite repository |940/940PASS,0fail/skip/cancel,193130.644625ms; unica esecuzione del precedente passaggio di materializzazione. Nessuna nuova modifica runtime giustifica ripeterla. |
| Build/typecheck | PASS nel precedente passaggio, Vite358ms e TypeScript senza errori. Non costituiscono audit tecnico né prova di compliance. |
| Scope | Solo documenti autorizzati; sei fonti già materializzate, codice, database, main e Production invariati. |

Checksum SHA-256 dei log locali di verifica:

- test: `d53b3ab4b63c2e0d77e3d4dd657b308b3ae0e199211410979b22fc0ab830d4e0`.
- build: `95b20386f4208a81deb6c6d41ede8dcdab124abd5acae2d243d6ea0fb7746696`.
- typecheck: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.


Baseline del commit documentale:`52a914f2d4dd1e68768683a969619cf97cc96cf7`. Il commit dell'intervento è identificato nella consegna finale; non viene inventato un hash prima della creazione. Nessun push o merge su main, nessuna modifica Production/database/runtime, nessun nuovo audit o remediation. Gli artefatti non tracciati dell'audit precedente sono stati preservati ed esclusi dal commit.

**Stato della materializzazione:**12 testi presenti,6 nuovi confronti integrali riusciti,6 file protetti invariati,145 ID canonici+10 X verificati;differenza estrattiva Privacy confermata come sola formattazione, con contenuto integrale preservato. Nessuna attestazione di equivalenza con lo ZIP non disponibile o di conformità legale.
