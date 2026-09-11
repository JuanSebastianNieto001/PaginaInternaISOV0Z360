-- =============================================================================
-- ISO DMS · 003 · Storage
-- -----------------------------------------------------------------------------
-- Bucket privado `documents`. Los archivos NUNCA son públicos: el acceso se
-- realiza mediante Signed URLs generadas en el servidor para usuarios que
-- superan las políticas de abajo.
--
-- Convención de rutas dentro del bucket:
--   {document_id}/{version}/{uuid}.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400, -- 25 MB (techo duro; el límite configurable vive en app_settings)
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/plain',
    'text/csv',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Políticas sobre storage.objects (RLS ya está habilitado por Supabase)
-- -----------------------------------------------------------------------------
drop policy if exists "documents_storage_select" on storage.objects;
create policy "documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.has_permission('documents.read')
  );

drop policy if exists "documents_storage_insert" on storage.objects;
create policy "documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (public.has_permission('documents.create') or public.has_permission('documents.update'))
    -- La primera carpeta debe ser un UUID de documento (evita rutas arbitrarias)
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "documents_storage_update" on storage.objects;
create policy "documents_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.has_permission('documents.update')
  )
  with check (
    bucket_id = 'documents'
    and public.has_permission('documents.update')
  );

drop policy if exists "documents_storage_delete" on storage.objects;
create policy "documents_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (public.has_permission('documents.delete') or public.has_permission('documents.create'))
  );
