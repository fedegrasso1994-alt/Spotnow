/** User-facing errors never expose SQL, credentials or raw provider internals. */
export function userMessage(error) {
  const text=String(error?.message||'');
  if(error?.code==='PGRST205'||error?.code==='PGRST202')return 'Questa funzione è in aggiornamento. Riprova tra poco.';
  if(/rate limit|limit reached|too many/i.test(text))return 'Troppe richieste. Attendi qualche minuto e riprova.';
  if(/not authorized|email address/i.test(text))return 'Controlla l’indirizzo email o usa Continua con Google.';
  if(/sospeso|suspended/i.test(text))return 'Account sospeso. Ricontrolla lo stato del tuo account.';
  if(/QR non valido|invalid QR/i.test(text))return 'Questo QR non è disponibile. Inquadra il QR del locale.';
  if(/invalid jwt|session|jwt expired|login richiesto|accedi/i.test(text))return 'La sessione non è disponibile. Accedi di nuovo per continuare.';
  if(/Profilo non disponibile|Profile unavailable|Match scaduto|Match.*disponibile|Access denied|permission|42501|row.level|Tribe negato/i.test(text)||error?.code==='42501')return 'Questo profilo o questa conversazione non è più disponibile.';
  if(/fetch|network|offline|abort|timeout|impiegato troppo|Failed to|Load failed/i.test(text)||error?.name==='AbortError')return 'Connessione non disponibile o troppo lenta. Riprova.';
  if(text.length<180&&!/[<>]|https?:|SQL|SELECT|INSERT|UPDATE|DELETE|constraint|relation/i.test(text)&&/^(Usa una foto JPG|Carica la foto|Completa il profilo|Scrivi un messaggio|Google non ha restituito|Il messaggio.*da 1 a 2000|Inserisci il codice|Indica email oppure telefono)/i.test(text))return text;
  return 'Operazione non riuscita. Riprova.';
}
