export function venueTokenFromQr(value, origin) {
  let url;
  try{url=new URL(value);}catch{return null;}
  if(url.origin!==origin)return null;
  const token=url.searchParams.get('venue');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||'')?token:null;
}
