/** Profile orchestration only. PHOTO remains authoritative for upload and publication. */
export const UNSAVED_PHOTO_MESSAGE='Il caricamento delle foto è temporaneamente sospeso. La foto visibile è un’anteprima non ancora salvata. Riprova più tardi.';
export async function photoForProfileSave({file,path,uploadPhoto,currentProfile}){
 if(!file)return {path,reusedCurrent:false};
 try{return {path:await uploadPhoto(file),reusedCurrent:false};}
 catch(error){
  // Only a deliberate admission pause permits preserving the already-published photo.
  // Never treat local previews, ready drafts, generic failures or another account as current.
  if(error?.code!=='PAUSED'||!path)throw error;
  const current=await currentProfile();
  if(current?.photo_path!==path)throw error;
  return {path,reusedCurrent:true};
 }
}
