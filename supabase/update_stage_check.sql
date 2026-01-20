-- Drop the old constraint that doesn't know about 'pub_voting'
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_stage_check;

-- Add the new constraint with the complete list of stages
ALTER TABLE rounds ADD CONSTRAINT rounds_stage_check 
CHECK (stage IN ('lobby', 'voting', 'pub_voting', 'results'));
