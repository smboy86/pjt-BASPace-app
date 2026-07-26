-- Public email sign-up always creates a customer profile. Client metadata is
-- intentionally ignored for authorization fields so a user cannot self-assign
-- partner_staff or admin privileges.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    role,
    status,
    display_name
  )
  values (
    new.id,
    'customer'::public.app_role,
    'active'::public.profile_status,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      80
    )
  );
  return new;
end;
$$;
