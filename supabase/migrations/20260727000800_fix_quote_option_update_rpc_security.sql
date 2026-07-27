alter function public.update_quote_option_master(
  uuid,
  text,
  integer,
  public.quote_option_form_type,
  bigint,
  text[]
)
security definer;
