declare namespace Deno {
 function memoryUsage():{rss:number,heapTotal:number,heapUsed:number,external:number};
 const env: {get(name:string):string|undefined};
 function serve(handler:(request:Request)=>Response|Promise<Response>):void;
}
