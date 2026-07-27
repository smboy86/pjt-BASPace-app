create type public.quote_option_form_type as enum ('simple', 'advanced');

create table public.quote_option_masters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_order integer not null,
  form_type public.quote_option_form_type not null default 'simple',
  base_price bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_option_masters_code_format check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint quote_option_masters_name_length check (
    char_length(trim(name)) between 1 and 50
  ),
  constraint quote_option_masters_display_order_positive check (display_order >= 1),
  constraint quote_option_masters_base_price_nonnegative check (base_price >= 0)
);

create table public.quote_option_images (
  id uuid primary key default gen_random_uuid(),
  quote_option_id uuid not null
    references public.quote_option_masters (id) on delete cascade,
  storage_path text not null unique,
  display_order integer not null,
  created_at timestamptz not null default now(),
  constraint quote_option_images_display_order_range check (
    display_order between 1 and 5
  ),
  constraint quote_option_images_order_unique unique (quote_option_id, display_order)
);

create index quote_option_masters_sort_idx
  on public.quote_option_masters (display_order, name);
create index quote_option_images_option_sort_idx
  on public.quote_option_images (quote_option_id, display_order);

create trigger quote_option_masters_set_updated_at
before update on public.quote_option_masters
for each row execute function private.set_updated_at();

create or replace function private.preserve_quote_option_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code <> old.code then
    raise exception 'Quote option code cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger quote_option_masters_preserve_code
before update of code on public.quote_option_masters
for each row execute function private.preserve_quote_option_code();

alter table public.quote_option_masters enable row level security;
alter table public.quote_option_images enable row level security;

create policy quote_option_masters_read_active
on public.quote_option_masters for select to authenticated
using (is_active or private.is_admin());

create policy quote_option_masters_admin_all
on public.quote_option_masters for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy quote_option_images_read_active
on public.quote_option_images for select to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.quote_option_masters master
    where master.id = quote_option_id
      and master.is_active
  )
);

create policy quote_option_images_admin_all
on public.quote_option_images for all to authenticated
using (private.is_admin())
with check (private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-option-images',
  'quote-option-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy quote_option_images_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'quote-option-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.quote_option_masters master
      where master.id = private.safe_uuid((storage.foldername(name))[1])
        and master.is_active
    )
  )
);

create policy quote_option_images_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'quote-option-images'
  and private.is_admin()
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.quote_option_masters master
    where master.id = private.safe_uuid((storage.foldername(name))[1])
  )
);

create policy quote_option_images_storage_delete
on storage.objects for delete to authenticated
using (bucket_id = 'quote-option-images' and private.is_admin());

create or replace function public.update_quote_option_master(
  target_option_id uuid,
  target_name text,
  target_display_order integer,
  target_form_type public.quote_option_form_type,
  target_base_price bigint,
  target_image_paths text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := trim(target_name);
  image_count integer := coalesce(array_length(target_image_paths, 1), 0);
begin
  if not private.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if char_length(normalized_name) not between 1 and 50 then
    raise exception 'Quote option name must be between 1 and 50 characters.';
  end if;

  if target_display_order < 1 then
    raise exception 'Display order must be a positive integer.';
  end if;

  if target_base_price < 0 then
    raise exception 'Base price cannot be negative.';
  end if;

  if image_count > 5 then
    raise exception 'A quote option can contain at most five images.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_image_paths, array[]::text[])) as image_path
    where image_path = ''
      or split_part(image_path, '/', 1) <> target_option_id::text
  ) then
    raise exception 'Invalid quote option image path.';
  end if;

  update public.quote_option_masters
  set
    name = normalized_name,
    display_order = target_display_order,
    form_type = target_form_type,
    base_price = target_base_price
  where id = target_option_id;

  if not found then
    raise exception 'Quote option was not found.';
  end if;

  delete from public.quote_option_images
  where quote_option_id = target_option_id;

  insert into public.quote_option_images (quote_option_id, storage_path, display_order)
  select
    target_option_id,
    image_path,
    image_order::integer
  from unnest(coalesce(target_image_paths, array[]::text[]))
    with ordinality as images(image_path, image_order);
end;
$$;

revoke all on function public.update_quote_option_master(
  uuid,
  text,
  integer,
  public.quote_option_form_type,
  bigint,
  text[]
) from public, anon;
grant execute on function public.update_quote_option_master(
  uuid,
  text,
  integer,
  public.quote_option_form_type,
  bigint,
  text[]
) to authenticated;

revoke all on public.quote_option_masters, public.quote_option_images
from anon, authenticated;
grant select, insert, update, delete
on public.quote_option_masters, public.quote_option_images
to authenticated;

insert into public.quote_option_masters (
  code,
  name,
  display_order,
  form_type,
  base_price
)
values
  ('TILE', '타일', 1, 'advanced', 0),
  ('BASIN_TOILET', '세면대/양변기', 2, 'simple', 0),
  ('WATER_TANK', '수조', 3, 'simple', 0),
  ('BATHTUB', '욕조', 4, 'simple', 0),
  ('ZENDAI', '젠다이', 5, 'simple', 0),
  ('MASONRY_WALL', '조적벽', 6, 'simple', 0),
  ('CEILING', '천장제', 7, 'simple', 0),
  ('BATHROOM_CABINET', '욕실장', 8, 'simple', 0),
  ('INDIRECT_LIGHTING', '간접등', 9, 'simple', 0);
