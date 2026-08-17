MATHSERA CLASSES — DELETE ROOT-CAUSE FIX

The earlier delete function had a database-side bug: PostgreSQL ROW_COUNT was being
assigned directly to a boolean variable. That made the delete result unreliable.

DO THIS ONCE:
1. Open Supabase Dashboard -> SQL Editor.
2. Open FIX_DELETE_ONCE.sql from this package.
3. Run the ENTIRE file once.
4. The final result should show:
   schema_name = public
   function_name = mathsera_delete_resource
   arguments = bigint
   return_type = boolean
5. Return to the existing Admin page and press DELETE once.

No repeated refreshes, no repeated SQL, and no additional ZIP patches are required.

The website already verifies the row after the RPC. It will only show success when
the resource is actually gone from public.resources.
