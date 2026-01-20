-- Add 'stage' column to rounds (default 'lobby')
alter table rounds 
add column if not exists stage text default 'lobby' check (stage in ('lobby', 'voting', 'results'));

-- Add 'area_options' to rounds (stores the 3 options)
alter table rounds 
add column if not exists area_options jsonb default '[]'::jsonb;

-- Add 'vote_area_id' to party_members (nullable)
alter table party_members 
add column if not exists vote_area_id text;
