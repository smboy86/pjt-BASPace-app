create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('customer', 'partner_staff', 'admin');
create type public.profile_status as enum ('active', 'invited', 'suspended', 'deleted');
create type public.partner_approval_status as enum ('pending', 'approved', 'inactive');
create type public.partner_member_status as enum ('invited', 'active', 'inactive');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  status public.profile_status not null default 'active',
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 30)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  business_number text,
  service_regions text[] not null default '{}',
  service_types text[] not null default '{}',
  approval_status public.partner_approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_company_name_length check (
    char_length(company_name) between 1 and 120
  )
);

create table public.partner_members (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.partner_member_status not null default 'invited',
  is_manager boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_members_one_partner_per_user unique (user_id),
  constraint partner_members_partner_user_unique unique (partner_id, user_id)
);

create index partner_members_partner_status_idx
  on public.partner_members (partner_id, status);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger partners_set_updated_at
before update on public.partners
for each row execute function private.set_updated_at();

create trigger partner_members_set_updated_at
before update on public.partner_members
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      80
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active';
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

create or replace function private.is_active_partner_member(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_members pm
    join public.partners p on p.id = pm.partner_id
    join public.profiles profile on profile.id = pm.user_id
    where pm.user_id = (select auth.uid())
      and pm.partner_id = target_partner_id
      and pm.status = 'active'
      and p.approval_status = 'approved'
      and profile.role = 'partner_staff'
      and profile.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.partner_members enable row level security;

create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or private.is_admin());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_admin_all
on public.profiles for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy partners_select_member_or_admin
on public.partners for select
to authenticated
using (private.is_admin() or private.is_active_partner_member(id));

create policy partners_admin_all
on public.partners for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy partner_members_select_self_or_admin
on public.partner_members for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

create policy partner_members_admin_all
on public.partner_members for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.profiles, public.partners, public.partner_members
from anon, authenticated;

grant select on public.profiles, public.partners, public.partner_members
to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;
grant insert, update, delete on public.partners, public.partner_members
to authenticated;
