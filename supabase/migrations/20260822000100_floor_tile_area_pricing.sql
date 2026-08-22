create or replace function private.apply_floor_tile_price_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  option_code text := new.selected_options -> 0 ->> 'optionCode';
  unit_price_text text := new.selected_options -> 0 ->> 'unitPrice';
  unit_price numeric := 0;
  bathroom_width_mm numeric;
  bathroom_length_mm numeric;
  area_square_meters numeric := 0;
  area_pyeong numeric := 0;
  calculated_price bigint := 0;
  calculation_unavailable boolean := true;
begin
  if option_code is distinct from 'FLOOR_TILE' then
    return new;
  end if;

  select
    request.bathroom_width,
    request.bathroom_length
  into
    bathroom_width_mm,
    bathroom_length_mm
  from public.remodel_requests request
  where request.id = new.request_id;

  if unit_price_text ~ '^[0-9]+$' then
    unit_price := unit_price_text::numeric;
  end if;

  calculation_unavailable :=
    bathroom_width_mm is null
    or bathroom_length_mm is null
    or bathroom_width_mm <= 0
    or bathroom_length_mm <= 0;

  if not calculation_unavailable then
    area_square_meters := bathroom_width_mm * bathroom_length_mm / 1000000;
    area_pyeong := area_square_meters / 3.305785;
    calculated_price := (round((area_pyeong * unit_price) / 1000) * 1000)::bigint;
  end if;

  new.base_price_snapshot := calculated_price;
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,pricingMethod}',
    to_jsonb('floor_area_pyeong'::text),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,areaSquareMeters}',
    to_jsonb(round(area_square_meters, 6)),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,areaPyeong}',
    to_jsonb(round(area_pyeong, 6)),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,priceCalculationUnavailable}',
    to_jsonb(calculation_unavailable),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,calculatedPrice}',
    to_jsonb(calculated_price),
    true
  );

  return new;
end;
$$;

revoke all on function private.apply_floor_tile_price_snapshot() from public, anon, authenticated;

drop trigger if exists selection_snapshots_apply_floor_tile_price on public.selection_snapshots;

create trigger selection_snapshots_apply_floor_tile_price
before insert on public.selection_snapshots
for each row
execute function private.apply_floor_tile_price_snapshot();

comment on function private.apply_floor_tile_price_snapshot() is
  'Calculates FLOOR_TILE snapshot prices from bathroom floor area and the current product pyeong unit price.';
