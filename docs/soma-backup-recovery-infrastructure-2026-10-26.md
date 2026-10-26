# SOMA — Backup recovery: infrastruttura e gate locale

26 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `96e6977b4319be8ad613770a490210da161432ff`. Stato: **BACKUP / RESTORE RECOVERY: BLOCKED**. Bucket predisposto, nessun checkpoint reale o restore dimostrato. Non è chiusura del disaster recovery né pilot GO.

## Decision freeze vigente

Supersede le proposte 12h/destinazione del [piano precedente](soma-backup-strategy-isolated-restore-plan-2026-10-26.md):

- Layer A: Supabase Pro sull'organizzazione esistente, backup DB giornalieri, 7 giorni, niente PITR. L'impatto di piano sui due progetti è stato esplicitamente accettato dal founder; nessun trasferimento di progetto.
- Layer B: checkpoint logico coordinato **giornaliero**, DB + foto canoniche necessarie + manifest/checksum, retention 7 giorni. È il livello autorevole per provare coerenza; non è stato implementato/attivato da questa fase infrastrutturale.
- Destinazione approvata: GCS nel progetto SOMA `rare-array-510414-d9`. Nessun secondo progetto Supabase, nessun utilizzo del progetto Luigi.
- RPO ≤24h e RTO poche ore/stesso giorno: target non ancora dimostrati. Nessun set parziale vale come restore point.
- Founder custode recovery principale; secondo custode requisito operativo futuro, non blocker del drill tecnico. Chiave separata dal backup, mai in Git/report.
- Conferma separata al momento dell'azione: soft delete OFF sul solo nuovo bucket; conservazione minima non bloccata 7 giorni, lifecycle Delete dopo 7 giorni. Nessun blocco retention irreversibile.

## A–B. Supabase Pro e billing

Console organizzazione SPOT NOW verificata Pro dopo azione manuale founder. Costi mostrati nella verifica: 25 USD correnti, 34,73 USD proiettati per ciclo 26 ottobre–26 novembre; non importo definitivo della fattura né costo aggiuntivo GCP. Nessun piano modificato dall'agente.

Nel solo staging `zjinjtkekmaqtxsuyvho` sono ora visibili backup PHYSICAL: ultimo punto mostrato **2026-10-26 00:26:52 UTC**, precedenti 25/24/23/22/21/20/19 ottobre. La presenza in console non dimostra restore riuscito o disponibilità di bytes foto. Nessun click Restore. PITR non attivato; nessuna API/dato/config/scheduler Production toccata.

## C–D. GCS creato e verificato

| Proprietà | Stato osservato |
|---|---|
| Progetto attivo | Spot Now, `rare-array-510414-d9` |
| Billing | Link verificato in sola lettura; conto collegato. Nessuna modifica di fatturazione dall'agente |
| Budget | Founder dichiara 10 EUR/mese con alert; non è un cap automatico, non modificato/verificato in questo task |
| Bucket | `soma-staging-backups-rare-array-510414-d9` |
| Regione / classe | `europe-west1` Belgio / Standard; UI 0,020 USD/GB-mese, operazioni/traffico esclusi |
| Accesso pubblico | Impedito; console mostra Non pubblica e restrizione allUsers/allAuthenticatedUsers |
| Accesso uniforme | Attivo; niente ACL oggetto |
| Conservazione minima | 7 giorni = 604800 secondi; effective time UI 26 ottobre 12:02:44 GMT+1 |
| Lock retention | Sbloccato; nessun lock irreversibile impostato |
| Soft delete / versioning | OFF / OFF |
| Hold predefiniti / object retention | Disabilitati |
| Lifecycle | Una regola: Delete quando età ≥7 giorni, senza filtri di prefisso/suffisso |
| Cifratura provider | Chiavi gestite Google; nessun KMS/add-on acquistato |
| Contenuti | Vuoto dopo creazione; nessun file o backup caricato |

La conservazione minima impedisce cancellazioni premature finché la policy è vigente, ma un owner autorizzato può modificarla perché non è locked. Lifecycle è asincrono: registrazione può richiedere fino a24h per propagare; non costituisce prova di cancellazione fisica all'esatto secondo del settimo giorno. Soft delete OFF evita altri sette giorni dopo la cancellazione. Prova effettiva expiry ancora da eseguire, nessuna promessa di deadline rigida. [GCS lifecycle](https://docs.cloud.google.com/storage/docs/lifecycle), [soft delete](https://docs.cloud.google.com/storage/docs/soft-delete).

### IAM e revisione automatica

Il bucket aveva tre concessioni legacy predefinite alle classi Owner, Editor e Viewer del progetto. La revisione automatica ha rifiutato la rimozione congiunta delle tre entità, segnalando possibile impatto e ampiezza non conforme. **Quella rimozione non è stata applicata né aggirata.**

Alternativa più limitata: rimossa esclusivamente la concessione Viewer del bucket (Legacy Bucket Reader/Object Reader), confermata dal messaggio della console. Owner ed Editor rimangono invariati; nessun IAM di progetto modificato. La vista IAM del progetto, anche includendo le concessioni Google, mostra come entità nominativa il founder con ruolo Owner; non è stato assegnato un nuovo ruolo a nessuno.

Nessun service account, chiave, writer automatico o grant per account applicativi ADMIN/MODERATOR creato. I ruoli applicativi Supabase non diventano ruoli Google. Non dichiarare completato il least-privilege del futuro job automatico: manca ancora l'identità di esecuzione con accesso ristretto al bucket e senza delete/overwrite delle copie. Qualunque futura espansione di accesso via browser richiede conferma al momento dell'azione. Non rimuovere Owner/Editor come scorciatoia.

## E–L. Checkpoint, restore e replay: NON eseguiti

| Criterio | Esito reale |
|---|---|
| Dump DB staging | Non eseguito; solo dry-run CLI di preparazione, exit0 |
| Snapshot coerente condiviso DB/manifest | Non implementato/verificato |
| Storage byte copy | 0 oggetti scaricati/coperti da nuovo backup; 42 oggetti sorgente non mutati dal task |
| Manifest/checksum | Design definito, nessun manifest reale pubblicato |
| Cifratura applicativa / chiave recovery | Non predisposta né generata in questa fase; cifratura provider non la sostituisce |
| Upload GCS / accesso anonimo su oggetto | Nessun upload; policy pubblica verificata in console, non test GET su archivio |
| Restore isolato | Nessun ambiente avviato o creato |
| Auth/RLS e mapping bytes ripristinati | Non verificati in cloud/stack locale completo |
| Replay delete/revoca/foto/staff | Non eseguito; proof locale preesistente non sostituisce il drill |

Dry-run `supabase db dump --project-ref zjinjtkekmaqtxsuyvho --dry-run`: prepara un percorso pg_dump con autenticazione temporanea CLI; non è un dump dati e non prova snapshot/completezza. Output gestito esclusivamente in file ignorato 0600 e rimosso; nessuna connection string o valore credenziale stampato o committato. Non chiedere password in chat né leggere file secret preesistenti come workaround.

Per la ripresa: usare un unico snapshot PostgreSQL consistente per dump e inventario referenze; le parti non possono essere estratte con snapshot indipendenti e dichiarate coerenti. Copiare solo bytes autorizzati necessari al cutoff, verificare SHA-256, abortire su oggetto mancante o writer non classificabile senza cambiare grace PHOTO. Cifrare archivio e manifest prima dell'upload; pubblicare il checkpoint solo dopo verifica integrale. Sei asset non attribuiti alla proiezione ledger e tre review storiche restano da riconciliare/preservare, non diventano oggetti eliminabili per il backup.

Ripristino prima in quarantena: nessuna importazione di cron/net run state, Vault, secret esterni, email/push/webhook; nessun vecchio token/sessione riammesso. Riprodurre cancellazione account, revoca consenso, replace/delete foto e revoca staff dopo cutoff con prova autorevole; assenza di registro/reconciliation completa blocca la riapertura. Nessun sistema di replay è stato creato implicitamente da questo report.

## M–O. Blocker attuale e minimo passo successivo

Manca il runtime di restore isolato sul Mac: Docker, pg_dump e psql non risultano disponibili nel PATH/percorsi standard controllati. Nessuna installazione eseguita.

È stata valutata l'alternativa nativa descritta dai documenti Supabase attuali. La CLI disponibile non espone `stack start/init` o `--runtime` nell'help effettivo: tali richieste restituiscono l'help root, non un'istanza avviata. Non trattare exit0/help come prova di funzionalità. Nessuna stack inizializzata, nessun fallback cloud usato. [Runtime Supabase](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).

**Azione manuale richiesta:** installare e avviare Docker Desktop dal [sito ufficiale](https://docs.docker.com/desktop/setup/install/mac-install/), accettando personalmente termini ed eventuali permessi del sistema. Non acquistare un piano né creare account esterni per questo passaggio. Se la licenza applicabile richiede costo, STOP prima di accettare/acquistare. L'agente non accetta accordi legali per il founder. Dopo conferma operatività, verificare daemon e isolamento prima di export reale; utilizzare directory e porte loopback dedicate, non l'attuale progetto locale e non un clone fisico.

Installazione Docker non chiude da sola il task: restano implementazione checkpoint cifrato, accesso programmatico minimo, replay, restore/schema/Auth/Storage e prove specifiche. Nessun RPO/RTO misurato o dichiarato raggiunto.

## P–T. Verifiche, file e Git

- Test mirati ops/inventory/staff: **12/12 PASS**.
- Full suite: **806/806 PASS**, zero fail/skip/cancel.
- Build PASS, typecheck PASS. Nessun codice runtime o test modificato.
- Corruption/hash mismatch, partial backup, cifratura e restore del nuovo motore: **NON eseguiti**, perché il motore non è stato implementato. Non confondere la suite prodotto verde con recovery riuscito.
- Modifiche cloud applicate: nuovo bucket, impostazioni di protezione/cifratura provider, lifecycle e sola rimozione della concessione Viewer bucket. Nessun altro ruolo/secret/progetto/API creato o cambiato; nessun deploy, job o PITR attivato.
- Supabase: nessun dato prodotto/Storage/PHOTO o schema mutato; sola CLI auth/dry-run. Main e Production invariati. Bucket vuoto lasciato intenzionalmente pronto; nessun account fixture o ambiente restore creato.
- File: questo report, [evidenza minimizzata](evidence/ops-phase-a/backup-recovery-infrastructure-2026-10-26.json), link nello stato OPS e nel piano candidato. Screenshot di console solo temporanei locali, niente segreti/copie dati nei documenti. Commit/push solo branch staging; SHA finale in Git/consegna.

**BACKUP / RESTORE RECOVERY: BLOCKED**
