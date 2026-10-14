# Retention Policy interna — Soma — bozza

**DRAFT — NOT LEGALLY VALIDATED — DO NOT PUBLISH**

14 ottobre 2026 · v 0.1 · **LEGAL VALIDATION PENDING**. Nessuna durata viene approvata o attivata da questo documento. Riferimento operativo preciso: [consolidamento lifecycle](../03-lifecycle-rights-moderation-dsa.md), parametri 023–026, PHOTO invariata.

## Registro delle categorie e stato

| Categoria | Regola candidata | Responsabile e gate |
|---|---|---|
| Check-in | Live 90 min; purge scaduti primo ciclo, obiettivo massimo 24 h senza storico | Tecnico +privacy owner da nominare; validare SLO/eccezioni |
| Spot non ricambiati / match senza chat |90 giorni, esclusioni reciproci/casi/hold | Prodotto +professionista; valori non policy approvata |
| Chat inattive |12 mesi calendario; eventuale avviso da progettare | Preavviso non implementato, owner da nominare |
| Report profilo conclusi |180 giorni candidato, no purge open/hold/sanzioni ancora necessarie | Moderation owner; reviewed non equivale a closed |
| Diagnostica / security app |7 giorni /30 giorni design | Tecnico; non replica TTL provider |
| Bacheca post/reactions | Invisibile server 24 h, purge primo ciclo eleggibile; reactions seguono parent/delete | Open report/hold differiscono; schermo già aperto ha limiti, nessun timer autonomo attuale |
| Bacheca report closed/audit |180 giorni massimo candidato report; audit segue cascade report/actor | Può sparire prima col parent. Validare record decisione/ricorso minimo separato se necessario |
| Bacheca receipt/quota |7 giorni candidato, cutoff quota per giorno Europe/Rome | Fingerprint create può confermare ipotesi sul testo; non anonimo. Retest nonce se durata cambia |
| Hold/evidence rilasciati |180 giorni candidato da release | Durata active hold non approvata: reviewer/review/max e chiusura espliciti prima pilot |
| PHOTO | Current fino replace/delete; grace 5 min, draft 24 h, technical receipts concluse 7 d | PHOTO-02 DONE, review incerto non purgabile solo per età; nessuna modifica qui |
| Auth/profile/Tribe | Fino delete o altra azione validata; nessun nuovo storico visite | Valutare necessità membership e account inattivi, non inventare TTL |
| Inbox/log provider/cache/backup | Durate effettive da verificare, non coperte dal purge app | PROVIDER/INCIDENT e professionista, niente copie permanenti ad hoc |

## Regole operative proposte

1. Ogni categoria ha finalità, owner, trigger, versione, valore, eccezioni, validation status, modalità dry-run/pause e prova di esecuzione. In staging policy OFF e retention paused; in produzione futura attivare solo ciò che è validato dopo rollout autorizzato.
2. Prima purge verificare stato aggiornato, writer/job, hold e casi aperti; recheck dopo lock condivisi. Un timeout non è prova di scrittura finita o autorizzazione a eliminare evidence. Pause non annulla una transazione già commit.
3. Hold solo esplicito, motivato, minimo, con reviewer e review_at, separato dal prodotto e senza uso discovery/matching. Non aprire hold indistinti su tutte le chat/foto. review_at non rilascia automaticamente: escalation degli overdue e decisione documentata per evitare permanenza indefinita.
4. Monitorare ultimo ciclo riuscito, backlog/età eleggibili, pause, errori e hold scaduti di review; log solo category/version/op/count/status/time. Nessun contenuto UGC, preferenza, immagine, bearer o lista account nei report pubblici.
5. Retry stesso operation ID/payload conserva esito; errore intermedio non pubblica stato parziale. Verificare dry-run, doppio run, interruzione/ripresa e concorrenza per ogni variazione. Board batching/carico richiede verifica prima scala pilot.
6. Delete utente rimuove dati ordinari e segue PHOTO; eccezioni tecniche minimali temporanee e hold non implicano account utilizzabile. Inventario copie esterne governato separatamente, con riapplicazione delete/revoca prima restore.
7. Backup con expiry finita, accesso ristretto e niente originali eliminati. Non pretendere erase immediato di backup immutabili; registro minimo degli eventi post-snapshot ancora da progettare/testare.

[DA VALIDARE: tutte le durate e basi/condizioni; finestre review e alert; persone/turni; proporzionalità receipt/hash; retention decision records; avvisi chat; TTL provider/backup; procedure richieste di limitazione/hold. Nessun purge reale eseguito da questo draft.]
