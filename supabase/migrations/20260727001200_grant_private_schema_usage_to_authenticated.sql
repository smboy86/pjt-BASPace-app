-- The quote-option RPC is security invoker and calls private.is_admin().
-- Authenticated app users need schema usage to resolve that authorization helper;
-- this does not grant access to private tables or bypass RLS policies.
grant usage on schema private to authenticated;
