create or replace function public.update_quote_option_master(
  target_option_id uuid,
  target_name text,
  target_display_order integer,
  target_form_type public.quote_option_form_type,
  target_base_price bigint,
  target_image_paths text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := trim(target_name);
  image_count integer := coalesce(array_length(target_image_paths, 1), 0);
begin
  if not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if char_length(normalized_name) not between 1 and 50 then
    raise exception 'Quote option name must be between 1 and 50 characters.';
  end if;

  if target_display_order not between 1 and 9999 then
    raise exception 'Display order must be between 1 and 9999.';
  end if;

  if target_base_price < 0 then
    raise exception 'Base price cannot be negative.';
  end if;

  if image_count > 5 then
    raise exception 'A quote option can contain at most five images.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_image_paths, array[]::text[])) as image_path
    where image_path = ''
      or split_part(image_path, '/', 1) <> target_option_id::text
  ) then
    raise exception 'Invalid quote option image path.';
  end if;

  update public.quote_option_masters
  set
    name = normalized_name,
    display_order = target_display_order,
    form_type = target_form_type,
    base_price = target_base_price
  where id = target_option_id;

  if not found then
    raise exception 'Quote option was not found.';
  end if;

  insert into public.quote_option_image_cleanup_queue (storage_path)
  select image.storage_path
  from public.quote_option_images image
  where image.quote_option_id = target_option_id
    and not (image.storage_path = any(coalesce(target_image_paths, array[]::text[])))
  on conflict (storage_path) do nothing;

  delete from public.quote_option_images
  where quote_option_id = target_option_id;

  insert into public.quote_option_images (quote_option_id, storage_path, display_order)
  select
    target_option_id,
    image_path,
    image_order::integer
  from unnest(coalesce(target_image_paths, array[]::text[]))
    with ordinality as images(image_path, image_order);
end;
$$;
