create type public.remodel_request_status as enum (
  'draft',
  'submitted',
  'matched',
  'in_consultation',
  'final_quote_sent',
  'confirmed',
  'closed'
);
create type public.selection_decision as enum (
  'not_selected',
  'consultation_required',
  'selected'
);
create type public.remodel_scope as enum ('partial', 'full');
create type public.assignment_status as enum ('assigned', 'accepted', 'declined');
create type public.quote_status as enum ('draft', 'sent', 'final', 'confirmed');
create type public.message_type as enum (
  'message',
  'question',
  'change_request',
  'quote_sent',
  'quote_confirmed',
  'system'
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  brand text,
  name text not null,
  description text,
  image_path text,
  base_price bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_base_price_nonnegative check (
    base_price is null or base_price >= 0
  )
);

create table public.catalog_options (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items (id) on delete cascade,
  name text not null,
  price_delta bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_price_history (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items (id) on delete cascade,
  previous_price bigint,
  new_price bigint,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now(),
  constraint catalog_price_history_prices_nonnegative check (
    (previous_price is null or previous_price >= 0)
    and (new_price is null or new_price >= 0)
  )
);

create table public.design_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cover_image_path text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.remodel_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  status public.remodel_request_status not null default 'draft',
  region text not null,
  housing_type text not null,
  bathroom_type text not null,
  estimated_size text,
  has_bathtub boolean,
  requires_demolition boolean,
  special_structure_note text,
  budget_range text not null,
  desired_schedule text not null,
  scope public.remodel_scope not null,
  priorities text[] not null default '{}',
  notes text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remodel_requests_submitted_at_required check (
    status = 'draft' or submitted_at is not null
  )
);

create table public.request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  storage_path text not null unique,
  category text not null default 'bathroom',
  sort_order integer not null default 0,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint request_photos_sort_order_nonnegative check (sort_order >= 0),
  constraint request_photos_size_nonnegative check (
    size_bytes is null or size_bytes >= 0
  )
);

create table public.selection_snapshots (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  category text not null,
  catalog_item_id uuid references public.catalog_items (id) on delete set null,
  item_name text,
  selected_options jsonb not null default '[]'::jsonb,
  base_price_snapshot bigint,
  decision_status public.selection_decision not null,
  created_at timestamptz not null default now(),
  constraint selection_snapshots_base_price_nonnegative check (
    base_price_snapshot is null or base_price_snapshot >= 0
  ),
  constraint selection_snapshots_options_array check (
    jsonb_typeof(selected_options) = 'array'
  )
);

create table public.request_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  assigned_staff_id uuid references public.profiles (id),
  status public.assignment_status not null default 'assigned',
  response_note text,
  assigned_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_assignments_request_partner_unique unique (request_id, partner_id)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  assignment_id uuid not null references public.request_assignments (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  version integer not null,
  status public.quote_status not null default 'draft',
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  tax bigint not null default 0,
  total bigint not null default 0,
  tax_included boolean not null default true,
  valid_until date,
  note text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_assignment_version_unique unique (assignment_id, version),
  constraint quotes_version_positive check (version > 0),
  constraint quotes_amounts_nonnegative check (
    subtotal >= 0 and discount >= 0 and tax >= 0 and total >= 0
  ),
  constraint quotes_sent_at_required check (
    status = 'draft' or sent_at is not null
  )
);

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  category text not null,
  name text not null,
  quantity numeric(12, 3) not null,
  unit_price bigint not null,
  amount bigint not null,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quote_line_items_quantity_positive check (quantity > 0),
  constraint quote_line_items_amounts_nonnegative check (
    unit_price >= 0 and amount >= 0
  ),
  constraint quote_line_items_sort_order_nonnegative check (sort_order >= 0)
);

create table public.consultation_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.remodel_requests (id) on delete cascade,
  assignment_id uuid not null references public.request_assignments (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  message_type public.message_type not null default 'message',
  body text not null default '',
  quote_id uuid references public.quotes (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint consultation_messages_body_or_quote check (
    char_length(trim(body)) > 0 or quote_id is not null
  )
);

create index remodel_requests_customer_status_idx
  on public.remodel_requests (customer_id, status, updated_at desc);
create index request_photos_request_sort_idx
  on public.request_photos (request_id, sort_order);
create index selection_snapshots_request_idx
  on public.selection_snapshots (request_id);
create index request_assignments_partner_status_idx
  on public.request_assignments (partner_id, status, assigned_at desc);
create index request_assignments_staff_status_idx
  on public.request_assignments (assigned_staff_id, status)
  where assigned_staff_id is not null;
create index quotes_request_assignment_idx
  on public.quotes (request_id, assignment_id, version desc);
create index quote_line_items_quote_sort_idx
  on public.quote_line_items (quote_id, sort_order);
create index consultation_messages_assignment_created_idx
  on public.consultation_messages (assignment_id, created_at);

create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function private.set_updated_at();

create trigger catalog_options_set_updated_at
before update on public.catalog_options
for each row execute function private.set_updated_at();

create trigger design_packages_set_updated_at
before update on public.design_packages
for each row execute function private.set_updated_at();

create trigger remodel_requests_set_updated_at
before update on public.remodel_requests
for each row execute function private.set_updated_at();

create trigger request_assignments_set_updated_at
before update on public.request_assignments
for each row execute function private.set_updated_at();

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function private.set_updated_at();

create or replace function private.protect_sent_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft'
    and coalesce(
      current_setting('baspace.allow_quote_status_transition', true),
      ''
    ) <> 'on'
  then
    raise exception 'Sent quotes are immutable; create a new version instead.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger quotes_protect_sent_update
before update or delete on public.quotes
for each row execute function private.protect_sent_quote();

create or replace function private.protect_sent_quote_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_quote_state public.quote_status;
  new_quote_state public.quote_status;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select q.status into old_quote_state
    from public.quotes q
    where q.id = old.quote_id;

    if old_quote_state <> 'draft' then
      raise exception 'Line items of sent quotes are immutable.';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select q.status into new_quote_state
    from public.quotes q
    where q.id = new.quote_id;

    if new_quote_state is distinct from 'draft' then
      raise exception 'Line items can only be written to draft quotes.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger quote_line_items_protect_sent_change
before insert or update or delete on public.quote_line_items
for each row execute function private.protect_sent_quote_line();

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

create trigger request_assignments_validate
before insert or update on public.request_assignments
for each row execute function private.validate_assignment();

create or replace function private.validate_quote_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.request_assignments ra
    where ra.id = new.assignment_id
      and ra.request_id = new.request_id
  ) then
    raise exception 'Quote request and assignment do not match.';
  end if;
  return new;
end;
$$;

create trigger quotes_validate_relationship
before insert or update on public.quotes
for each row execute function private.validate_quote_relationship();

create or replace function private.validate_message_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

create trigger consultation_messages_validate_relationship
before insert or update on public.consultation_messages
for each row execute function private.validate_message_relationship();

create or replace function private.sync_sent_quote_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status = 'sent' then
    update public.remodel_requests
    set status = 'in_consultation'
    where id = new.request_id
      and status in ('submitted', 'matched', 'in_consultation');
  end if;
  return new;
end;
$$;

create trigger quotes_sync_request_status
after update on public.quotes
for each row execute function private.sync_sent_quote_request_status();
