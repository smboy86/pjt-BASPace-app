alter table public.consultation_messages
  alter column assignment_id drop not null;

create index consultation_messages_request_created_idx
  on public.consultation_messages (request_id, created_at);

create or replace function private.validate_message_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignment_id is null then
    if new.quote_id is not null then
      raise exception 'Request-level messages cannot reference a quote.';
    end if;

    return new;
  end if;

  if not exists (
    select 1
    from public.request_assignments ra
    where ra.id = new.assignment_id
      and ra.request_id = new.request_id
  ) then
    raise exception 'Message request and assignment do not match.';
  end if;

  if new.quote_id is not null
    and not exists (
      select 1
      from public.quotes q
      where q.id = new.quote_id
        and q.request_id = new.request_id
        and q.assignment_id = new.assignment_id
    )
  then
    raise exception 'Message quote does not belong to this assignment.';
  end if;

  return new;
end;
$$;

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
    )
  )
  or (
    assignment_id is not null
    and private.can_access_assignment(assignment_id)
  )
);

drop policy consultation_messages_customer_insert
  on public.consultation_messages;
create policy consultation_messages_customer_insert
on public.consultation_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.owns_request(request_id)
  and message_type in ('message', 'question', 'change_request')
  and (
    assignment_id is null
    or (
      private.can_access_assignment(assignment_id)
      and exists (
        select 1
        from public.request_assignments ra
        where ra.id = assignment_id
          and ra.status = 'accepted'
      )
    )
  )
);
