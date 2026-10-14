# Rights Request Procedure — bozza interna

**DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH**

14 ottobre 2026 · v 0.1. [Inventario I/E/V RIGHTS](../../soma-rights01-contract-2026-10-11.md) + [estensione Bacheca](../03-lifecycle-rights-moderation-dsa.md). Nessuna categoria marcata manuale è automaticamente esclusa per legge.

## Responsabili e intake

Privacy owner [NOME], sostituto [NOME]; Federico assegna ruoli e accesso ristretto alla casella somadatingapp@gmail.com. Label separate SUPPORTO/PRIVACY/SAFETY/RICORSO, MFA/recovery e test ricezione da completare. Registrare request ID, tipo, data/fuso, stato/owner, verifiche identità, categorie richieste, percorso di risposta e calendario applicabile. Nessun caso reale o email personale nel repository pubblico.

## Verifica e delimitazione

- Accettare richieste anche se utente restricted, consenso dating revocato o account già cancellato. Non richiedere nuovo consenso per esercitare diritti.
- Usare sessione/autenticazione già disponibile quando appropriata; per richieste esterne verificare identità in modo proporzionato senza raccogliere automaticamente documenti o più dati del necessario. [Professionista valida alternative, casi ambigui e prevenzione account takeover.]
- Individuare dati conservati realmente, non ricostruire preferenze/testi già cancellati. Distinguere accesso/export, cancellazione, rettifica/limitazione/opposizione ove applicabili e ricorso di moderazione. [Validare tutti i diritti e le condizioni; nessun diniego automatico software.]

## Access/export e completezza

Automatico staging: account/profile/age/history/consent/history/photos/checkins/tribes/spots/matches/messages propri/blocks/reports/moderation più board_posts/reactions/reports propri. Owner server per pagina, export fino 10 k record/8 MiB; superamento dà errore esplicito e percorso manuale, non export silenziosamente incompleto. Non snapshot transazionale: gestire variazioni concorrenti e spiegare il periodo coperto.

Manuale V: identity provider e dati tecnici personali non segreti, ricevuti/chat contestuale, report ricevuti/dettagli e note pertinenti, foto binary complete, provider/inbox/backup/hold/evidence e altri dati riferibili non nel JSON. Redigere/limitare soltanto con motivazione professionale per diritti terzi/security, non perché il dato è in schema privato. Non divulgare identità di altri autori anonimi o segnalanti tramite un export automatico.

Escludere credenziali/token/lease/secret; distinguere questi da dati personali legittimamente accessibili. Custodire eventuale pacchetto temporaneo cifrato/accesso ristretto con expiry approvata; verificare destinatario e canale prima invio. Non allegare automaticamente foto/chat a una normale email né creare link pubblici. Nessun nuovo delivery provider approvato da questo draft.

## Delete e verifica

Normale delete-account elimina Auth/profilo, preferenza e dati prodotto, check-in/Tribe/Spot/match/chat e Bacheca/reactions/report ordinari; può eliminare conversazioni anche per il partner. FOTO segue PHOTO-02, senza originali persistenti o writer incerti purgati per timeout. Delete proprio post idempotente anche restricted, quota pubblicazione non rimborsata.

Verificare Auth non più utilizzabile, zero dati prodotto/oggetti fixture e quota attiva, job conclusi, nessun nuovo orphan. Safety evidence sopravvive solo se esplicitamente held, separata e minima. Technical receipts PHOTO 7 d se necessarie non contengono contenuti prodotto ma restano correlabili; purge al ciclo utile dopo soglia, non wall-clock mentre scheduler è in pausa. Non dichiarare successo completo se writer/cleanup incerto impedisce di provarlo; assegnare retry/manual review e riscontro.

Inbox, provider log, export già scaricati, copie peer e backup non editabili hanno processi distinti. Definire expiry copie e riapplicazione delete/revoca prima restore per evitare resurrection. Non cancellare eccezioni di safety senza decisione validata, né usare hold come conservazione indefinita di default.

## Risposta, tempi e chiusura

[VALIDARE termini, gratuità/condizioni, eventuali proroghe, comunicazione dei motivi e rimedi/autorità applicabili; inserire calendario confermato e reminder prima pilot.] La sola bozza non conferma tempi legali. Riferimento per la review: [EDPB sui diritti](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en).

Registrare copertura categorie, esclusioni motivate, prova consegna, scadenza pacchetti temporanei, esito delete e follow-up; conservare solo registro minimo con durata validata. Prova pre-pilot: richiesta complessa sintetica, delivery sicuro, A/B isolation, revoca/restricted, delete con hold/receipt, provider/mail/copie e retry. Smoke app già passato non prova l'intera procedura umana.
