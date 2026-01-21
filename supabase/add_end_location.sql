ALTER TABLE party_members 
ADD COLUMN IF NOT EXISTS end_lat float8,
ADD COLUMN IF NOT EXISTS end_lng float8;
