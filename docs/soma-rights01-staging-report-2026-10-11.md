# RIGHTS-01 — collaudo autenticato staging, 2026-10-11

**Smoke autenticato del contratto attuale: PASS. Chiusura completa RIGHTS-01: NO-GO.** Questo report sostituisce gli impedimenti Auth/download delle revisioni precedenti, conservate nella storia Git. Nessun cambiamento a produzione, main, UI runtime, migration 024 o PHOTO-01/02 in questa fase.

## Perimetro e autenticazione

Solo Soma Staging `zjinjtkekmaqtxsuyvho`, due account sintetici temporanei con marker test e indirizzi example.invalid. Il founder ha disattivato e salvato personalmente Confirm email; l'API ha poi confermato autoconfirm. Signup e login email/password normali, JWT reali, configurazione pubblica client esistente. Nessuna chiave amministrativa/service-role letta, nessuna credenziale reale, nessuna modifica Auth globale da parte dell'agente.

Le credenziali fixture sono state generate solo nel contesto privato del test, fuori dal repository, poi eliminate. Il canary PHOTO era limitato esattamente ai due owner; cleanup e scheduler globali sempre OFF. Console SQL utilizzata per controlli aggregati, venue sintetica e teardown rigorosamente fixture-scoped, non per creare identities o bypassare Auth.

Il resolver OS aveva ENOTFOUND; dns.resolve4 e HTTPS con hostname/TLS originali hanno consentito il runner. Un ESERVFAIL transitorio è stato superato ripetendo la risoluzione. Nessuna modifica infrastrutturale o nuovo provider.

## Risultati reali

| Test | Risultato / evidenza |
| --- | --- |
| Signup/login A e B | PASS, due sessioni normali |
| Dati propri / isolamento | PASS, 15 sezioni owner-only; parametro target owner rifiutato, lettura diretta profilo peer negata |
| Export JSON / esclusioni | PASS, categorie previste; niente token, segreti, metadata security, email/preferenza/occupation privata o messaggio ricevuto del peer |
| Retry export e upload | PASS, stessi dati e replay upload senza duplicazione |
| Foto proprie | PASS, tre copie canonical/detail/thumb per fixture; lettura autenticata propria |
| QR, Ora, Tribe, Spot, match, chat | PASS su fixture; messaggi con nonce/retry, relazioni persistenti verificate |
| Restricted e consenso revocato | PASS access/export/foto; preferenza cancellata, revoca ripetuta idempotente |
| Download browser | PASS, tre JSON reali (A eligible, A restricted/revoked, B eligible) confrontati con digest delle sezioni API |
| Download foto | PASS, JPEG canonicale realmente scaricato e confrontato con bytes Storage; helper di test, non nuova feature UI Soma |
| Delete A restricted/revoked, delete B | PASS HTTP 200; Auth e rights negati dopo delete; retry HTTP 401 senza effetti |
| Isolamento delete | PASS, B e relativa foto/Tribe preservati dopo delete A; relazioni social A eliminate |
| Retention staging | PASS dry-run/replay e rifiuto execute mentre paused; nessun purge globale abilitato |
| Teardown fixture | PASS ripetuto due volte; zero residui, nessuna ricreazione |

Il browser era un harness locale su Vite collegato al vero staging con il componente RIGHTS e backend reali, non una pubblicazione frontend staging. Il timeout dell'evento download del tool non era un fallimento del download: i file effettivi sono stati verificati nel filesystem. JSON contiene metadata foto, non bytes; helper separato scarica la canonicale. Nessuna prova Android/iOS fisica rivendicata. Il reset/logout rilascia Blob/output/cache client; non dimostra cancellazione di ogni cache o backup esterno.

## Delete ordinario versus teardown

Dopo la cancellazione ordinaria erano assenti Auth identity/session/refresh token, profilo, età/consenso/eventi/challenge, check-in, Tribe, Spot/match/chat, block/report, foto/asset/job e oggetti Storage delle fixture. Quota attiva zero. Audit Auth correlato alle fixture: conteggio zero, senza ispezionare contenuti personali.

**Restavano 5 ricevute tecniche private per account, 10 totali:** lifecycle set purged, cleanup account completed, cutover attempt settled, cutover deletion completed e cutover audit. Sono soggette alla retention PHOTO-02 di 7 giorni, non indefinite. Questo non soddisfa letteralmente la decisione RIGHTS secondo cui solo safety hold espliciti sopravvivono alla cancellazione. Non è stata modificata né tacitamente riapprovata la policy PHOTO.

Solo per completare il cleanup sintetico autorizzato, il teardown ha rimosso quelle 10 ricevute dopo verifica di Auth/profile/Storage assenti, writer settled, set purged, quota zero, nessun claim e nessun safety hold. Ha rimosso venue e ricevute di dry-run esclusivamente fixture. Nessun purge per età/timeout o elemento review. Il teardown non è il nuovo contratto di cancellazione utente.

## Stato finale staging

- 3 account, 3 profili e 39 oggetti foto preesistenti invariati.
- Due fixture eliminate; sei oggetti foto fixture eliminati.
- Zero account, oggetti, venue o ricevute fixture; zero orfani e riferimenti mancanti.
- Tre writer review preesistenti preservati; zero unknown inattesi.
- PHOTO PAUSED, cleanup OFF, scheduler OFF, retention paused.
- Credenziali temporanee, SQL temporanei, quattro nuovi download e harness privato rimossi; download preesistenti preservati. Server locale fermato e tab test chiuse.

**Il founder può riattivare ora manualmente Confirm email nel solo staging.** L'agente non ha modificato e non modificherà tale impostazione.

## Test e file

10 test RIGHTS, inclusi tre nuovi: retention non ricrea dati cancellati; teardown rifiuta account ancora vivi; input teardown rigidamente limitato a due owner UUID. Suite totale, build, typecheck e release check riportati nell'evidence JSON. Test PGlite active purge/retry integrano il dry-run cloud, senza affermare apertura dei job staging globali.

File di questa fase: `scripts/rights-staging-smoke.mjs`, `scripts/rights-fixture-teardown.mjs`, `tests/user-rights.test.js`, `tests/staging/rights-browser-smoke.html`, questo report e evidence JSON. Nessun file runtime, stile o migration cambiato.

Branch `codex/rights-01-staging`, baseline smoke `69e83fa26f3e67faf1702783f3ab0c4ee2d20717`; main invariato `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Commit finali verificabili dalla storia del branch: nessun merge main o deploy produzione.

## Aperture / raccomandazione

GO per considerare completato questo smoke autenticato e il cleanup. **NO-GO alla chiusura completa RIGHTS-01 e al rollout:** occorre allineare esplicitamente decisione solo-safety con le ricevute tecniche PHOTO a 7 giorni, senza riaprire autonomamente PHOTO-02. Restano validazione professionale di scope/esclusioni e procedura completa di accesso alle copie provider, safety evidence e backup; foto binarie non integrate nell'export UI attuale. Non è una dichiarazione di conformità o pilot-ready.

Gli ulteriori controlli presenti nel runner (es. download Storage peer negato) non rieseguiti dopo l'ultima estensione non sono conteggiati come nuove prove cloud. La checklist successiva del founder ha chiarito il perimetro smoke: non serve riproporre il precedente impedimento del testo troncato.
