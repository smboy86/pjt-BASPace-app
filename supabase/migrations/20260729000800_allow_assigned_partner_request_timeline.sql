drop policy consultation_messages_select
  on public.consultation_messages;

create policy consultation_messages_select
on public.consultation_messages for select to authenticated
using (
  (
    assignment_id is null
    and (
      private.owns_request(request_id)
      or private.is_admin()
      or exists (
        select 1
        from public.request_assignments assignment
        where assignment.request_id = consultation_messages.request_id
          and private.can_access_assignment(assignment.id)
      )
    )
  )
  or (
    assignment_id is not null
    and private.can_access_assignment(assignment_id)
  )
);
