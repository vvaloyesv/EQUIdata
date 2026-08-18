-- EQUIdata — bucket de Storage para fotos de perfil.
--
-- Lectura pública (es una foto de perfil, no un dato sensible — igual que
-- cualquier avatar de Slack/Gmail/etc.). Escritura restringida a que cada
-- quien solo pueda subir/reemplazar el archivo dentro de su propia carpeta
-- ({auth.uid()}/...) — el primer segmento de la ruta del objeto es el uid.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
