-- Enable RLS (just to be safe, though usually enabled)
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pub_cache ENABLE ROW LEVEL SECURITY;

-- ROUNDS: Allow anyone to Select, Insert, Update (for MVP simplicity)
DROP POLICY IF EXISTS "Enable read access for all users" ON rounds;
DROP POLICY IF EXISTS "Enable insert for all users" ON rounds;
DROP POLICY IF EXISTS "Enable update for all users" ON rounds;

CREATE POLICY "Enable read access for all users" ON rounds FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON rounds FOR UPDATE USING (true);

-- PARTY_MEMBERS: Allow full access
DROP POLICY IF EXISTS "Enable read access for party_members" ON party_members;
DROP POLICY IF EXISTS "Enable insert for party_members" ON party_members;
DROP POLICY IF EXISTS "Enable update for party_members" ON party_members;

CREATE POLICY "Enable read access for party_members" ON party_members FOR SELECT USING (true);
CREATE POLICY "Enable insert for party_members" ON party_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for party_members" ON party_members FOR UPDATE USING (true);

-- PUB_CACHE: Allow full access
DROP POLICY IF EXISTS "Enable read access for pub_cache" ON pub_cache;
DROP POLICY IF EXISTS "Enable insert for pub_cache" ON pub_cache;
DROP POLICY IF EXISTS "Enable update for pub_cache" ON pub_cache;

CREATE POLICY "Enable read access for pub_cache" ON pub_cache FOR SELECT USING (true);
CREATE POLICY "Enable insert for pub_cache" ON pub_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for pub_cache" ON pub_cache FOR UPDATE USING (true);
