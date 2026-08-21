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
    'CEILING_LIGHT_VENT',
    'FAUCET_DRAIN',
    'GROUT',
    'TILE',
    'ZENDAI_PARTITION'
  ]::text[] then
    raise exception 'Unexpected quote option catalog. Aborting the tile category split.';
  end if;
end;
$$;

update public.quote_option_masters
set
  name = case code
    when 'TILE' then '측면 타일'
    else name
  end,
  form_type = case code
    when 'TILE' then 'advanced'::public.quote_option_form_type
    else form_type
  end,
  is_active = case code
    when 'TILE' then true
    else is_active
  end,
  display_order = case code
    when 'TILE' then 1
    when 'BASIN_TOILET' then 3
    when 'FAUCET_DRAIN' then 4
    when 'BATHTUB' then 5
    when 'ZENDAI_PARTITION' then 6
    when 'CEILING_LIGHT_VENT' then 7
    when 'GROUT' then 8
    when 'BATHROOM_CABINET' then 9
    else display_order
  end
where code in (
  'TILE',
  'BASIN_TOILET',
  'FAUCET_DRAIN',
  'BATHTUB',
  'ZENDAI_PARTITION',
  'CEILING_LIGHT_VENT',
  'GROUT',
  'BATHROOM_CABINET'
);

insert into public.quote_option_masters (
  code,
  name,
  display_order,
  form_type,
  is_active
)
values ('FLOOR_TILE', '바닥 타일', 2, 'advanced', true);

do $$
declare
  resulting_codes text[];
  tile_catalog jsonb;
begin
  select array_agg(code order by display_order, name)
  into resulting_codes
  from public.quote_option_masters;

  if resulting_codes is distinct from array[
    'TILE',
    'FLOOR_TILE',
    'BASIN_TOILET',
    'FAUCET_DRAIN',
    'BATHTUB',
    'ZENDAI_PARTITION',
    'CEILING_LIGHT_VENT',
    'GROUT',
    'BATHROOM_CABINET'
  ]::text[] then
    raise exception 'The quote option catalog does not match the required nine-category order.';
  end if;

  select jsonb_object_agg(
    code,
    jsonb_build_object(
      'name', name,
      'displayOrder', display_order,
      'formType', form_type,
      'isActive', is_active
    )
  )
  into tile_catalog
  from public.quote_option_masters
  where code in ('TILE', 'FLOOR_TILE');

  if tile_catalog is distinct from jsonb_build_object(
    'TILE', jsonb_build_object('name', '측면 타일', 'displayOrder', 1, 'formType', 'advanced', 'isActive', true),
    'FLOOR_TILE', jsonb_build_object('name', '바닥 타일', 'displayOrder', 2, 'formType', 'advanced', 'isActive', true)
  ) then
    raise exception 'The wall and floor tile options do not match the required configuration.';
  end if;
end;
$$;
