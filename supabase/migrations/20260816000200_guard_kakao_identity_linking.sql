-- Apply the same no-auto-link policy to Kakao OAuth and replace the
-- Google-specific trigger/function names with a provider-neutral guard.
drop trigger if exists guard_google_identity_linking on auth.identities;
drop function if exists private.guard_google_identity_linking();

create or replace function private.guard_social_identity_linking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider in ('google', 'kakao')
    and exists (
      select 1
      from auth.identities identity
      where identity.user_id = new.user_id
        and identity.provider not in ('google', 'kakao')
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'social_identity_existing_email';
  end if;

  return new;
end;
$$;

create trigger guard_social_identity_linking
before insert on auth.identities
for each row execute function private.guard_social_identity_linking();
