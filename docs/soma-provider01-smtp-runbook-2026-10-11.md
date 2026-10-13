# Soma — requisiti custom SMTP, nessun provider selezionato

Decisione founder: default SMTP Supabase non va usato nel pilot reale. Nessun nuovo servizio/dependency configurato, nessun invio qui. Owner Federico + tecnico; contratto/transfer/retention da professionista. [Documentazione Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Requisiti di selezione

- Dati: destinatario email, mittente/header, template transazionale, link/token one-time Auth, message/delivery IDs e metadati di consegna strettamente necessari. Non includere foto, preferenze dating, venue/presenza, match o chat. Il provider può accedere al contenuto/token: trattare link come segreti, non copiarli in log/ticket pubblici.
- No open/click tracking, pixel, riscrittura link o advertising; verificare impostazioni effettive. EU/SEE preferita per messaggi, log e backup; regione marketing non basta a provare residenza totale. Documentare supporto/subprocessor/failover fuori SEE e meccanismi transfer applicabili.
- DPA/entità contraente/ruoli, subprocessor, breach commitments, export/delete, retention copie incluse bounce/suppression/support/log/backup. TTL minimo configurabile; eventuale TTL minimo vendor non compatibile → valutazione esplicita, non inventare 7 giorni universali.
- Delivery logs: status/codice/time/ID minimi, recipient minimizzato ove possibile, no corpo/link/cookie. Accessi nominativi MFA, retention configurata, nessun webhook/drain nuovo senza approvazione.
- Deliverability: sender/domain controllato e verificato, SPF/DKIM/DMARC, TLS, limiti/rate compatibili col pilot, bounce/suppression minimale, protezioni abuso Auth. Nessun marketing; dominio/sender da decidere separatamente, non acquistato qui.
- Credenziali SMTP solo impostazione server Supabase/secret manager autorizzato: mai VITE_, frontend, repo, screenshot o log. Least privilege, rotazione/revoca/recovery e owner. Separare staging/prod credential/sender/recipient allowlist.

## Staging e compatibility

Auth attuale resta testabile in staging con fixture sintetiche e limiti del servizio corrente; nessuna promessa delivery default a qualsiasi utente. Nuovo SMTP si testa dopo scelta/approvazione separata: staging dedicato, destinatari inbox di test autorizzate, nessuna copia account/mail produzione.

Checklist: signup/confirmation, email login/link o OTP dove attivi, reset dove applicabile, Google OAuth/anonymous linking invariati, redirect/PKCE/expiry/single-use/replay, retry/rate-limit/timeout provider, bounce, sender branding Soma, anti-enumeration e link scanner. Se un flow è disabilitato annotare N/A con evidenza: non attivare password reset/signup solo per soddisfare la checklist. Dopo retry non duplicare link validi senza controllo, non esporre errori vendor/recipient. Test unsubscribe marketing N/A: nessun marketing introdotto.

Criterio GO: accordi e regioni verificati, TTL/config no tracking, sender autentico, inbox controllate PASS, secret scope/rotazione auditabile, flussi realmente abilitati PASS; produzione richiede autorizzazione distinta e rollback operativo documentato. Default SMTP non è fallback di produzione approvato: se custom fallisce, pausa controllata del percorso email e assistenza, preservando sessioni e Google dove funzionale; non modificare Auth silenziosamente.
