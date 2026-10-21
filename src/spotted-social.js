import{createQodApi,qodError}from'./spotted-qod.js';
/** Social content only. No profile authorization, Spot, Match or romantic request API. */
import {createRomanticApi}from'./spotted-romantic.js';
export const spottedLength=text=>[...text.trim()].length;
export function spottedError(error){const special=qodError(error);if(special)return special;const code=String(error?.message||'');if(code.includes('BOARD_RATE'))return 'Stai scrivendo troppo velocemente. Riprova tra poco.';if(code.includes('BOARD_TEXT'))return 'Usa da 1 a 280 caratteri, senza link, tag o menzioni.';if(code.includes('OPERATION_EXPIRED'))return 'Richiesta scaduta. Riprova.';if(code.includes('BOARD_ACCESS'))return 'Contenuto scaduto, rimosso o community non più disponibile.';return 'Connessione non disponibile o troppo lenta. Riprova.';}
export function createSpottedApi(client){const call=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};return{
 romantic:createRomanticApi(client),
 qod:createQodApi(call),
 operation:place=>call('board_operation',{place}),
 feed:(place,after_id=null)=>call('spotted_feed',{place,after_id}),
 comments:(target_post,after_id=null)=>call('spotted_comments',{target_post,after_id}),
 create:(place,message_text,operation_id)=>call('spotted_create_post',{place,message_text,operation_id}),
 comment:(target_post,message_text,operation_id)=>call('spotted_create_comment',{target_post,message_text,operation_id}),
 like:(content_id,content_kind,liked,operation_id)=>call('spotted_like',{content_id,content_kind,liked,operation_id}),
 report:(id,kind,reason,operation_id)=>call(kind==='post'?'board_report':'spotted_report_comment',{[kind==='post'?'target_post':'target_comment']:id,reason,operation_id}),
 remove:(id,kind,operation_id)=>call(kind==='post'?'board_delete':'spotted_delete_comment',{[kind==='post'?'target_post':'target_comment']:id,operation_id}),
};}
