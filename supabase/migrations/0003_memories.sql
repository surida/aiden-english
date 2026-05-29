create table memories (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  content text not null,                  -- e.g. "has a dog named Coco", "math exam on Friday"
  kind text not null default 'fact',      -- "fact" (durable) | "event" (time-bound)
  created_at timestamptz default now()
);

create index memories_student_recent on memories (student_id, created_at desc);

-- Server-only access, same posture as the other tables.
alter table memories enable row level security;
grant all privileges on table memories to service_role;
