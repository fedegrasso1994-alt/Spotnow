# DPIA — screening e struttura di valutazione d'impatto — draft

**DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH**

14 ottobre 2026 · v 0.1 · **LEGAL VALIDATION PENDING**. Non è una conclusione DPIA, accettazione del rischio o parere che esclude obblighi. Professionista e responsabile del trattamento/ruoli da qualificare, nessun DPO presunto.

## Contesto e perimetro

Federico Grasso indicato come founder persona fisica. Pilot Italia/italiano/18+, due università, >200 registrati, crescita progressiva; simultaneità/volumi di contenuti e finestra temporale pilot ancora da stimare. Core Profilo/Ora/Tribe/Spot/match/chat/foto + Bacheca 280/3 post/giorno/Tribe/reactions/report/expiry 24 h. Cupido, poll, Pulse, media UGC e AI esclusi. Università solo QR/recruiting, nessun dato individuale/admin.

## Screening da far decidere

Il [GDPR art.35](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) e l'[elenco del Garante](https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9058979) sono riferimenti per valutare rischio e necessità. Non dedurre larga scala o esenzione dal solo numero 200; il contesto dating, la precisione venue, la vulnerabilità e le combinazioni contano nella review.

| Criterio / ipotesi | Fatti e incertezze da valutare |
|---|---|
| Dati particolari/altamente personali | Preference dating trattata come alta sensibilità; inferenze da genere, relazione, foto, messaggi, UGC; possibile Art.9/10 nei report, da qualificare |
| Aspetti personali/matching | Filtri discovery e reciprocità, non scoring AI o decisioni di credito/lavoro; qualificare profiling e conseguenze effettive |
| Monitoraggio/ubicazione | QR/check-in 90 min, membership persistente e timestamp post; niente GPS o storico visite voluto; log e backup possono correlare eventi |
| Vulnerabilità |18+ autodichiarato, rischio underage elusivo, studenti e rischio outing/pressione sociale; non equiparare tutti gli universitari a maggiorenni |
| Scala e diffusione |2 università/>200/crescita, contenuti visibili a membership potenzialmente ampia; durata/estensione geografica/numero attivi da precisare |
| Combinazione set/inferenze | Auth→profilo→Tribe→post/relazione, author mapping privato e operatori privilegiati; non si scambiano dati individuali con venue |
| Innovazione/diritti/accesso servizio | App basata su luoghi, anonimato peer parziale, revoca dating distinta da UGC; verificare impatto su esercizio diritti e possibilità di scelta |

**Raccomandazione preparatoria:** sottoporre una valutazione completa al professionista prima pilot, senza concludere automaticamente obbligo o esclusione. Registrare decisione motivata, autore/data, criteri/fonti, necessità di altri specialisti, consultazioni richieste e riesame se scala/feature/provider cambiano.

## Necessità e proporzionalità da completare

Finalità separate: account/profilo/dating/presenza/community/safety/diritti/security/recovery. Per ogni dato verificare necessità, alternativa meno invasiva e condizione/base valida; consenso preference non copre automaticamente ogni UGC o inferenza. Nessuna DOB/documento, timestamp peer Ora null, niente visita Tribe, nessun roster reaction, foto normalizzate senza originali, no advertising: misure esistenti, non sufficienti da sole a stabilire proporzionalità.

Valutare membership persistente senza leave UI, dati del partner e delete chat, localStorage/cache, copy/cache provider, TTL/hold, minori e accesso interno. Definire disclosure comprensibile prima raccolta e testare comprensione dell'anonimato e dei 90 min/24 h.

## Registro rischi preliminare

| Evento / danno | Controlli disponibili | Rischio residuo preliminare e misura aperta |
|---|---|---|
| Outing/re-identificazione/stalking | RLS/no author peer/no timestamp Ora/GPS; case MFA reveal | HIGH: testo/time/piccolo gruppo/membership; precisione/disclosure UGC e safety da validare |
| Accesso illegittimo staff/service role | Staff dedicato, claim, MFA e audit; nessuna lettura generica staff sensibili | HIGH: recovery/access review/detection/config provider da provare |
| Minori o consenso non valido | AGE server, revoca NULL/versione, accountrestricted | HIGH: elusione/placeholder, misure e testo professionali prima rollout |
| Conservazione eccessiva/perdita prove | Retention parametri, hold esplicito, dry-run/replay | HIGH: hold/open indefiniti, job paused, audit cascade e backup non governati |
| Dati persi/resuscitati dal restore | PHOTO lifecycle sicuro, drill locale, runbook isolamento | HIGH: restore cloud/eventi replay non implementati, DB ≠ Storage, owner RPO/RTO mancanti |
| Molestie/doxxing/contenuti illegali | Report/hide/suspend/ban, quota, testo 280 | HIGH: notice completo, urgenze/ricorsi/copertura non pronti; blocks dating≠isolamentoUGC |
| Export/deletion incompleti o a destinatario errato | Own-only API, delete +PHOTO verificati | HIGH: categorie manuali/provider/inbox/binary/delivery e tempi da provare |
| Copies/cache/trasferimenti | Font locali candidato, noanalytics, privateStorage | HIGH: regioni/contratti/log/backup vendor e copie peer non governate dal delete app |

Valutazioni qualitative conservative, **non rischio accettato** né calcolo formale probabilità×impatto. Per ogni rischio il professionista/owner aggiunge gravità/probabilità motivate, misure ulteriori, responsabile, costo, scadenza, test, rischio residuo e decisione di procedere o fermarsi. Se restano rischi non mitigati, definire quali funzioni non aprire e quali consultazioni/azioni siano necessarie, senza dedurre approvazione da questo draft.

## Allegati e sign-off mancanti

Data map 01, decision pack LP 01–25, retention/rights/moderation 03, providerMC 01–35, matrice manuale 04, evidenze 05. Mancano contratti/versioni verificate, design backup definitivo/restore cloud, operatori e finestre, risposte legali, documenti validati e QA dispositivo.

Campi di chiusura: professionista [NOME], founder [APPROVAZIONE], eventuale ruolo DPO da valutare, esito screening [DA DECIDERE], misure/prerequisiti [ELENCO], riesame [EVENTO/DATA], riferimenti parere [PRIVATI]. Nessuna firma, nessun documento inviato o pubblicato automaticamente.
