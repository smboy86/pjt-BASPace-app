create or replace function public.update_quote_option_master(
  target_option_id uuid,
  target_name text,
  target_display_order integer,
  target_form_type public.quote_option_form_type,
  target_products jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := trim(target_name);
begin
  if not private.is_admin() then raise exception 'Administrator access is required.'; end if;
  if char_length(normalized_name) not between 1 and 50 then raise exception 'Quote option name must be between 1 and 50 characters.'; end if;
  if target_display_order not between 1 and 9999 then raise exception 'Display order must be between 1 and 9999.'; end if;
  if jsonb_typeof(target_products) is distinct from 'array' then raise exception 'Products must be an array.'; end if;

  update public.quote_option_masters
  set name = normalized_name, display_order = target_display_order, form_type = target_form_type
  where id = target_option_id;
  if not found then raise exception 'Quote option was not found.'; end if;

  if jsonb_array_length(target_products) = 0 then
    insert into public.quote_option_image_cleanup_queue (storage_path)
    select image_path from public.quote_option_products
    where quote_option_id = target_option_id and image_path is not null
    on conflict (storage_path) do nothing;
    delete from public.quote_option_products where quote_option_id = target_option_id;
    return;
  end if;

  if exists (
    select 1 from jsonb_to_recordset(target_products) as product(id uuid, name text, price bigint, image_path text, created_at timestamptz)
    where char_length(trim(name)) not between 1 and 100
      or price not between 0 and 1000000000000
      or image_path is null or image_path = ''
      or split_part(image_path, '/', 1) <> target_option_id::text
  ) then raise exception 'Each product requires a valid name, image, and price.'; end if;

  insert into public.quote_option_image_cleanup_queue (storage_path)
  select product.image_path from public.quote_option_products product
  where product.quote_option_id = target_option_id and product.image_path is not null
    and not exists (
      select 1 from jsonb_to_recordset(target_products) as next_product(id uuid, name text, price bigint, image_path text, created_at timestamptz)
      where next_product.image_path = product.image_path
    )
  on conflict (storage_path) do nothing;

  delete from public.quote_option_products where quote_option_id = target_option_id;
  insert into public.quote_option_products (id, quote_option_id, name, price, image_path, created_at)
  select coalesce(product.id, gen_random_uuid()), target_option_id, trim(product.name), product.price, product.image_path, coalesce(product.created_at, now())
  from jsonb_to_recordset(target_products) as product(id uuid, name text, price bigint, image_path text, created_at timestamptz);
end;
$$;
