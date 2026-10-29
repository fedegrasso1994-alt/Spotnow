export const ORIGIN='http://127.0.0.1:4297',SOURCE='https://zjinjtkekmaqtxsuyvho.supabase.co';
export const STAFF=Object.freeze({ADMIN:'7e8b9388-f0a1-4c7f-86f2-2746096016b9',MODERATOR:'f6fa2d11-cc8b-42cd-abb8-f986e07d14de'});
export const READS=['admin_analytics_dashboard','ops_health','ops_recent','moderation_review_queue'];
export function accountScope(role,id,ids){if(!['USER','ADMIN','MODERATOR'].includes(role)||!ids.includes(id)||(role==='USER'?Object.values(STAFF).includes(id):STAFF[role]!==id))throw Error('RECOVERY_ACCOUNT_SCOPE');}
export function authRoute(method,path){
 if(method==='GET'&&['/user','/factors'].includes(path))return true;
 if(method==='POST'&&['/token','/logout','/factors'].includes(path))return true;
 return method==='POST'&&/^\/factors\/[a-f0-9-]{36}\/(challenge|verify)$/.test(path);
}
export function safeCode(e){return /^[A-Z_0-9]{1,80}$/.test(e?.message||'')?e.message:'RECOVERY_REVIEW_FAILED';}
