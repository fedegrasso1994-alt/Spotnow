# PHOTO-02 — ripresa e arresto controllato, 10 ottobre 2026

**NO-GO alla riapertura globale: smoke incompleti.** Produzione nuovamente
PAUSED, epoch4; admission, execute/cleanup e scheduler OFF. Nessuna migration,
funzione o frontend riapplicato; nessun rollback o modifica PHOTO-01.

## A–B. ENOTFOUND e connettività

Riprodotto ENOTFOUND nel sandbox per tutti e tre gli host provati: endpoint
Supabase, supabase.com e github.com. Eseguendo la stessa diagnosi con l'accesso
rete autorizzato fuori dal sandbox, tutti risolvono. Endpoint configurato
corretto: `qlucwdjcjomwyziegxrn.supabase.co`. Auth/REST senza apikey rispondono
401 (gateway raggiunto); Storage status200. Successive richieste autenticate
read-only a Auth admin, profili REST, bucket Storage e photo_cutover_status
sono passate. Questo classifica il problema riprodotto come restrizione locale
del runner/sandbox, non come errore dell'URL o outage Supabase. Non sono stati
cambiati DNS, endpoint o configurazioni di produzione.

## C. Gate preliminari e canary

Baseline iniziale invariata: 1account/profilo, una foto current, 3oggetti;
nessun missing/orfano/unknown/review/inflight/delete pendente. Runtime019ready.
Impronte foto e catalogo Storage reali identiche al precedente report.

Creati due account sintetici con metadata photo02_fixture e purpose specifico;
nessun account reale usato per test. Upload in PAUSED restituisce503 PAUSED,
no-store. begin_photo_upload e bridge_begin legacy rifiutano PHOTO_PAUSED.
Collector execute OFF restituisce503; chiamata non amministrativa è negata.
Scheduler configurato autenticato OFF. CANARY è stato aperto esclusivamente
ai due UUID sintetici; admission globale non è mai stata aperta.

Creata venue QR sintetica separata per i journey; nessuna venue reale modificata.

## D. Smoke e gate che ha causato lo stop

PASS live: JPEG, PNG, WebP; pubblicazione e lettura canonical/detail/thumbnail;
replace con foto precedente leggibile; file invalido422 con foto corrente
preservata; retry valido200; retry dello stesso nonce restituisce lo stesso path.

Il test combinato discovery/social ha fallito prima di Spot/match/chat/delete.
È stata eseguita **subito pausa**, senza proseguire ad approve_smoke/open/cleanup.
La diagnosi successiva è stata esclusivamente read-only.

**Causa dimostrata: asserzione errata del nuovo harness, non evidenza di una
regressione Ora.** Il test chiedeva che lo stesso peer attivo apparisse sia in
live=true sia in live=false. Il contratto SQL014 filtra invece
`(coalesce(c.expires_at>now(),false)=live)`: false è la discovery dei membri
offline. Con entrambi i check-in attivi:

- live=true: 1peer sintetico, timestamp di presenza null;
- live=false: 0peer (comportamento corretto);
- my_tribes: venue presente, member_count2 e live_count2.

Corretta **solo l'asserzione del test**: peer attivo presente in live=true,
assente in live=false; appartenenza Tribe verificata da my_tribes. Nessuna
modifica alla logica dell'app per far passare il test. Lo smoke corretto non è
stato rieseguito in questo tentativo, rispettando lo stop al gate fallito.

`Profilo` in questi smoke indica pubblicazione, lettura profilo e asset reali;
non è un collaudo manuale su ogni dispositivo. QR e Ora sono stati raggiunti
tramite RPC reali; Tribe è confermata nella diagnosi read-only. Non conteggiare
il journey combinato come completamente passato.

## E–H. Stato finale e fixture preservate

| Controllo live finale | Risultato |
|---|---|
| Phase/admission | PAUSED / OFF |
| Execute cleanup / scheduler | OFF / OFF |
| Account/profili | 3: uno reale invariato, due sintetici |
| Storage | 18: tre reali invariati, quindici copie canonical/varianti sintetiche |
| Ledger | 3current, 3retired, 1failed settled (file invalido) |
| Missing / orfani / writer unknown o review | 0 / 0 / 0 |
| Legacy inflight/unknown, delete pending, account cleanup pending | tutti0 |
| Scheduler attivi production | 0 |
| Owner quota contabilizzati | 3 |
| Massima somma reserved_bytes+32000 per owner | 13.807.598 byte, sotto128MiB |

La quota risulta coerente con le riserve conservative e senza oggetti non
attribuiti. Questo **non è ancora il test della soglia128MiB**. I failed/retired
sintetici sono deliberatamente conservati nel ledger e non sono orfani:
cleanup e scheduler restano disabilitati. Non purgarli fuori dal lifecycle.

Impronte baseline reale ancora `481b0f016cdb54faae1218e1442fc4e5` (foto) e
`dac9a189fe97289fac5d32823e72726b` (catalogo Storage). Nessuna foto reale persa,
sostituita o cancellata. Nessun worker incerto da risolvere sulla base del tempo.

## I–K. Rischi, GO e GitHub

NO-GO operativo alla riapertura finché mancano Spot/match/chat, delete account,
quota/draft boundary, cleanup idempotente dopo grace reale, collector globale,
scheduler autenticato e suo controllo finale. I risultati già passati e lo
stato delle fixture sono salvati per una ripresa controllata; non trattarli
come autorizzazione ad attivare lo scheduler.

Codice runtime produzione resta quello versionato `ad27260`, branch
photo02-staging; main non viene mergiato senza GO finale. Questo tentativo
versiona il nuovo harness di produzione e il report aggregato, senza segreti,
foto reali, UUID o credenziali delle fixture. Working files diagnostici e
credenziali temporanee restano ignorati; credenziale server temporanea rimossa
al termine.

Test235/235, build e typecheck PASS; sintassi harness PASS. La correzione
all'asserzione è verificata dal contratto SQL e dalla diagnosi live read-only,
ma il journey completo corretto resta da eseguire.

Alla ripresa: controllare nuovamente la baseline, usare accesso rete autorizzato,
riammettere solo gli account sintetici nel CANARY e completare i gate mancanti.
Il controllo di sicurezza deve precedere ogni riapertura. Evitare di ripetere
inutilmente upload già riusciti: il rate limit PHOTO-01 resta invariato.
