/** PHOTO-02 review orchestration; review never certifies a settled writer. */
export async function reviewSnapshot(admin){const r=await admin.rpc('photo_review_inventory');if(r.error)throw new Error('PHOTO02_REVIEW_RPC');return r.data;}
export async function recordPendingReview(admin,path){const r=await admin.rpc('photo_reconciliation_pending',{path});if(r.error)throw new Error('PHOTO02_REVIEW_RPC');return r.data===true;}
