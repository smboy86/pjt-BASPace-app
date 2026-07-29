alter table public.remodel_requests
  add column adjusted_estimate_amount bigint,
  add column adjusted_by uuid references public.profiles (id),
  add column adjusted_at timestamptz,
  add column adjustment_confirmed_at timestamptz,
  add constraint remodel_requests_adjusted_estimate_amount_valid check (
    adjusted_estimate_amount is null
    or adjusted_estimate_amount between 0 and 1000000000000
  ),
  add constraint remodel_requests_adjustment_metadata_consistent check (
    (
      adjusted_estimate_amount is null
      and adjusted_by is null
      and adjusted_at is null
      and adjustment_confirmed_at is null
    )
    or (
      adjusted_estimate_amount is not null
      and adjusted_by is not null
      and adjusted_at is not null
    )
  );

create or replace function public.adjust_customer_request_quote(
  target_request_id uuid,
  target_amount bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.remodel_requests;
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

  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if target_request.id is null then
    raise exception 'Remodel request was not found.';
  end if;

  if target_request.status not in ('submitted', 'quote_adjustment') then
    raise exception 'Remodel request cannot be adjusted in its current state.';
  end if;

  update public.remodel_requests
  set
    status = 'quote_adjustment',
    adjusted_estimate_amount = target_amount,
    adjusted_by = (select auth.uid()),
    adjusted_at = now(),
    adjustment_confirmed_at = null
  where id = target_request_id;
end;
$$;

create or replace function public.confirm_adjusted_request_quote(
  target_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.remodel_requests;
begin
  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if target_request.id is null
    or target_request.customer_id <> (select auth.uid())
    or target_request.status <> 'quote_adjustment'
    or target_request.adjusted_estimate_amount is null
  then
    raise exception 'Adjusted estimate cannot be confirmed.';
  end if;

  if target_request.adjustment_confirmed_at is null then
    update public.remodel_requests
    set adjustment_confirmed_at = now()
    where id = target_request_id;
  end if;
end;
$$;

revoke all on function public.adjust_customer_request_quote(uuid, bigint)
  from public, anon;
revoke all on function public.confirm_adjusted_request_quote(uuid)
  from public, anon;

grant execute on function public.adjust_customer_request_quote(uuid, bigint)
  to authenticated;
grant execute on function public.confirm_adjusted_request_quote(uuid)
  to authenticated;
