import{createHash,createHmac}from'node:crypto';
export const LOCAL_USER_PURPOSE='LOCAL_RECOVERY_USER_AUTH_V1';
export function localUserDefinition(checkpoint,seed){
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(checkpoint)||!Buffer.isBuffer(seed)||seed.length!==32)throw Error('LOCAL_USER_INPUT');
 const b=createHash('sha256').update(checkpoint+':'+LOCAL_USER_PURPOSE).digest().subarray(0,16);b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;const h=b.toString('hex'),id=h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
 return{id,email:'soma-recovery-only-user-'+checkpoint.slice(0,8)+'@example.invalid',password:createHmac('sha256',seed).update(id).digest('base64url')+'aA1!',user_metadata:{synthetic:true,recovery_only:true,purpose:LOCAL_USER_PURPOSE,checkpoint_id:checkpoint}};
}
export function ownLocalFixture(user,definition,checkpointIds){if(!user||user.id!==definition.id||user.email!==definition.email||checkpointIds.includes(user.id)||user.role!=='authenticated'||user.user_metadata?.synthetic!==true||user.user_metadata?.recovery_only!==true||user.user_metadata?.purpose!==LOCAL_USER_PURPOSE||user.user_metadata?.checkpoint_id!==definition.user_metadata.checkpoint_id)throw Error('LOCAL_USER_OWNERSHIP');return true;}
