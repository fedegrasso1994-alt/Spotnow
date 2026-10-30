import{createDiscoveryClock}from'./daily-discovery-state.js';
export{createDiscoveryClock};
export function chanceView(p){
 if(!p||!['ready','waiting','paused','tribe_required'].includes(p.status)||!Number.isFinite(Date.parse(p.server_now))||!Array.isArray(p.chances)||!Number.isInteger(p.unrevealed_count)||p.unrevealed_count<0)throw Error('CHANCE_RESPONSE');
 const ids=new Set();for(const c of p.chances){if(typeof c.id!=='string'||ids.has(c.id)||!Number.isFinite(Date.parse(c.released_at))||Date.parse(c.expires_at)-Date.parse(c.released_at)!==86400000||typeof c.revealed!=='boolean'||typeof c.spotted!=='boolean'||'profile'in c||'name'in c||'photo_path'in c)throw Error('CHANCE_RESPONSE');ids.add(c.id);}
 if(p.unrevealed_count!==p.chances.filter(c=>!c.revealed).length)throw Error('CHANCE_RESPONSE');return p;
}
export function chanceCountdown(seconds){if(seconds===null)return '—';const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
export function chanceTime(at){return Number.isFinite(Date.parse(at))?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(at)):'—';}
