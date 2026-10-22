/** Transport-independent generic presentation contract. Never accept product copy from callers. */
export const NOTIFICATION_COPY=Object.freeze({dd:'Nuove persone ti aspettano su SOMA.',match:'Hai un nuovo match ❤️',request:'Qualcuno vorrebbe conoscerti 👀',message:'Hai un nuovo messaggio.'});
export function pushEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com)$/.test(u.hostname)&&u.pathname.length>1;}catch{return false;}}
/** At-most-one intended send per lease. Ambiguous network outcomes are never retried blindly. */
export async function dispatchNotifications({rpc,send}){
 const rows=await rpc('notification_claim',{});const totals={accepted:0,expired:0,retry:0,permanent:0,uncertain:0};
 for(const row of rows){let outcome='permanent';
  if(pushEndpoint(row.endpoint))try{
   await send({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({reference:row.reference,binding:row.binding}),{TTL:300,urgency:'normal',timeout:10000});outcome='accepted';
  }catch(error){const status=Number(error?.statusCode);outcome=status===404||status===410?'expired':status===429?'retry':status>=400&&status<500?'permanent':'uncertain';}
  await rpc('notification_finish',{delivery:row.id,claim:row.lease,outcome});totals[outcome]++;
 }return totals;
}

/** Anonymous device checks have a bounded body even without Content-Length. */
export async function notificationInput(request){const reader=request.body?.getReader();if(!reader)throw Error('INPUT');const chunks=[];let size=0;try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();throw Error('SIZE');}chunks.push(part.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));}
