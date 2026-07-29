create or replace function public.respond_to_partner_request(
  target_request_id uuid,
  target_action text
)
returns public.assignment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_assignment_id uuid;
  target_assignment public.request_assignments%rowtype;
  target_request public.remodel_requests%rowtype;
  next_assignment_status public.assignment_status;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if target_action is null
    or target_action not in ('proceed', 'decline')
  then
    raise exception 'Unsupported partner request action.';
  end if;

  select ra.id
  into target_assignment_id
  from public.request_assignments ra
  join public.partner_members member
    on member.partner_id = ra.partner_id
   and member.user_id = current_user_id
   and member.status = 'active'
  join public.partners partner
    on partner.id = member.partner_id
   and partner.approval_status = 'approved'
  join public.profiles staff_profile
    on staff_profile.id = member.user_id
   and staff_profile.role = 'partner_staff'
   and staff_profile.status = 'active'
  where ra.request_id = target_request_id
    and ra.status = 'assigned'
    and (
      ra.assigned_staff_id is null
      or ra.assigned_staff_id = member.user_id
      or member.is_manager
    );

  if not found then
    raise exception 'Accessible pending assignment was not found.';
  end if;

  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if not found then
    raise exception 'Remodel request was not found.';
  end if;

  perform 1
  from public.request_assignments request_assignment
  where request_assignment.request_id = target_request.id
  order by request_assignment.id
  for update;

  select ra.*
  into target_assignment
  from public.request_assignments ra
  join public.partner_members member
    on member.partner_id = ra.partner_id
   and member.user_id = current_user_id
   and member.status = 'active'
  join public.partners partner
    on partner.id = member.partner_id
   and partner.approval_status = 'approved'
  join public.profiles staff_profile
    on staff_profile.id = member.user_id
   and staff_profile.role = 'partner_staff'
   and staff_profile.status = 'active'
  where ra.id = target_assignment_id
    and ra.request_id = target_request.id
    and ra.status = 'assigned'
    and (
      ra.assigned_staff_id is null
      or ra.assigned_staff_id = member.user_id
      or member.is_manager
    );

  if not found then
    raise exception 'Pending assignment changed while responding.';
  end if;

  if target_action = 'proceed' then
    if target_request.status not in ('matched', 'in_consultation') then
      raise exception 'This request can no longer be accepted.';
    end if;

    next_assignment_status := 'accepted';

    update public.request_assignments
    set
      status = next_assignment_status,
      responded_at = now()
    where id = target_assignment.id;

    update public.remodel_requests
    set status = 'in_consultation'
    where id = target_request.id
      and status in ('matched', 'in_consultation');
  else
    next_assignment_status := 'declined';

    update public.request_assignments
    set
      status = next_assignment_status,
      responded_at = now()
    where id = target_assignment.id;

    if target_request.status in ('matched', 'in_consultation')
      and not exists (
        select 1
        from public.request_assignments remaining_assignment
        where remaining_assignment.request_id = target_request.id
          and remaining_assignment.status in ('assigned', 'accepted')
      )
    then
      update public.remodel_requests
      set status = 'cancelled'
      where id = target_request.id
        and status in ('matched', 'in_consultation');
    end if;
  end if;

  return next_assignment_status;
end;
$$;

revoke all on function public.respond_to_partner_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_partner_request(uuid, text)
  to authenticated;
