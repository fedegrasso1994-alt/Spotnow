> Documento storico: il flusso attuale e lo stato verificato sono in `revisione-adversariale.md` e `operazioni-pilota.md`. Le sezioni precedenti possono descrivere ingresso anonimo, Google dopo il match o match a scadenza, oggi superati.

# Ingresso anonimo e salvataggio con Google

L'ingresso usa `signInAnonymously` solo dopo il pulsante Entra o l'apertura del QR. La sessione esistente viene riutilizzata; chiudere la pagina non elimina profilo e dati. La cancellazione dei dati del browser o il logout di un account anonimo possono impedirne il recupero.

Supabase: abilitati Anonymous Sign-Ins e Manual Linking. Nessuna modifica alle policy di presenza: ogni utente anonimo ha un ID autenticato distinto e rimane soggetto a RLS.

Dopo il primo match, messaggio facoltativo: “Salva i tuoi match — Collega Google per ritrovarli anche se cambi telefono o cancelli i dati del browser”. Più tardi lascia aperto il match e permette la chat. Il collegamento non annulla la scadenza del match.

Il prompt è collegato al primo match reale. Il profilo offre anche “Salva con Google”, così chi sceglie “Più tardi” può riprovare. La prova con due account anonimi ha verificato match, messaggi persistenti e blocco; il collegamento Google reale resta da verificare.

Stato al 2 ottobre 2026: verifica in due passaggi completata dal proprietario; progetto Google Cloud Spot Now (`rare-array-510414-d9`) e client OAuth Web creati. Credenziali inserite dal proprietario nella dashboard Supabase; provider Google verificato Enabled. Flag locale abilitato. Resta la prova OAuth reale di conservazione dello stesso UUID, profilo e match.

## Configurazione Google ancora necessaria
Email di assistenza temporanea autorizzata dal proprietario: `email personale del proprietario`. Prima del lancio sostituirla con un indirizzo dedicato a Spot Now nella schermata consenso Google e aggiornare i contatti del progetto.

1. Progetto Google Cloud e schermata consenso OAuth per Spot Now.
2. Client OAuth di tipo Web Application.
3. Redirect autorizzato: `https://qlucwdjcjomwyziegxrn.supabase.co/auth/v1/callback`.
4. Client ID e client secret configurati nel provider Google della dashboard Supabase. Il secret va inserito solo nella dashboard, mai nel frontend o nel repository.
5. Abilitare il provider e impostare `VITE_GOOGLE_ENABLED=true`, poi verificare il ritorno allo stesso user ID e la conservazione di profilo/match/chat.

Finché Google non è configurato il pulsante informa che il collegamento sarà disponibile a breve; non simula un account salvato. Se l'identità Google è già associata a un altro account, occorre un percorso esplicito di recupero/conflitto prima del pilota: non sostituire automaticamente l'account anonimo.

Riferimenti: https://supabase.com/docs/guides/auth/auth-anonymous e https://supabase.com/docs/guides/auth/auth-identity-linking
