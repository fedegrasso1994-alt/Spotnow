# Privacy Policy — Soma — bozza per revisione

**DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH**

14 ottobre 2026 · v 0.1 · **non descrive una policy già pubblicata**. Testo candidato per il prodotto integrato staging, non una promessa sul deploy attuale. Le annotazioni tra parentesi quadre sono obblighi di completamento prima di qualsiasi pubblicazione.

## Chi gestisce Soma e come contattarci

Il founder ha indicato Federico Grasso, persona fisica, e il recapito somadatingapp@gmail.com per assistenza, privacy, safety e ricorsi. [VALIDARE identità, ruolo, recapiti completi e informazioni da pubblicare; nessuna società o DPO è stato dichiarato. Verificare sicurezza e operatività della casella.]

## A chi si rivolge il servizio

Soma è progettata per maggiorenni. Il primo pilot previsto si svolge in Italia, in italiano, presso due università e con crescita oltre 200 registrati. L'accesso richiede età numerica almeno 18 e dichiarazione esplicita; non raccogliamo data di nascita o documenti e la dichiarazione non è una verifica indipendente dell'età. [VALIDARE misure, gestione sospetti minori e raccolta preprofilo.]

## Dati e finalità proposte

| Dati | Uso descritto nel candidato | Base/condizione da completare |
|---|---|---|
| Identità Auth, email, sessione | Accesso e recupero account; Google può restituire identificativo, nome/avatar oltre all'email | [LP03/16: base e ruoli effettivi] |
| Nome di presentazione, età, genere, foto; professione/corso facoltativo | Profilo, riconoscimento e presentazione ai destinatari autorizzati | [LP02/03/05: finalità, necessità e condizioni] |
| Preferenza dating | Discovery e matching secondo il prodotto | [LP05/06: Art.6 e condizione Art.9, testo separato validato] |
| Check-in, venue, Tribe | Ora e community del luogo, non GPS o cronologia continua | [LP07/08] |
| Spot, match, messaggi, blocchi | Contatti reciproci, conversazioni e protezione | [LP09, inclusi dati di terzi/contenuti sensibili] |
| Post, reaction, report Bacheca | Community anonima ai peer, interazioni aggregate, safety | [LP11/12/21; il consenso dating non copre automaticamente ogni UGC] |
| Stato età/consenso, moderation/hold, metadata tecnici | Prova minima, diritti, integrità, prevenzione abusi e gestione casi | [LP04/06/12–15: condizioni e tempi] |
| Metadati rete/provider, supporto, copie recovery | Funzionamento, supporto e ripristino | [LP16–20: dati realmente trattati e accordi/TTL] |

Non sono previsti advertising SDK, rubrica, GPS, riconoscimento facciale o AI per Cupido/moderazione nel pilot. I testi scritti liberamente possono contenere dati personali propri o di terzi: evitare informazioni identificanti o intime non necessarie. [VALIDARE trattamento di contenuti spontanei e inferenze, non solo del campo preference.]

## Presenza e visibilità

Il check-in tramite QR abilita Ora per 90 minuti. Agli altri mostriamo “Qui ora”, senza orario preciso di check-in/scadenza; il server usa internamente i propri timestamp. La Tribe può restare anche dopo il check-in: appartenenza non significa essere sul posto adesso. [Validare permanenza membership e diritti granulari; il QR può essere condiviso e non garantisce presenza fisica.]

Bacheca è riservata ai membri autorizzati della stessa Tribe. Non mostriamo autore, avatar, identità dei reagenti o preferenze dating nel feed; Soma mantiene l'attribuzione interna. Staff autorizzato con MFA e caso valido può conoscere l'autore, con audit. Il contenuto, i tempi e il contesto possono comunque rendere riconoscibile chi scrive: **non promettiamo anonimato assoluto**. Le venue non ricevono liste utenti, match, chat o report né accessi amministrativi.

## Consenso dating e scelta di revoca

La scelta proposta è separata da Terms/Privacy e versionata. Revocando il consenso dating la preferenza viene cancellata e non usata per nuove discovery/matching dipendenti; nessun fallback a ALL. Match e chat già esistenti non vengono cancellati automaticamente. Bacheca resta disponibile se sussistono gli altri requisiti. [VALIDARE conseguenze, prova/versione e testo; non è il consenso legale definitivo.]

## Conservazione e cancellazione

[INSERIRE SOLO DURATE VALIDATE da LP15, coerenti con configurazione effettiva e procedura interna.] I post cessano di essere restituiti dal server dopo 24 ore; il purge fisico avviene al primo ciclo utile, salvo report aperti/hold. Le copie già ricevute non sono richiamabili e l'aggiornamento di uno schermo già aperto ha limiti da risolvere/spiegare prima pubblicazione.

Delete account elimina i dati prodotto e le foto secondo lifecycle sicuro; può eliminare match/chat anche per il partner. Possono restare temporaneamente receipts tecniche minime oppure evidence sotto hold esplicito, senza uso prodotto. Backup non immediatamente modificabili, log provider, inbox e copie dei destinatari hanno percorsi distinti: non promettere erase istantaneo ovunque. [Completare tempi, accessi, motivi ed eccezioni validate.]

## Fornitori, accessi e trasferimenti

Supabase tratta DB/Auth/Storage/processing; Vercel hosting/CDN; Google l'autenticazione OAuth. Gmail è usato per il workflow manuale di contatto, non come API runtime. GitHub e strumenti di sviluppo ricevono codice e dati sintetici, non sono destinatari ordinari dei contenuti utente. [VERIFICARE accordi, ruoli, subprocessor, localizzazione di ogni copia e trasferimenti/meccanismi applicabili: regione DB Irlanda non prova che tutto rimanga nel SEE. Nessun SMTP custom scelto per effetto di questo draft.]

## Diritti e tecnologie del dispositivo

L'export automatico copre dati propri conservati e non espone identità degli autori anonimi altrui. Ulteriori dati o richieste complesse, comprese conversazioni, foto, log e copie esterne, richiedono procedura manuale e valutazione dei diritti di terzi. Access/export/delete restano disponibili anche restricted o con consenso revocato, secondo il percorso tecnico e gli eventuali incidenti da gestire. [VALIDARE tutti i diritti applicabili, verifica identità, termini, limitazioni motivate, rimedi e autorità competente; nessun diniego automatico dalla sola esclusione UI.]

Usiamo sessione locale Auth, stato QR/navigazione/installazione e cache foto necessaria al flusso. [Inventariare cookie/localStorage e telemetry vendor, distinguere strettamente necessario da usi opzionali e definire disclosure/consenso applicabili.] Non dichiarare il sito “senza cookie o tracciamento” senza verifica completa.

## Prima di pubblicare

Professionista valida tutte le parentesi, tabella finalità/basi, destinatari/trasferimenti, diritti/autorità/tempi e retention. Founder verifica che testi, versioni, contatti e configurazioni coincidano con ciò che sarà realmente pubblicato. Questo file resta fuori runtime e non costituisce consenso o informativa vigente.
