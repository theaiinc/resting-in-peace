-- Create places table
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  name text not null default '',
  brief text default '',
  audio_url text,
  created_at timestamptz default now()
);

-- Create tracks table
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pts jsonb not null default '[]',
  dist double precision default 0,
  duration integer default 0,
  date text,
  created_at timestamptz default now()
);

-- Storage bucket for voice notes
insert into storage.buckets (id, name, public) values ('audio', 'audio', true) on conflict do nothing;

-- Allow all operations for anon users (no auth needed for this app)
create policy if not exists "Allow all for anon on places"
  on places for all
  using (true)
  with check (true);

create policy if not exists "Allow all for anon on tracks"
  on tracks for all
  using (true)
  with check (true);

-- Enable RLS
alter table places enable row level security;
alter table tracks enable row level security;

-- Storage policies for audio bucket
create policy if not exists "Allow public upload to audio"
  on storage.objects for insert
  with check (bucket_id = 'audio');

create policy if not exists "Allow public read from audio"
  on storage.objects for select
  using (bucket_id = 'audio');

create policy if not exists "Allow public delete from audio"
  on storage.objects for delete
  using (bucket_id = 'audio');
