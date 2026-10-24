# Staging staff — enrollment MFA locale

Follow-up OPS Phase A su baseline528360da6e675fb64f9dc18687e7e34003f89eb0,
branch `codex/soma-schema-v2-staging`. User ha creato due nuovi account dedicati
nel solo staging e ne ha nominato gli UID; Federico custodirà MFA di entrambi.
UID/config restano locali/ignorati, non hardcoded nel bundle o nel repository.

Preflight read-only dei soli due UID: entrambi esistenti/confermati,
non anonimi/banned, senza profilo, ruolo o fattore MFA. Nessuna email, password,
token o secret MFA letti/restituiti. Account creati dal founder, non dal tool.
Nessun ruolo viene assegnato: esplicito vincolo del presente passaggio.

È disponibile [utility locale dedicata](../tools/staff-mfa/README.md), separata
dall'app, servita solo su `http://127.0.0.1:4197`. Server statico, no-store,
Host/Origin guard, CSP; login/MFA direttamente via Auth staging, niente proxy
o logger delle credenziali. Public key validata, sessioni solo memoria, nessuna
route backend/Storage/RPC o configurazione globale modificata. Nessun nuovo
provider o dipendenza. Config e build `.local/staff-mfa/` ignorate; config0600.

Il controller verifica UID esatto e account confermato prima di enrollment o
challenge; mostra privatamente il QR solo al titolare. Riuso dello stesso
enrollment nella sessione, nessuna cancellazione automatica o duplicazione di
fattori. Fattore preesistente unverified richiede review, non cleanup ad hoc.
Verifica provider AAL2 e successivo logout/login/challenge per ciascun account.
Logout limitato alla sessione del tool; niente revoca globale di altre sessioni.

**Setup pronto; MFA umano ancora da collaudare.** La pagina è stata richiesta nel
pannello browser Codex (tool: queued); il link locale è disponibile anche per
apertura manuale sul Mac. Nessuna screenshot/DOM/network capture della pagina
durante interazione umana. L'agente non genera o legge password/TOTP seed/OTP.
Il risultato della UI non viene spacciato per prova finché il titolare non
completa il flow e il successivo postcheck metadata-only non viene eseguito.

Verifiche: sette test controller/guard/server statico, **7/7 PASS**. Test Auth
fake dichiarati, incluso formato reale SDK del QR; non equivalgono a enrollment
cloud. Suite completa **790/790 PASS**, build prodotto PASS, typecheck standard
PASS, bundle locale PASS; asset locali HTTP200/no-store e POST405. Typecheck
standard resta quello del progetto; il tool JS è verificato da bundle e test.
[Evidenza redatta](evidence/ops-phase-a/staff-mfa-setup.json).

File: `tools/staff-mfa/{auth.js,page.js,index.html,style.css,server.mjs,README.md}`,
`scripts/build-staff-mfa.mjs`, `tests/staff-mfa.test.js`, questo report/evidenza e
aggiornamento della procedura staff esistente. Nessuna modifica src/UI prodotto,
migration, API/RLS, Edge, config Auth, PHOTO, flag, scheduler, main o Production.

Passo successivo **solo dopo conferma umana**: leggere metadata minimi dei due
fattori e stato di login autorizzato, senza secret/token; mantenere ruoli assenti.
Grant server-side resta sospeso fino al successivo gate esplicito. Non modifica
il blocker migration history né gli altri blocker OPS.
