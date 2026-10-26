# SOMA — Backup strategy + isolated restore plan

26 ottobre 2026. Baseline `df544c34413e4c69e29f9c7e21cebc60dde96c0b`, branch `codex/soma-schema-v2-staging`. **Strategia candidata, non attivazione.** Nessun acquisto, nuovo progetto/provider, dump reale, download foto, backup job, modifica PHOTO o accesso Production.

**BACKUP STRATEGY: READY FOR DECISION** significa che le opzioni e le autorizzazioni necessarie sono definite. Il gate precedente di disaster recovery resta **BLOCKED** fino al drill cloud e alla verifica dei bytes.

## Baseline ed evidenze

- Letti Product/UX source of truth, [OPS](SOMA_OPS_RECOVERY_SUPPORT_PREPILOT.md), [audit recovery live](soma-backup-restore-vercel-rollback-2026-10-26.md), [runbook candidato precedente](soma-provider01-backup-restore-runbook-2026-10-11.md), PHOTO/Storage, [Retention Phase A](soma-retention-phase-a-scheduler-staging-2026-10-23.md) e [Observability](soma-observability-mvp-staging-report-2026-10-23.md).
- CLI staging rilette in questo task: `backups:null`, physical backup data vuoto, PITR false, regione `eu-west-1`, `walg_enabled:true`; branch isolati zero. Il flag WAL-G non prova un punto recuperabile. Piano Free verificato nella console nell'audit odierno precedente; nessun nuovo piano assunto.
- Baseline Storage dell'audit precedente, non nuova scansione bytes: 42 metadata objects, bucket privato `profile-photos`, 4 foto correnti, current/variant missing metadata 0. Sei oggetti referenziati da asset richiedono riconciliazione ledger; tre writer review vanno preservati. Nessuno è classificato eliminabile da questa strategia.
- Cron Phase A esistente `0 3 * * *`: non modificato. PHOTO cleanup/scheduler, Discovery e Notifications delivery restano negli stati OFF precedentemente verificati, non nuovamente attivati o attestati da un dump. Nessuna configurazione viene sincronizzata tra ambienti.

## A. Opzione provider-managed

Pro parte da **25 USD/mese**, con credito compute di 10 USD; progetti Micro aggiuntivi da 10 USD/mese, consumi e tasse esclusi. Pro include backup DB giornalieri conservati 7 giorni. Questi sono prezzi pubblici, non preventivo della specifica organizzazione né autorizzazione di spesa. [Pricing ufficiale](https://supabase.com/pricing).

PITR è add-on: finestra 7 giorni circa **100 USD/mese**, richiede almeno Small compute; non lo raccomando come primo acquisto per il target RPO 24h. È recupero DB, non Storage. Il piano Free non risolve il gap di backup gestito; Pro non garantisce RTO di poche ore. [Backup e PITR](https://supabase.com/docs/guides/platform/backups).

Restore-to-new-project richiede piano a pagamento e physical backup; copia anche Auth e chiave root di cifratura. Non copia bytes/configurazione Storage, Edge e impostazioni Auth/API. Il costo del nuovo progetto dipende dalle risorse replicate. Il clone fisico può avviare cron/pg_net subito: **non usarlo per il drill SOMA finché non è garantito contenimento preventivo**. [Clone ufficiale](https://supabase.com/docs/guides/platform/clone-project).

Una Preview branch non equivale a restore di backup con provenienza. La sua tariffazione è distinta: Micro da 0,01344 USD/ora più uso, non coperto dai compute credits. Non creare branch per aggirare il gate costi/isolamento. [Branching](https://supabase.com/docs/guides/platform/manage-your-usage/branching).

## B–C. Confronto e raccomandazione

| Strategia | Copertura | Costo mensile candidato | Setup/manutenzione | Confidence dopo collaudo | Pilot ~1000 utenti |
|---|---|---|---|---|---|
| A: solo Pro gestito | DB giornaliero, niente bytes foto | Base pubblica 25 USD + eventuali progetti/consumi | Bassa per DB | Non basta al servizio completo | Insufficiente da sola |
| B: solo application-level governato | DB logico completo + bytes se implementati | Nessun piano extra obbligatorio per definizione; media/runner/egress/tempo operatore da quotare | Più alta: copertura Auth, snapshot, cifratura, expiry, retry, alert | Dipende interamente dal processo proprio | Possibile, più rischio operativo; non scegliere per il solo costo |
| C: ibrida, raccomandata | Pro DB + recovery set logico/bytes cifrato, copia separata | Base Pro + destinazione/runner/media + progetto drill temporaneo; totale non ancora quotabile | Media; un recovery set coerente e controllo umano | Ridondanza DB e prova end-to-end; nessuna garanzia prima del drill | Miglior compromesso candidato |

**Raccomandazione C:** Pro per il DB operativo; recovery set coerente DB logico + sole foto canoniche necessarie, cifrato fuori dal progetto sorgente. Nessun PITR iniziale salvo RPO più stretto approvato. Non basta abbinare arbitrariamente l'ultimo backup DB provider all'ultimo export Storage: i cutoff devono coincidere o la differenza deve essere riconciliata e dichiarata.

Destinazione non selezionata né creata:

| Destinazione candidata | Beneficio | Limite / decisione |
|---|---|---|
| Supporto offline cifrato dedicato sotto controllo founder | Nessun nuovo provider/account; separazione da cancellazione cloud | Non normale cartella laptop sincronizzata; disponibilità, furto/incendio, chiavi, turnazione e operatore ancora da approvare |
| Progetto Supabase separato, bucket privato | Provider già noto, automazione possibile | Nuovo progetto/costi autorizzati prima; stesso account/provider non indipendente da compromissione totale; accessi separati da verificare |
| Object storage privato separato / servizio backup | Possibile isolamento account/provider | Nuovo provider, contratto, regione/trasferimenti e costi: confronto/approvazione esplicita, STOP prima di scelta/acquisto |

Per il primo proof si raccomanda **solo sintetico locale**, poi progetto temporaneo isolato dopo approvazione. Per backup regolari pilot serve una destinazione raggiungibile in modo affidabile: il solo Mac personale offline non soddisfa una cadenza automatica. Nessun runner o nuova credenziale viene introdotto qui.

## D–F. Contratto candidato dei recovery set

Tutte le durate/cadenze di questa sezione sono **PROPOSTE DA APPROVARE**, non policy già attive.

| Copia | Cadenza proposta | Retention proposta | Completezza / integrità |
|---|---|---|---|
| DB provider Pro | Giornaliera gestita dal provider | 7 giorni del piano | Timestamp effettivamente recuperabile verificato; restore di prova richiesto |
| Recovery set logico DB + bytes | Ogni 12h | 7 giorni dal cutoff, niente settimanali/mensili permanenti | Pubblicare completo solo dopo export DB, bytes e manifest coerenti verificati |
| Set temporanei incompleti | Retry esplicito limitato | Rimozione entro 24h proposta | Mai pubblicati come restore point; delete verificata e senza intaccare un set valido |
| Ambiente/file di drill | Solo durante prova autorizzata | Eliminare al termine, massimo 24h proposto | Prova distruzione destinazione corretta + copie temporanee; nessun log con contenuto |
| Journal minimo di replay | Continuo prima di riaprire recovery | 8 giorni proposti, condizionati alla massima età effettiva dei backup | Copre tutti i set ancora recuperabili; fail-closed se gap o hold/revoca non riproducibile |

La cadenza 12h lascia margine operativo rispetto a 24h; è una scelta da approvare, non un nuovo scheduler. A 24h senza margine un solo ritardo supera il target. Verificare età dell'ultimo **set completo con punto coerente**: warning candidato oltre 12h, gate recovery degradato oltre 24h; canale/presidio da approvare, nessun alert nuovo attivato. Una schedule non garantisce un backup riuscito.

Backup non deve conservare dati indefinitamente. Le durate 90d Analytics, 14d diagnostics, 30d DD e 7d receipt PHOTO restano quelle attive: questa proposta riguarda copie disaster recovery segregate, non ripristino di dati già scaduti nell'app. Il professionista deve validare l'eventuale ritardo di cancellazione nelle copie immutabili. Nessun uso ordinario/analytics/discovery dei backup. Nessun safety hold prolunga automaticamente l'intero backup; si gestiscono solo evidenze minimali nel percorso safety autorizzato.

### DB: contenuto e tracciabilità

Schema applicativo pubblico/privato, dati, grants/RLS/RPC/triggers, estensioni richieste, Auth identities/account/MFA necessari al recovery e metadata Storage devono essere mappati separatamente. Conservare versione PostgreSQL/CLI, commit schema/Edge, versione policy, timestamp UTC/cutoff, conteggi per categoria, versione catalogo e digest cifrato del set. La migration history ha 36 versioni storiche non registrate: ricostruzione spiegabile, nessun repair cieco.

Un semplice dump schema `public` o un comando CLI predefinito non prova copertura Auth/Storage/private/migration history. Prima del codice costruire una lista esplicita include/exclude e verificare il formato con restore fail-fast; lo schema gestito Supabase va inizializzato da versione compatibile, poi le customizzazioni applicative ripristinate separatamente. [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Non aggiungere comandi di export reale finché architettura e autorizzazione non sono approvate.

Escludere dal payload ripristinabile normale Vault, password di ruoli cloud, signing/service-role/SMTP/VAPID/dispatch secret, credenziali esterne, code HTTP pronte, cron attivi e sessioni/refresh token riutilizzabili. Auth password hash/factor sono dati di autenticazione altamente sensibili, non credenziali cloud: eventuale loro copia per recovery reale richiede gestione cifrata e procedura provider verificata. Non promettere ripristino MFA da un export che omette la chiave necessaria a decifrarne i campi. Drill sintetico usa credenziali/factor nuovi, mai quelli degli staff esistenti. Secret esterni ricreati da custode autorizzato, non dal dump.

### Storage: selezione, manifest e consistenza

Solo bucket `profile-photos` nel perimetro attualmente provato; fallire in presenza di nuovi bucket finché inventariati. Selezionare base canonicale e varianti effettivamente referenziate dalle foto correnti al cutoff, con owner tecnico e corrispondenza ledger/asset/manifest. Non contare nomi file come prova di ownership. Non copiare originali deliberatamente scartati, draft, ready non pubblicati, file parziali o oggetti retired eleggibili. Review/unknown e i sei oggetti da riconciliare restano intatti nella sorgente: non copiarli automaticamente come foto correnti né promettere loro copertura. Documentare questa esclusione per un recovery completo o risolverne la classificazione prima di approvare il set reale.

Manifest cifrato per ogni oggetto: bucket/key sorgente immutabile, mapping di destinazione, riferimento tecnico al photo set/owner, ruolo variante, MIME, dimensione, SHA-256 calcolato sui bytes e confrontato con evidenza autorevole dove presente, cutoff/set ID e versione schema. Niente signed URL, nomi, email o contenuti nel catalogo operativo esterno. Il mapping è dato personale tecnico e segue cifratura/expiry del set. Ricevute PHOTO necessarie restano parte del DB secondo il lifecycle esistente; nessuna proroga dei loro 7 giorni nel DB attivo.

DB snapshot consistente → materializzare referenze al cutoff → leggere bytes e verificare hash → validare manifest → cifrare e pubblicare catalogo atomicamente. Con delete/replace concorrente un oggetto può sparire durante copia: **abortire il set**, non allungare grace, trattenere writer o bypassare PHOTO. Una foto cambiata dopo cutoff non sostituisce implicitamente quella del set. Se il processo non può completare entro le condizioni esistenti, serve una nuova decisione tecnica prima di alterare lifecycle; non dichiarare backup completo con file mancanti.

I file non correnti esclusi possono ancora esistere nel DB ripristinato: devono essere classificati e riconciliati in quarantena prima di cleanup o accesso. Il recovery non deve ricreare un worker/job incerto sulla sola base del vecchio timestamp.

## G. Sicurezza e ownership

Founder Federico approva budget/destinazione e nomina operatore backup e sostituto (sostituto attualmente non definito). Custode della chiave recovery e owner di restore espliciti, accessi minimi e auditati; app ADMIN/MODERATOR non ottengono raw DB/backup. MFA console, TLS in transito, cifratura autenticata dei set prima della destinazione e media cifrato a riposo. Chiave fuori da archivio/repository e disponibile attraverso procedura di recupero verificata: la perdita della chiave equivale a perdita del backup. Algoritmo/libreria già supportati da scegliere nell'implementazione, nessuna crittografia ad hoc.

Digest verifica integrità, non autenticità: autenticare manifest/ciphertext e proteggere catalogo da riscrittura. L'operatore sorgente non deve poter cancellare senza controllo tutte le copie. Validare limiti reali dei ruoli provider prima di promettere isolamento IAM. Registro accessi con set ID/stato/tempi/error class, senza dump, path pubblici o UGC. Telemetria diagnostica segue i 14 giorni già approvati; un nuovo registro di replay richiede schema/accesso/retention da approvare prima dell'implementazione.

## H–I. Restore isolato: sequenza e acceptance

1. Autorizzazione nominativa: source solo staging `zjinjtkekmaqtxsuyvho`, destination ID diverso e confermato due volte. Rifiutare ref Production, destinazione corrente staging, nomi ambigui, costi non approvati. Nessun overwrite del source.
2. Creare destinazione **solo dopo approvazione**, stessa regione SEE se disponibile, progetto separato con credenziali nuove. Quarantena prima dell'import: nessuna pubblicazione frontend, nessun cron/pg_net/webhook/SMTP/push/integration source. Il clone fisico non offre esclusione preventiva: preferire logico selettivo. Senza contenimento provato STOP.
3. Primo drill con due identità sintetiche e foto valide sintetiche, membership, match/chat, consensi, contenuto anonimo e hold minimali. Nessun trasferimento utenti/post/foto esistenti o account operativi. Usare schema versionato e soli cataloghi Place sintetici, non dump per poi anonimizzare.
4. Aprire ciphertext autenticato, verificare integrità prima del parsing; restore in ordine schema/config OFF → fixture dati/identità → dipendenze/grants/RLS → bytes tramite API Storage in bucket privato. Nessun INSERT diretto nei metadata Storage per fingere upload riuscito. Errori fermano il restore; mai ignorare conflitti indiscriminatamente.
5. Replay post-cutoff di delete, revoca consenso, revoca ruolo/sessioni, ban, hold e purge eleggibili; journal separato dal DB perso con sequence/cutoff e conferma completezza. Gap = nessuna riapertura. Tutte le sessioni pregresse restano inammissibili; sessioni fresche/MFA per staff dopo nuove fence. Il solo ripristino 055 non basta se anche i suoi dati tornano indietro.
6. Verificare tabelle/FK/conteggi e schema/RLS/RPC/grants attesi, hash bytes, MIME/dimensioni, mapping/quota/current, owner-only e denied utenti non autorizzati, anonimato UGC, validità hold e nessun writer/job risuscitato. Safety/legal review resta separata.
7. Nuovo login sintetico sul target (non sessione source), MFA dove previsto, profilo/foto/access/export/delete, social minimo e nessun egress source. Frontend di prova con ref target esclusivo; credenziali nuove. Provider Auth/Storage cloud non sono provati da PGlite. Se non esiste percorso auth sicuro supportato, segnare il criterio non verificato.
8. Misurare cutoff ed elapsed fino a servizio realmente utilizzabile; verificare che il source sia rimasto invariato. Eliminare esclusivamente destinazione e copie temporanee autorizzate, verificare chiusura accessi e nessuna fixture nel source. Conservare solo esiti minimali.

Acceptance richiesta: tutti i passi PASS, timestamp noto, zero riferimenti correnti mancanti, hash bytes identici, accesso pubblico negato, nessun account/consenso/sessione cancellato risuscitato, zero chiamate esterne non autorizzate, nessuna modifica al source. Poi testare set incompleto/corrotto negato, retry senza duplicati, interruzione/ripresa, replace/delete concorrente, scadenza copie e chiave recovery indisponibile. Nessun criterio soddisfatto per il solo HTTP 200.

## J. Failure-mode matrix

| Guasto | Sintomo | Ordine recovery / riconciliazione | Perdita attesa |
|---|---|---|---|
| A: DB perso, Storage sano | Auth/RPC/ledger indisponibili, bytes ancora presenti | Quarantena, restore DB coerente, replay, verificare referenze bytes; nessun purge degli oggetti più recenti senza evidenza | Dal punto coerente valido al guasto; ≤24h solo con target provato |
| B: Storage perso, DB sano | GET falliti con metadata/current presenti | Preservare DB, recuperare bytes ancora necessari dal set, confrontare mapping/hash; non ripristinare DB vecchio per default | Foto create dopo copia possono non essere recuperabili; niente pixels da hash |
| C: entrambi persi | Source DB e bytes non leggibili | Restore logico + bytes dello stesso set completo, replay prima di riaprire | Punto coerente comune, non il più recente di uno solo |
| D: perdita parziale | Solo alcuni current/varianti falliscono | Riconciliazione puntuale, recuperare solo oggetti autorizzati; non sovrascrivere foto nuove | Oggetti senza copia richiedono gestione utente successiva approvata |
| E: backup bytes più vecchio del DB | DB contiene key nuove assenti nel set | Non fare rollback DB sano alla cieca; recupero selettivo, marcare missing e tenere percorso interessato chiuso; non pubblicare vecchia foto come corrente senza decisione | Novità successive alla copia, da quantificare |
| F: migration mismatch | Restore/RPC/RLS/grants incompatibili | Stop prima dell'esposizione; scegliere release compatibile e mappa migration spiegata; non tornare al writer PHOTO-01 | Nessuna stima di RTO finché incompatibilità non risolta |

## K–M. RPO/RTO e decisioni necessarie

RPO ≤24h, RTO poche ore/stesso giorno: **candidati, non dimostrati**. Backup giornaliero provider non garantisce da solo RPO≤24h in presenza di ritardi/failure, né coerenza con Storage. Set ogni12h + controllo età + copia separata + drill cronometrato è la mitigazione minima proposta; non attivata. La copertura umana e il tempo di recupero chiave/provider fanno parte dell'RTO. Nessuna promessa 24/7.

Decisioni founder richieste prima del codice operativo:

1. Approvare strategia C e budget Pro (organizzazione/progetti esatti da verificare prima dell'upgrade; nessuna modifica Production implicita). Upgrade di un'organizzazione condivisa potrebbe incidere su altri progetti: ottenere consenso sul perimetro reale prima del billing.
2. Scegliere destinazione e runner: supporto offline governato per proof, oppure progetto separato per automazione; un nuovo provider richiede ulteriore autorizzazione. Confermare custode chiave, operatore e backup owner.
3. Approvare o correggere 12h/7d, temporanei24h e journal8d, separati dalle retention prodotto; validazione professionale di copie immutabili e replay prima del pilot.
4. Autorizzare separatamente progetto drill temporaneo, regione, costo massimo e distruzione finale. Nessuna autorizzazione di questa fase consente dump di utenti reali.

Passi tecnici successivi, **non eseguiti**: specifica include/exclude Auth e matrice migrazioni; design journal indipendente e schema/API da segnalare prima; implementazione worker piccolo con test checksum/AEAD/restore parsing/expiry/concorrenza; proof locale bytes su file sintetici; cloud drill isolato; solo dopo prove autorizzazione di backup regolare/scheduler. Nessun ad hoc exporter introdotto prima della scelta. Nessuna acquisto necessario per valutare il piano; acquisto/creazione cloud necessari per il percorso gestito proposto richiedono esplicita autorizzazione.

## N–R. Prove e file

Prova sicura riutilizzata e rieseguita: `tests/ops-readiness.test.js` ripristina snapshot sintetico in un secondo PGlite, dimostra gate ON/dati cancellati risuscitati e quarantena, bytes separati in memoria. **Non è export file cifrato, test SHA del backup, ripristino Supabase Auth/Storage o drill cloud.** Questi test specifici del futuro exporter non esistono perché non è stato implementato: non dichiararli PASS.

Targeted ops/inventory/staff: 12/12 PASS. Full suite: **806/806 PASS**, zero fail/skip/cancel. Build PASS; typecheck PASS; risultati nell'evidenza di questo task. Nessun nuovo script/test/runtime/migration/provider; solo questo piano, collegamenti ai runbook e riepilogo evidenze. Nessuna fixture cloud creata e nessun dato reale copiato.

Evidenza: [backup-strategy-2026-10-26.json](evidence/ops-phase-a/backup-strategy-2026-10-26.json). Commit/push sul solo branch staging; SHA finale nella consegna/Git. Main e Production invariati. Recovery operativo resta bloccato finché le decisioni e le prove mancanti non sono chiuse.

**BACKUP STRATEGY: READY FOR DECISION**
