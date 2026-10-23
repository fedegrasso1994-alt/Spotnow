# Soma — Moderation decision freeze e nuovo gate di correlazione

Baseline: `codex/soma-schema-v2-staging`, `a233378866452f28762d7565ec610c0f04f7c86f`. Questo follow-up aggiorna i gate dell'audit precedente con le nuove decisioni founder. Nessuna migration, modifica runtime o scrittura staging in questa fase.

## Decisioni già approvate: non da riaprire

- Correggere blocco da contenuti anonimi SPOTTED e audit delle azioni; autore risolvibile internamente solo nel contesto safety autorizzato.
- Closed pilot: segnalazione/blocco interlocutore dalla chat. Nessun report del singolo messaggio. Nessuna nuova API di lettura delle chat complete; nessuna copia permanente dei messaggi nel report/audit. Eventuali futuri accessi a evidenza puntuale devono essere autorizzati server-side, minimi, on-demand e dimostrati necessari.
- Ricorsi manuali tramite canale support/privacy/safety già approvato; niente appeal center.
- Hold/action: actor, reason, created_at, current status, review_due_at, eventuale esito. Hold aperti riesaminati ogni30giorni; esiti manuali keep/release/escalate, mai auto-release. Durata massima/base/retention legali separate dal coding staging.

Il mancato report message-level non è più un blocker: il perimetro è stato deciso. Anche l'assenza di appeal center non è più un blocker di prodotto. Account operativi e validazione professionale rimangono gate operativi/pre-pilot, non nuove decisioni imposte qui.

## Nuovo conflitto riprodotto prima di implementare

Una relazione di blocco privata impedisce di leggere direttamente l'author UUID da `public.blocks`, ma questo da solo non garantisce anonimato.

Prova con fixture sintetiche in PostgreSQL/PGlite disposable, catena reale fino a QoD:

1. A ha due Match nominali, B e C.
2. B ha un post SPOTTED; il payload visto da A non espone B.
3. Si applica il normale `block_profile(B)` per misurare gli effetti che un blocco anonimo **globale** erediterebbe: non è una nuova RPC anonima e non è un workaround implementato.
4. Dal normale `my_matches_page()` scompare esattamente il Match B; C resta.
5. Se l'azione fosse presentata ad A come blocco di un autore anonimo, la scomparsa del contatto B identificherebbe quell'autore.

Evidenza: `evidence/moderation-finalization/correlation-risk.json`. Due Match prima, uno dopo; scompare quello dell'autore. Nessun ID reale, token o contenuto reale nell'evidenza. Nessuna scrittura staging.

La stessa classe di rischio può coinvolgere altre relazioni nominali, incluse richieste già ricevute e profili già conosciuti in discovery. Non affermo di aver riprodotto ogni variante: la variante Match è sufficiente a dimostrare il conflitto. Mantenere il record Match ma farne fallire autorizzazione/foto/lista non risolve la correlazione.

Questo collide con la combinazione: anonimato autore + ereditarietà degli effetti del blocco profilo + nessuna nuova semantica Match/chat. Il freeze impone STOP su un nuovo conflitto security prima di implementare workaround. Nessuna protezione viene allentata per superare il gate.

## Scelta di perimetro richiesta

Raccomandazione MVP sottoposta al founder: distinguere il blocco anonimo dei contenuti/interazioni anonime SPOTTED dal blocco esplicito di un profilo noto.

- Il primo non modifica relazioni già nominali (Match/chat/richieste già ricevute) e non viene propagato silenziosamente ai reader nominali ORA/TRIBE/profilo.
- Il secondo mantiene integralmente il blocco globale esistente, con autore/profilo già noto all'utente.
- Questa separazione evita la specifica correlazione riprodotta, ma definisce il perimetro di una funzione prodotto: non viene adottata automaticamente né dichiarata protezione universale contro ogni inferenza.

Alternativa: mantenere l'intento di blocco globale e fermarsi su un design anti-correlazione dedicato. Non promettere un blocco globale immediatamente osservabile e contemporaneamente impossibile da correlare a contatti nominali.

Domanda founder inviata tramite il controllo di input; nessuna risposta presunta per il trascorrere del tempo.

## Parti autorizzate già definite per la successiva implementazione

Queste sono indicazioni di design, non migration o runtime introdotti:

- Relazione anonima privata/RLS, senza lettura diretta o export che riveli target UUID; input contenuto opaco e risoluzione autore soltanto server. Nessun inserimento ingenuo in `public.blocks` leggibile dal blocker. Scope effettivo subordinato alla scelta sopra.
- Audit contenuti: actor server-authorized, tipo/target interno, reason categorica e transizione prima/dopo immutabili, clock server, idempotenza. Nessuna copia testo post/commento/chat nell'audit ordinario.
- Metadata di review separati dall'immutabilità dell'azione originale; esiti manuali auditati. Hold mantiene review_due_at entro30giorni dalla review/creazione, senza auto-release. Keep/escalate non ripubblicano contenuti né riattivano account; release hold non equivale a revoca ban/sanzione.
- Nessuna ricostruzione fittizia di actor/stati storici mancanti; legacy incompleti devono essere riconoscibili. Non reimpostare silenziosamente il clock di un hold già overdue.
- Riutilizzare RBAC/MFA esistente e tenere separato il dashboard Analytics read-only. Nessun accesso chat generalizzato al moderatore.
- Conservare le policy tecniche moderazione esistenti e le protezioni safety. Non applicare Analytics90giorni a safety/moderation, non inventare un nuovo TTL legale, non attivare scheduler/purge.

## Verifiche e stato

Solo diagnosi locale e documentazione. Database disposable chiuso. Nessuna fixture cloud o oggetto Storage creato; nessun nuovo grant, configurazione Auth o secret. Main/Production invariati. Suite completa725/725 PASS, build PASS, typecheck PASS; diagnosi ripetibile con `node scripts/moderation-block-correlation-audit.mjs`. Esiti nell'evidenza di follow-up e nella consegna; nessun nuovo E2E staging dichiarato.

**MODERATION FINALIZATION: BLOCKED** fino alla decisione sul perimetro del blocco anonimo. I precedenti blocker chat/ricorsi sono risolti dalle decisioni founder sopra; non vengono riproposti.
