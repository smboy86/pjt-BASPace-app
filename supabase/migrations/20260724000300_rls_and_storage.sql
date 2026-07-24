create or replace function private.owns_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.remodel_requests r
    where r.id = target_request_id
      and r.customer_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.request_assignments ra
    join public.remodel_requests r on r.id = ra.request_id
    where ra.id = target_assignment_id
      and (
        r.customer_id = (select auth.uid())
        or (
          private.is_active_partner_member(ra.partner_id)
          and (
            ra.assigned_staff_id is null
            or ra.assigned_staff_id = (select auth.uid())
            or exists (
              select 1
              from public.partner_members pm
              where pm.partner_id = ra.partner_id
                and pm.user_id = (select auth.uid())
                and pm.status = 'active'
                and pm.is_manager
            )
          )
        )
        or private.is_admin()
      )
  );
$$;

create or replace function private.can_write_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.request_assignments ra
    where ra.id = target_assignment_id
      and ra.status = 'accepted'
      and private.is_active_partner_member(ra.partner_id)
      and (
        ra.assigned_staff_id = (select auth.uid())
        or (
          ra.assigned_staff_id is null
          and exists (
            select 1
            from public.partner_members pm
            where pm.partner_id = ra.partner_id
              and pm.user_id = (select auth.uid())
              and pm.status = 'active'
              and pm.is_manager
          )
        )
      )
  );
$$;

create or replace function private.can_edit_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.remodel_requests r
    where r.id = target_request_id
      and r.customer_id = (select auth.uid())
      and r.status in ('draft', 'submitted')
      and not exists (
        select 1
        from public.quotes q
        where q.request_id = r.id
          and q.status <> 'draft'
      )
  );
$$;

create or replace function private.safe_uuid(value text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

alter table public.catalog_items enable row level security;
alter table public.catalog_options enable row level security;
alter table public.catalog_price_history enable row level security;
alter table public.design_packages enable row level security;
alter table public.remodel_requests enable row level security;
alter table public.request_photos enable row level security;
alter table public.selection_snapshots enable row level security;
alter table public.request_assignments enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.consultation_messages enable row level security;

create policy profiles_select_assigned_staff
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.request_assignments ra
    join public.remodel_requests r on r.id = ra.request_id
    where ra.assigned_staff_id = profiles.id
      and r.customer_id = (select auth.uid())
  )
);

create policy partners_select_assigned_customer
on public.partners for select
to authenticated
using (
  exists (
    select 1
    from public.request_assignments ra
    join public.remodel_requests r on r.id = ra.request_id
    where ra.partner_id = partners.id
      and r.customer_id = (select auth.uid())
  )
);

create policy catalog_items_read_active
on public.catalog_items for select to authenticated
using (is_active or private.is_admin());
create policy catalog_items_admin_all
on public.catalog_items for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy catalog_options_read_active
on public.catalog_options for select to authenticated
using (
  private.is_admin()
  or (
    is_active
    and exists (
      select 1 from public.catalog_items ci
      where ci.id = catalog_item_id and ci.is_active
    )
  )
);
create policy catalog_options_admin_all
on public.catalog_options for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy catalog_price_history_admin_read
on public.catalog_price_history for select to authenticated
using (private.is_admin());
create policy catalog_price_history_admin_insert
on public.catalog_price_history for insert to authenticated
with check (private.is_admin() and changed_by = (select auth.uid()));

create policy design_packages_read_active
on public.design_packages for select to authenticated
using (is_active or private.is_admin());
create policy design_packages_admin_all
on public.design_packages for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy remodel_requests_customer_select
on public.remodel_requests for select to authenticated
using (customer_id = (select auth.uid()));
create policy remodel_requests_customer_insert
on public.remodel_requests for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and private.current_app_role() = 'customer'
  and status = 'draft'
);
create policy remodel_requests_customer_update
on public.remodel_requests for update to authenticated
using (customer_id = (select auth.uid()) and status in ('draft', 'submitted'))
with check (
  customer_id = (select auth.uid())
  and status in ('draft', 'submitted')
);
create policy remodel_requests_partner_select
on public.remodel_requests for select to authenticated
using (
  exists (
    select 1 from public.request_assignments ra
    where ra.request_id = id
      and private.can_access_assignment(ra.id)
  )
);
create policy remodel_requests_admin_all
on public.remodel_requests for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy request_photos_access
on public.request_photos for select to authenticated
using (
  private.owns_request(request_id)
  or private.is_admin()
  or exists (
    select 1 from public.request_assignments ra
    where ra.request_id = request_photos.request_id
      and private.can_access_assignment(ra.id)
  )
);
create policy request_photos_customer_insert
on public.request_photos for insert to authenticated
with check (private.can_edit_request(request_id));
create policy request_photos_customer_delete
on public.request_photos for delete to authenticated
using (private.can_edit_request(request_id));
create policy request_photos_admin_all
on public.request_photos for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy selection_snapshots_access
on public.selection_snapshots for select to authenticated
using (
  private.owns_request(request_id)
  or private.is_admin()
  or exists (
    select 1 from public.request_assignments ra
    where ra.request_id = selection_snapshots.request_id
      and private.can_access_assignment(ra.id)
  )
);
create policy selection_snapshots_customer_insert
on public.selection_snapshots for insert to authenticated
with check (private.can_edit_request(request_id));
create policy selection_snapshots_customer_update
on public.selection_snapshots for update to authenticated
using (private.can_edit_request(request_id))
with check (private.can_edit_request(request_id));
create policy selection_snapshots_customer_delete
on public.selection_snapshots for delete to authenticated
using (private.can_edit_request(request_id));
create policy selection_snapshots_admin_all
on public.selection_snapshots for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy request_assignments_customer_select
on public.request_assignments for select to authenticated
using (private.owns_request(request_id));
create policy request_assignments_partner_select
on public.request_assignments for select to authenticated
using (
  private.can_access_assignment(id)
  and not private.owns_request(request_id)
  and not private.is_admin()
);
create policy request_assignments_partner_update
on public.request_assignments for update to authenticated
using (
  private.can_access_assignment(id)
  and not private.owns_request(request_id)
  and not private.is_admin()
  and status = 'assigned'
)
with check (
  private.is_active_partner_member(partner_id)
  and status in ('accepted', 'declined')
);
create policy request_assignments_admin_all
on public.request_assignments for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy quotes_customer_select
on public.quotes for select to authenticated
using (
  private.owns_request(request_id)
  and status in ('sent', 'final', 'confirmed')
);
create policy quotes_partner_select
on public.quotes for select to authenticated
using (
  private.can_access_assignment(assignment_id)
  and not private.owns_request(request_id)
  and not private.is_admin()
);
create policy quotes_partner_insert
on public.quotes for insert to authenticated
with check (
  private.can_write_assignment(assignment_id)
  and author_id = (select auth.uid())
  and status = 'draft'
  and sent_at is null
);
create policy quotes_partner_update_draft
on public.quotes for update to authenticated
using (
  private.can_write_assignment(assignment_id)
  and author_id = (select auth.uid())
  and status = 'draft'
)
with check (
  private.can_write_assignment(assignment_id)
  and author_id = (select auth.uid())
  and status in ('draft', 'sent')
);
create policy quotes_admin_all
on public.quotes for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy quote_line_items_customer_select
on public.quote_line_items for select to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_id
      and private.owns_request(q.request_id)
      and q.status in ('sent', 'final', 'confirmed')
  )
);
create policy quote_line_items_partner_select
on public.quote_line_items for select to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and private.can_access_assignment(q.assignment_id)
      and not private.owns_request(q.request_id)
      and not private.is_admin()
  )
);
create policy quote_line_items_partner_write
on public.quote_line_items for all to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_id
      and q.status = 'draft'
      and q.author_id = (select auth.uid())
      and private.can_write_assignment(q.assignment_id)
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_id
      and q.status = 'draft'
      and q.author_id = (select auth.uid())
      and private.can_write_assignment(q.assignment_id)
  )
);
create policy quote_line_items_admin_all
on public.quote_line_items for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy consultation_messages_select
on public.consultation_messages for select to authenticated
using (private.can_access_assignment(assignment_id));
create policy consultation_messages_customer_insert
on public.consultation_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.owns_request(request_id)
  and private.can_access_assignment(assignment_id)
  and message_type in ('message', 'question', 'change_request')
  and exists (
    select 1
    from public.request_assignments ra
    where ra.id = assignment_id
      and ra.status = 'accepted'
  )
);
create policy consultation_messages_partner_insert
on public.consultation_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.can_write_assignment(assignment_id)
  and message_type = 'message'
);
create policy consultation_messages_admin_insert
on public.consultation_messages for insert to authenticated
with check (private.is_admin() and author_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-photos',
  'request-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy request_photos_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'request-photos'
  and (
    private.is_admin()
    or private.owns_request(private.safe_uuid((storage.foldername(name))[1]))
    or exists (
      select 1
      from public.request_assignments ra
      where ra.request_id = private.safe_uuid((storage.foldername(name))[1])
        and private.can_access_assignment(ra.id)
    )
  )
);

create policy request_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-photos'
  and array_length(storage.foldername(name), 1) = 2
  and private.safe_uuid((storage.foldername(name))[2]) = (select auth.uid())
  and private.can_edit_request(private.safe_uuid((storage.foldername(name))[1]))
);

create policy request_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-photos'
  and (
    private.is_admin()
    or (
      array_length(storage.foldername(name), 1) = 2
      and private.safe_uuid((storage.foldername(name))[2]) = (select auth.uid())
      and private.can_edit_request(private.safe_uuid((storage.foldername(name))[1]))
    )
  )
);

create or replace function public.mark_quote_final(target_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_quote public.quotes;
begin
  select q.* into target_quote
  from public.quotes q
  where q.id = target_quote_id
  for update;

  if target_quote.id is null
    or target_quote.status <> 'sent'
    or not private.can_write_assignment(target_quote.assignment_id)
  then
    raise exception 'Quote cannot be marked as final.';
  end if;

  perform set_config('baspace.allow_quote_status_transition', 'on', true);

  update public.quotes
  set status = 'final'
  where id = target_quote_id;

  update public.remodel_requests
  set status = 'final_quote_sent'
  where id = target_quote.request_id;
end;
$$;

create or replace function public.confirm_final_quote(target_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_quote public.quotes;
begin
  select q.* into target_quote
  from public.quotes q
  where q.id = target_quote_id
  for update;

  if target_quote.id is null
    or target_quote.status <> 'final'
    or not private.owns_request(target_quote.request_id)
  then
    raise exception 'Final quote cannot be confirmed.';
  end if;

  perform set_config('baspace.allow_quote_status_transition', 'on', true);

  update public.quotes
  set status = 'confirmed'
  where id = target_quote_id;

  update public.remodel_requests
  set status = 'confirmed'
  where id = target_quote.request_id;
end;
$$;

revoke all on function public.mark_quote_final(uuid) from public, anon;
revoke all on function public.confirm_final_quote(uuid) from public, anon;
grant execute on function public.mark_quote_final(uuid) to authenticated;
grant execute on function public.confirm_final_quote(uuid) to authenticated;

revoke all on
  public.catalog_items,
  public.catalog_options,
  public.catalog_price_history,
  public.design_packages,
  public.remodel_requests,
  public.request_photos,
  public.selection_snapshots,
  public.request_assignments,
  public.quotes,
  public.quote_line_items,
  public.consultation_messages
from anon, authenticated;

grant select, insert, update, delete on
  public.catalog_items,
  public.catalog_options,
  public.catalog_price_history,
  public.design_packages,
  public.remodel_requests,
  public.request_photos,
  public.selection_snapshots,
  public.request_assignments,
  public.quotes,
  public.quote_line_items,
  public.consultation_messages
to authenticated;
