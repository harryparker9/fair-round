-- Add vote_pub_id to party_members to track pub votes
ALTER TABLE party_members 
ADD COLUMN IF NOT EXISTS vote_pub_id text;
