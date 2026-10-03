> Documento storico: il flusso attuale e lo stato verificato sono in `revisione-adversariale.md` e `operazioni-pilota.md`. Le sezioni precedenti possono descrivere ingresso anonimo, Google dopo il match o match a scadenza, oggi superati.

# Pubblicazione e installazione

Configurazione Vercel pronta: framework Vite, pnpm build, output dist. Impostare nel progetto hosting VITE_SUPABASE_URL, VITE_SUPABASE_PUBLIC_KEY (solo publishable) e VITE_GOOGLE_ENABLED=true. Nessun client secret Google nel frontend.

Dopo aver ottenuto l’URL HTTPS definitivo del pilota, autorizzare in Supabase i redirect esatti / e /?admin=1. Il callback OAuth Google resta quello di Supabase. Generare un nuovo QR con l’origine HTTPS del pilota; il QR localhost non funziona sugli altri telefoni.

Collaudo da completare su iPhone e Android: QR esterno, fotocamera, foto obbligatoria, due account, interesse/match/chat, chiusura e riapertura, collegamento Google con stesso UUID e recupero match, Home, ritorno OAuth nella modalità installata e offline. L’installazione può usare uno spazio sessione diverso dal browser: verificare prima di promettere recupero automatico. L’ingresso anonimo resta nel browser corrente; Google serve al recupero tra ambienti.

Il service worker non conserva contenuti privati: in assenza di connessione mostra solo la spiegazione offline. Presenza e messaggi richiedono rete. Installazione non ancora verificata fisicamente su telefoni.

Indicazioni iPhone: Safari → Condividi → Aggiungi alla schermata Home; mantenere Apri come app web quando presente. Android: pulsante installazione quando disponibile o menu del browser. Fonti: https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios e https://web.dev/articles/add-manifest

## Pubblicazione del 2 ottobre 2026

Sito di prova: https://spot-now-alpha.vercel.app/
Dashboard: https://vercel.com/fedegrasso1994-1482/spot-now
Pubblicazione manuale della cartella dist tramite Drop to Deploy; 20 file. Non ancora collegata a GitHub: aggiornare il codice locale non aggiorna automaticamente il sito. La build incorpora solo URL Supabase e chiave publishable, mai segreti.

Supabase Site URL aggiornato al sito HTTPS e redirect esatti / e /?admin=1 aggiunti; ritorno locale conservato per sviluppo. Login Google gestore sul dominio HTTPS verificato fino alla coda reale. Ingresso da QR HTTPS verificato fino alla creazione profilo con sessione anonima. QR per telefoni: docs/test-qr-https.png (ignorato da Git). Installazione fisica, fotocamera e match su due telefoni ancora da provare.

## Aggiornamento del 3 ottobre 2026
Tribe pubblicata sullo stesso dominio. Per aggiornare: pnpm build, copiare vercel.static.json in dist/vercel.json, vercel link --yes --project spot-now --scope fedegrasso1994-1482 --cwd dist, vercel deploy --prod --yes --scope fedegrasso1994-1482 --cwd dist. I file .env.local e .vercel creati dalla CLI restano locali/esclusi dal caricamento. Nessun collegamento Git automatico. Account richiesto prima del check-in; il popup dopo il primo match propone ora l’installazione PWA.
