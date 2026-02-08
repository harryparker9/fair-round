-- Add columns to pub_cache to support smart caching
alter table pub_cache
add column if not exists filters text[] default '{}',
add column if not exists search_lat float8,
add column if not exists search_lng float8;

-- Add comment explaining usage
comment on column pub_cache.filters is 'Filters used for this search (e.g. gastropub, cocktails)';
comment on column pub_cache.search_lat is 'Latitude of the search center used for these results';
comment on column pub_cache.search_lng is 'Longitude of the search center used for these results';
