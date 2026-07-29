alter type public.remodel_request_status
  add value if not exists 'quote_adjustment' after 'submitted';
