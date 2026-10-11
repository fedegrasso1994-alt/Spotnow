# RIGHTS-01 — inventario e design candidato staging

11ottobre2026. Baseline `codex/age-consent-retention-staging ef964a5` (001–023), main `d0f515e` invariato. PHOTO-01/02 non modificati. PROVIDER/INCIDENT restano su branch distinti; nessun merge implicito. La checklist autenticata successiva ha completato il perimetro. Decisione founder del 11 ottobre: sono ammesse ricevute tecniche minimali, necessarie e temporanee dopo delete, oltre alla safety evidence esplicitamente held.

Accesso/export automatico owner-only è un **sottoinsieme tecnico**, non la risposta completa già validata a un'istanza Art15 né una decisione legale sulle esclusioni. Le informazioni proteggenti terzi o indagini richiedono verifica manuale e risposta motivata dal professionista; il semplice fatto che una tabella sia privata non elimina diritti dell'interessato.

## Inventario diritti

A/E/D = accesso automatizzato / export automatizzato / delete ordinario. “Manuale” significa da valutare/fornire con procedura autorizzata, non negazione categorica. Tutte le proiezioni dirette sono del caller, nessun target_user accettato.

| Dato / collocazione | A / E / D | Esclusione/hold/relazione con altri |
|---|---|---|
| Auth users / identities / sessions | Parziale / parziale / sì, Auth delete | ID/email/phone/created/anonymous propri; niente password/token/session secret/raw metadata. Identità provider dettagliate e logs: manuale. Auth identities/sessions dipendono da provider e non sono esportati via raw to_jsonb |
| Profile / preference / occupation | sì / sì / cascade | Nome/età/genere/preference corrente solo proprio; nessuna DOB. Revoca già cancella preference; export non ricostruisce valore passato |
| AGE eligibility / age events | sì / sì / cascade | status/metodo/versione/attestazione, eventi status/time; no request fingerprint/operation internals. Restricted non blocca rights |
| CONSENT state/events/challenges | state/events sì / sì / cascade | version/time/action; challenges/token/hash tecnico esclusi. Consenso non requisito access/export/delete |
| Foto canonical/detail/thumb/preview e lifecycle | metadati / metadati / PHOTO-02 | Set propri non purged e copie Storage note; niente lease/write manifest. Binary/current preview non inclusi nel JSON; canale foto completo separato da collaudare, non “export immagini completo” |
| Check-in conservato / Ora | sì / sì / cascade | Timestamp **propri** necessari al diritto, non quelli altrui; nessuna cronologia aggiunta.90min invariati |
| Tribe membership | sì / sì / cascade | Venue ID/name propri; nessun last_visit/last_checkin_at o profilo di altri membri |
| Spot / interests | inviati sì / sì / cascade | Own sent time/venue e chiave opaca; incoming non ricambiati e mittenti esclusi. Non serve preference attiva per leggere la propria azione storica |
| Matches | propri sì / sì / cascade | ID/venue/created/first_message_at, niente preference/profilo del peer. Account delete rimuove relazione e conversazione anche al partner secondo contratto esistente |
| Messages | scritti dal caller sì / sì / cascade | Body propri, ID/match/time. Messaggi ricevuti non inclusi in automatico; eventuale accesso contestuale a dati propri/conversazione da procedura manuale, evitando materiale terzi protetto |
| Blocks | effettuati sì / sì / cascade | own action/time e chiave; chi ha bloccato il caller non rivelato |
| Reports | inviati: reason/status/time sì / sì / preparation | dettagli liberi/target e segnalazioni ricevute non esposti automaticamente, per tutela terzi/safety; valutazione manuale, non diniego automatico |
| Suspensions / moderation | own status/time sì / sì / preparation | ragioni/note/identità moderatore/report di terzi esclusi automatico. Moderator membership e moderation_audit riferiti al deleted rimossi da preparation esistente |
| Safety holds/evidence/audit | manuale / manuale / solo hold esplicito può preservare evidence | 023 preserva reason/status categorici di report held, non dettagli/chat/foto/preference. Isolati, RLS private, non discovery. Review_at/actor/audit e released retention configurabile; nessun TTL legale scelto |
| Retention runs / privacy logs | manuale se riferibili / manuale / policy lifecycle | Log privacy tipizzati non hanno user_id. Non inventare legame individuo o eventi. Event metadata AGE/CONSENT cascade; safety metadata con target va risolto/review, non purge per sola età |
| PHOTO audit / receipts / queue / ledger | escluso internals / manuale se necessario / normal lifecycle | Conclusi7giorni, unknown/review non purgati per timeout. Eccezione tecnica post-delete APPROVATA dal founder: conclusi7giorni, dettagli nel contratto; nessuna cancellazione anticipata per aggirare PHOTO |
| Email/notification | provider/manuale / manuale / da provider verificare | Non ci sono nuove notifiche/export email in questo task. Auth email/logs e Gmail manuale non cancellati dal DB account automaticamente |
| Analytics/telemetry | provider/manuale / manuale / provider TTL | Nessun advertising SDK; client30eventi RAM type/time. Logs Supabase/Vercel/GitHub/CDN/IP-UA/backups inventario provider ancora manual checks |
| Backup e copie client | manuale / manuale / expiry e restore reconciliation | Non promettere delete immediato backup immutabile o file export già scaricato; registro deletion/revoca e recovery INCIDENT/PROVIDER ancora aperti |

## Contratto e autorizzazione

Migration024 aggiunge **solo** `public.my_rights_page(section, after_key, page_size)`; niente tabella/job, nessun RLS/grant delle API esistenti modificato. SECURITY DEFINER, search_path vuoto, auth.uid non-null ed Auth ancora esistente, enum sezioni, page_size1–100, cursor max200char, grants solo authenticated e niente anon/PUBLIC. Ambiente privacy deve essere staging; prod fail-closed. Non basta una query JS che elimina campi: il backend proietta campi esplicitamente, nessun to_jsonb integrale salvo leggere singoli campi allowlist Auth.

Parametri non consentono userID o SQL/tabella arbitrari; owner_id restituito coincide col JWT caller. Senza target param non si può chiedere l'export di un altro. Se account restricted/suspended/revoked ma Auth valido, diritti propri restano disponibili. Dopo Auth delete nessun accesso, anche con sub precedente. Nessuna service role client o nuova Edge function richiesta.

Pagination keyset stabile su ID/path, pagina100 e next_key nullo a fine. Nessuna truncation silenziosa: client continua, rileva loop, account cambiato e risposte invalide. Limiti export client10k record/8MiB dati: oltre soglia error esplicito e richiesta assistenza completa, niente file parziale. Richieste boundedFetch esistenti. Non è snapshot transazionale fra pagine; aggiornamenti/delete/retention durante export → ripetere o richiesta manuale, non dichiarare point-in-time.

JSON UTF8 versionato, browser RAM/Blob solo, nessun object Storage/link pubblico o job persistente. La visualizzazione ha titoli italiani; i nomi tecnici dei campi nel JSON restano machine-readable. URL Blob revocato a chiusura/cambio sessione/nuova richiesta; non persistito in localStorage/sessionStorage/logs. Caller check su ogni pagina e ultima lettura impedisce file misto tra account.

UI sperimentale nel pannello Età/Consenso (disponibile anche restricted): “I miei dati / export (staging)”. Flag `VITE_RIGHTS_PHASE1=true` solo URL staging, insieme a `VITE_PRIVACY_PHASE1=true`. Default false in .env.example; nessun redesign o CSS modificato. Download: preparaJSON, poi link esplicito “Salva il file JSON” con gesto utente, evitando avvio automatico dopo attesa di rete. L'export ricevuto/scaricato sul dispositivo è una copia voluta dall'utente, non revocabile via account deletion.

## Cancellazione e safety

Riusato endpoint delete-account e cleanupPhotoAccount, senza modifica: JWT verificato server, caller ID ignorando target client, begin barrier → drain/retry → Storage removal → prepare_account_deletion → Auth delete → finish account cleanup. Restricted o consenso revocato non sono condizioni bloccanti. PAUSED PHOTO impedisce temporaneamente delete:409/503 o retry previsto, non successo anticipato. Unknown writer deve essere riconciliato, non timeout purge.

023 conserva solo evidence categorica per report sotto hold esplicito, separata dal prodotto e senza account utilizzabile. Un hold non autorizza automaticamente copia integrale chat/preference/foto; tale bisogno futuro richiede design/approvazione separata. Safety review/closure/accessi/durata legale da professionista; hold overdue non scade in automatico, ma non è un permesso indefinito.

**Decisione founder approvata:** il delete elimina dati prodotto ordinari; safety evidence sopravvive solo sotto hold esplicito. Receipts tecniche necessarie a integrità/idempotenza/anti-replay/lifecycle possono restare minimizzate e senza contenuti prodotto, con retention automatica breve. PHOTO mantiene i 7 giorni esistenti. UUID/path tecnici restano dati correlabili, non anonimi. Nessun uso discovery/analytics/personalizzazione. [Contratto aggiornato e coverage integrale](soma-rights01-contract-2026-10-11.md).

Le copie provider/logs/backups richiedono procedure RIGHTS manuali e validazione professionale; il modulo non dichiara di averle cancellate. Scope completo inventariato: ogni categoria è inclusa, esclusa motivatamente dal canale automatico o marcata per validazione professionale.

## Rollback e gate

Staging: disabilitare VITE_RIGHTS_PHASE1 e revocare/drop sole RPC024, nessun dato da recuperare. Non rollback020–023 o PHOTO. Smoke autenticato staging completato con due fixture sintetiche e foto sintetiche, poi cleanup completo; nessun dato reale. Prima di produzione: testi/procedura manuale/exclusions professionali, export foto/comunicazioni contesto, HTTP/JWT e device reali, test delete completo API/Storage restricted e retry, release/privacy compatibile; nuovo preflight/rollout esplicitamente autorizzato.
