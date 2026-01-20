-- Remove duplicate members, keeping the most recent one for each name in the round
DELETE FROM party_members a USING party_members b
WHERE a.id < b.id
AND a.round_id = b.round_id
AND a.name = b.name;
