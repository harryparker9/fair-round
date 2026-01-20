-- Enable RLS on rounds (ensure it's on)
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pub_cache ENABLE ROW LEVEL SECURITY;

-- 1. DROP EXISTING POLICIES TO AVOID ERRORS
DROP POLICY IF EXISTS "Allow public select rounds" ON rounds;
DROP POLICY IF EXISTS "Allow public update rounds" ON rounds;
DROP POLICY IF EXISTS "Allow public insert rounds" ON rounds;
DROP POLICY IF EXISTS "Allow public all pub_cache" ON pub_cache;

-- 2. CREATE NEW POLICIES

-- ROUNDS
CREATE POLICY "Allow public select rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Allow public update rounds" ON rounds FOR UPDATE USING (true);
CREATE POLICY "Allow public insert rounds" ON rounds FOR INSERT WITH CHECK (true);

-- PUB CACHE (Needed for saving results)
CREATE POLICY "Allow public all pub_cache" ON pub_cache FOR ALL USING (true) WITH CHECK (true);
