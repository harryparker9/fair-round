-- Replace 'YOUR_ROUND_ID' with the actual ID from your URL or database
-- It looks like a UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)
-- You can find this by looking at your URL or the rounds table.
-- BUT, since I can't see your screen, run this and replace the ID manually in SQL editor.

-- Insert 'Sarah' in Clapham
insert into party_members (round_id, name, transport_mode, status, location)
select 
  id as round_id, 
  'Sarah (Clapham)', 
  'transit', 
  'ready', 
  '{"lat": 51.4613, "lng": -0.1383, "address": "Clapham Common"}'::jsonb
from rounds 
order by created_at desc 
limit 1; -- Adds to the MOST RECENT round created

-- Insert 'Mike' in Stratford
insert into party_members (round_id, name, transport_mode, status, location)
select 
  id as round_id, 
  'Mike (Stratford)', 
  'transit', 
  'ready', 
  '{"lat": 51.5416, "lng": -0.0034, "address": "Stratford Station"}'::jsonb
from rounds 
order by created_at desc 
limit 1; -- Adds to the MOST RECENT round created
