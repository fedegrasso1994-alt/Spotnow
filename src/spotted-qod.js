/** QoD intents only: authors and editorial controls never cross this boundary. */
export function createQodApi(call){return{
 current:place=>call('spotted_qod',{place}),
 answers:(question_id,after_id=null)=>call('spotted_qod_answers',{question_id,after_id}),
 answer:(question_id,message_text,operation_id)=>call('spotted_qod_answer',{question_id,message_text,operation_id}),
};}
export function qodError(error){const code=String(error?.message||'');if(code.includes('QOD_ALREADY_ANSWERED'))return 'Hai già risposto a questa domanda.';if(code.includes('QOD_CLOSED'))return 'Questa domanda è terminata. Torna alla community per la prossima.';return null;}
