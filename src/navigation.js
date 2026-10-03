/** Internal history stores route data only; never OAuth tokens, drafts or profile data. */
export function createNavigation({history=window.history,onNavigate}) {
  let started=false;
  const allowed=new Set(['intro','camera','scan','login','onboarding','venue','tribes','tribe','matches','chats','myprofile','match','chat','suspended','deleting']);
  return {
    record(screen,context={},replace=false){
      if(!allowed.has(screen))return;
      const state={spotRoute:{screen,...context}};
      if(!started||replace||history.state?.spotRoute?.screen===screen){history.replaceState(state,'');started=true;}
      else history.pushState(state,'');
    },
    back(event){const route=event.state?.spotRoute;if(route&&allowed.has(route.screen))return onNavigate(route);},
    reset(){started=false;}
  };
}
