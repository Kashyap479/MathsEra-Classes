-- MathsEra Classes — ONE-TIME OWNER ADMIN BOOTSTRAP
-- This patch fixes: "Login succeeded, but this account is not authorised..."
--
-- The function can ONLY promote the exact owner email below AND only when
-- there is no admin profile yet. It cannot be used to promote any other account.
-- After the first successful bootstrap, the function becomes harmless.
--
-- Run this once in Supabase Dashboard -> SQL Editor.

create or replace function public.mathsera_bootstrap_owner()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt()->>'email',''));
  owner_email text := lower('mathseraclasses2025@gmail.com');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if current_email <> owner_email then
    raise exception 'This account is not the authorised MathsEra owner account';
  end if;

  if exists (select 1 from public.admin_profiles where is_admin = true) then
    return false;
  end if;

  insert into public.admin_profiles(user_id, display_name, is_admin)
  values (current_user_id, 'Praveen Sir', true)
  on conflict (user_id)
  do update set display_name='Praveen Sir', is_admin=true;

  return true;
end;
$$;

revoke all on function public.mathsera_bootstrap_owner() from public;
grant execute on function public.mathsera_bootstrap_owner() to authenticated;

-- Verify:
-- select * from public.admin_profiles;
