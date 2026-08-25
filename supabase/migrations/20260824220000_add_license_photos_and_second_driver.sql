-- Reservation columns for license photo uploads and an optional second driver
alter table public.reservations
  add column if not exists license_photo_path text,
  add column if not exists second_driver_name text,
  add column if not exists second_driver_license_number text,
  add column if not exists second_driver_license_state text,
  add column if not exists second_driver_license_expiration_date date,
  add column if not exists second_driver_license_photo_path text;

-- Private bucket for license photos. Unlike car-images/agreements/tenant-assets/
-- tenant-logos (all public), driver's license photos are PII and must not be
-- publicly readable — access is via short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('license-photos', 'license-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "license_photos_tenant_select" on storage.objects
for select to authenticated
using (bucket_id = 'license-photos' and (storage.foldername(name))[1] = (current_tenant_id())::text);

create policy "license_photos_tenant_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'license-photos' and (storage.foldername(name))[1] = (current_tenant_id())::text);

create policy "license_photos_tenant_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'license-photos' and (storage.foldername(name))[1] = (current_tenant_id())::text);
