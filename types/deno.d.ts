declare namespace Deno {
 function memoryUsage():{rss:number,heapTotal:number,heapUsed:number,external:number};
 const env: {get(name:string):string|undefined};
 function serve(handler:(request:Request)=>Response|Promise<Response>):void;
}

/** Supabase hosted background lifetime; no scheduler or new provider. */
declare const EdgeRuntime:{waitUntil(task:Promise<unknown>):void};
