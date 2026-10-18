/** Separate self editing from authorized minimal other-user reads. */
export function profileAuthorizationEnabled(env){
 if(env.VITE_PROFILE_AUTHORIZATION_V2!=='true')return false;
 if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Profile authorization v2 richiede staging.');
 return true;
}
export function createProfileAuthorizationApi(client){return {
 async profile(id){const r=await client.rpc('authorized_profile',{target_user:id});if(r.error)throw r.error;return r.data?.[0]||null;},
 async photos(refs){const r=await client.functions.invoke('profile-photo',{body:{refs}});if(r.error)throw r.error;return new Map((r.data?.photos||[]).map(p=>[p.ref,p.url]));}
};}
