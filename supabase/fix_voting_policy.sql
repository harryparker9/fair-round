-- Enable RLS but create a permissive policy for the MVP
-- This allows anyone to insert, update, or select party members
-- Crucial for anonymous voting where we rely on localStorage IDs

ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to party_members"
ON party_members
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure the vote_area_id column is actually there (it should be, but just in case)
COMMENT ON COLUMN party_members.vote_area_id IS 'The ID of the area the member voted for';
