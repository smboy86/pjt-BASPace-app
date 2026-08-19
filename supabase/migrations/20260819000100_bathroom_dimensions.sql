alter table public.remodel_requests
  add column bathroom_width numeric not null default 0,
  add column bathroom_length numeric not null default 0,
  add column bathroom_height numeric not null default 0;

alter table public.remodel_requests
  add constraint remodel_requests_bathroom_dimensions_check check (
    (
      bathroom_width = 0
      and bathroom_length = 0
      and bathroom_height = 0
    )
    or (
      bathroom_width > 0
      and bathroom_length > 0
      and bathroom_height > 0
    )
  );

drop function public.submit_customer_remodel_request(
  text,
  text,
  text,
  text,
  boolean,
  text,
  jsonb
);

create function public.submit_customer_remodel_request(
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
    or jsonb_array_length(target_selections) > 8
  then
    raise exception 'Selections must be an array with at most eight items.';
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
  boolean,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
) from public, anon;

grant execute on function public.submit_customer_remodel_request(
  text,
  text,
  text,
  text,
  boolean,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
) to authenticated;

drop function public.get_partner_assigned_remodel_request(uuid);

create function public.get_partner_assigned_remodel_request(
  target_request_id uuid
)
returns table (
  assignment_id uuid,
  assignment_status public.assignment_status,
  customer_name text,
  id uuid,
  customer_id uuid,
  request_status public.remodel_request_status,
  region text,
  address_detail text,
  housing_type text,
  bathroom_type text,
  bathroom_width numeric,
  bathroom_length numeric,
  bathroom_height numeric,
  estimated_size text,
  has_bathtub boolean,
  requires_demolition boolean,
  demolition_cost_snapshot_manwon integer,
  special_structure_note text,
  budget_range text,
  desired_schedule text,
  scope public.remodel_scope,
  priorities text[],
  notes text,
  adjusted_estimate_amount bigint,
  adjusted_estimate_reason text,
  adjusted_by uuid,
  adjusted_at timestamptz,
  adjustment_confirmed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  selection_rows jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ra.id,
    ra.status,
    customer.display_name,
    request.id,
    request.customer_id,
    request.status,
    request.region,
    request.address_detail,
    request.housing_type,
    request.bathroom_type,
    request.bathroom_width,
    request.bathroom_length,
    request.bathroom_height,
    request.estimated_size,
    request.has_bathtub,
    request.requires_demolition,
    request.demolition_cost_snapshot_manwon,
    request.special_structure_note,
    request.budget_range,
    request.desired_schedule,
    request.scope,
    request.priorities,
    request.notes,
    request.adjusted_estimate_amount,
    request.adjusted_estimate_reason,
    request.adjusted_by,
    request.adjusted_at,
    request.adjustment_confirmed_at,
    request.submitted_at,
    request.created_at,
    request.updated_at,
    coalesce(
      jsonb_agg(to_jsonb(selection) order by selection.created_at, selection.id)
        filter (where selection.id is not null),
      '[]'::jsonb
    )
  from public.request_assignments ra
  join public.remodel_requests request
    on request.id = ra.request_id
  join public.profiles customer
    on customer.id = request.customer_id
  join public.partner_members member
    on member.partner_id = ra.partner_id
   and member.user_id = (select auth.uid())
   and member.status = 'active'
  join public.partners partner
    on partner.id = member.partner_id
   and partner.approval_status = 'approved'
  join public.profiles staff_profile
    on staff_profile.id = member.user_id
   and staff_profile.role = 'partner_staff'
   and staff_profile.status = 'active'
  left join public.selection_snapshots selection
    on selection.request_id = request.id
  where request.id = target_request_id
    and ra.status in ('assigned', 'accepted', 'declined')
    and (
      ra.assigned_staff_id is null
      or ra.assigned_staff_id = member.user_id
      or member.is_manager
    )
  group by
    ra.id,
    customer.display_name,
    request.id;
$$;

revoke all on function public.get_partner_assigned_remodel_request(uuid)
  from public, anon, authenticated;

grant execute on function public.get_partner_assigned_remodel_request(uuid)
  to authenticated;
