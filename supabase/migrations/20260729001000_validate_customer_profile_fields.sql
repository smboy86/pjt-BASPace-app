alter table public.profiles
  add constraint profiles_display_name_trimmed_length
  check (char_length(btrim(display_name)) between 2 and 80)
  not valid;

comment on constraint profiles_display_name_trimmed_length on public.profiles is
  'New and updated profiles require a trimmed customer-facing name between 2 and 80 characters.';

create or replace function private.validate_profile_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is not null and new.phone !~ '^[0-9]{10,11}$' then
    raise exception using
      errcode = '23514',
      constraint = 'profiles_phone_format',
      message = 'Profile phone must contain 10 or 11 digits.';
  end if;

  return new;
end;
$$;

create trigger profiles_validate_phone
before insert or update of phone on public.profiles
for each row execute function private.validate_profile_phone();

comment on function private.validate_profile_phone() is
  'Validates newly supplied profile phone values while allowing name-only updates on legacy rows.';
