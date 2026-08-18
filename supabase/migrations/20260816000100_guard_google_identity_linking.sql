-- Google OAuth is customer-only. Prevent Supabase's automatic identity
-- linking from attaching Google to an account that already uses email login.
-- A brand-new Google user has no pre-existing identity when this trigger runs.
create or replace function private.guard_google_identity_linking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider = 'google'
    and exists (
      select 1
      from auth.identities identity
      where identity.user_id = new.user_id
        and identity.provider <> 'google'
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'google_identity_existing_email';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_google_identity_linking on auth.identities;
create trigger guard_google_identity_linking
before insert on auth.identities
for each row execute function private.guard_google_identity_linking();
