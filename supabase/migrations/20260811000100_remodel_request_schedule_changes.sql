create table public.remodel_request_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  previous_schedule text not null,
  new_schedule text not null,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now(),
  constraint remodel_request_schedule_changes_new_schedule_format check (
    new_schedule ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  constraint remodel_request_schedule_changes_value_changed check (
    previous_schedule <> new_schedule
  )
);

create index remodel_request_schedule_changes_request_changed_idx
  on public.remodel_request_schedule_changes (request_id, changed_at desc, id desc);

alter table public.remodel_request_schedule_changes enable row level security;

create policy remodel_request_schedule_changes_customer_select
on public.remodel_request_schedule_changes for select to authenticated
using (
  exists (
    select 1
    from public.remodel_requests request
    where request.id = request_id
      and request.customer_id = (select auth.uid())
  )
);

create policy remodel_request_schedule_changes_admin_select
on public.remodel_request_schedule_changes for select to authenticated
using (private.is_admin());

grant select on table public.remodel_request_schedule_changes to authenticated;
grant all on table public.remodel_request_schedule_changes to service_role;

drop policy remodel_requests_customer_update on public.remodel_requests;

create policy remodel_requests_customer_update
on public.remodel_requests for update to authenticated
using (
  customer_id = (select auth.uid())
  and status = 'draft'
  and private.current_app_role() = 'customer'
)
with check (
  customer_id = (select auth.uid())
  and status = 'draft'
  and private.current_app_role() = 'customer'
);

create function public.update_remodel_request_schedule(
  target_request_id uuid,
  target_date text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_schedule text;
  parsed_target_date date;
  seoul_current_date date := (now() at time zone 'Asia/Seoul')::date;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if target_date is null
    or target_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then
    raise exception 'A valid construction date is required.';
  end if;

  begin
    parsed_target_date := target_date::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'A valid construction date is required.';
  end;

  if to_char(parsed_target_date, 'YYYY-MM-DD') <> target_date
    or parsed_target_date <= seoul_current_date
  then
    raise exception 'The construction date must be after today.';
  end if;

  select request.desired_schedule
  into current_schedule
  from public.remodel_requests request
  where request.id = target_request_id
  for update;

  if not found then
    raise exception 'Remodel request was not found.';
  end if;

  if current_schedule = target_date then
    return;
  end if;

  update public.remodel_requests
  set desired_schedule = target_date
  where id = target_request_id;

  insert into public.remodel_request_schedule_changes (
    request_id,
    previous_schedule,
    new_schedule,
    changed_by
  )
  values (
    target_request_id,
    current_schedule,
    target_date,
    (select auth.uid())
  );
end;
$$;

revoke all on function public.update_remodel_request_schedule(uuid, text)
  from public, anon;

grant execute on function public.update_remodel_request_schedule(uuid, text)
  to authenticated, service_role;
