import {LEGAL_DOCUMENTS} from './legal-documents.js';
/** Missing/new server contracts fail closed; these checks never replace server authorization. */
export const legalGateRequired=s=>!s||s.age_status!=='eligible'||s.terms_status!=='accepted'||!knownTerms(s);
export const knownTerms=s=>Boolean(s&&s.required_terms_version===LEGAL_DOCUMENTS.terms.version&&s.required_terms_hash===LEGAL_DOCUMENTS.terms.sha256&&s.terms_url===LEGAL_DOCUMENTS.terms.url);
export const operationIds=()=>({age:crypto.randomUUID(),terms:crypto.randomUUID()});
export async function completeLegalGate(backend,displayed,{adult,terms,operations,current=()=>true,onState=(_state)=>{}}){
 const ensure=()=>{if(!current())throw Error('LEGAL_ACCOUNT_CHANGED');};
 ensure();
 if(!knownTerms(displayed))throw Error('LEGAL_VERSION_UNAVAILABLE');
 if(displayed.age_status!=='eligible'&&!adult)throw Error('AGE_EXPLICIT_REQUIRED');
 if(displayed.terms_status!=='accepted'&&!terms)throw Error('TERMS_EXPLICIT_REQUIRED');
 const fresh=await backend.privacyState();ensure();
 if(!knownTerms(fresh)||fresh.required_terms_version!==displayed.required_terms_version||fresh.required_terms_hash!==displayed.required_terms_hash){onState(fresh);throw Error('LEGAL_VERSION_CHANGED');}
 // A hidden/already satisfied requirement cannot supply a new explicit choice.
 if(fresh.age_status!=='eligible'&&(!adult||displayed.age_status==='eligible'||fresh.statement_version!==displayed.statement_version)){onState(fresh);throw Error('AGE_EXPLICIT_REQUIRED');}
 if(fresh.terms_status!=='accepted'&&(!terms||displayed.terms_status==='accepted')){onState(fresh);throw Error('TERMS_EXPLICIT_REQUIRED');}
 if(fresh.age_status!=='eligible'){await backend.attestAdultCheckbox(true,operations.age);ensure();}
 if(fresh.terms_status!=='accepted'){await backend.acceptTerms(fresh,true,operations.terms);ensure();}
 const result=await backend.privacyState();ensure();onState(result);
 if(legalGateRequired(result))throw Error('LEGAL_INCOMPLETE');
 return result;
}
