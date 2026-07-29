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

  if target_request.status <> 'submitted' then
    raise exception 'Only a newly submitted request can be adjusted.';
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

revoke all on function public.adjust_customer_request_quote(uuid, bigint)
  from public, anon;
grant execute on function public.adjust_customer_request_quote(uuid, bigint)
  to authenticated;
