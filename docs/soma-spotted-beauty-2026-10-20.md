# SOMA — SPOTTED BEAUTY / EMOTIONAL POLISH

2026-10-20 — `SPOTTED BEAUTY: GO FOR REVIEW`

Baseline `77e048c0d306c30d5ba72413ba21cdfe91da5c5c`; solo branch
`codex/soma-schema-v2-staging`. Codice Preview:
`5c04f7ac1116cadcaac7dc641da6fcb9d5dd7ea9`.
Commit di consegna successivo: solo report/evidenze, nessuna differenza runtime.

## A. Audit visuale

Review della Preview esistente, anche della sezione SPOTTED autenticata in sola
lettura, e confronto con lo screenshot sintetico del precedente collaudo.
Like, commenti e CTA romantica apparivano quasi allo stesso livello: pulsanti
outline con poca distinzione. Il cuore Unicode non distingueva chiaramente lo
stato attivo; lo stato vuoto era una sola riga tecnica. Card e azioni davano
un'impressione rigida, senza richiedere un nuovo design system.

## B–D. Modifiche e pattern

- Cuore outline SVG; pieno e corallo solo quando `liked` restituito dal server è
  true. Contatore aderente, cifre tabulari. Nessun optimistic like o cambio API.
- Fumetto outline per commenti, contatore e target leggibili; commenti separati
  dal post con un sottile bordo laterale, senza trasformarli in chat.
- CTA romantica su riga propria, accento corallo attenuato e piccola icona outline.
  Nessun indicatore di consegna: conferma neutra esistente invariata, resa più
  leggibile da un bordo laterale. Non è uno stato persistente della richiesta.
- Superficie post appena più calda, metadato statico “Una voce della community”,
  gerarchia delle azioni e dei link secondari più chiara. Nessuno pseudonimo stabile.
- Stato vuoto “Qui manca solo la tua voce.” con invito breve. Commenti vuoti con
  invito dedicato. Non mostrato durante caricamento o errore.
- Riutilizzati `board-card`, `btn`, `btn-ghost`, `backlink`, superfici/raggi SOMA,
  Inter/Bebas Neue e accento corallo. Nuovo piccolo set SVG statico outline coerente
  (cuore, commento, scintilla, chevron), senza librerie, emoji o richieste esterne.
- Tap feedback esistente, focus esplicito e rispetto `prefers-reduced-motion`.
  Nessuna animazione pesante. MATCH/accettazione già esistenti non modificati.

## E. File

Runtime:
1. `src/spotted-presentation.js` — icone statiche e stati vuoti, solo presentazione.
2. `src/spotted-social-ui.js` — composizione visiva, classi e copy.
3. `src/spotted-social.css` — aggiunte tutte sotto `#spotted`; regole romantiche
   preesistenti relative a MATCH/PROFILO lasciate intatte.

Test:
4. `tests/spotted-beauty.test.js` — sei regressioni mirate.
5. `tests/spotted-social-client.test.js` — aggiornate due aspettative di copy.

Consegna:
6. Questo report.
7. `docs/evidence/spotted-beauty/validation.json` — risultati, SHA e hash screenshot/log.

Nessuna modifica a stili globali, navigazione, token, TRIBE, ORA, MATCH o PROFILO.
Nessuna migration, modifica SQL/RPC/RLS, Edge deploy o modifica PHOTO.

## F. Mobile/accessibilità

Browser: 390×844 e 320×700. Nessun overflow orizzontale, incluse parole lunghe
senza spazi nei commenti. Azioni alte almeno 44 px; CTA romantica 46,30 px, larghezza
250 px nel post a 320 px; va a capo come riga separata, senza comprimere il testo.
Scroll normale sopra la tab bar esistente. Non tutte le azioni devono stare sopra
la piega: restano raggiungibili scorrendo.

Focus tastiera: outline visibile 2 px. SVG decorativi `aria-hidden`, non focusabili;
nomi accessibili Mi piace/Rimuovi mi piace preservati. Contrasto testo aggiunto:
15,00:1 body, 5,03:1 metadati/link, 6,56:1 like attivo, 7,72:1 CTA romantica,
4,57:1 secondario stato vuoto. I colori disabilitati non sono presentati come attivi.
Zero errori console nel collaudo componente. Sono viewport responsive, non test
fisici iOS/Android né una certificazione completa WCAG.

## G–I. Test

- Frontend mirati: **21/21 PASS**.
- Nuovi: self-like e unlike con argomenti API invariati; stato vuoto soltanto su
  risposta vuota valida; commenti a un livello; CTA e ricevuta neutra; SVG statici;
  scope CSS/focus/touch/reduced-motion.
- Suite completa finale: **616/616 PASS**, zero fail/skip.
- Build staging con flag baseline: **PASS**.
- Typecheck: **PASS**.
- Scanner release: **PASS**, 37 file; nessun fixture/secret/env nel bundle.
- Font locali: **PASS**, nove asset, nessuna dipendenza Google Fonts runtime.

La suite include SPOTTED social/romantic PostgreSQL-backed, quote, anonimato,
accept/Match, guard, opt-out e le regressioni core preesistenti. Nessuna loro
semantica è stata riaperta. Il self-like resta consentito, come prima.

## J. Preview e verifica ambiente

[Apri Preview staging](https://spot-ms6zz4yar-fedegrasso1994-1482.vercel.app)

- Deployment `dpl_Cf5KkduUHfi19XV4jeKUsJyKxEAt`, READY, Preview.
- SHA codice `5c04f7ac1116cadcaac7dc641da6fcb9d5dd7ea9`.
- Solo Supabase `zjinjtkekmaqtxsuyvho`, nessun riferimento production nel bundle.
- Deployment Protection mantenuta attiva.
- Boot, welcome SOMA attuale, login, asset/import e reload mobile: PASS;
  zero errori console osservati. Nessun nuovo login Google/email reale in questo task.
- Primo artifact `dpl_Dbui7t7khXETXiHsstxzrZ4AAZUv` non è quello consegnato:
  il browser smoke ha rilevato flag frontend staging mancanti (vecchia intro QR).
  Artifact ricreato con gli stessi flag della baseline approvata; nessuna modifica
  sorgente per aggirare i gate. Configurazione riproducibile nell'evidenza JSON.
- Unica configurazione di delivery esterna: aggiunto soltanto l'host esatto della
  Preview finale alla allowlist Auth **staging**, 13→14 URL; Site URL e 13 voci
  precedenti invariati. Nessun cambio provider, email confirmation, GCP o OAuth.

## K. Screenshot

Tutte le immagini SPOTTED seguenti usano il vero renderer con un adapter UI
**sintetico locale**, esplicitamente distinto dal backend: nessun contenuto
pubblicato su account reali, nessun mock inserito nel bundle finale. Il percorso
locale di review è DEV-only, ignorato da Git e non incluso nell'artifact.
Non sono dichiarate come un nuovo E2E autenticato sulla Preview hosted.

Cartella locale: `.local/spotted-beauty/screenshots/`.

| Richiesta | File |
|---|---|
| A. Post normale | `post-390.png` |
| B. Like attivo | `liked-390.png` |
| C. Commenti visibili | `comments-390.png` |
| D. CTA romantica / feedback neutro | `romantic-390.png` |
| E. Stato vuoto | `empty-390.png` |
| F. 320 px | `post-320.png`, `comments-320.png`, `empty-320.png` |
| G. 390 px | immagini sopra e `preview-390.png` (welcome hosted) |

Hash/dimensioni in `docs/evidence/spotted-beauty/validation.json`.
Screenshot locali preservati come materiale di review, non dati utenti nel repository.

## L–N. Limiti, integrità e Git

Nessun blocker visivo riproducibile nel perimetro verificato. Rimane la review
estetica founder e il successivo collaudo su dispositivi fisici; nessun claim di
nuovo smoke autenticato remoto completo. Nessun dato backend o account creato o
cancellato per questo polish. Nessun cambio a Discovery, retention, cleanup o scheduler.

Main resta `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
Vercel Production prima/dopo: `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`, invariata.
Solo branch staging; codice e report pushati con commit separati. Stato finale
working tree/remoto verificato alla consegna. Nessun merge main, QoD o share.

`SPOTTED BEAUTY: GO FOR REVIEW`

STOP.
