# Soma — Final Legal Decision Pack

14 ottobre 2026 · versione 0.1 per professionista privacy/tech · **LEGAL VALIDATION PENDING**. Baseline staging `2db1a75`; main/produzione documentati `d0f515e` con PHOTO001–019. Documento unico delle 25 decisioni richieste; gli allegati sono evidenze, non condizioni già approvate.

**Operatore dichiarato:** Federico Grasso; recapito somadatingapp@gmail.com; nessuna società, indirizzo o DPO inventati. ** Prodotto previsto:** Italia/italiano/18+, 2 università, >200 registrati con crescita progressiva. Venue solo QR/recruiting e nessun dato individuale. Cupido escluso; Bacheca di solo testo, 280 code point Unicode e 3 post al giorno per utente/Tribe, 24 h, quattro reactions, senza media/poll/Pulse/share card/notifiche sofisticate.

Questa versione documenta lo stato tecnico e sottopone proposte: non sceglie basi giuridiche, non certifica 18+, non conclude DPIA/DSA/trasferimenti e non è destinata agli utenti. Per leggere i rischi considerare insieme [data map/threat model](01-bacheca-privacy-safety.md), [lifecycle/DSA](03-lifecycle-rights-moderation-dsa.md) e [azioni/readiness](04-manual-actions-readiness-roadmap.md).

## Come restituire la review

Per ogni LP: esito APPROVATO / APPROVATO CON CONDIZIONI / DA INTEGRARE / NON APPROVATO; motivazione e riferimento professionale; campi/testi/durate esatti; owner; evidenza necessaria; scadenza e dipendenze. Distinguere decisione normativa da scelta di rischio/prodotto founder. Evidenze contrattuali e casi reali in canale privato, non GitHub pubblico. Nessuna comunicazione al professionista è stata inviata automaticamente.

## LP-01 — Struttura prodotto e operatore

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Core attuale produzione; estensioni 020–026 soltanto staging. Federico Grasso indicato come persona fisica, nessuna società/DPO/indirizzo presunto. |
| Scelta proposta | Pilot Italia/italiano/18+, 2 università, >200 registrati; venue solo QR/recruiting senza dati individuali; Cupido escluso. |
| Fonte/razionale interno | Decision sheet 6 ottobre e README; evitare di presentare il candidato come già in produzione. |
| Rischio | BLOCKER pilot: identità/ruolo/accordi e contatti incompleti. |
| Domanda precisa al professionista | Quale identità/ruolo e quali recapiti completi devono figurare nei documenti e negli accordi, considerato il pilot senza società e i rapporti con le università? |
| Modifica tecnica se cambia la risposta | Aggiornare solo dopo validazione testi/contatti e accordi; se i ruoli cambiano, rivalutare accessi e flussi, non dare admin alle venue. |

## LP-02 — Categorie dati e inventario

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Data map core + delta AGE/CONSENT/RETENTION/RIGHTS/MODERATION e sette tabelle Bacheca; log/backup/mail esterni separati. |
| Scelta proposta | Inventario unico dei dati effettivamente conservati, non collezione di dati ipotetici. Nessuna DOB/KYC/GPS/rubrica/AI. |
| Fonte/razionale interno | Data map 10 ottobre, extension 01 e schema 001–026. |
| Rischio | HIGH: UGC/foto/chat possono contenere dati intimi o di terzi; hash/UUID non sono anonimi. |
| Domanda precisa al professionista | Quali categorie e inferenze, incluse reaction/membership/report e UGC di terzi, richiedono ulteriori condizioni o misure? |
| Modifica tecnica se cambia la risposta | Minimizzazione di campi/log/claim o raccolte se richiesto; no scansione massiva di contenuti reali per compilare il dossier. |

## LP-03 — Finalità e necessità

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Auth, profilo, discovery, presenza, community, contatti reciproci, safety, diritti, integrità/recovery; nessun advertising. |
| Scelta proposta | Separare finalità dating, UGC, safety, security e recovery senza riuso per analytics/personality score. |
| Fonte/razionale interno | Data map; codice backend/social/board; provider audit. |
| Rischio | BLOCKER pilot: finalità e basi non approvate per categoria. |
| Domanda precisa al professionista | Quali finalità sono necessarie e quale base Art.6 va documentata per ciascuna, distinta dalle condizioni per dati particolari? |
| Modifica tecnica se cambia la risposta | Registro finalità/versioni e controlli opzionalità; togliere eventuali dati non necessari, task separato. |

## LP-04 — AGE 18+

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 020: età numerica +dichiarazione/versione, server gates; nessuna DOB persistente; account esistenti devono riconfermare. |
| Scelta proposta | OPTION B founder: >=18 e dichiarazione esplicita, report underage/sospensione manuale; no KYC/documenti via email. |
| Fonte/razionale interno | AGE report e design; stato Auth può precedere completamento profilo. |
| Rischio | BLOCKER pilot valutazione minori; autodichiarazione non verifica indipendente. |
| Domanda precisa al professionista | Il gate è proporzionato al rischio dating/UGC e quali misure servono prima/dopo sospetto minore, anche preprofilo? |
| Modifica tecnica se cambia la risposta | Possibile pre-gate o age assurance separata se richiesta; nessun nuovo provider/documento senza autorizzazione. |

## LP-05 — Dating preference / Art.9

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Preference privata SELF/server, mai proiezione peer; gender/foto/relazioni/UGC possono produrre altre inferenze. |
| Scelta proposta | Founder tratta tecnicamente preferenze come dato Art.9 altamente sensibile; non assume automaticamente manifestamente pubblico. |
| Fonte/razionale interno | SEC-01, 021, LEGAL-01 audit e threat model. |
| Rischio | BLOCKER pilot: condizione applicabile da professionista; community chiusa non rende ogni dato pubblico. |
| Domanda precisa al professionista | Quale condizione Art.9 e relativo perimetro si applicano a preferenze, inferenze e contenuti spontanei, insieme alla base Art.6? |
| Modifica tecnica se cambia la risposta | Cambiare raccolta/gate/consent purpose o minimizzare inferenze se necessario; no selezione autonoma di una base. |

## LP-06 — Consenso e revoca

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 021: checkbox separata, versione/hash/time/stato active-revoked/eventi; testo placeholder staging non valido per produzione. |
| Scelta proposta | Revoca idempotente, preference cancellata/NULL, stop nuove discovery/Spot/match dipendenti; mai fallback ALL. Chat/match esistenti preservati; Bacheca indipendente. |
| Fonte/razionale interno | CONSENT design/report e founder; EDPB consent per revisione del testo, non approvazione qui. |
| Rischio | BLOCKER pilot: testo/finalità/versioning e conseguenze da validare. |
| Domanda precisa al professionista | La scelta copre la specifica finalità? Quale prova minima e quali conseguenze/reconsent richiede una nuova versione materiale? |
| Modifica tecnica se cambia la risposta | Catalogo validated/versione e flow conseguenze; eventuale cambio purpose e storage audit con test revoca/race. |

## LP-07 — Location/check-in / Ora

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | QR, non GPS; una riga check-in per utente, 90 min server. Timestamp peer null/Qui ora; proprie scadenze conservate. |
| Scelta proposta | Non mantenere storico spostamenti; 022 timestamp visita/Spot superflui NULL e purge scaduti al ciclo utile con target 24 h candidato. |
| Fonte/razionale interno | LOC-01/015, 022–023; retention consolidata 03. |
| Rischio | HIGH: venue e timestamp propri/server restano dati di presenza; QR condivisibile non prova presenza certa. |
| Domanda precisa al professionista | Quale disclosure/retention e quale trattamento dei luoghi potenzialmente sensibili sono adeguati senza promettere precisione GPS o presenza verificata? |
| Modifica tecnica se cambia la risposta | Ridurre campi/TTL/precisione o accessi se richiesto; non cambiare 90 min o introdurre geolocalizzazione autonomamente. |

## LP-08 — Tribe

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Membership persistente luogo/utente; nessun last_visit utile dopo 022. Non richiede check-in corrente per Persone/Bacheca. |
| Scelta proposta | Preservare membership, senza cronologia delle visite; nessun toggle leave introdotto per default. |
| Fonte/razionale interno | Founder + 022 + contratto Bacheca; iscrizione non attestazione presenza attuale. |
| Rischio | HIGH: elenco appartenenze è dato di associazione, non anonimo. |
| Domanda precisa al professionista | Sono necessari diritti/controlli granulari su membership/visibilità oltre delete totale, pur mantenendo il prodotto approvato? |
| Modifica tecnica se cambia la risposta | Solo se richiesto, design di rimozione/visibilità/esercizio diritti con retrocompatibilità; non riaprire decisione founder come già modificata. |

## LP-09 — Spot / match / chat

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Interesse privato e reciproco per match, RLS partecipanti, blocchi/sanzioni; UGC chat, non E2EE dimostrata. |
| Scelta proposta | Revoca dating non elimina automaticamente relazioni pregresse; delete account cascada relazione/chat anche per partner. |
| Fonte/razionale interno | backend/live-social, 023–025, RIGHTS contract. |
| Rischio | HIGH: dati relazionali/intimi, interessi ricevuti e conversazioni interessano terzi. |
| Domanda precisa al professionista | Come gestire retention, accesso alla conversazione, cancellazione di uno dei due, blocco e avviso prima purge inattività? |
| Modifica tecnica se cambia la risposta | Task su preavviso/export contestuale/redazioni/retention se necessario; non affermare già disponibile tutto il dialogo esportato. |

## LP-10 — Foto / PHOTO-01/02

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | DONE produzione. Input<=8 MiB, lato massimo 8192 px più limiti pixel/formato; canonical/detail/thumb JPEG, preview DB; nessun originale persistente della pipeline. |
| Scelta proposta | Conservare current, grace 5 min, draft 24 h, quota 128 MiB, max 2 draft, HTTP 60 s, receipts 7 d; review incerti richiedono reconciliation. |
| Fonte/razionale interno | PHOTO implementation/operational DONE; RIGHTS receipts contract. |
| Rischio | HIGH disclosure: foto personale, cache/backup/preview sono copie; no riconoscimento biometrico. |
| Domanda precisa al professionista | Sono proporzionate copie/receipt/metadata e adeguata disclosure delete/cache/backup, senza promettere erase delle copie ricevute? |
| Modifica tecnica se cambia la risposta | Solo dipendenza dimostrata e autorizzata; non riaprire decoder/lifecycle per rebranding o semplificazioni documentali. |

## LP-11 — Bacheca

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | GO tecnico staging 026; 280 caratteri, 3 post/giorno/Tribe, 24 h, 4 reactions, peer projection senza author. |
| Scelta proposta | Anonimo ai peer, internamente attribuibile solo per finalità autorizzate; revoca dating non blocca UGC. |
| Fonte/razionale interno | 01 extension + smoke reale 312 suite; payload e grant verificati. |
| Rischio | HIGH outing/doxxing/inferenza da testo/timestamp/contatori; schermo già aperto senza timer. |
| Domanda precisa al professionista | Come descrivere il limite di anonimato, la sensibilità UGC e il significato esatto di 24 h? Serve minimizzare timestamp o aggiornamento UI automatico? |
| Modifica tecnica se cambia la risposta | Task preciso dopo risposta; nessuna nuova identity feature o tracking, niente media/AI/poll. |

## LP-12 — Moderation e accessi

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 025–026 RBAC/MFA personale, queue paginata, claim/revision, author reveal case-only auditato; hide/warn/suspend/ban. |
| Scelta proposta | Federico + 1 sostituto nominativo, least privilege, nessun accesso automatico cloud/chat/preferenze; vecchi post non tornano dopo release. |
| Fonte/razionale interno | MODERATION design/report; board action/queue. |
| Rischio | BLOCKER pilot: staff vero/formazione/copertura/motivazioni/ricorsi non pronti. |
| Domanda precisa al professionista | Quali comunicazioni, motivazioni, garanzie sul reviewer e informazioni di caso vanno rese, evitando identità reporter e dati non necessari? |
| Modifica tecnica se cambia la risposta | Decision receipt/comunicazioni/canale ricorso solo se validati; nessun accesso generalizzato al DB per il sostituto. |

## LP-13 — Safety hold / evidence

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 023 hold esplicito con review/release/audit; 026 capture minima body/reason/hold/date al delete, non automatico per ogni report. |
| Scelta proposta | Separare dal prodotto, nessun uso discovery; review e retention finita configurabile, nessuna cancellazione per sola età di stato incerto. |
| Fonte/razionale interno | Founder, RIGHTS contract, schema e smoke held evidence. |
| Rischio | BLOCKER governance: active hold/open report possono restare senza termine enforce. |
| Domanda precisa al professionista | Quali condizioni, tempi massimi/riesami, campi minimi e criteri release per ogni tipo di caso, senza retention indefinita o perdita di prove? |
| Modifica tecnica se cambia la risposta | Controlli osservabilità/review e eventuale evidence schema minimo; non introdurre autore/profilo/chat completi per comodità. |

## LP-14 — Rights/access/export/delete

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Owner-only 15+3 sezioni, restricted/revoked consentiti, Auth delete normale, PHOTO lifecycle; inventario I/E/V manuale. |
| Scelta proposta | Access/export comprensibili; terzi e segreti redatti; solo held evidence e technical receipts minime/temporanee sopravvivono. |
| Fonte/razionale interno | RIGHTS contract/report, consolidamento 03, smoke finale. |
| Rischio | BLOCKER procedura manuale non provata per categorie V/foto binary/provider/mail. |
| Domanda precisa al professionista | Quali dati aggiuntivi vanno forniti/redatti e come rispondere a richieste complesse senza qualificare ogni esclusione UI come diniego legale? |
| Modifica tecnica se cambia la risposta | Export esteso o processo sicuro/delivery, identità proporzionata; no documenti via email come requisito automatico. |

## LP-15 — Retention complessiva

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 023–026 parametri centrali/OFF, dry-run/hold/locks/replay. Post 24 h separati da purge; report/audit cascade può anticipare 180 d. |
| Scelta proposta | Default design: check-in 24 h, Spot 90 d, empty match 90 d, chat 12 mesi, closed report 180 d, diagnostic 7 d/security 30 d; non policy definitive. |
| Fonte/razionale interno | 03 tabella effettiva, 023–026 e test expiry/retry. |
| Rischio | BLOCKER approvazione durate; HIGH backlog se job paused/open indefiniti. |
| Domanda precisa al professionista | Quali trigger/durate/eccezioni/avvisi e quale minimo record decisione restano dopo purge/delete/appeal? |
| Modifica tecnica se cambia la risposta | Policy versions validated, task avvisi e scheduler approvato; batching board da misurare, mai attivare durate dal solo documento. |

## LP-16 — Provider effettivi

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Supabase DB/Auth/Storage/Edge; Vercel static/CDN; Google OAuth; Gmail manuale; GitHub/CI; tooling sviluppo separato. |
| Scelta proposta | Nessun advertising; stessi font locali nel candidato; Pro Vercel deciso, Pro Supabase candidato; custom SMTP da scegliere separatamente. |
| Fonte/razionale interno | PROVIDER audit `515facd`/remediation/manual MC01–35; nessun nuovo controllo dashboard qui. |
| Rischio | BLOCKER accordi/accessi/SMTP/piani non confermati attuali. |
| Domanda precisa al professionista | Quale ruolo e accordo concreto si applicano a ogni servizio/account, inclusa Gmail consumer e tooling senza dati reali? |
| Modifica tecnica se cambia la risposta | Config minimizzata/log/SMTP in task autorizzati; nessun nuovo provider implicito per consegna draft. |

## LP-17 — Transfer/subprocessor

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | DB Irlanda eu-west-1 verificato 11 ottobre; non dimostra regioni Edge/CDN/Auth/log/backup/supporto. |
| Scelta proposta | Preferire EU/SEE disponibili, documentare percorsi e accessi remoti; nessun trasferimento dichiarato conforme senza evidenza. |
| Fonte/razionale interno | PROVIDER MC01–35, versioni DPA e subprocessor da acquisire in custodia privata. |
| Rischio | BLOCKER legal/provider facts non completi. |
| Domanda precisa al professionista | Quali trasferimenti reali e strumenti/valutazioni sono richiesti per le entità/servizi contrattuali effettivi? |
| Modifica tecnica se cambia la risposta | Opzioni regione/accesso o sostituzioni solo dopo valutazione/autorizzazione; non inserire SCC/adequacy inventate nei testi. |

## LP-18 — Backup e restore

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Runbook candidato; drill solo locale con bytes sintetici; nessun restore cloud completo provato. DB backup != bytes Storage. |
| Scelta proposta | Copie canonicali necessarie soltanto, rolling expiry; RPO DB/Storage 24 h e RTO 4 h candidati non approvati né garantiti. |
| Fonte/razionale interno | Backup runbook PROVIDER, INCIDENT drill e contratto PHOTO. |
| Rischio | BLOCKER disponibilità e resurrection dopo restore. |
| Domanda precisa al professionista | Quali retention backup, disclosure e registro minimo deletion/revoca/ban sono proporzionati e per quanto conservarli per non resuscitare dati? |
| Modifica tecnica se cambia la risposta | Progettare/testare recovery isolato con reapply eventi; no duplicazione originali e no restore produzione nello staging ordinario. |

## LP-19 — Incident response

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | 15 scenari desk review, drill locale, PHOTO pause reale disponibile; nessun interruttore generale dei flussi social attestato. |
| Scelta proposta | Incident owner +backup nominati, canale sano, registro ristretto, triage tempestivo, decisioni notifiche professionali. |
| Fonte/razionale interno | INCIDENT inventory/runbook/drill, bozza incidenti del pack. |
| Rischio | BLOCKER reperibilità/restore/recovery/alert non provati. |
| Domanda precisa al professionista | Quali criteri awareness, autorità/comunicazioni, contenuto e termini applicabili, ed evidence TTL per incidente dati dating/UGC/location? |
| Modifica tecnica se cambia la risposta | Alert/log minimi, containment/social se richiesto, prove operative; no notifica/invio reale o promesse zero perdita. |

## LP-20 — Analytics/cookie/storage browser

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Nessun SDK advertising/analytics/push implementato nel perimetro; telemetry vendor distinta; Auth localStorage/draft QR/flag installazione/cache foto esistenti. |
| Scelta proposta | No advertising pilot; no nuovo analytics; documentare storage necessario e valutarne durata, minimizzare font/log. |
| Fonte/razionale interno | PROVIDER, runtime/diagnostics/public/sw.js/data map; telemetry dashboard non esclusa per sempre. |
| Rischio | HIGH device metadata/IP/QR URL e TTL browser/vendor. |
| Domanda precisa al professionista | Quali tecnologie richiedono informazione/consenso secondo regole applicabili e quali restano strettamente necessarie, incluse future configurazioni vendor? |
| Modifica tecnica se cambia la risposta | Inventario key/cookie/HAR sintetico e TTL/consent UI solo se richiesti; non pubblicare claim cookie-free. |

## LP-21 — DSA/UGC

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Report member-only su post live; hide e sanzioni staff; no notice pubblico completo, statement-of-reasons o workflow di ricorso completo provati. |
| Scelta proposta | Checklist di qualificazione e gap, non autocertificazione; non assumere esenzione per>200/pilot/senza società. |
| Fonte/razionale interno | 03 DSA checklist e fonti Commissione; no affidamento a proposta 2020. |
| Rischio | BLOCKER chiusura legale di applicabilità e remediation eventualmente necessaria. |
| Domanda precisa al professionista | Qualificazione Soma/Tribe e obblighi concreti: notice, casi urgenti, motivazione, rimedi, contatti, record e trasparenza? |
| Modifica tecnica se cambia la risposta | Task separati canali/campi/receipt/audit decisione/delivery, privacy by design e test di isolamento terzi prima rollout. |

## LP-22 — DPIA screening

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Dati altamente personali, contesto dei luoghi, matching e UGC identificabile in gruppi universitari; screening draft non conclusivo. |
| Scelta proposta | Valutazione cauta completa prima pilot; >200 non determina da solo larga scala o esonero. |
| Fonte/razionale interno | DPIA draft, GDPR 35/Garante elenco, LEGAL audit e threat model 01. |
| Rischio | BLOCKER decisione professionale su DPIA e rischi residui; nessuna conclusione sostituita. |
| Domanda precisa al professionista | È necessaria una DPIA, una designazione DPO o altra consultazione? Quali criteri/dati/scala/rischi valutare e quale trattamento sospendere finché non mitigato? |
| Modifica tecnica se cambia la risposta | Implementare solo misure indicate e approvate; se rischio non mitigabile, NO-GO al relativo trattamento. |

## LP-23 — Documenti legali e pubblicazione

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Otto draft non validati, non collegati al runtime; placeholder consenso ancora staging. |
| Scelta proposta | Privacy, Terms, Community, retention/procedure/DPIA e disclosure tracking/location/UGC coerenti col deploy effettivo. |
| Fonte/razionale interno | Draft set e indice README; nessun URL di policy finale presunto. |
| Rischio | BLOCKER sign-off/testi/versioning/delivery mancanti. |
| Domanda precisa al professionista | Quali testi, recapiti, linguaggio/termini, registrazioni e accettazioni separati sono necessari e quali non richiedono consenso? |
| Modifica tecnica se cambia la risposta | Versioni/hash/catalogo legale e collegamenti soltanto dopo approvazione; no pubblicazione di un placeholder. |

## LP-24 — Decisioni founder già prese

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Italia-only/italiano, 18+OPTION B, sensibilità Art. 9, revoca NULL/nessun ALL, Tribe senza storico, casella unica, least privilege, Federico +sostituto, Bacheca MVP. |
| Scelta proposta | Non riaprire queste scelte come se fossero mancanti; se incompatibili con review, registrare richiesta motivata e nuova autorizzazione. |
| Fonte/razionale interno | Decision sheet 6 ottobre, design approvato 020–026, contratto Bacheca. |
| Rischio | HIGH confusione tra decisione prodotto e sufficienza legale. |
| Domanda precisa al professionista | Quali scelte richiedono adattamento vincolante o misure aggiuntive prima dell'apertura, e con quale motivazione? |
| Modifica tecnica se cambia la risposta | Delta di requisiti/task versionati; nessun cambio automatico runtime o PHOTO, nessun consenso dedotto dalla scelta founder. |

## LP-25 — Decisioni professionali e approvazione finale

| Voce | Scheda decisione |
|---|---|
| Stato tecnico | Nessun parere finale ricevuto; manual check aperti, main/produzione non contengono 020–026. |
| Scelta proposta | Risposte scritte per ciascun LP, owner/date/evidenza e accettazione del rischio esplicita; review non sostituita da test. |
| Fonte/razionale interno | Questo documento +matrice manuale 04 + fonti 05. |
| Rischio | BLOCKER pilot: assenza approvazione finale/azioni e preflight. |
| Domanda precisa al professionista | Per ciascun LP: approvato/con modifiche/non approvato? Quali condizioni e controlli prima rollout/pilot, e quali punti richiedono altro specialista? |
| Modifica tecnica se cambia la risposta | Aprire remediation indipendenti, rieseguire test/documenti, poi preflight read-only, autorizzazione founder e rollout controllato; mai merge direttamente da questo task. |

## Uscita della review e limiti della consegna

La review può iniziare con questa baseline e gap dichiarati: **GO alla consegna/review**. Il sign-off finale per il prodotto effettivamente pubblicato richiede risposte LP, contratti/configurazioni esterne verificati e tutte le remediation obbligatorie completate. ** NO-GO pilot e nessuna autorizzazione al rollout** per effetto del dossier. Se i provider o le capacità restano non verificati il parere deve indicarli come condizione aperta, non darli per assunti.

Allegati: gli otto [draft](README.md), checklist 35 item PROVIDER storica, evidenze e stato [05](05-evidence-sources-verification.md), inventario [core](../soma-legal01-data-map-2026-10-10.md), contratto [RIGHTS](../soma-rights01-contract-2026-10-11.md), runbook [recovery](../soma-provider01-backup-restore-runbook-2026-10-11.md), [INCIDENT](../soma-incident01a-runbook-2026-10-11.md).
