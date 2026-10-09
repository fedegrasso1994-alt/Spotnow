import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
export async function database({limit=19}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,is_anonymous boolean not null default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb default '{}'::jsonb,created_at timestamptz default now(),updated_at timestamptz default now());
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')&&Number(f.slice(0,3))<=limit).sort()){if(f.startsWith('017_')){await db.exec(await readFile('supabase/cutover/prepare.sql','utf8'));await db.exec("update spot_private.photo_cutover_control set phase='DRAINING'");}await db.exec(await readFile(`supabase/migrations/${f}`,'utf8'));}
 if(limit>=19)await db.exec("update spot_private.photo_cutover_control set phase='OPEN',smoke_epoch=epoch,execute_enabled=true");
 return db;
}
export const ids={a:'10000000-0000-0000-0000-000000000001',b:'10000000-0000-0000-0000-000000000002',c:'10000000-0000-0000-0000-000000000003',v:'20000000-0000-0000-0000-000000000001',w:'20000000-0000-0000-0000-000000000002',q:'30000000-0000-0000-0000-000000000001',r:'30000000-0000-0000-0000-000000000002'};
export async function seed(db){const {a,b,c,v,w,q,r}=ids;await db.exec(`insert into auth.users values('${a}',false),('${b}',false),('${c}',false);
 insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height) values('${a}/a.png','${a}','data:image/jpeg;base64,YQ==',repeat('a',64),1,'PNG',1,1),('${b}/b.png','${b}','data:image/jpeg;base64,YQ==',repeat('a',64),1,'PNG',1,1),('${c}/c.png','${c}','data:image/jpeg;base64,YQ==',repeat('a',64),1,'PNG',1,1);
 insert into public.profiles values('${a}','Anna',24,'F','ALL','${a}/a.png',now()),('${b}','Luca',26,'M','ALL','${b}/b.png',now()),('${c}','Cleo',25,'F','ALL','${c}/c.png',now());
 insert into storage.objects(bucket_id,name) values('profile-photos','${a}/a.png'),('profile-photos','${b}/b.png');
 insert into public.venues(id,name,address) values('${v}','Gym','Test'),('${w}','Campus','Test');insert into spot_private.venue_codes values('${v}','${q}'),('${w}','${r}');`);}
export const asUser=async(db,id)=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);
export const admin=async db=>db.exec('reset role;');
