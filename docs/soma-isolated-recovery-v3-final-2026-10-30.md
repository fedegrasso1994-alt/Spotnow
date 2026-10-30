# SOMA — ISOLATED RECOVERY V3: final review

30 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline `d30ae62b7e3890615a39d67f1a25956ceb2132b7`.

**ISOLATED RECOVERY V3: GO FOR REVIEW**

La prova del contratto v3 e del target isolato è conclusa: DB, Storage, identità durevoli, rifiuto delle capability source, nuovo MFA staff, separazione privilegi, logout/stale e replay finale sono verificati. Il target rimane quarantinato. Il solo harness privato è stato fermato dopo le prove; fattori MFA recovery preservati, nessuna revoca sessioni source. I target operativi RPO continuo ≤24h e RTO di poche ore **non sono dimostrati** da questo percorso di debug e attese durato più giorni; le misure e i limiti sono sotto. Nessun via libera al pilot o a Production è implicito.

Questo è il report conclusivo; [evidenze aggregate](evidence/ops-phase-a/isolated-recovery-v3-final-2026-10-30.json). I report precedenti conservano i rispettivi STOP storici.

## A–G. Contratto, isolamento e replay

| Voce | Risultato |
|---|---|
| Checkpoint | `28ec939f-9e37-4b91-9fe2-2cc1c9e252dc`, manifest/contratto v3 |
| SHA-256 archivio cifrato | `b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae` |
| Integrità | AES-GCM/hash/46 file verificati; archivio storico invariato |
| Auth durevole | proiezioni esplicite `auth.users` e `auth.identities`, secondo manifest v3; hash password durevole presente solo nell'archivio cifrato/DB privato |
| Auth transitorio | sessioni, refresh, MFA factors/challenges, flow/OAuth/SAML runtime e staff revoked-session rows esclusi dal restore |
| Campi misti Auth | ricostruzione neutra esatta dei quattro campi transitori auditati; nessuna alterazione password/hash o normalizzazione generica |
| Vecchi archivi | v1/v2 incompatibili rifiutati dal validatore; nessun downgrade silenzioso |
| Importer | `supabase_admin` solo bootstrap; nessun grant a postgres, owner/ACL stripping, FK bypass o dummy session |
| DB owner / public owner | postgres / pg_database_owner preservati |
| Catalogo finale | 1.547 originali verificati; ACL/default ACL/RLS/policies/SECURITY DEFINER preservati |
| Delta provider | sola migration Storage 0074 già approvata; funzione/trigger gestiti dal provider, ownership corretta, applicata una volta |
| Runtime | Auth/REST/Storage con identità ristrette; nessun uso runtime di supabase_admin |
| Quarantena | rete Docker internal, nessuna porta pubblicata dai tre servizi; nessuna riapertura al pubblico |

Il source non viene ruotato o ripulito per simulare DR. La barriera dipende dal trust distinto del target e dall'assenza delle sessioni source, provata con capability **realmente emesse e valide nel source**.

Replay iniziale della vecchia fixture vuota cancellata dal source: eseguito tramite engine PHOTO/account deletion già previsto. Replay finale: **PASS read-only**, identità cancellata ancora assente, nessun nuovo delta durevole, zero ulteriori chiamate al deletion engine. Credential/identity digest, ruoli, consensi, hold/suspension/moderation restano coerenti. Il nuovo audit evita il confronto improprio dei timestamp di login con il digest completo usato durante la prima cancellazione; non ignora variazioni di sicurezza. Nessuna revoca, promozione o release hold automatica.

## H–M. Prove Auth, MFA e autorizzazione

Il messaggio umano `USER PASS; ADMIN PASS; MODERATOR PASS` è stato confrontato con il risultato **calcolato dal server**, non assunto come unica evidenza. Gate completo `pass:true`, completato il 30 ottobre alle `10:59:33.323Z`.

| Source capability reale | Source valido | Target Auth | Target REST | Target refresh |
|---|---|---|---|---|
| USER ordinario esistente, magiclink normale | GET user verificato, AAL1 | 403 | 401 | 400, nessuna sessione emessa |
| ADMIN dedicato, MFA source esistente | GET user verificato, AAL2 | 403 | 401 | 400, nessuna sessione emessa |
| MODERATOR dedicato, MFA source esistente | GET user verificato, AAL2 | 403 | 401 | 400, nessuna sessione emessa |

Nessun token finto o chiave API legacy usato per sostituire questa prova. Il refresh opaco a 12 caratteri viene accettato come formato, poi sottoposto ai controlli reali. La validazione source precede sempre i probe target. Nessuna capability è salvata nelle evidenze.

**USER target**: canary recovery-only precedente PASS con password errata negata, password corretta/sessione/GET user/refresh locale reali, RLS e staff denied, logout e cleanup completo. È una nuova fixture esclusivamente locale, distinta dal checkpoint: non è presentata come password storica recuperata. Le identità storiche sono state caricate da GoTrue; i due staff hanno inoltre effettuato veri login recovery con le identità/password recuperate. La composizione delle prove USER, approvata dal founder, mantiene separata la prova source-token del USER ordinario da quella della password locale. Nessun reset o alterazione hash staging/recovery.

**ADMIN recovery**: fresh login AAL1 con tutti i privilegi staff negati; nuovo enrollment TOTP solo recovery; AAL2 con dashboard Analytics, ops_health, ops_recent e moderation_review_queue consentiti, come nel modello congelato. Logout reale e stessi JWT negati su tutte le superfici staff.

**MODERATOR recovery**: fresh login AAL1 negato; nuovo TOTP solo recovery; AAL2 consente moderation_review_queue e nega Analytics, ops, role management. Logout reale e JWT stale negati.

Stato target dopo i logout: **0 sessioni, 0 refresh, 0 live refresh-session, 0 revocation receipts pendenti, 0 FK non validate**; un fattore TOTP verified per ciascuno staff, entrambi creati nel recovery dopo il preflight, **0 unverified**. ADMIN/MODERATOR restano assegnati come stato applicativo durevole; nessun grant/revoke eseguito durante questo finale. MFA source invariato. Le garanzie migration 055 rimangono preservate e coperte dai test di stale-session/revoke-regrant della suite.

## I–K. DB ↔ Storage e smoke applicativo

- DB restaurato riutilizzato: nessun nuovo restore o retry-until-green.
- Byte Storage verificati attraverso API privata: **42/42 SHA-256 PASS**, zero orfani, zero canonical mancanti, PHOTO ledger invariato. Route anonima/pubblica negate, nessun byte immagine esposto.
- Auth health / REST / Storage status: **200 / 200 / 200**.
- API applicative staff: veri JWT umani AAL2 esercitano dashboard/ops/moderation con la separazione sopra.
- Contratti ordinari account status e Match: letture reali tramite authenticator→authenticated nel DB, con UID ordinario recuperato; ritorni corretti e nessun altro profilo leggibile. È una prova DB/RPC con contesto dichiarato, non un nuovo login Auth né una simulazione di JWT firmati.
- HTTP anonimo su dashboard, ops_health, moderation_review_queue e my_matches: **401**.

Scope dello smoke: **API/DB/service recovery**, insieme alle prove Auth reali sopra. Non viene dichiarato un nuovo walkthrough completo dell'interfaccia prodotto, un deploy Edge locale o Web Push reale. Nessun contenuto personale incluso nei risultati.

## N–O. Misure effettive e limiti RPO/RTO

| Riferimento | Timestamp UTC |
|---|---|
| Cutoff checkpoint recuperato | 2026-10-28 07:40:43.624898 |
| Avvio retry v3, receipt originale esclusivo | 2026-10-28 16:33:36.988 |
| Smoke applicativo conclusivo verificato | 2026-10-30 11:03:39.504 |

Misure ricavate dai timestamp registrati, risoluzione di calcolo millisecondi:

- **Lag del recovery point all'avvio del retry**: 31.973,364 s = **8h 52m 53,364s**. Questa è la misura del gap del checkpoint nel relativo scenario di drill; non inventa un incidente reale né dimostra RPO continuo ≤24h.
- **Tempo osservato del percorso di recovery retry**: 153.002,516 s = **42h 30m 02,516s**. Include diagnosi, blocchi provider, test e attese umane. Il cronometro non è stato azzerato al login finale. Non comprende una durata totale della campagna precedente non dimostrabile da questa receipt.
- **Età dello stesso checkpoint allo smoke conclusivo**: 184.975,880 s = **51h 22m 55,880s**. Questo archivio storico non dimostra copertura di un ipotetico incidente corrente entro 24h.

Il target di ripristino in poche ore **non è raggiunto nel percorso osservato**. Per il pilot restano la prova della cadenza backup ≤24h con recovery point coerenti e un drill cronometrato sul percorso ormai corretto. Non si esegue ora un ulteriore restore per migliorare il numero e non si escludono retroattivamente le attese. La perdita effettiva di dati di un incidente reale non è misurata, perché nessun incidente reale è stato dichiarato.

## P. Stato operativo e rischi residui

1. Nessun blocker strutturale residuo rilevato nella prova di recovery v3 qui definita; review del contratto/operatività richiesta prima dell'impiego reale.
2. RPO operativo continuo ≤24h e RTO breve restano gate pre-pilot, con i limiti misurati sopra. Nessun nuovo backup o rollout automatico avviato in questo finale.
3. Il target isolato rimane privato per la review, con due staff e nuovi fattori MFA recovery intenzionalmente conservati. Gestire rimozione ambiente/copie secondo la retention backup approvata e l'autorizzazione operativa; nessun job di cleanup nuovo creato.
4. Il flag Retention scheduler ripristinato nel DB è `true`, ma lo schema cron è assente nel target: **nessun job fisico locale attivato**. Non è stato sincronizzato o modificato il flag. Notifications delivery è false. Nessuna feature/schedule source cambiata.
5. Nessuna email ulteriore dopo l'unica richiesta accettata alle 10:51:58 UTC; nessuna automazione creata. Nessun provider, piano, DNS, signing trust o session revocation source modificato.

## Q–V. Test, file e Git

Suite finale **885/885 PASS**, zero failure/skip/cancel, una sola esecuzione in questa chiusura. **Build PASS; typecheck PASS.** Questa chiusura cambia solo documentazione/evidence: nessun codice prodotto, migration, RLS, API condivisa, PHOTO o Auth policy modificato.

Main/origin-main restano `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Nessun deploy, alias o env Production toccato. Source staging: solo letture finali; i login source sono stati effettuati privatamente dal titolare nel gate autorizzato. Nessun valore di password, OTP, TOTP seed, recovery code, JWT o refresh è presente nel report/Git.

**ISOLATED RECOVERY V3: GO FOR REVIEW**
