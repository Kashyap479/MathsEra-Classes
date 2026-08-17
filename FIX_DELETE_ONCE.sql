-- MathsEra Classes — DELETE ROOT-CAUSE FIX (ONE TIME)
-- Run this entire file ONCE in Supabase SQL Editor.
--
-- ROOT CAUSE FIX:
-- The previous function incorrectly stored PostgreSQL ROW_COUNT (a bigint)
-- directly into a boolean variable. This version uses DELETE ... RETURNING
-- and returns TRUE only when the requested resource row was actually deleted.

create or replace function public.mathsera_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

drop function if exists public.mathsera_delete_resource(bigint);

create function public.mathsera_delete_resource(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_id bigint;
begin
  if p_id is null then
    raise exception 'Resource ID is required';
  end if;

  if not public.mathsera_is_admin() then
    raise exception 'Not authorized to delete resources';
  end if;

  delete from public.resources
  where id = p_id
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$$;

revoke all on function public.mathsera_delete_resource(bigint) from public;
grant execute on function public.mathsera_delete_resource(bigint) to authenticated;
grant usage on schema public to authenticated;

-- Keep database-side admin protection in place.
alter table public.resources enable row level security;
drop policy if exists "Authenticated users can delete resources" on public.resources;
drop policy if exists "Only admin can delete resources" on public.resources;
drop policy if exists "MathsEra admin delete resources" on public.resources;
create policy "MathsEra admin delete resources"
on public.resources
for delete to authenticated
using (public.mathsera_is_admin());

-- Storage cleanup protection for uploaded library files.
drop policy if exists "Authenticated can delete MathsEra library files" on storage.objects;
drop policy if exists "Only admin can delete MathsEra library files" on storage.objects;
drop policy if exists "MathsEra admin delete library files" on storage.objects;
create policy "MathsEra admin delete library files"
on storage.objects
for delete to authenticated
using (bucket_id = 'library-files' and public.mathsera_is_admin());

-- Refresh PostgREST so the RPC is immediately discoverable.
notify pgrst, 'reload schema';

-- Verify exact function signature.
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'mathsera_delete_resource';
