alter table public.remodel_requests
  add column adjusted_estimate_reason text,
  add constraint remodel_requests_adjusted_estimate_reason_valid check (
    adjusted_estimate_reason is null
    or char_length(btrim(adjusted_estimate_reason)) between 1 and 500
  );

drop function public.adjust_customer_request_quote(uuid, bigint);

create function public.adjust_customer_request_quote(
  target_request_id uuid,
  target_amount bigint,
  target_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.remodel_requests;
  normalized_reason text;
begin
  if not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if target_amount is null
    or target_amount < 0
    or target_amount > 1000000000000
  then
    raise exception 'Adjusted estimate amount is invalid.';
  end if;

  normalized_reason := btrim(target_reason);

  if normalized_reason is null
    or char_length(normalized_reason) < 1
    or char_length(normalized_reason) > 500
  then
    raise exception 'Adjusted estimate reason is invalid.';
  end if;

  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if target_request.id is null then
    raise exception 'Remodel request was not found.';
  end if;

  if target_request.status <> 'submitted' then
    raise exception 'Only a newly submitted request can be adjusted.';
  end if;

  update public.remodel_requests
  set
    status = 'quote_adjustment',
    adjusted_estimate_amount = target_amount,
    adjusted_estimate_reason = normalized_reason,
    adjusted_by = (select auth.uid()),
    adjusted_at = now(),
    adjustment_confirmed_at = null
  where id = target_request_id;
end;
$$;

revoke all on function public.adjust_customer_request_quote(uuid, bigint, text)
  from public, anon;
grant execute on function public.adjust_customer_request_quote(uuid, bigint, text)
  to authenticated;

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
