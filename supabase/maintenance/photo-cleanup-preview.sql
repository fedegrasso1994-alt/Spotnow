-- Read-only inventory. Run only in the authenticated project SQL Editor.
-- This is NOT a cleanup job: no objects or metadata are removed.
-- Referenced files are excluded. Recency alone cannot prove a file is disposable:
-- an upload may still be part of an unfinished save in another browser.
select count(*) as unused_files,
       count(*) filter (where o.created_at < now() - interval '24 hours') as older_than_24_hours,
       min(o.created_at) as oldest_uploaded_at
from storage.objects o
where o.bucket_id='profile-photos'
  and not exists (select 1 from public.profiles p where p.photo_path=o.name);
