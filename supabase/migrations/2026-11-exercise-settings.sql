-- Per-exercise avoid/replace choices and pain-review timestamps. Run once in the Supabase SQL editor.
alter table user_preferences add column if not exists exercise_settings jsonb default null;
