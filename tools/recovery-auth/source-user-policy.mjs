/** Existing confirmed source USER only; no signup, password change or redirect modification. */
import{SOURCE}from'./policy.mjs';
export const SOURCE_USER_ID='3a1ebca7-ccd5-444d-8745-ec5a117c2d08';
export const EXISTING_PREVIEW='https://spot-n6zjiy9qz-fedegrasso1994-1482.vercel.app/';
export function existingUserOtpRequest(email){if(typeof email!=='string'||!email.includes('@')||/[\r\n]/.test(email))throw Error('SOURCE_USER_EMAIL');return{email,create_user:false};}
export function sourceCredentialRoute(method,path,query=''){return method==='GET'&&['/user','/factors'].includes(path)&&!query||method==='POST'&&path==='/token'&&query==='?grant_type=password'||method==='POST'&&/^\/factors\/[a-f0-9-]{36}\/(challenge|verify)$/.test(path)&&!query;}
export function sourceMagicLinkHash(value){let u;try{u=new URL(value)}catch{throw Error('SOURCE_EMAIL_LINK_REQUIRED')}
 if(u.origin!==SOURCE||u.pathname!=='/auth/v1/verify'||u.username||u.password||u.hash||u.searchParams.get('type')!=='magiclink')throw Error('SOURCE_EMAIL_LINK_SCOPE');
 const token=u.searchParams.get('token');if(!/^[A-Za-z0-9_-]{16,256}$/.test(token||''))throw Error('SOURCE_EMAIL_TOKEN_FORMAT');return token;
}
