/** Sender/context/quota are server-derived; operation IDs survive retries in this client session. */
export function spotV2Enabled(env){
 if(env.VITE_SPOT_V2!=='true')return false;
 if(env.VITE_ORA_V2!=='true'||env.VITE_PRIVACY_PHASE1!=='true'||new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Spot v2 disponibile solo nello staging.');
 return true;
}
export function createSpotV2Api(client){
 const call=async(n,a={})=>{const r=await client.rpc(n,a);if(r.error)throw r.error;return r.data;};
 return{send:(target,operation)=>call('send_spot_v2',{target_user:target,operation_id:operation,origin_kind:'ora'}),budget:()=>call('my_ora_spot_budget')};
}
