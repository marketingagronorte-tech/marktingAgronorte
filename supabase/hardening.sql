-- Keep the existing owner-operated RLS event trigger, while closing direct API execution.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
