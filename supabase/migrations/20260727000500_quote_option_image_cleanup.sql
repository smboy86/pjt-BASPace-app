drop policy quote_option_images_storage_select on storage.objects;

create policy quote_option_images_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'quote-option-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.quote_option_images image
      join public.quote_option_masters master
        on master.id = image.quote_option_id
      where image.storage_path = storage.objects.name
        and master.is_active
    )
  )
);

create table public.quote_option_image_cleanup_queue (
  storage_path text primary key,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quote_option_image_cleanup_queue_attempts_nonnegative check (attempts >= 0)
);

alter table public.quote_option_image_cleanup_queue enable row level security;

create policy quote_option_image_cleanup_queue_admin_all
on public.quote_option_image_cleanup_queue for all to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.quote_option_image_cleanup_queue from anon, authenticated;
grant select, insert, update, delete
on public.quote_option_image_cleanup_queue
to authenticated;
