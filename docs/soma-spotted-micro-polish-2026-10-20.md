# SOMA — SPOTTED MICRO POLISH

2026-10-20 — `SPOTTED MICRO POLISH: GO FOR REVIEW`

Baseline `d68c021d81959b0192482c6b2075531cda108ba4`.
Solo `codex/soma-schema-v2-staging`.
Codice deployato `e20b2913d114f0af8822b94606553502aabddb0e`;
commit report/evidenze successivo senza differenze runtime.

## A–B. Modifiche esatte e riuso

- Segnala/Elimina nello stesso footer secondario allineato a destra. Piccolo testo
  muted, peso 500, nessun grande pulsante; una separazione sottile dal gruppo social
  nei post. Restano target invisibili almeno 44×44 px.
- Aggiorna: piccolo SVG refresh statico della famiglia outline già introdotta,
  testo 13 px muted e peso 500. Lo stesso handler `load()` e la stessa disabilitazione
  durante busy. Nessun nuovo timer, floating button o cambio polling.
- Tutti i post: stesso chevron/backlink, 13 px muted, allineamento a sinistra e
  spaziatura più leggera. Identica uscita dal thread senza chiamate aggiuntive.
- Commenti: distanza label/contenuto ridotta a 8 px; azioni social a 12 px dal testo;
  footer discreto, senza bordo superiore aggiuntivo. Separazione e indentazione
  preesistenti conservate. Nessuna full card o bolla chat.

Riutilizzati `.backlink`, `--muted`, `--line`, `spottedIcon`, componenti post e
commento esistenti. Nessuna modifica a cuore, like attivo, fumetto, contatori,
CTA romantica, card post, font, palette o bottom nav.

## C. File modificati

1. `src/spotted-presentation.js` — soltanto icona refresh statica aggiuntiva.
2. `src/spotted-social-ui.js` — classi, icona e raggruppamento DOM azioni secondarie.
3. `src/spotted-social.css` — 14 righe di micro polish tutte sotto `#spotted`.
4. `tests/spotted-micro-polish.test.js` — due test di comportamento invariato.
5. Questo report.
6. `docs/evidence/spotted-micro/validation.json`.

Nessuna modifica a SQL/RPC/RLS/Edge, API, backend, quota, self-like, anonimato,
Match, PHOTO, Membership, ORA, TRIBE, PROFILO o stili globali.
Report e cancellazione mantengono gli stessi handler, parametri e conferme.

## D–G. Verifiche

- Browser 390×844 e 320×700: PASS.
- Post lungo, più commenti, testo senza spazi, contenuti propri/altrui,
  liked/unliked e CTA romantica: verificati senza overflow.
- Azioni secondarie/social almeno 44 px in altezza; footer proprio raggiungibile
  sopra la nav: bottom 383,71 px, nav top 631,60 px nel controllo a 320 px.
- Commenti con classe `.board-card`: zero. Nav globale invariata.
- Console fixture UI: zero errori.
- Frontend SPOTTED: **23/23 PASS**.
- Suite completa, incluse SPOTTED social/romantic PostgreSQL-backed:
  **618/618 PASS**, zero fail/skip.
- Build, typecheck: **PASS**.
- Release scan: **PASS**, 37 file, nessun test/env/secret nel bundle.
- Font locali: nove asset PASS; nessun nuovo provider o dipendenza.

I due test aggiunti verificano: raggruppamento secondario senza cambi a report e
conferma delete; refresh esplicito con una sola lettura e ritorno dal thread senza
nuove richieste. Le regressioni preesistenti coprono like, self-like, commenti,
richieste romantiche, quote, retry e social core.

## H. Preview

https://spot-7p8n2hi8k-fedegrasso1994-1482.vercel.app

Deployment `dpl_56hBTTXWJCaXuuwL3D3LfSGZGDj5`, READY, Preview;
SHA `e20b2913d114f0af8822b94606553502aabddb0e`.
Flag frontend baseline staging preservati; solo Supabase
`zjinjtkekmaqtxsuyvho`, zero URL production nel bundle.
Deployment Protection invariata. Welcome attuale, login e reload hosted PASS;
zero errori console osservati. Nessun nuovo login Google/email reale dichiarato.

Sola configurazione di delivery necessaria: aggiunto l'host esatto della nuova
Preview alla allowlist Auth staging, 14→15 URL. Site URL e voci precedenti invariati;
nessuna modifica provider/email confirmation/GCP/OAuth.

## I. Screenshot

Cartella locale `.local/spotted-micro/screenshots/`:

- `posts-390.png`: card post e footer.
- `liked-390.png`: cuore attivo, Aggiorna e footer Segnala/Elimina.
- `comments-390.png`: gerarchia commenti a 390 px.
- `comments-320.png`: vista commenti a 320 px.
- `back-refresh-320.png`: Aggiorna e Tutti i post.
- `own-comment-320.png`: commento proprio lungo e contesto altrui.
- `footer-320.png`: footer proprio raggiungibile e focus tastiera su Elimina.
- `preview.png`: welcome hosted dopo reload.

Sono screenshot del vero renderer con adapter UI locale sintetico, non un nuovo
E2E autenticato remoto. Nessun post/report o account reale scritto, nessuna fixture
Auth creata. Harness DEV-only ignorato da Git, escluso dal bundle finale.
Dimensioni/hash in `docs/evidence/spotted-micro/validation.json`.

## J–L. Note finali

Nessun blocker visivo osservato nel perimetro. Review estetica founder e successivo
collaudo su dispositivi fisici restano distinti dai viewport browser verificati.
Questione emoji bottom nav deliberatamente rinviata, nessun intervento in questo task.

Main: `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`, invariato.
Deployment Production prima/dopo `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`, invariato.
Codice e report pushati separatamente sul solo branch staging; SHA remoto e working
tree verificati alla consegna. Nessun cambio flag Discovery/cleanup/scheduler.

QoD e Share non iniziati. Nessun merge main o deploy Production.

`SPOTTED MICRO POLISH: GO FOR REVIEW`

STOP.
