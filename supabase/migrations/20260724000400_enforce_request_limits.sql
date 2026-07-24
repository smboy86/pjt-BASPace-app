create or replace function private.enforce_request_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  photo_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.request_id::text, 0)
  );

  select count(*) into photo_count
  from public.request_photos rp
  where rp.request_id = new.request_id
    and rp.id <> new.id;

  if photo_count >= 5 then
    raise exception 'A remodel request can contain at most 5 photos.';
  end if;

  return new;
end;
$$;

create trigger request_photos_enforce_limit
before insert or update of request_id on public.request_photos
for each row execute function private.enforce_request_photo_limit();

create or replace function private.validate_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and (
      new.id <> old.id
      or new.request_id <> old.request_id
      or new.partner_id <> old.partner_id
      or new.assigned_at <> old.assigned_at
    )
  then
    raise exception 'Assignment identity fields are immutable.';
  end if;

  if tg_op = 'UPDATE'
    and new.assigned_staff_id is distinct from old.assigned_staff_id
    and not private.is_admin()
  then
    raise exception 'Only an administrator can reassign partner staff.';
  end if;

  if new.assigned_staff_id is not null
    and not exists (
      select 1
      from public.partner_members pm
      join public.profiles p on p.id = pm.user_id
      where pm.partner_id = new.partner_id
        and pm.user_id = new.assigned_staff_id
        and pm.status = 'active'
        and p.role = 'partner_staff'
        and p.status = 'active'
    )
  then
    raise exception 'Assigned staff must be an active member of the partner.';
  end if;

  return new;
end;
$$;
