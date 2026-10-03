/** Bound network waits and honour the caller's cancellation. No request bodies are logged. */
export function boundedFetch(fetcher=fetch, timeoutMs=20000) {
  return async (input, init={}) => {
    const controller=new AbortController();
    const signal=init.signal || (typeof Request!=='undefined'&&input instanceof Request ? input.signal : undefined);
    const abort=()=>controller.abort(signal?.reason);
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(new Error('La richiesta ha impiegato troppo tempo. Riprova.')),timeoutMs);
    try{return await fetcher(input,{...init,signal:controller.signal});}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  };
}
