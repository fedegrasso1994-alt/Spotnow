import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const sha256=text=>createHash('sha256').update(text).digest('hex');
export async function legalDocuments(){
 const terms=await readFile('docs/legal/02_TERMS_AND_CONDITIONS.md','utf8');
 const privacy=await readFile('docs/legal/01_PRIVACY_POLICY.md','utf8');
 const main=terms.split('<!-- SOMA-SOURCE-SEGMENT main BEGIN -->')[1]?.split('<!-- SOMA-SOURCE-SEGMENT main END -->')[0];
 if(!main||!main.includes('1. Chi gestisce SOMA')||!privacy.includes('1. Titolare e contatti')||!privacy.includes('SOMA — Privacy Policy v1.1: checklist'))throw Error('LEGAL_SOURCE_BOUNDARY');
 const bodies={terms:main.slice(main.indexOf('1. Chi gestisce SOMA')).replace(/```\s*$/,'').trim(),privacy:privacy.slice(privacy.indexOf('1. Titolare e contatti')).split('SOMA — Privacy Policy v1.1: checklist')[0].trim()};
 return Object.fromEntries(Object.entries(bodies).map(([kind,text])=>[kind,{version:kind+'-1.1-staging',url:'/legal/'+kind+'-v1.1-staging.html',sha256:sha256(text),source_sha256:sha256(kind==='terms'?terms:privacy),text}]));
}
