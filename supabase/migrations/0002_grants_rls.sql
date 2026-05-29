-- All data access goes through the server using the service_role key
-- (see lib/db.ts). Enable RLS with NO anon/authenticated policies so the
-- public anon key (which ships in the browser bundle) cannot read or write
-- this minors' data directly — only our server can.
alter table students enable row level security;
alter table interests enable row level security;
alter table sessions enable row level security;
alter table session_items enable row level security;

-- service_role bypasses RLS but still needs table-level privileges. Grant them
-- explicitly (Supabase's auto-grants don't always apply to tables created via
-- the SQL editor). Covers existing objects + anything created later.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
