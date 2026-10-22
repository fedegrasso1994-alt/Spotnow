/** First-party, staging-only observation. No arbitrary payloads or offline queue. */
export const analyticsEnabled=env=>env.VITE_ANALYTICS_MVP==='true'&&new URL(env.VITE_SUPABASE_URL).hostname==='zjinjtkekmaqtxsuyvho.supabase.co';
export function createAnalyticsApi(client){return{async observe(event_name,surface,operation_id,channel='unknown',entry='direct'){const r=await client.rpc('analytics_observe',{event_name,surface,operation_id,channel,entry});if(r.error)throw r.error;}};}
const screens={privacy:'account',onboarding:'account',tribeOnboarding:'account',daily:'tribe',spotted:'spotted',venue:'ora',myprofile:'profile',matches:'match',chats:'match',chat:'match',match:'match'};
export function createAnalytics({api,session,document:doc=globalThis.document,location=globalThis.location,storage=globalThis.sessionStorage,uuid=()=>crypto.randomUUID()}){
 let owner=null,pendingDD=false;const seen=new Set();
 const entry=()=>{const q=new URLSearchParams(location.search||'');return q.has('venue')?'qr':q.has('s')?'share':q.has('n')?'notification':'direct';};
 const visible=()=>doc.visibilityState==='visible';
 function send(event,surface,op=uuid(),channel='unknown'){if(!visible()||!session()?.user?.id||session().user.is_anonymous)return;void api.observe(event,surface,op,channel,entry()).catch(()=>{});}
 return{
  authStart(channel){if(!['google','email'].includes(channel))return;try{storage.setItem('soma-analytics-auth',channel);}catch{}},
  view(screen){const account=session()?.user?.id;if(!account||session().user.is_anonymous||!visible())return;if(account!==owner){owner=account;seen.clear();let channel='unknown';try{channel=storage.getItem('soma-analytics-auth')||'unknown';storage.removeItem('soma-analytics-auth');}catch{}send('auth_success','account',uuid(),['google','email'].includes(channel)?channel:'unknown');}
   const surface=screens[screen];if(!surface)return;pendingDD=screen==='daily';// Only navigation arms DD view; background polling cannot arm it.
   const key=screen+':'+new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(seen.has(key))return;seen.add(key);send('screen_view',surface);
  },
  discoveryPainted(nonempty){if(!pendingDD||!nonempty||!visible())return;pendingDD=false;send('dd_view','tribe');},
  shareOutcome(outcome,operation){if(['shared','copied','cancelled'].includes(outcome))send('share_'+outcome,'spotted',operation);},
  shareResolved(){send('share_resolved','spotted');},
  reset(){owner=null;pendingDD=false;seen.clear();}
 };
}
