-- Preserve the complete pre-transition catalog inside the private schema. The backup tables keep
-- the original UUIDs and image paths so the catalog can be restored without changing historical
-- selection snapshots. Storage objects are intentionally not deleted by this migration.
do $$
declare
  current_codes text[];
begin
  select array_agg(code order by code)
  into current_codes
  from public.quote_option_masters;

  if current_codes is distinct from array[
    'BASIN_TOILET',
    'BATHROOM_CABINET',
    'BATHTUB',
    'CEILING',
    'INDIRECT_LIGHTING',
    'MASONRY_WALL',
    'TILE',
    'WATER_TANK',
    'ZENDAI'
  ]::text[] then
    raise exception 'Unexpected quote option catalog. Aborting the eight-category transition.';
  end if;
end;
$$;

create table private.quote_option_masters_backup_20260810
as
select master.*, now() as archived_at
from public.quote_option_masters master;

create table private.quote_option_products_backup_20260810
as
select product.*, now() as archived_at
from public.quote_option_products product;

create table private.quote_option_images_backup_20260810
as
select image.*, now() as archived_at
from public.quote_option_images image;

create table private.quote_option_storage_backup_20260810
as
select
  product.id as product_id,
  product.quote_option_id,
  product.image_path,
  exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'quote-option-images'
      and object.name = product.image_path
  ) as object_exists,
  exists (
    select 1
    from public.quote_option_image_cleanup_queue queue
    where queue.storage_path = product.image_path
  ) as cleanup_queued,
  now() as archived_at
from public.quote_option_products product
where product.image_path is not null;

comment on table private.quote_option_masters_backup_20260810 is
  'Pre-transition quote option master backup created by migration 20260810000100.';
comment on table private.quote_option_products_backup_20260810 is
  'Pre-transition quote option product backup created by migration 20260810000100.';
comment on table private.quote_option_images_backup_20260810 is
  'Pre-transition legacy quote option image metadata backup created by migration 20260810000100.';
comment on table private.quote_option_storage_backup_20260810 is
  'Pre-transition product image path and Storage presence inventory created by migration 20260810000100.';

update public.quote_option_masters
set
  name = case code
    when 'TILE' then '타일'
    when 'BASIN_TOILET' then '세면대 / 양변기'
    when 'BATHTUB' then '욕조'
    when 'BATHROOM_CABINET' then '욕실장'
  end,
  display_order = case code
    when 'TILE' then 1
    when 'BASIN_TOILET' then 2
    when 'BATHTUB' then 4
    when 'BATHROOM_CABINET' then 8
  end
where code in ('TILE', 'BASIN_TOILET', 'BATHTUB', 'BATHROOM_CABINET');

insert into public.quote_option_masters (
  code,
  name,
  display_order,
  form_type,
  is_active
)
values
  ('FAUCET_DRAIN', '수전 / 유가', 3, 'simple', true),
  ('ZENDAI_PARTITION', '젠다이 / 조적 파티션', 5, 'simple', true),
  ('CEILING_LIGHT_VENT', '천장재 / 조명 / 환풍기', 6, 'simple', true),
  ('GROUT', '줄눈', 7, 'simple', true);

-- Product rows cascade with the retired masters. Their original rows and image paths are preserved
-- above, and the Storage files remain untouched for recovery and historical snapshot verification.
delete from public.quote_option_masters
where code in ('WATER_TANK', 'ZENDAI', 'MASONRY_WALL', 'CEILING', 'INDIRECT_LIGHTING');

do $$
declare
  resulting_codes text[];
begin
  select array_agg(code order by display_order)
  into resulting_codes
  from public.quote_option_masters;

  if resulting_codes is distinct from array[
    'TILE',
    'BASIN_TOILET',
    'FAUCET_DRAIN',
    'BATHTUB',
    'ZENDAI_PARTITION',
    'CEILING_LIGHT_VENT',
    'GROUT',
    'BATHROOM_CABINET'
  ]::text[] then
    raise exception 'The quote option catalog does not match the required eight-category order.';
  end if;

  if (select count(*) from private.quote_option_masters_backup_20260810) <> 9 then
    raise exception 'The pre-transition master backup is incomplete.';
  end if;
end;
$$;
