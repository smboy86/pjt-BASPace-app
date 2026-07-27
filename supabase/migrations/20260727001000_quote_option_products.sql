create table public.quote_option_products (
  id uuid primary key default gen_random_uuid(),
  quote_option_id uuid not null references public.quote_option_masters (id) on delete cascade,
  name text not null,
  price bigint not null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_option_products_name_length check (char_length(trim(name)) between 1 and 100),
  constraint quote_option_products_price_nonnegative check (price between 0 and 1000000000000)
);

create index quote_option_products_option_sort_idx
  on public.quote_option_products (quote_option_id, created_at, name);

create trigger quote_option_products_set_updated_at
before update on public.quote_option_products
for each row execute function private.set_updated_at();

-- Preserve existing catalog data. Products without a legacy image remain editable but need an
-- image before the administrator can save them through the new product bundle UI.
insert into public.quote_option_products (quote_option_id, name, price, image_path)
select
  master.id,
  concat(master.name, ' 기존 제품 ', image.display_order),
  master.base_price,
  image.storage_path
from public.quote_option_masters master
join public.quote_option_images image on image.quote_option_id = master.id
union all
select master.id, concat(master.name, ' 기존 제품'), master.base_price, null
from public.quote_option_masters master
where not exists (
  select 1 from public.quote_option_images image where image.quote_option_id = master.id
);

delete from public.quote_option_images;

alter table public.quote_option_products enable row level security;

create policy quote_option_products_read_active
on public.quote_option_products for select to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.quote_option_masters master
    where master.id = quote_option_id and master.is_active
  )
);

create policy quote_option_products_admin_all
on public.quote_option_products for all to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.quote_option_products from anon, authenticated;
grant select, insert, update, delete on public.quote_option_products to authenticated;

alter table public.quote_option_masters drop constraint quote_option_masters_base_price_nonnegative;
alter table public.quote_option_masters drop column base_price;

drop function public.update_quote_option_master(uuid, text, integer, public.quote_option_form_type, bigint, text[]);

create function public.update_quote_option_master(
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
  if jsonb_typeof(target_products) <> 'array' then raise exception 'Products must be an array.'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(target_products) as product(id uuid, name text, price bigint, image_path text)
    where char_length(trim(name)) not between 1 and 100
      or price not between 0 and 1000000000000
      or image_path is null
      or image_path = ''
      or split_part(image_path, '/', 1) <> target_option_id::text
  ) then raise exception 'Each product requires a valid name, image, and price.'; end if;

  update public.quote_option_masters
  set name = normalized_name, display_order = target_display_order, form_type = target_form_type
  where id = target_option_id;
  if not found then raise exception 'Quote option was not found.'; end if;

  insert into public.quote_option_image_cleanup_queue (storage_path)
  select product.image_path
  from public.quote_option_products product
  where product.quote_option_id = target_option_id
    and product.image_path is not null
    and not exists (
      select 1 from jsonb_to_recordset(target_products) as next_product(id uuid, name text, price bigint, image_path text)
      where next_product.image_path = product.image_path
    )
  on conflict (storage_path) do nothing;

  delete from public.quote_option_products where quote_option_id = target_option_id;

  insert into public.quote_option_products (id, quote_option_id, name, price, image_path)
  select coalesce(product.id, gen_random_uuid()), target_option_id, trim(product.name), product.price, product.image_path
  from jsonb_to_recordset(target_products) as product(id uuid, name text, price bigint, image_path text);
end;
$$;

revoke all on function public.update_quote_option_master(uuid, text, integer, public.quote_option_form_type, jsonb) from public, anon;
grant execute on function public.update_quote_option_master(uuid, text, integer, public.quote_option_form_type, jsonb) to authenticated;
