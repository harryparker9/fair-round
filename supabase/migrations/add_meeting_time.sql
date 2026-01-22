-- Add meeting_time to rounds table
ALTER TABLE rounds 
ADD COLUMN meeting_time TIMESTAMPTZ DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN rounds.meeting_time IS 'The scheduled time for the meetup, used for connection planning.';
