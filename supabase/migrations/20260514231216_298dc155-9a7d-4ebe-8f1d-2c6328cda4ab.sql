
-- Enums
create type public.player_position as enum ('goleiro','zagueiro','lateral','volante','meia','atacante');
create type public.dominant_foot as enum ('direito','esquerdo','ambidestro');

-- Players table
create table public.players (
  user_id uuid primary key,
  display_name text not null,
  age integer not null check (age between 14 and 60),
  city text not null,
  state text not null check (char_length(state) = 2),
  position public.player_position not null,
  dominant_foot public.dominant_foot not null,
  height_cm integer not null check (height_cm between 140 and 220),
  avatar_url text not null,
  gallery_urls text[] not null default '{}',
  video_url text,
  bio text check (bio is null or char_length(bio) <= 280),
  goals_season integer not null default 0 check (goals_season >= 0),
  previous_clubs text[] not null default '{}',
  availability jsonb not null default '{"days":[],"periods":[]}'::jsonb,
  whatsapp_e164 text not null check (whatsapp_e164 ~ '^[1-9][0-9]{7,14}$'),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_position_idx on public.players (position) where is_published;
create index players_created_idx on public.players (created_at desc) where is_published;

alter table public.players enable row level security;

create policy "Players viewable by authenticated"
on public.players for select
to authenticated
using (is_published or auth.uid() = user_id);

create policy "Users can insert own player"
on public.players for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own player"
on public.players for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own player"
on public.players for delete
to authenticated
using (auth.uid() = user_id);

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('player-media','player-media', true)
on conflict (id) do nothing;

-- Storage policies: path is players/<user_id>/...
create policy "Player media public read"
on storage.objects for select
using (bucket_id = 'player-media');

create policy "Player media owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'player-media'
  and (storage.foldername(name))[1] = 'players'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Player media owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'player-media'
  and (storage.foldername(name))[1] = 'players'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Player media owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'player-media'
  and (storage.foldername(name))[1] = 'players'
  and (storage.foldername(name))[2] = auth.uid()::text
);
