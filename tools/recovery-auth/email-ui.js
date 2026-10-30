/** UI state only. Never turns a missing private link into an Auth attempt. */
export function sourceEmailControls(state,link=''){
 const verified=state?.verified===true,requested=state?.requested===true;
 return{requestDisabled:state?.attempted===true||requested||verified,verifyDisabled:!requested||verified||!String(link).trim(),awaitingLink:requested&&!verified};
}
