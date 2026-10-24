# MFA per staff staging — setup locale

Utility operativa separata da Soma. Nessuna nuova route dell'app, migration,
Edge o deploy. Nessuna funzione di grant/revoke ruolo. Solo Auth del progetto
`zjinjtkekmaqtxsuyvho`. I due account ammessi sono nominati dal founder nella
config locale ignorata, non per email o UID hardcoded nel bundle/repository.

## Esecuzione sul Mac

Prerequisiti: account dedicati già creati e confermati dal titolare; Node e
dipendenze esistenti. `.local/staff-mfa/config.json`, permessi0600, contiene solo
`url`, `publicKey` pubblica e `accounts:[{id,label}]` per ADMIN/MODERATOR.
Nessuna password, sessione, seed o codice in quel file. Origine backend fissata
allo staging, chiavi secret/service-role rifiutate. Non leggere altri secret.

```sh
node scripts/build-staff-mfa.mjs
node tools/staff-mfa/server.mjs
```

Aprire `http://127.0.0.1:4197`. Il server fa bind solo su loopback; non esporlo
via tunnel, rete o Vercel. Se4197 occupata, fermarsi: non collegarsi alla cieca
ad altro servizio né cambiare Host guard senza aggiornare/verificare il setup.
Chiudere con Ctrl+C nel terminale del server dopo completamento e postcheck.

## Passaggi del titolare, per ciascuno dei due account

1. Scegliere ADMIN o MODERATOR: etichette di destinazione, **nessun ruolo assegnato**.
2. Inserire email/password dell'identità selezionata e premere Accedi.
   La risposta Auth deve corrispondere esattamente all'UID nominato, non anonimo,
   email confermata. Un altro UID viene rifiutato e la sola sessione del tool
   viene chiusa. Non procedere a MFA con identità diversa.
3. Premere Attiva MFA una volta, scansionare privatamente il QR con il proprio
   autenticatore. Nominare le voci in modo distinto per ADMIN e MODERATOR.
4. Inserire il codice nel campo della pagina e premere Verifica MFA. Risultato:
   fattore verified e sessione Auth AAL2 verificati tramite SDK reale.
5. Premere Esci. Fare nuovo login sullo stesso account, inserire un nuovo codice
   e premere Verifica MFA (senza un secondo enrollment). Il riepilogo deve
   riportare anche il nuovo login verificato. Poi Esci.
6. Ripetere sull'altro account. Comunicare soltanto che entrambi i controlli sono
   passati e che l'MFA resta sotto custodia personale; niente credenziali o QR.

Non ricaricare mentre il QR è attivo: resta solo in memoria. Se un vecchio
fattore unverified impedisce il setup, fermarsi e segnalare solo lo stato.
Non vengono eliminati fattori automaticamente né creati duplicati per retry.
Un fattore già verified può essere usato con Verifica MFA senza nuovo enrollment.
Un errore generico non è prova di attivazione riuscita: serve stato verified/AAL2.

## Confini di privacy e sicurezza

Password/codici vanno direttamente dal browser a Supabase Auth. Il server locale
serve esclusivamente file statici e config pubblica: rifiuta POST, Host/Origin
estranei e path arbitrari. No request logger, proxy Auth, CDN, analytics, SDK
esterni nuovi, service worker o session persistence. CSP blocca framing e form
submission; connect limitato a self/staging Auth, con guard aggiuntivo che rifiuta
RPC/Storage/Edge o altra origine. Il QR viene mostrato come immagine SVG, non
inserito come HTML eseguibile. Nessuna copia screenshot/evidenza del QR.

Il custode non deve condividere screenshot della pagina o valori Auth. Durante
l'uso umano l'agente non ispeziona DOM, network body, console, memoria o screenshot
della pagina. L'agente può successivamente controllare nel DB solo metadata
minimi dei due account (fattore tipo/status, eventuale AAL sessione, assenza ruoli),
mai `auth.mfa_factors.secret` o token.

I pulsanti vengono serializzati nella pagina; il provider resta autorità per
identità/MFA. Il tool non è una nuova garanzia di autorizzazione admin e non
introduce recovery backdoor. Browser/storage/account locali compromessi non
sono resi sicuri da questo helper. Dopo setup non assegnare ruoli senza il
successivo gate esplicito del founder.

## Verifiche

`node --test tests/staff-mfa.test.js`; build locale via Vite/dipendenze esistenti.
I test del controller usano un Auth fake e sono dichiaratamente test automatici,
non MFA umano o delivery provider. Il passaggio manuale resta aperto finché il
titolare esegue i due veri enrollment e i successivi login/challenge.
