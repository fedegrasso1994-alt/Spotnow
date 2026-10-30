// Optional process-local test transport for a proven stale LAN DNS cache.
// Exact staging hostname only, normal TLS/SNI/certificate verification unchanged.
import dns from'node:dns';import{isIP}from'node:net';
if(process.env.CHANCE_STAGING_PUBLIC_DNS==='1'){
 const hostname='zjinjtkekmaqtxsuyvho.supabase.co',original=dns.lookup.bind(dns),resolver=new dns.Resolver();resolver.setServers(['1.1.1.1']);
 dns.lookup=function(name,options,callback){if(name!==hostname)return original(name,options,callback);if(typeof options==='function'){callback=options;options={};}const verified=process.env.CHANCE_STAGING_VERIFIED_ADDRESS;if(verified){if(isIP(verified)!==4)throw Error('INVALID_VERIFIED_ADDRESS');if(options?.all)return callback(null,[{address:verified,family:4}]);return callback(null,verified,4);}resolver.resolve4(name,(error,addresses)=>{if(error)return callback(error);if(options?.all)return callback(null,addresses.map(address=>({address,family:4})));callback(null,addresses[0],4);});};
}
