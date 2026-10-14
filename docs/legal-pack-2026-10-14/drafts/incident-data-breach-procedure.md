# Incident / Data Breach Procedure — bozza interna

**DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH**

14 ottobre 2026 · v 0.1. Integra [INCIDENT-01A](../../soma-incident01a-runbook-2026-10-11.md), inventario 15 scenari e drill locale, non prova di readiness cloud. Nessun incidente reale, notifica o nuova capacità di contenimento dichiarati.

## Ruoli e preparazione mancanti

Incident owner [NOME], sostituto [NOME], tecnico recovery [NOME], professionista privacy/legale [DA INDIVIDUARE], backup owner [NOME]. Federico è il founder responsabile di assegnare ruoli e autorizzazioni; il sostituto moderazione non riceve automaticamente accesso a DB/GitHub/Vercel. Definire finestre e canale alternativo su account sano, recovery e escalation se owner indisponibile. Non dichiarare copertura 24/7.

## Procedura candidata

1. **Rilevazione e registro privato.** Assegnare incident ID, ora/fuso e fonte, sistemi/versione, sintomo e grado certezza. Separare detection, escalation, awareness e conclusione; non attendere la root cause per escalare. Nessun token, body chat, preferenze o foto nei ticket pubblici.
2. **Triage safety e dati.** Valutare accesso/divulgazione, perdita/alterazione/indisponibilità, categorie e persone potenzialmente coinvolte. Includere outing dating, venue/check-in, UGC/reveal autore, account staff, service role e CI, purge/restore errato. Un outage o ENOTFOUND locale non dimostra da solo un breach o un outage globale.
3. **Contenimento autorizzato.** Verificare progetto/ambiente e operatore sano. PHOTO pause/execute_off esistenti hanno ambito foto e possono incidere sul delete; privacy retention pause è staging. Discovery/chat non hanno un kill-switch generale dimostrato: non inventare comandi. Se API irraggiungibile, non dichiarare contenimento riuscito. Nessun purge di writer incerto/review.
4. **Accessi compromessi.** Tecnico autorizzato delimita ruoli/sessioni/chiavi/CI e dipendenze, con recovery sicuro e approvazioni necessarie. Non incollare segreti nel registro; sospendere accesso al caso, non fare un export indiscriminato dei dati per investigare.
5. **Evidence minima.** Solo sotto finalità e hold espliciti, custodia ristretta, integrità/provenienza, reviewer, review_at e retention validata. Post già identificante o accuse richiedono particolare cautela; niente duplicazione di feed/chat completi o foto originali. Backup non diventa deposito evidence permanente.
6. **Valutazione professionale.** L'[EDPB](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en) distingue incidenti e violazioni e richiama obblighi di documentazione/notifica/comunicazione dipendenti dal rischio. Il professionista definisce awareness, autorità e destinatari, contenuti e calendario applicabili; registrare anche la decisione motivata di non notificare. [INSERIRE termini legali confermati e referente autorizzato prima pilot; non usare questo placeholder per ritardare il triage.]
7. **Recovery separato DB/Storage.** Destinazione isolata prima restore, job/email/webhook/secret di produzione esclusi o disabilitati preventivamente. Ripristinare schema/release e canonicali coerenti, non originali scartati; reapply deletion/revoca/ban/expiry e revoca sessioni obsolete. Stop su missing, untracked o unknown non classificati. Drill locale non prova RPO/RTO cloud.
8. **Riapertura a gate.** Owner tecnico e founder verificano canary/smoke e rischio residuo; professionista guida comunicazioni. Admission poi cleanup/scheduler per ultimi secondo il protocollo applicabile. Non tornare a PHOTO-01 o a API meno protette dopo migration nuove.
9. **Chiusura.** Registro di causa/limiti, impatto, misure, tempi, decisioni/notifiche, recovery effettivo, azioni e riesame evidence; non promettere zero perdita o erase globale. Revisione post-incidente con task indipendenti.

## Registro minimo e prove prima pilot

Campi: incident ID, owner/substitute, detection/awareness/escalation con fuso, sistemi/commit, categorie/interessati stimati, rischio e incertezze, azioni/time/operator, riferimenti evidence opachi, decisioni professionali, approvazione riapertura, scadenza evidence e follow-up. Registro reale in custodia privata, non repository pubblico.

Da provare: handoff umano fuori finestra, recovery access, contenimento social/cache client, alert consegnato, restore cloud sintetico DB+Storage +ledger con eventi post-backup, tentativo riapertura negato se incoerente. RPO DB/Storage 24 h e RTO 4 h restano candidati, da misurare e approvare; nessun SLA imposto qui. Nessun nuovo provider o canale d'allerta attivato.
