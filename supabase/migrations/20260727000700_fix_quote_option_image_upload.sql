drop policy quote_option_images_storage_insert on storage.objects;

create policy quote_option_images_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'quote-option-images'
  and private.is_admin()
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1
    from public.quote_option_masters master
    where master.id = private.safe_uuid((storage.foldername(name))[1])
  )
);
