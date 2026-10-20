/** Separate from social likes and Spot v2. Never expose an outbox or hidden author. */
export function createRomanticApi(client){const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};return{
 settings:()=>call('spotted_romantic_settings'),
 optIn:receive=>call('spotted_romantic_opt_in',{receive}),
 submit:(content_id,content_kind,operation_id)=>call('spotted_romantic_submit',{content_id,content_kind,operation_id}),
 inbox:()=>call('spotted_romantic_inbox'),
 decide:(request_id,accept)=>call('spotted_romantic_decide',{request_id,accept}),
 report:target_user=>call('report_profile',{target_user,report_reason:'other',report_details:'Richiesta SPOTTED',also_block:true})
};}
export function romanticError(error){const code=String(error?.message||'');if(code.includes('UNAVAILABLE'))return 'Questa richiesta non è più disponibile.';if(code.includes('CONTENT'))return 'Questo contenuto non è più disponibile.';if(code.includes('ACCESS'))return 'Le richieste non sono disponibili. Verifica il tuo profilo e il consenso dating.';return 'Connessione non disponibile. Riprova.';}
