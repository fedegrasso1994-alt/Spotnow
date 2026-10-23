# SOMA — DD → Notifications flake investigation

Baseline: `52e39dadd6493918834fee270b018e51c984e763`, branch `codex/soma-schema-v2-staging`. Task esclusivamente test/harness; nessun deploy/migration/purge o attivazione scheduler. Data:23 ottobre2026.

## A–C. Condizione esatta, classificazione, evidenze

**Classificazione: A. TEST/HARNESS FLAKE.**

Assert originale, `tests/notifications.test.js:26` nella baseline:

```js
assert.ok(first.items?.length || first.people?.length ||
          JSON.stringify(first).includes(ids.b));
```

La RPC reale `my_daily_discovery()` restituisce `profiles`, non `items` o `people`. I primi due operandi sono quindi undefined. L'ultimo operando passa soltanto se B è incluso nel payload di A. Ma la fixture condivisa `qodDatabase → romanticDatabase` ha **sei** membri eleggibili, non due: solo A e B hanno subscription. DD assegna fino a quattro persone per account con reciprocità e tie-breaker basato su `generation_id`. Due utenti iscritti alle notifiche non devono necessariamente essere assegnati l'uno all'altro. Un payload corretto con altri peer produce il falso negativo.

`037_daily_discovery_engine.sql` definisce la proiezione `profiles`;038/041 mantengono il tie-break MD5 con generation_id, preservato da039/040. Non è una race introdotta da Retention054 né un problema dimostrato nel runtime Notifications.

### Riproduzione prefissata

`scripts/dd-notifications-flake-reproduce.mjs`:12 database PGlite indipendenti, stesso server clock congelato `2026-10-21T12:00:00+02:00`, sei utenti eleggibili, due subscription, stesse policy. Valori generation prefissati1..12, ogni caso eseguito una volta. Nessuna ricerca/retry fino a green.

| Seed | A vede B | Profili effettivi di A | Assert vecchio | Eventi DD |
|---:|---|---:|---|---:|
|1|sì|4|PASS|2|
|2|no|4|FAIL|2|
|3|no|4|FAIL|2|
|4|sì|4|PASS|2|
|5|no|3|FAIL|2|
|6|sì|4|PASS|2|
|7|sì|4|PASS|2|
|8|no|4|FAIL|2|
|9|sì|4|PASS|2|
|10|sì|3|PASS|2|
|11|sì|4|PASS|2|
|12|no|4|FAIL|2|

**5/12 falsi FAIL,12/12 drop non vuoti e due notifiche corrette.** Questa è una matrice deterministica di diagnosi, non una stima statistica della frequenza in produzione. Evidenza integrale: `evidence/dd-notifications-flake/reproduction.json`.

### Alternative esaminate

- **Wall clock / finestre / DST:** il helper QoD congelava già il clock del singolo database alle12:00 Rome, finestra08–16. Con timestamp identico cambiare solo seed riproduce PASS/FAIL. Nessuna transizione temporale causa questo assert. Il nuovo test asserisce esplicitamente il timestamp della fixture e la notte03:00 seguente.
- **Eligibility / allocazioni:** sei membri/six eligible in tutti i12 casi; drop3–4validi, non paused/empty. Il test originale confonde presenza di una specifica persona con validità del drop.
- **Notifications OFF:** il test incriminato abilita intenzionalmente il controllo solo nel PGlite locale. Il nuovo caso separato conserva due subscription ma spegne enabled/delivery e dimostra DD valido senza eventi/claim. Non vengono cambiati flag staging.
- **Ordine / casualità:** generation_id casuale nel fixture originale cambia la selezione reciproca; ordinamento di lettura/ID exposure casuali non deve essere usato per presumere A↔B. Le assertions corrette verificano peer effettivi e set destinatari.
- **Visibilità transazioni:** chiamate await e auto-commit, trigger DD deferred, eventi osservati dopo la query. Stesso numero2 anche nei casi falsamente falliti; nessun evento mancante dimostrato.
- **Contaminazione / cleanup:** ogni caso usa un nuovo PGlite con role/session/catalogo/clock locali, chiuso al termine; nessun database remoto/fixture condivisa. Riprodotto in processo diagnostico indipendente, senza full-suite concurrency. Non emerge una contaminazione cross-test come causa.

## D. Fix minimo e invarianti rafforzati

Modificato solo `tests/notifications.test.js`; nessun helper condiviso o runtime applicativo modificato.

1. Fixture finestra draft con generation1 e2, stessa logica DD reale. Un caso A↔B e un caso senza A↔B. Non eliminate le altre quattro persone e non alterate eligibility/preferenze per forzare una coppia.
2. Asserzioni sul contratto `profiles`: status ready/partial,1–4profili unici.
3. Ogni peer realmente assegnato ad A deve ricevere A tramite la vera RPC pubblica; stessa window_id. Reciprocità A/B verificata in entrambe le forme previste dai seed.
4. Esattamente un evento per ciascun destinatario A/B, entrambi riferiti alla finestra corretta; nessun destinatario in più.
5. Refresh preserva la lista di profili e gli ID degli eventi, non solo il loro conteggio. Notte03:00 produce waiting_window/profiles vuoti e nessuna notifica aggiuntiva.
6. Notifications OFF con subscription esistenti: nessun evento/dispatch, DD continua a funzionare.

Non è stata rimossa alcuna garanzia Notifications/DD. L'asserzione sbagliata su un peer specifico è sostituita da verifiche del contratto e della reciprocità effettiva.

Aggiunti solo script diagnostico e runner di verifica, più questo report/evidenze. Nessun nuovo provider/dipendenza.

## E–H. Piano di verifica non adattivo

`scripts/dd-notifications-flake-verify.mjs` dichiara prima dell'esecuzione:
-20run mirati (due subcase e OFF), processi/database nuovi;
-1run delle suite pertinenti DD/Notifications;
-3run completi consecutivi, concurrency2, stesso comando/sorgenti;
-stop al primo failure, nessun retry/reset della sequenza.

Prima validazione singola del fix:4/4PASS. Matrice diagnostica originale intenzionalmente registra il vecchio assert false nei cinque casi, mentre i suoi assert di comportamento reale passano. Non viene contata come esecuzione verde del test originale.

Risultati definitivi nel file machine-readable `evidence/dd-notifications-flake/verification.json` e nella consegna. Build e typecheck separati; zero deploy.

## I. Retention / PHOTO / ambienti

Migration054 ed executor Phase A non modificati. Nessun file sotto src/public/supabase cambia rispetto alla baseline. Nessun test vecchio corretto durante le tre suite consecutive. Query staging esclusivamente READ ONLY prima/dopo, usando lo script già esistente; nessuna fixture staging creata, nessun dato prodotto scritto/eliminato. I fixture nuovi vivono soltanto nei database locali PGlite.

Controlli richiesti: scheduler/cleanup OFF, Discovery OFF, Notifications/delivery OFF; PHOTO invariata. Nessuna modifica ai secret/Auth, main o Production; nessuna API Production contattata. Prova di hash sorgenti e stato staging in `invariance.json`.

Il task chiude soltanto la classificazione e correzione del flake. Non modifica il precedente report/gate Retention Phase A e non autorizza la sua attivazione: scheduler rimane OFF fino al task/consenso separato previsto.

## J–L. Git e gate

Commit test/harness e report/evidenze separati; SHA/push/working tree verificati nella consegna finale. Stato finale subordinato all'intero piano fisso, non alla prima esecuzione verde.

## Risultati definitivi

| Verifica | Esito |
|---|---|
| Ripetizioni mirate prefissate |20/20 PASS,80 verifiche (4/run)|
| Suite DD/Notifications |119/119 PASS|
| Suite completa consecutiva1 |776/776 PASS|
| Suite completa consecutiva2 |776/776 PASS|
| Suite completa consecutiva3 |776/776 PASS|
| Skip / cancellazioni / retry |0 /0 /0|
| Build / typecheck / diff-check |PASS /PASS /PASS|

Il piano è terminato alla terza suite, senza ulteriori tentativi. Log completi locali ignorati in `.local/dd-notifications-flake/`; risultati/timestamp/exit code versionati in verification.json. Il conteggio cresce da773 a776 per due subcase deterministici e il nuovo caso Notifications OFF.

Confronto staging identico salvo timestamp osservazione:4Auth,4profili,42oggetti,1Match,2messaggi; hash profili/Storage invariati. Nessuna fixture remota nuova. Manual/scheduler Phase A OFF, tre cron esistenti OFF, Discovery/Analytics/Notifications OFF, PHOTO admission OPEN con cleanup/scheduler OFF. Receipt PHOTO preesistente invariata. Nessuna configurazione Auth/secret modificata.

Migration054 Git blob invariato: `a45f16732d58ba06b03d51644adb3baa1ea6e64e`; purge source/config staging identici prima/dopo. Nessun file runtime sotto src/public/supabase o dependency manifest cambiato. Main resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

**DD NOTIFICATIONS FLAKE: CLEARED**

Scheduler retention NON attivato. Nessun nuovo gate operativo o rollout è eseguito da questo task.

Commit test/harness verificato: `e49d57dab07886dddfb599f29fb25bf0574744f4`. Il commit successivo contiene solo report/evidenze. SHA remoto e working tree finale riportati nella consegna.
