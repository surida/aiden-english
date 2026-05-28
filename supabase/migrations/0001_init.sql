create table students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  level int not null default 2,          -- hidden 1..6 internal scale
  diagnosed_at timestamptz,
  created_at timestamptz default now()
);

create table interests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  tag text not null,                      -- e.g. "kpop","games"
  note text                               -- recent topic memory, e.g. "exam on Fri"
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  persona_id text not null,
  mode text not null,                     -- "free" | "daily_q" | "diagnostic"
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,                     -- "student" | "ai"
  text text not null,
  correction jsonb,                       -- {original, fixed, note} when present
  created_at timestamptz default now()
);
