create type public.quote_option_tile_size as enum (
  '300x300',
  '300x600',
  '600x600',
  '600x1200'
);

alter table public.quote_option_products
add column tile_size public.quote_option_tile_size;

create index quote_option_products_tile_size_sort_idx
on public.quote_option_products (
  quote_option_id,
  tile_size,
  display_order,
  created_at,
  id
);

do $$
begin
  if not exists (
    select 1
    from public.quote_option_masters
    where code = 'TILE'
  ) or not exists (
    select 1
    from public.quote_option_masters
    where code = 'FLOOR_TILE'
  ) then
    raise exception 'The wall and floor tile options must exist before adding tile sizes.';
  end if;
end;
$$;

update public.quote_option_masters
set form_type = case
  when code in ('TILE', 'FLOOR_TILE') then 'advanced'::public.quote_option_form_type
  else 'simple'::public.quote_option_form_type
end;

create function private.validate_quote_option_product_tile_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  option_code text;
begin
  select master.code
  into option_code
  from public.quote_option_masters master
  where master.id = new.quote_option_id;

  if option_code is null then
    raise exception 'Quote option was not found.';
  end if;

  if option_code in ('TILE', 'FLOOR_TILE') and new.tile_size is null then
    raise exception 'Advanced tile products require a tile size.';
  end if;

  if option_code not in ('TILE', 'FLOOR_TILE') and new.tile_size is not null then
    raise exception 'Simple quote option products cannot have a tile size.';
  end if;

  return new;
end;
$$;

create trigger quote_option_products_validate_tile_size
before insert or update of quote_option_id, tile_size
on public.quote_option_products
for each row execute function private.validate_quote_option_product_tile_size();

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
  option_code text;
  expected_form_type public.quote_option_form_type;
begin
  if not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select master.code
  into option_code
  from public.quote_option_masters master
  where master.id = target_option_id;

  if option_code is null then
    raise exception 'Quote option was not found.';
  end if;

  expected_form_type := case
    when option_code in ('TILE', 'FLOOR_TILE') then 'advanced'::public.quote_option_form_type
    else 'simple'::public.quote_option_form_type
  end;

  if target_form_type is distinct from expected_form_type then
    raise exception 'The quote option form type is fixed by its option code.';
  end if;

  if char_length(normalized_name) not between 1 and 50 then
    raise exception 'Quote option name must be between 1 and 50 characters.';
  end if;

  if target_display_order not between 1 and 9999 then
    raise exception 'Display order must be between 1 and 9999.';
  end if;

  if jsonb_typeof(target_products) is distinct from 'array' then
    raise exception 'Products must be an array.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(target_products) as product(
      id uuid,
      name text,
      price bigint,
      image_path text,
      tile_size text,
      created_at timestamptz,
      display_order integer
    )
    where char_length(trim(product.name)) not between 1 and 100
      or product.price is null
      or product.price not between 0 and 1000000000000
      or product.image_path is null
      or product.image_path = ''
      or split_part(product.image_path, '/', 1) <> target_option_id::text
      or (
        expected_form_type = 'advanced'
        and (
          product.tile_size is null
          or product.tile_size not in ('300x300', '300x600', '600x600', '600x1200')
        )
      )
      or (
        expected_form_type = 'simple'
        and product.tile_size is not null
        and product.tile_size <> ''
      )
  ) then
    raise exception 'Each product requires valid fields for its quote option type.';
  end if;

  update public.quote_option_masters
  set
    name = normalized_name,
    display_order = target_display_order,
    form_type = expected_form_type
  where id = target_option_id;

  insert into public.quote_option_image_cleanup_queue (storage_path)
  select product.image_path
  from public.quote_option_products product
  where product.quote_option_id = target_option_id
    and product.image_path is not null
    and not exists (
      select 1
      from jsonb_to_recordset(target_products) as next_product(
        id uuid,
        name text,
        price bigint,
        image_path text,
        tile_size text,
        created_at timestamptz,
        display_order integer
      )
      where next_product.image_path = product.image_path
    )
  on conflict (storage_path) do nothing;

  delete from public.quote_option_products
  where quote_option_id = target_option_id;

  insert into public.quote_option_products (
    id,
    quote_option_id,
    name,
    price,
    image_path,
    tile_size,
    created_at,
    display_order
  )
  select
    coalesce(product.id, gen_random_uuid()),
    target_option_id,
    trim(product.name),
    product.price,
    product.image_path,
    case
      when expected_form_type = 'advanced'
        then product.tile_size::public.quote_option_tile_size
      else null
    end,
    coalesce(product.created_at, now()),
    coalesce(product.display_order, 0)
  from jsonb_to_recordset(target_products) as product(
    id uuid,
    name text,
    price bigint,
    image_path text,
    tile_size text,
    created_at timestamptz,
    display_order integer
  );
end;
$$;

create or replace function public.submit_customer_remodel_request(
  target_region text,
  target_address_detail text,
  target_budget_range text,
  target_notes text,
  target_requires_demolition boolean,
  target_desired_construction_date text,
  target_bathroom_width numeric,
  target_bathroom_length numeric,
  target_bathroom_height numeric,
  target_selections jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request_id uuid;
  normalized_region text := trim(target_region);
  normalized_address_detail text := trim(target_address_detail);
  normalized_notes text := trim(target_notes);
  parsed_construction_date date;
  demolition_cost_manwon integer;
  seoul_current_date date := (now() at time zone 'Asia/Seoul')::date;
begin
  if (select auth.uid()) is null
    or private.current_app_role() is distinct from 'customer'
  then
    raise exception 'An active customer session is required.';
  end if;

  if char_length(normalized_region) not between 1 and 200 then
    raise exception 'A valid base address is required.';
  end if;

  if char_length(normalized_address_detail) > 200 then
    raise exception 'The detailed address is too long.';
  end if;

  if target_budget_range not in (
    'KRW_150_200',
    'KRW_200_300',
    'KRW_300_500',
    'CONSULTATION'
  ) then
    raise exception 'A valid budget code is required.';
  end if;

  if target_requires_demolition is null then
    raise exception 'A construction type is required.';
  end if;

  if target_bathroom_width is null
    or target_bathroom_length is null
    or target_bathroom_height is null
    or not (
      (
        target_bathroom_width = 0
        and target_bathroom_length = 0
        and target_bathroom_height = 0
      )
      or (
        target_bathroom_width > 0
        and target_bathroom_length > 0
        and target_bathroom_height > 0
      )
    )
  then
    raise exception 'Bathroom dimensions must all be positive or all be zero.';
  end if;

  if target_desired_construction_date is null
    or target_desired_construction_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then
    raise exception 'A valid construction date is required.';
  end if;

  begin
    parsed_construction_date := target_desired_construction_date::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'A valid construction date is required.';
  end;

  if to_char(parsed_construction_date, 'YYYY-MM-DD') <> target_desired_construction_date
    or parsed_construction_date <= seoul_current_date
  then
    raise exception 'The construction date must be after today.';
  end if;

  if char_length(normalized_notes) > 2000 then
    raise exception 'The additional request is too long.';
  end if;

  if jsonb_typeof(target_selections) <> 'array'
    or jsonb_array_length(target_selections) > 9
  then
    raise exception 'Selections must be an array with at most nine items.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_selections) selection
    group by selection ->> 'optionId'
    having count(*) > 1
  ) then
    raise exception 'Only one product can be selected per option.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_selections) selection
    left join public.quote_option_masters option_master
      on option_master.id = private.safe_uuid(selection ->> 'optionId')
    left join public.quote_option_products product
      on product.id = private.safe_uuid(selection ->> 'productId')
      and product.quote_option_id = option_master.id
    where option_master.id is null
      or not option_master.is_active
      or product.id is null
      or (
        option_master.form_type = 'advanced'
        and product.tile_size is null
      )
      or (
        option_master.form_type = 'simple'
        and product.tile_size is not null
      )
  ) then
    raise exception 'One or more selected products are unavailable.';
  end if;

  if target_requires_demolition then
    select setting.amount_manwon
    into demolition_cost_manwon
    from public.construction_type_cost_settings setting
    where setting.code = 'DEMOLITION';

    if not found then
      raise exception 'The demolition cost setting was not found.';
    end if;
  end if;

  insert into public.remodel_requests (
    customer_id,
    status,
    region,
    address_detail,
    housing_type,
    bathroom_type,
    bathroom_width,
    bathroom_length,
    bathroom_height,
    estimated_size,
    has_bathtub,
    requires_demolition,
    demolition_cost_snapshot_manwon,
    budget_range,
    desired_schedule,
    scope,
    priorities,
    notes,
    submitted_at
  )
  values (
    (select auth.uid()),
    'submitted',
    normalized_region,
    normalized_address_detail,
    '아파트',
    '공용 욕실',
    target_bathroom_width,
    target_bathroom_length,
    target_bathroom_height,
    '약 3㎡',
    false,
    target_requires_demolition,
    demolition_cost_manwon,
    target_budget_range,
    target_desired_construction_date,
    'full',
    array[]::text[],
    normalized_notes,
    now()
  )
  returning id into created_request_id;

  insert into public.selection_snapshots (
    request_id,
    category,
    item_name,
    selected_options,
    base_price_snapshot,
    decision_status
  )
  select
    created_request_id,
    option_master.name,
    product.name,
    jsonb_build_array(
      jsonb_build_object(
        'optionCode', option_master.code,
        'optionId', option_master.id,
        'productId', product.id,
        'productName', product.name,
        'tileSize', product.tile_size,
        'imagePath', product.image_path,
        'unitPrice', product.price
      )
    ),
    product.price,
    'selected'
  from jsonb_array_elements(target_selections) selection
  join public.quote_option_masters option_master
    on option_master.id = private.safe_uuid(selection ->> 'optionId')
  join public.quote_option_products product
    on product.id = private.safe_uuid(selection ->> 'productId')
    and product.quote_option_id = option_master.id;

  return created_request_id;
end;
$$;
