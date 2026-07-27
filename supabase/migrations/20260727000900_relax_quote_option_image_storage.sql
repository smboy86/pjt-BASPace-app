drop policy quote_option_images_storage_select on storage.objects;
drop policy quote_option_images_storage_insert on storage.objects;
drop policy quote_option_images_storage_delete on storage.objects;

create policy quote_option_images_storage_select
on storage.objects for select to authenticated
using (bucket_id = 'quote-option-images');

create policy quote_option_images_storage_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'quote-option-images');

create policy quote_option_images_storage_delete
on storage.objects for delete to authenticated
using (bucket_id = 'quote-option-images');
