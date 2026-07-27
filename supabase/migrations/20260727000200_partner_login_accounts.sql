create table public.partner_login_accounts (
  partner_id uuid primary key references public.partners (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  login_email text not null,
  created_at timestamptz not null default now(),
  constraint partner_login_accounts_email_length
    check (char_length(trim(login_email)) between 3 and 320)
);

create unique index partner_login_accounts_login_email_uidx
  on public.partner_login_accounts (lower(login_email));

alter table public.partner_login_accounts enable row level security;

create policy partner_login_accounts_select_self_or_admin
on public.partner_login_accounts for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

create policy partner_login_accounts_admin_all
on public.partner_login_accounts for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create or replace function public.create_partner_with_representative(
  p_target_user_id uuid,
  p_company_name text,
  p_business_number text,
  p_business_registration_image_path text,
  p_contact_name text,
  p_contact_phone text,
  p_login_email text,
  p_note text
)
returns public.partners
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_partner public.partners;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_target_user_id
  ) then
    raise exception 'partner profile not found';
  end if;

  insert into public.partners (
    company_name,
    business_number,
    business_registration_image_path,
    contact_name,
    contact_phone,
    note,
    approval_status
  )
  values (
    trim(p_company_name),
    trim(p_business_number),
    p_business_registration_image_path,
    trim(p_contact_name),
    trim(p_contact_phone),
    nullif(trim(p_note), ''),
    'approved'::public.partner_approval_status
  )
  returning * into created_partner;

  update public.profiles
  set
    role = 'partner_staff'::public.app_role,
    status = 'active'::public.profile_status,
    display_name = left(trim(p_contact_name), 80),
    phone = left(trim(p_contact_phone), 30)
  where id = p_target_user_id;

  insert into public.partner_members (
    partner_id,
    user_id,
    status,
    is_manager
  )
  values (
    created_partner.id,
    p_target_user_id,
    'active'::public.partner_member_status,
    true
  );

  insert into public.partner_login_accounts (
    partner_id,
    user_id,
    login_email
  )
  values (
    created_partner.id,
    p_target_user_id,
    lower(trim(p_login_email))
  );

  return created_partner;
end;
$$;

revoke all on function public.create_partner_with_representative(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_partner_with_representative(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
