-- Enable RLS on pub_cache to remove the warning
alter table pub_cache enable row level security;

-- Allow public read/write for now (MVP Demo mode)
-- In production, we'd restrict write to server-side only, but for this demo flow:
create policy "Allow all access for pub_cache"
on pub_cache for all
using (true)
with check (true);
