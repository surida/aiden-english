create table corrections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  original text not null,
  fixed text not null,
  note text,
  created_at timestamptz default now()
);

create index corrections_session_recent on corrections (session_id, created_at desc);

-- Server-only access, same posture as the other tables.
alter table corrections enable row level security;
grant all privileges on table corrections to service_role;
