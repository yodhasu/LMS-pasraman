grant execute on function public.current_app_role() to authenticated;
revoke execute on function public.current_app_role() from anon;
revoke execute on function public.current_app_role() from public;
