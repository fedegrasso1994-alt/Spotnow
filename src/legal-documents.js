/** Staging document descriptors are generated from the unchanged Legal Pack. */
export {LEGAL_DOCUMENTS} from './legal-document-data.js';
export function legalLink(doc,kind,label){
 const a=doc.createElement('a');a.className='backlink';a.textContent=label;
 a.href=kind==='terms'?'/legal/terms-v1.1-staging.html':'/legal/privacy-v1.1-staging.html';a.target='_blank';a.rel='noopener noreferrer';return a;
}
export function mountLegalLinks(doc,root){
 const links=doc.createElement('div');links.className='privacy-footer-links';
 links.append(legalLink(doc,'terms','Termini e condizioni'),legalLink(doc,'privacy','Informativa sulla privacy'));
 root.append(links);return links;
}
