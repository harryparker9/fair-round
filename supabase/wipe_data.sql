
-- DANGER: This will delete ALL round and user data.
-- Only run this if you want to completely reset the application.

TRUNCATE TABLE rounds CASCADE;
-- 'party_members' and other related tables will be cleared automatically 
-- if they have ON DELETE CASCADE. If not, we truncate them too just in case.
TRUNCATE TABLE party_members CASCADE;

-- If 'votes' exists and isn't cascaded:
-- TRUNCATE TABLE votes CASCADE;
