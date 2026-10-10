/** Server-side protocol selection; never inferred from a client header or cached UI. */
export function photoProtocolRPC(protocol='photo02'){return protocol==='bridge01'?{begin:'photo_cutover_bridge_begin',intent:'photo_cutover_bridge_intent',receipt:'photo_cutover_bridge_receipt'}:{begin:'photo02_begin_photo_upload',intent:'photo_write_intent',receipt:'photo_write_receipt'};}
export async function cutoverExecuteAllowed(admin){const r=await admin.rpc('photo_cutover_execute_permit');if(r.error)throw new Error('PHOTO_CUTOVER_GATE');return r.data===true;}
