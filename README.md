# Spot Now

App dedicata ai single, ricostruita dal prototipo Claude con le variazioni approvate. Sito: https://spot-now-alpha.vercel.app/.

## Flusso attuale

QR del luogo → anteprima → accesso Google (email alternativa) → profilo con foto obbligatoria → check-in di **90 minuti**. Rinnovo soltanto con nuova scansione, nessuna geolocalizzazione. La Tribe rimane disponibile dopo la presenza live; più Tribe, un solo luogo live. Spot non ritirabili, match persistenti per coppia, chat accessibile anche senza messaggi. Nessuna modalità nascosta e nessun comando Lascia Tribe.

Le vecchie istruzioni su ingresso anonimo, Google dopo il match e match a scadenza sono storiche. La conservazione del vecchio profilo temporaneo usa un percorso esplicito e non fonde automaticamente account.

## Sviluppo e verifiche

Node 24, pnpm 10. `pnpm install --frozen-lockfile`, `pnpm dev`. Copiare `.env.example` in `.env.local` e impostare URL e chiave pubblica Supabase; mai una service role nel frontend. `pnpm test`, `pnpm typecheck`, `pnpm build`, `node scripts/check-release.mjs`.

App locale http://127.0.0.1:4173/; demo isolata con dati fittizi http://127.0.0.1:4173/?demo=1. Script di pubblicazione: `scripts/deploy-production.sh`, con Vercel CLI autenticata. Il controllo della build precede il link Vercel, che genera file locali esclusi dal caricamento.

## Stato della revisione

Piano: [docs/piano-revisioni-completo.md](docs/piano-revisioni-completo.md). Evidenze e limiti: [docs/revisione-adversariale.md](docs/revisione-adversariale.md). Procedure: [docs/operazioni-pilota.md](docs/operazioni-pilota.md).

Migrazioni 001–009 e funzione `delete-account` mantengono autorizzazione server e verifica JWT. La verifica POST non distruttiva è distinta dalla cancellazione reale. Installazione e fotocamera su telefoni fisici, account eliminabile, configurazioni operative e documenti da validare prima del lancio sono tracciati nel rapporto; non sono dichiarati superati dai test desktop.
