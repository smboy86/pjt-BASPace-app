create or replace function public.complete_remodel_request(
  target_request_id uuid
)
returns public.remodel_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_request public.remodel_requests%rowtype;
  can_complete boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  can_complete := private.is_admin();

  if not can_complete then
    select exists (
      select 1
      from public.request_assignments assignment
      join public.partner_members member
        on member.partner_id = assignment.partner_id
       and member.user_id = current_user_id
       and member.status = 'active'
      join public.partners partner
        on partner.id = member.partner_id
       and partner.approval_status = 'approved'
      join public.profiles staff_profile
        on staff_profile.id = member.user_id
       and staff_profile.role = 'partner_staff'
       and staff_profile.status = 'active'
      where assignment.request_id = target_request_id
        and assignment.status = 'accepted'
        and (
          assignment.assigned_staff_id is null
          or assignment.assigned_staff_id = member.user_id
          or member.is_manager
        )
    )
    into can_complete;
  end if;

  if not can_complete then
    raise exception 'Construction completion access is denied.';
  end if;

  select request.*
  into target_request
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if not found then
    raise exception 'Remodel request was not found.';
  end if;

  if target_request.status not in ('in_consultation', 'final_quote_sent') then
    raise exception 'Only an in-progress request can be completed.';
  end if;

  update public.remodel_requests
  set status = 'closed'
  where id = target_request.id
    and status in ('in_consultation', 'final_quote_sent');

  return 'closed'::public.remodel_request_status;
end;
$$;

revoke all on function public.complete_remodel_request(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_remodel_request(uuid)
  to authenticated;
