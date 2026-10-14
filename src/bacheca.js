/** BACHECA-01 staging contract. Never grants authorization client-side. */
export const BOARD_REACTIONS=['❤️','👀','😂','🔥'];
export const boardLength=text=>[...text.trim()].length;
export function boardEnabled(env){if(env.VITE_BACHECA_PHASE1!=='true')return false;if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Bacheca disponibile solo nello staging.');return true;}
export function boardError(error){const code=String(error?.message||'');if(code.includes('DAILY_LIMIT'))return 'Hai già pubblicato 3 post oggi in questa Tribe.';if(code.includes('OPERATION_EXPIRED'))return 'Richiesta scaduta. Pubblica di nuovo per crearne una nuova.';if(code.includes('BOARD_TEXT'))return 'Scrivi un testo da 1 a 280 caratteri.';if(code.includes('BOARD_ACCESS'))return 'Post non disponibile o accesso alla Tribe non consentito.';return 'Operazione non completata. Puoi riprovare.';}
export function createBoardApi(client){const call=async(n,a)=>{const r=await client.rpc(n,a);if(r.error)throw r.error;return r.data;};return{
 operation:place=>call('board_operation',{place}),
 feed:(place,cursor=null)=>call('board_feed',{place,cursor_time:cursor?.created_at||null,cursor_id:cursor?.id||null}),
 create:(place,text,operation)=>call('board_create',{place,message_text:text,operation_id:operation}),
 react:(id,kind,operation)=>call('board_react',{target_post:id,reaction:kind,operation_id:operation}),
 remove:(id,operation)=>call('board_delete',{target_post:id,operation_id:operation}),
 report:(id,reason,operation)=>call('board_report',{target_post:id,reason,operation_id:operation}),
 };
}
