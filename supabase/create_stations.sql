-- Enable PostGIS if not already enabled
create extension if not exists postgis;

-- 1. Create table if it doesn't exist (migrations)
create table if not exists stations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tfl_id text unique not null,
  location geography(Point, 4326) not null,
  zone integer,
  lines text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns if they are missing (Upgrade path)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'stations' and column_name = 'lat') then
        alter table stations add column lat double precision;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'stations' and column_name = 'lng') then
        alter table stations add column lng double precision;
    end if;
end $$;

-- 3. Update Indexes
create index if not exists stations_geo_idx on stations using gist (location);

-- 4. Safely Re-apply RLS Policies
alter table stations enable row level security;

-- Drop existing policies to avoid "already exists" errors
drop policy if exists "Enable read for everyone" on stations;
drop policy if exists "Enable insert for everyone" on stations;
drop policy if exists "Enable update for everyone" on stations;

-- Re-create policies
create policy "Enable read for everyone" on stations for select using (true);
create policy "Enable insert for everyone" on stations for insert with check (true);
create policy "Enable update for everyone" on stations for update using (true);
