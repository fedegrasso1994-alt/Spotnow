/** Presentation only: no allocation, quota accounting or client-clock authority. */
export function createDiscoveryClock(now=()=>performance.now()){
 let server=NaN,received=0,latency=0;
 return {set(payload,started=now()){server=Date.parse(payload.server_now);received=now();latency=Math.max(0,received-started);},remaining(at){const end=Date.parse(at);return Number.isFinite(server)&&Number.isFinite(end)?Math.max(0,Math.ceil((end-server-latency-Math.max(0,now()-received))/1000)):null;},clear(){server=NaN;}};
}
export function countdownText(seconds){if(seconds===null)return '—';const s=Math.max(0,Math.floor(seconds));return `tra ${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
export function discoveryView(p){
 if(!p||!['ready','partial','empty','waiting_next_window','waiting_window','tribe_required','paused'].includes(p.status)||!Array.isArray(p.profiles)||p.profiles.length>4||!Number.isFinite(Date.parse(p.server_now)))throw Error('DD_RESPONSE');
 if(new Set(p.profiles.map(r=>r.id)).size!==p.profiles.length||p.profiles.some(r=>typeof r.id!=='string'||typeof r.name!=='string'||typeof r.outgoing_spot_pending!=='boolean'))throw Error('DD_RESPONSE');
 const windowEnd=p.current_window_end||p.ends_at,next=p.next_window_starts_at||p.next_transition_at;
 if(p.status==='paused')return {kind:'paused',profiles:[],budget:null,windowEnd:null,next:null};
 if(p.status==='tribe_required')return {kind:'tribe_required',profiles:[],budget:null,windowEnd:null,next:null};
 if(p.status==='waiting_window')return {kind:'overnight',profiles:[],budget:null,windowEnd:null,next};
 if(!Number.isFinite(Date.parse(windowEnd))||!Number.isInteger(p.window_spots_remaining)||!Number.isInteger(p.day_spots_remaining)||p.window_spots_remaining<0||p.day_spots_remaining<0)throw Error('DD_RESPONSE');
 const budget=Math.min(p.window_spots_remaining,p.day_spots_remaining);
 return {kind:p.profiles.length?(budget===0?'quota':p.profiles.length<4?'partial':'full'):(Number(p.window_allocated)>0||p.status==='waiting_next_window'?'exhausted':'empty'),profiles:p.profiles,budget,windowEnd,next};
}
