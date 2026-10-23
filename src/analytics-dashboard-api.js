export function dashboardEnabled(env){
 if(env.VITE_ADMIN_ANALYTICS!=='true')return false;
 if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Dashboard staging only');
 return true;
}
export function createDashboardApi(client){return async(weeksAgo=0)=>{
 if(!Number.isInteger(weeksAgo)||weeksAgo<0||weeksAgo>10)throw Error('Periodo non valido');
 const r=await client.rpc('admin_analytics_dashboard',{weeks_ago:weeksAgo});
 if(r.error)throw Error('Dashboard non disponibile: verifica ruolo ADMIN, MFA e connessione.');
 return r.data;
};}
export function metricText(metric){
 if(!metric||metric.status==='suppressed')return 'Dati insufficienti / protetti';
 if(metric.status==='immature')return 'Coorte non ancora matura';
 if(metric.status==='unmeasured')return 'Non misurato';
 if('band'in metric)return `${metric.band} · fascia di ampiezza ${metric.band_width} profili/finestra`;
 if('returned_lower_bound'in metric)return `Ritornati ≥ ${metric.returned_lower_bound} · eleggibili ≥ ${metric.eligible_lower_bound}`;
 return `≥ ${metric.value}`;
}
/** @type {Array<[string, Array<[string, string | null]>]>} */
export const dashboardSections=[
 ['Overview',[
 ['Registrazioni osservate','signup_completed_users'],['Utenti attivati: onboarding completato','onboarding_complete_users'],['DAU · ultimo giorno concluso','dau'],['WAU · 7 giorni conclusi','wau'],['MAU · 30 giorni conclusi','mau'],['Utenti con primo Match osservato','first_match_users'],['Totale account registrati',null],['Match → primo messaggio (coorte)',null]]],
 ['TRIBE',[
 ['Drop consultati','dd_view:tribe'],['Spot creati','spot_created:tribe'],['Spot diventati reciproci','spot_matched:tribe'],['Utenti eleggibili',null],['Profili assegnati (non visualizzati)','dd_assignments'],['Media profili assegnati / finestra','dd_average'],['Zero exposure tra tutti gli eleggibili',null],['Utenti con Spot / 7 giorni',null],['Spot → Match (coorte)',null],['Ricorrenza delle coppie',null]]],
 ['ORA',[
 ['Presenze iniziate','ora_start:ora'],['Spot creati','spot_created:ora'],['Spot diventati reciproci','spot_matched:ora'],['Utenti con presenza iniziata','ora_start:ora:users'],['Manuale / QR',null],['Profili mostrati / visualizzati',null],['Spot rate / conversione (coorte)',null],['Breakdown Place',null]]],
 ['SPOTTED',[
 ['Post creati','post_created:spotted'],['Commenti creati','comment_created:spotted'],['Like aggiunti (non saldo netto)','like_added:spotted'],['QoD viste',null],['Risposte QoD','qod_answer:spotted'],['Tentativi romantic','romantic_attempt:spotted'],['Richieste consegnabili','romantic_delivered:spotted'],['Richieste accettate','romantic_accepted:spotted'],['Accept rate / Match conversion (coorte)',null],['Share: handoff nativo','share_shared:spotted'],['Share: copia link','share_copied:spotted'],['Share: annullamenti','share_cancelled:spotted'],['Share: risoluzioni autorizzate','share_resolved:spotted'],['Share iniziati / aperti / bloccati',null]]],
 ['MATCH / chat',[
 ['Match creati unici','match_created:match'],['Conversazioni iniziate','conversation_started:match'],['Messaggi inviati','message_sent:match'],['Origine esclusiva del Match',null],['First-message rate (coorte)',null],['Tempo medio / mediano al primo messaggio',null]]]
];
