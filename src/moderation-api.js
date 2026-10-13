export function moderationEnabled(env){if(env.VITE_MODERATION_PHASE1!=='true')return false;if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Moderation staging only');return true;}
export function createModerationApi(client){
 const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw Error('Moderazione non disponibile: verifica ruolo, MFA o aggiorna la coda.');return r.data;};
 return{release:(target,reason,note,operationId)=>call('moderation_release',{target_user:target,reason_code:reason,note,operation_id:operationId}),queue:(filter,cursor)=>call('moderation_queue',{filter,cursor_time:cursor?.created_at||null,cursor_id:cursor?.id||null,page_size:50}),action:(r,action,reason,note,hours,operationId)=>call('moderation_action',{report_id:r.id,action,reason_code:reason,note,duration_hours:hours,operation_id:operationId,expected_revision:r.revision})};
}
export function createOwnModerationNotice({backend,document:doc=globalThis.document}){
 if(!backend.moderationNotice)return {refresh:async()=>{}};
 const notice=doc.createElement('p');notice.className='sub';notice.setAttribute('role','status');notice.hidden=true;doc.getElementById('profileActions').append(notice);
 let epoch=0;backend.onSessionChange(event=>{if(event==='SIGNED_OUT'){epoch++;notice.hidden=true;notice.textContent='';}});
 return{async refresh(){const generation=epoch;try{const s=await backend.moderationNotice();if(generation!==epoch)return;notice.hidden=!s?.warning;notice.textContent=s?.warning?'Hai ricevuto un avviso di moderazione. Rispetta le regole della community; per chiarimenti contatta l’assistenza.':'';}catch{notice.hidden=true;notice.textContent='';}}};
}
