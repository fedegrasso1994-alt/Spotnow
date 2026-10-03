> Documento storico: il flusso attuale e lo stato verificato sono in `revisione-adversariale.md` e `operazioni-pilota.md`. Le sezioni precedenti possono descrivere ingresso anonimo, Google dopo il match o match a scadenza, oggi superati.

# Collegamento Supabase

La versione live è collegata al progetto tramite `.env.local`; la demo resta separata al percorso `?demo=1`. Nessun account reale è simulato.

## Configurazione necessaria
1. Progetto Supabase dedicato al pilota, URL progetto e chiave pubblica publishable/anon. Non inserire chiavi service_role nel frontend o nel repository.
2. Applicare `supabase/migrations/001_profiles_checkins.sql` al progetto vuoto.
3. Scegliere email OTP o telefono OTP. Per email, il template deve contenere `{{ .Token }}`; per SMS configurare il provider. Configurare invio, limiti e URL per il dominio del pilota.
4. Inserire il locale in `venues` e il suo codice in `spot_private.venue_codes`. Il QR contiene un link al dominio dell'app con quel token. Non pubblicare il token nel repository.
5. Collegare il client ufficiale, con `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, al modulo `src/backend.js`. L'interfaccia di accesso sarà collegata dopo la scelta del metodo e la configurazione.

## Regole già preparate nel database
Foto obbligatoria e privata, profilo 18+, scrittura solo sul proprio profilo. Accesso ai profili altrui consentito solo con check-in attivi nello stesso locale, secondo la preferenza del lettore e senza blocchi in entrambe le direzioni. Preferenze reciproche non ancora richieste, in attesa della decisione.

La durata del check-in è fissata dal server. Il client non può modificare il timestamp o rinnovare la presenza tramite una query diretta. Solo `check_in` può rinnovarla, ricevendo il codice QR.

Le foto usano link firmati di 30 secondi: un link già emesso può funzionare per il tempo residuo anche dopo il check-out; il client dovrà rinnovarlo solo con autorizzazione ancora valida. Le copie già viste o salvate non possono essere revocate.

## Verifiche prima dell'attivazione
Migration e policy devono essere eseguite su Postgres/Supabase: non risultano ancora validate su un database reale. Verificare account A/B nello stesso locale, account C in altro locale, scadenza e blocchi; accessi API diretti devono rispettare gli stessi vincoli. Verificare upload, profilo senza foto, età <18, login dopo chiusura e riapertura, QR invalido e impossibilità di scrivere check-in direttamente.

Match/chat reali e accesso ai profili via match dopo il check-out richiedono la migration successiva; questa base consente per ora accesso solo ai profili nel locale.

Riferimenti: https://supabase.com/docs/guides/auth/auth-email-passwordless ; https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/storage/security/access-control

## Verifica collegamento
Chiave pubblica verificata: `/auth/v1/settings` risponde 200. Email abilitata, telefono disabilitato. `/rest/v1/profiles` restituisce PGRST205: tabella ancora assente.

Dashboard nel browser di Codex non autenticata. Prima di testare l’accesso completo: applicare la migration, impostare redirect `http://127.0.0.1:4173/**`, configurare OTP nel template con `{{ .Token }}`. In alternativa il codice supporta anche i link di accesso email predefiniti. Nessuna email di test è stata inviata.

## Configurazione eseguita
Migration 001 eseguita nel progetto il 2 ottobre 2026. Abilitata RLS anche su `spot_private.venue_codes`. Lettura foto con controllo esplicito tramite `can_view_photo`, che limita gli altri profili alla stessa presenza e ai blocchi.

Site URL salvato: `http://127.0.0.1:4173`. Redirect autorizzato salvato: `http://127.0.0.1:4173/**`.

Test `supabase/tests/profiles_checkins.sql` eseguito sul database: PASS per isolamento locale/foto, rifiuto modifiche client alla durata, età minima, foto presente, rinnovo QR, blocco inverso e scadenza. Tutti i dati di test sono stati annullati con rollback. API senza login: risposta 401 sui profili.

Invio email ancora limitato al servizio predefinito Supabase (solo indirizzi del team). La dashboard richiede SMTP personalizzato anche per modificare i template OTP. Modalità disponibile ora: link di accesso; SMTP/OTP e prova di login reale ancora da completare. Nessuna email inviata automaticamente.

Riferimento: https://supabase.com/docs/guides/auth/auth-smtp


## Migration 002 applicata
Interessi, match e messaggi attivati. RPC express_interest, my_matches e send_message collegate al frontend. Letture e invii limitati ai partecipanti di un match attivo e non bloccato. Dopo il check-out la lista di scoperta non espone il partner; le foto restano autorizzate soltanto per una conversazione ancora accessibile. Test transazionali matches_messages.sql passati sul progetto; nessuna fixture conservata.

La sessione iniziale è anonima (configurata); Google è facoltativo dopo il primo match, ma il provider non è ancora configurato. I riferimenti sopra a tabella assente e OTP obbligatorio descrivono le fasi iniziali, superate da questa configurazione.
