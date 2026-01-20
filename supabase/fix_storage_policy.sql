-- 1. Create the storage bucket 'temporary_selfies' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('temporary_selfies', 'temporary_selfies', true)
on conflict (id) do nothing;

-- 2. Allow Public Uploads (INSERT) for 'temporary_selfies'
create policy "Allow public uploads"
on storage.objects for insert
with check ( bucket_id = 'temporary_selfies' );

-- 3. Allow Public View/Download (SELECT) for 'temporary_selfies'
create policy "Allow public viewing"
on storage.objects for select
using ( bucket_id = 'temporary_selfies' );
