
drop policy if exists "Player media public read" on storage.objects;

create policy "Player media owner read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'player-media'
  and (storage.foldername(name))[1] = 'players'
  and (storage.foldername(name))[2] = auth.uid()::text
);
