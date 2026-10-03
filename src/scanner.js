import QrScanner from 'qr-scanner';
import { venueTokenFromQr } from './qr.js';

export function createVenueScanner({screen,onScan,onBack}) {
  screen.removeAttribute('onclick');
  const finder=screen.querySelector('.viewfinder');
  const video=document.createElement('video');video.playsInline=true;video.muted=true;video.className='qr-video';finder.prepend(video);
  const hint=screen.querySelector('.camhint');hint.setAttribute('role','status');
  const start=document.createElement('button');start.className='btn btn-primary btn-sm';start.style.marginTop='16px';start.textContent='Attiva fotocamera';
  const back=document.createElement('button');back.className='backlink';back.style.marginTop='18px';back.textContent='← Indietro';back.onclick=()=>{stop();onBack();};screen.append(start,back);
  let scanner,active=false,processing=false,generation=0;
  function stop(){generation++;active=false;scanner?.destroy();scanner=null;video.srcObject=null;start.hidden=false;}
  async function activate(){
    stop();const attempt=generation;active=true;start.hidden=true;hint.textContent='Consenti l’accesso alla fotocamera per inquadrare il QR.';
    const instance=new QrScanner(video,async result=>{
      if(attempt!==generation||!active||processing)return;
      const token=venueTokenFromQr(result.data,location.origin);
      if(!token){hint.textContent='Questo codice non è un QR Spot Now valido.';return;}
      processing=true;stop();
      try{await onScan(token);}catch{hint.textContent='Non riesco ad aprire questo locale. Riprova o apri il QR con la fotocamera del telefono.';}finally{processing=false;}
    },{preferredCamera:'environment',returnDetailedScanResult:true,maxScansPerSecond:5,onDecodeError:()=>{}});
    scanner=instance;
    try{await instance.start();if(attempt!==generation||!active){instance.destroy();return;}hint.textContent='Inquadra il QR esposto nel locale.';}
    catch{if(attempt!==generation)return;stop();hint.textContent='Fotocamera non disponibile. Puoi usare la fotocamera del telefono e aprire il link del QR.';}
  }
  start.onclick=activate;
  return {open(){hint.textContent='Attiva la fotocamera e inquadra il QR del locale.';},stop};
}
