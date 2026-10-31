/** Current-Place budget is server-derived. Never persists across detail/session changes. */
export function createOraSpotQuota({api,onChange=()=>{}}){
 let epoch=0,state={checking:false,disabled:false,label:null,remaining:null};
 return{get state(){return state;},clear(){epoch++;state={checking:false,disabled:false,label:null,remaining:null};},async load(){
  const version=++epoch;state={checking:true,disabled:true,label:'Verifica Spot…',remaining:null};onChange();
  try{const value=await api.budget();if(version!==epoch)return;const remaining=value?.place_remaining;
   if(!Number.isInteger(remaining)||remaining<0)throw Error('ORA_BUDGET_UNAVAILABLE');
   state={checking:false,disabled:remaining===0,label:remaining===0?'Spot già usato qui oggi':null,remaining};
  }catch{if(version!==epoch)return;state={checking:false,disabled:true,label:'Spot non disponibile. Riapri il profilo.',remaining:null};}
  onChange();
 }};
}
