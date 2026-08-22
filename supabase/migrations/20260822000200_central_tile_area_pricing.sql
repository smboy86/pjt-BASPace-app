create function private.calculate_quote_option_price(
  target_option_code text,
  target_bathroom_width_mm numeric,
  target_bathroom_length_mm numeric,
  target_bathroom_height_mm numeric,
  target_unit_price numeric
)
returns table (
  calculated_price bigint,
  area_square_meters numeric,
  area_pyeong numeric,
  calculation_unavailable boolean,
  pricing_method text
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  area_square_millimeters numeric := 0;
  raw_price numeric := 0;
begin
  calculated_price := 0;
  area_square_meters := 0;
  area_pyeong := 0;
  calculation_unavailable := false;

  if target_option_code is null or target_option_code not in ('TILE', 'FLOOR_TILE') then
    pricing_method := 'direct_unit_price';
    calculation_unavailable := target_unit_price is null or target_unit_price < 0;
    calculated_price := case
      when calculation_unavailable then 0
      else round(target_unit_price)::bigint
    end;
    return next;
    return;
  end if;

  pricing_method := case
    when target_option_code = 'FLOOR_TILE' then 'floor_area_pyeong'
    else 'wall_area_pyeong'
  end;

  calculation_unavailable :=
    target_unit_price is null
    or target_unit_price < 0
    or target_bathroom_width_mm is null
    or target_bathroom_length_mm is null
    or target_bathroom_width_mm <= 0
    or target_bathroom_length_mm <= 0
    or (
      target_option_code = 'TILE'
      and (
        target_bathroom_height_mm is null
        or target_bathroom_height_mm <= 0
      )
    );

  if calculation_unavailable then
    return next;
    return;
  end if;

  area_square_millimeters := case
    when target_option_code = 'FLOOR_TILE'
      then target_bathroom_width_mm * target_bathroom_length_mm
    else
      target_bathroom_width_mm * target_bathroom_height_mm * 2
      + target_bathroom_length_mm * target_bathroom_height_mm * 2
      - 900 * 2100
  end;

  if area_square_millimeters <= 0 then
    calculation_unavailable := true;
    return next;
    return;
  end if;

  area_square_meters := area_square_millimeters / 1000000;
  area_pyeong := area_square_meters / 3.305785;
  raw_price := area_pyeong * target_unit_price;

  if raw_price > 9223372036854775000 then
    calculation_unavailable := true;
    area_square_meters := 0;
    area_pyeong := 0;
    return next;
    return;
  end if;

  calculated_price := (round(raw_price / 1000) * 1000)::bigint;
  return next;
end;
$$;

create function private.apply_tile_price_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  option_code text := new.selected_options -> 0 ->> 'optionCode';
  unit_price_text text := new.selected_options -> 0 ->> 'unitPrice';
  unit_price numeric;
  bathroom_width_mm numeric;
  bathroom_length_mm numeric;
  bathroom_height_mm numeric;
  price_result record;
begin
  if option_code is null or option_code not in ('TILE', 'FLOOR_TILE') then
    return new;
  end if;

  select
    request.bathroom_width,
    request.bathroom_length,
    request.bathroom_height
  into
    bathroom_width_mm,
    bathroom_length_mm,
    bathroom_height_mm
  from public.remodel_requests request
  where request.id = new.request_id;

  if unit_price_text ~ '^[0-9]+$' then
    unit_price := unit_price_text::numeric;
  end if;

  select *
  into price_result
  from private.calculate_quote_option_price(
    option_code,
    bathroom_width_mm,
    bathroom_length_mm,
    bathroom_height_mm,
    unit_price
  );

  new.base_price_snapshot := price_result.calculated_price;
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,pricingMethod}',
    to_jsonb(price_result.pricing_method),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,areaSquareMeters}',
    to_jsonb(round(price_result.area_square_meters, 6)),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,areaPyeong}',
    to_jsonb(round(price_result.area_pyeong, 6)),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,priceCalculationUnavailable}',
    to_jsonb(price_result.calculation_unavailable),
    true
  );
  new.selected_options := jsonb_set(
    new.selected_options,
    '{0,calculatedPrice}',
    to_jsonb(price_result.calculated_price),
    true
  );

  return new;
end;
$$;

drop trigger if exists selection_snapshots_apply_floor_tile_price on public.selection_snapshots;
drop function if exists private.apply_floor_tile_price_snapshot();

create trigger selection_snapshots_apply_tile_price
before insert on public.selection_snapshots
for each row
execute function private.apply_tile_price_snapshot();

revoke all on function private.calculate_quote_option_price(
  text,
  numeric,
  numeric,
  numeric,
  numeric
) from public, anon, authenticated;
revoke all on function private.apply_tile_price_snapshot() from public, anon, authenticated;

comment on function private.calculate_quote_option_price(
  text,
  numeric,
  numeric,
  numeric,
  numeric
) is 'Central quote option price calculator for direct, floor tile, and four-wall tile pricing.';
