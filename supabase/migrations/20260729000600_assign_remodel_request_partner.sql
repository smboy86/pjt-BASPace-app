create or replace function public.assign_remodel_request_partner(
  target_request_id uuid,
  target_partner_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.remodel_requests%rowtype;
  representative_user_id uuid;
  created_assignment_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if not found then
    raise exception 'Remodel request was not found.';
  end if;

  if target_request.status not in ('submitted', 'quote_adjustment') then
    raise exception 'Remodel request cannot be assigned in its current state.';
  end if;

  perform 1
  from public.request_assignments assignment
  where assignment.request_id = target_request.id
  order by assignment.id
  for update;

  if exists (
    select 1
    from public.request_assignments assignment
    where assignment.request_id = target_request.id
      and assignment.status in ('assigned', 'accepted')
  ) then
    raise exception 'Remodel request already has an active partner assignment.';
  end if;

  select account.user_id
  into representative_user_id
  from public.partners partner
  join public.partner_login_accounts account
    on account.partner_id = partner.id
  join public.partner_members member
    on member.partner_id = partner.id
   and member.user_id = account.user_id
   and member.status = 'active'
   and member.is_manager
  join public.profiles profile
    on profile.id = account.user_id
   and profile.role = 'partner_staff'
   and profile.status = 'active'
  where partner.id = target_partner_id
    and partner.approval_status = 'approved';

  if not found then
    raise exception 'Approved partner representative was not found.';
  end if;

  insert into public.request_assignments (
    request_id,
    partner_id,
    assigned_staff_id,
    status
  )
  values (
    target_request.id,
    target_partner_id,
    representative_user_id,
    'assigned'
  )
  returning id into created_assignment_id;

  update public.remodel_requests
  set status = 'matched'
  where id = target_request.id;

  return created_assignment_id;
end;
$$;

revoke all on function public.assign_remodel_request_partner(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.assign_remodel_request_partner(uuid, uuid)
  to authenticated;
