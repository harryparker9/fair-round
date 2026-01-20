-- Create a table for Rounds
create table rounds (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  code text unique not null,
  host_id uuid, -- Optional if we want to link to auth users
  status text check (status in ('active', 'completed', 'expired')) default 'active',
  settings jsonb default '{"mode": "optimized", "max_travel_time": null}'::jsonb
);

-- Create a table for Party Members
create table party_members (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references rounds(id) on delete cascade not null,
  name text not null,
  photo_path text, -- Path in Supabase Storage
  transport_mode text check (transport_mode in ('walking', 'cycling', 'transit')) default 'transit',
  status text check (status in ('pending', 'ready')) default 'pending',
  location jsonb, -- { lat, lng, address }
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for Pub Cache (Triangulation Results)
create table pub_cache (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references rounds(id) on delete cascade unique,
  results jsonb, -- The full list of pub recommendations with details
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Simple for now: allow anon read/write if they have the code)
alter table rounds enable row level security;
alter table party_members enable row level security;

create policy "Enable insert for everyone" on rounds for insert with check (true);
create policy "Enable read for everyone" on rounds for select using (true);

create policy "Enable insert for party members" on party_members for insert with check (true);
create policy "Enable read for party members" on party_members for select using (true);
create policy "Enable update for party members" on party_members for update using (true);
