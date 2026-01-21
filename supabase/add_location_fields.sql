-- Add new columns for advanced location preference
-- Corrected to use UUID for foreign keys to match stations.id

ALTER TABLE party_members 
ADD COLUMN IF NOT EXISTS start_location_type text DEFAULT 'live', -- 'live' or 'station'
ADD COLUMN IF NOT EXISTS start_station_id uuid REFERENCES stations(id),
ADD COLUMN IF NOT EXISTS end_location_type text DEFAULT 'same', -- 'same' or 'station'
ADD COLUMN IF NOT EXISTS end_station_id uuid REFERENCES stations(id);
