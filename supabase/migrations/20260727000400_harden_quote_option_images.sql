alter table public.quote_option_masters
add constraint quote_option_masters_display_order_max
check (display_order <= 9999);

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
      where image.storage_path = name
        and master.is_active
    )
  )
);
