alter table public.request_photos
  add constraint request_photos_mime_type_supported check (
    mime_type = 'image/jpeg'
  ) not valid,
  add constraint request_photos_size_limit check (
    size_bytes is not null
    and size_bytes > 0
    and size_bytes <= 1572864
  ) not valid;

update storage.buckets
set
  file_size_limit = 1572864,
  allowed_mime_types = array['image/jpeg']
where id = 'request-photos';

drop policy if exists request_photos_storage_select on storage.objects;
drop policy if exists request_photos_storage_insert on storage.objects;
drop policy if exists request_photos_storage_delete on storage.objects;

create policy request_photos_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'request-photos'
  and (
    private.is_admin()
    or private.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
    or exists (
      select 1
      from public.request_photos photo
      where photo.storage_path = storage.objects.name
        and (
          private.owns_request(photo.request_id)
          or exists (
            select 1
            from public.request_assignments assignment
            where assignment.request_id = photo.request_id
              and private.can_access_assignment(assignment.id)
          )
        )
    )
    or private.owns_request(private.safe_uuid((storage.foldername(name))[1]))
    or exists (
      select 1
      from public.request_assignments assignment
      where assignment.request_id = private.safe_uuid((storage.foldername(name))[1])
        and private.can_access_assignment(assignment.id)
    )
  )
);

create policy request_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-photos'
  and array_length(storage.foldername(name), 1) = 1
  and private.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
);

create policy request_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-photos'
  and (
    private.is_admin()
    or private.safe_uuid((storage.foldername(name))[1]) = (select auth.uid())
    or (
      array_length(storage.foldername(name), 1) = 2
      and private.safe_uuid((storage.foldername(name))[2]) = (select auth.uid())
      and private.can_edit_request(private.safe_uuid((storage.foldername(name))[1]))
    )
  )
);

create function public.submit_customer_remodel_request_with_photos(
  target_region text,
  target_address_detail text,
  target_budget_range text,
  target_notes text,
  target_requires_demolition boolean,
  target_desired_construction_date text,
  target_bathroom_width numeric,
  target_bathroom_length numeric,
  target_bathroom_height numeric,
  target_selections jsonb,
  target_photos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request_id uuid;
  customer_id uuid := (select auth.uid());
begin
  if customer_id is null
    or private.current_app_role() is distinct from 'customer'
  then
    raise exception 'An active customer session is required.';
  end if;

  if jsonb_typeof(target_photos) <> 'array'
    or jsonb_array_length(target_photos) > 5
  then
    raise exception 'Photos must be an array with at most five items.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_photos) photo
    where jsonb_typeof(photo) <> 'object'
      or coalesce(photo ->> 'storagePath', '') !~
        ('^' || customer_id::text || '/[A-Za-z0-9._-]+$')
      or coalesce(photo ->> 'mimeType', '') <> 'image/jpeg'
      or coalesce(photo ->> 'category', '') <> 'bathroom'
      or coalesce(photo ->> 'sortOrder', '') !~ '^[0-4]$'
      or coalesce(photo ->> 'sizeBytes', '') !~ '^[0-9]+$'
      or (photo ->> 'sizeBytes')::bigint not between 1 and 1572864
  ) then
    raise exception 'One or more photo metadata values are invalid.';
  end if;

  if exists (
    select photo ->> 'storagePath'
    from jsonb_array_elements(target_photos) photo
    group by photo ->> 'storagePath'
    having count(*) > 1
  ) or exists (
    select photo ->> 'sortOrder'
    from jsonb_array_elements(target_photos) photo
    group by photo ->> 'sortOrder'
    having count(*) > 1
  ) then
    raise exception 'Photo paths and sort orders must be unique.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_photos) photo
    left join storage.objects object
      on object.bucket_id = 'request-photos'
      and object.name = photo ->> 'storagePath'
    where object.id is null
  ) then
    raise exception 'One or more uploaded photos were not found.';
  end if;

  created_request_id := public.submit_customer_remodel_request(
    target_region,
    target_address_detail,
    target_budget_range,
    target_notes,
    target_requires_demolition,
    target_desired_construction_date,
    target_bathroom_width,
    target_bathroom_length,
    target_bathroom_height,
    target_selections
  );

  insert into public.request_photos (
    request_id,
    storage_path,
    category,
    sort_order,
    mime_type,
    size_bytes
  )
  select
    created_request_id,
    photo ->> 'storagePath',
    photo ->> 'category',
    (photo ->> 'sortOrder')::integer,
    photo ->> 'mimeType',
    (photo ->> 'sizeBytes')::bigint
  from jsonb_array_elements(target_photos) photo;

  return created_request_id;
end;
$$;

revoke all on function public.submit_customer_remodel_request_with_photos(
  text,
  text,
  text,
  text,
  boolean,
  text,
  numeric,
  numeric,
  numeric,
  jsonb,
  jsonb
) from public, anon;

grant execute on function public.submit_customer_remodel_request_with_photos(
  text,
  text,
  text,
  text,
  boolean,
  text,
  numeric,
  numeric,
  numeric,
  jsonb,
  jsonb
) to authenticated;
