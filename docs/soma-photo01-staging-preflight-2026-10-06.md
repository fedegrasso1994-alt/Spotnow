# Soma — staging e preflight PHOTO-01

Data: 2026-10-06. Esito: **staging operativo; gate PHOTO-01 NON superato**.

## Isolamento e configurazione verificata

- Nuovo progetto `Soma Staging`: `zjinjtkekmaqtxsuyvho`.
- Dashboard: https://supabase.com/dashboard/project/zjinjtkekmaqtxsuyvho
- Database in West EU / Ireland, `eu-west-1`, compute Nano, organizzazione Free.
- Nessun upgrade, acquisto o nuova risorsa a pagamento effettuato.
- Verifica iniziale: zero account Auth, oggetti Storage, bucket e tabelle pubbliche.
- Nessuna copia o lettura di database, Storage, foto, account o credenziali della
  produzione. Nessuna operazione diretta al progetto `qlucwdjcjomwyziegxrn`.
- Migration **001–015** applicate dal repository, in ordine, senza modificare i
  file originali. Registrate anche in `supabase_migrations.schema_migrations`.
- Tutte le tabelle applicative pubbliche hanno RLS attiva.
- Bucket `profile-photos` privato: 8.388.608 byte, JPEG / PNG / WebP.
- RPC e correzioni LOC-01 e SEC-01 incluse; timer server di 90 minuti verificato.
- Edge Functions `photo-assets` e `delete-account` deployate dal codice attuale.
  Verifica JWT attiva in entrambe; nessun cambio alle chiavi di firma Auth.
- Tre account email/password sintetici con conferma amministrativa, di cui uno
  senza profilo, due venue universitarie fittizie e QR generati ex novo.
  Foto geometriche sintetiche; nessun messaggio email inviato agli utenti reali.
- Google OAuth e SMTP non configurati nello staging: non necessari per queste
  prove API, e non collaudati da questo task.
- Anteprima locale separata: http://127.0.0.1:4174/ con URL e chiave pubblica del
  solo staging passati al processo Vite. `.env` e anteprima sulla porta 4173
  invariati. Schermata iniziale caricata senza errori JavaScript osservati.

## Controlli reali del baseline

Account sintetici: login con JWT ES256, upload privato anche prima del profilo,
salvataggio profilo, generazione thumbnail/detail/preview via Edge e dry-run
autenticato di cancellazione hanno funzionato. Nessuna cancellazione eseguita.

Verificate via Auth, PostgREST, RPC e Storage reali:

- SEC-01: lettura diretta del profilo altrui restituisce zero righe.
- QR: entrambi gli account effettuano check-in; i propri timestamp differiscono
  esattamente di 90 minuti.
- Ora: discovery del secondo account, timestamp altrui null, variante HD presente.
- Foto HD dell'altro account: firma autorizzata e download JPEG con HTTP 200.
- Tribe, Spot reciproco, Match e invio/lettura di un messaggio sintetico.
- Lettura diretta di `checkins`: solamente il proprio check-in.
- Simulazione della scadenza del secondo account: escluso da Ora, ancora
  presente in Tribe con foto, membership e Match/Chat conservati.
- Timestamp del check-in scaduto conservati; nessun cleanup o cambio retention.
- Nuova scansione del QR sintetico rinnova la sessione.

Questi sono controlli API del baseline, non un collaudo completo della UI,
dell'OAuth Google, dei dispositivi o della futura pipeline PHOTO-01.

## Preflight sul runtime Edge reale

Sonda `photo01-preflight`, deployata **solo nello staging**, versione 1.
Riusa i decoder e il generatore delle varianti attuali; riceve direttamente
il file nel body HTTP. Richiede JWT e account marcato sintetico, verifica il
progetto staging, limita il body a 8 MiB e non scrive alcun oggetto Storage.
Non è una nuova API di pubblicazione e non implementa PHOTO-01.

Runtime osservato nei log: `supabase-edge-runtime-1.77.0`, Deno 2.1.4;
esecuzione dell'errore in `eu-central-2` (routing Edge distinto dal database).

| Fixture sintetica | Input | Risposta | Tempo interno osservato |
| --- | ---: | --- | ---: |
| JPEG, 1600×1200 | 53.129 byte | HTTP 200, varianti generate | 364 ms |
| WebP, 1600×1200 | 3.498 byte | HTTP 200, varianti generate | 316 ms |
| PNG RGB 8 bit, 6000×4000 | 8.388.608 byte | HTTP 200, varianti generate | 742 ms |
| PNG RGB 16 bit, 6000×4000 | 8.388.608 byte | **HTTP 422, allocation failed** | 323 ms |

Errore nel log reale:
`PHOTO01_PREFLIGHT_FAILED Array buffer allocation failed`.
La fixture 16 bit è valida: decodifica locale con controllo CRC riuscita;
24.000.000 pixel, tre canali, buffer decodificato di 144.000.000 byte.
Entrambe le PNG rispettano 8 MiB, 24 MP e dimensioni inferiori a 8192 per lato.

I tempi sono misure di quelle singole richieste, non garanzie o misure di CPU.
`Deno.memoryUsage()` restituisce RSS zero in questo runtime; i campioni di heap
ed external memory non sono una misura affidabile del picco complessivo.
Il fallimento osservato basta a respingere il gate della pipeline attuale.

Interruzione al primo fallimento. Non completati: JPEG/WebP da 8 MiB, casi
dimensioni limite, file corrotti, matrice metadata/orientamento e concorrenza.
Non introdotti registry, nuova migration, enforcement o nuovo upload client.
Nessuna normalizzazione delle foto legacy e nessuna modifica di produzione.

## Proposta successiva, NON implementata

Prima valutare un decoder con memoria limitata, downsampling e gestione dei
16 bit che superi lo stesso preflight reale. Nessuna riduzione automatica dei
formati, della dimensione o del numero di pixel approvati.

Alternativa da progettare: ingresso in un bucket temporaneo privato, accessibile
solamente al proprietario e al processore autorizzato, senza pubblicazione
dell'originale; decodifica/normalizzazione con risorse limitate, registry e
pubblicazione solo dopo successo. Il bucket temporaneo **non risolve da solo**
l'allocazione del decoder: il processore va corretto e misurato prima.
Accesso, retry, rimozione degli input temporanei e limiti richiedono una proposta
esplicita. Nuovi provider, costi o modifica del piano richiedono conferma prima
della creazione. Non autorizzato un fallback che pubblichi originali non validati.

## Evidenze e verifiche locali

- Script, fixture, risposte JSON e sonda riproducibile conservati temporaneamente
  in `/tmp/soma-staging-*`, `/tmp/soma-photo01-*` e
  `/tmp/soma-photo01-preflight/`. Nessuna credenziale inserita nel repository,
  nei bundle o in questo documento. File credenziali/test account con mode 0600.
- SHA-256 `photo-assets/index.ts`:
  `abf65ad0022219929e6a1225332505d293bd90052019ea2b8bc0af7f2ac3ba84`.
- SHA-256 `delete-account/index.ts`:
  `7d3c39e1a6c3b02cbae97ef134fd5f1dd4246aa1d9f155309e934c27366a2297`.
- SHA-256 sonda temporanea:
  `885153941d4c7dcd3c054d44545be9581cc3c2692bbaa7492a2324b3efc97ced`.
- SHA-256 fixture PNG 16 bit da 8 MiB:
  `59d789dacf923d65d38386a87dc23b378a4873b13465e660055c557e4d16ff8e`.
- Suite attuale: **164/164 pass**, zero failure o skip.
- Typecheck: PASS. Build: PASS, output `/tmp/soma-staging-build`.
- Confronto hash di 249 file originali: nessuna modifica.
- Unico nuovo file versionabile di questo task: questo report. Decision sheet
  preesistente non modificata. Nessun commit, push o deploy Vercel effettuato.

**PHOTO-01 rimane aperto.** Staging disponibile per sperimentazioni successive;
nessuna autorizzazione implicita a proseguire in produzione.
