/** Engine transport only; no schedule, client allocation or final TRIBE UI. */
export function createDailyDiscoveryApi(client){const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};return {
 current:()=>call('my_daily_discovery'),
 spot:(target,operation)=>call('send_tribe_spot',{target_user:target,operation_id:operation}),
};}
