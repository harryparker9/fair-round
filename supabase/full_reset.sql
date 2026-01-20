-- Nuke all members for the specific round (or all if we want a full reset for testing)
-- Replace 'ROUND_ID' with the actual ID if known, otherwise we can just clear recent ones for testing
DELETE FROM party_members;

-- Reset round state
UPDATE rounds 
SET stage = 'lobby', area_options = NULL 
WHERE stage != 'lobby';
