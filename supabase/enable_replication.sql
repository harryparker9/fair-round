-- Enable Realtime Replication for specific tables
-- This is critical for users to see updates without refreshing

-- Check if publication exists, otherwise creating default is complex via SQL editor 
-- so we just ALTER the default one which usually exists as 'supabase_realtime'

BEGIN;
  -- Remove if already exists to avoid duplication errors (optional safe-guard)
  ALTER PUBLICATION supabase_realtime DROP TABLE party_members;
  ALTER PUBLICATION supabase_realtime DROP TABLE rounds;
  
  -- Add them fresh
  ALTER PUBLICATION supabase_realtime ADD TABLE party_members;
  ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
COMMIT;
