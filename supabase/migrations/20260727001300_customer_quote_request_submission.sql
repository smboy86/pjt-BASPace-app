alter table public.remodel_requests
add column address_detail text not null default '';

update public.remodel_requests
set budget_range = case budget_range
  when '150~200만원' then 'KRW_150_200'
  when '200~300만원' then 'KRW_200_300'
  when '300~500만원' then 'KRW_300_500'
  when '견적 협의' then 'CONSULTATION'
  else 'CONSULTATION'
end;

alter table public.remodel_requests
add constraint remodel_requests_budget_range_code check (
  budget_range in ('KRW_150_200', 'KRW_200_300', 'KRW_300_500', 'CONSULTATION')
);

alter table public.remodel_requests
add constraint remodel_requests_address_lengths check (
  char_length(trim(region)) between 1 and 200
  and char_length(address_detail) <= 200
);

create function public.submit_customer_remodel_request(
  target_region text,
  target_address_detail text,
  target_budget_range text,
  target_notes text,
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
  ) then
    raise exception 'One or more selected products are unavailable.';
  end if;

  insert into public.remodel_requests (
    customer_id,
    status,
    region,
    address_detail,
    housing_type,
    bathroom_type,
    estimated_size,
    has_bathtub,
    requires_demolition,
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
    '약 3㎡',
    false,
    true,
    target_budget_range,
    '2개월 이내',
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

revoke all on function public.submit_customer_remodel_request(
  text,
  text,
  text,
  text,
  jsonb
) from public, anon;

grant execute on function public.submit_customer_remodel_request(
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;
