alter table public.partners
  alter column business_number set not null,
  add column business_number_normalized text generated always as (
    regexp_replace(business_number, '[^0-9]', '', 'g')
  ) stored,
  add column business_registration_image_path text,
  add column contact_name text not null,
  add column contact_phone text not null,
  add column note text;

alter table public.partners
  add constraint partners_business_number_required
    check (char_length(trim(business_number)) > 0),
  add constraint partners_contact_name_length
    check (char_length(trim(contact_name)) between 1 and 80),
  add constraint partners_contact_phone_length
    check (char_length(trim(contact_phone)) between 1 and 30),
  add constraint partners_note_length
    check (note is null or char_length(note) <= 1000),
  add constraint partners_business_registration_image_path_length
    check (
      business_registration_image_path is null
      or char_length(business_registration_image_path) <= 500
    );

create unique index partners_business_number_normalized_uidx
  on public.partners (business_number_normalized);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-documents',
  'partner-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy partner_documents_admin_select
on storage.objects for select to authenticated
using (bucket_id = 'partner-documents' and private.is_admin());

create policy partner_documents_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'partner-documents' and private.is_admin());

create policy partner_documents_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'partner-documents' and private.is_admin())
with check (bucket_id = 'partner-documents' and private.is_admin());

create policy partner_documents_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'partner-documents' and private.is_admin());
