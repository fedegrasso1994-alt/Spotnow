/** Bound concurrent work without blocking the UI or losing rejected tasks. */
export function createRequestQueue(limit=4){
 const waiting=[];let active=0;
 function drain(){while(active<limit&&waiting.length){const task=waiting.shift();active++;Promise.resolve().then(task.work).then(task.resolve,task.reject).finally(()=>{active--;drain();});}}
 return {run(work){return new Promise((resolve,reject)=>{waiting.push({work,resolve,reject});drain();});}};
}
