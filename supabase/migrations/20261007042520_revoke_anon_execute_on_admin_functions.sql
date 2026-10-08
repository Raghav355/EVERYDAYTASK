/*
# Revoke EXECUTE on admin SECURITY DEFINER functions from anon and authenticated

1. Purpose
- Security advisors flagged that all admin SECURITY DEFINER functions can be
  executed by the `anon` and `authenticated` roles via the PostgREST RPC endpoint.
- Although each function body checks `is_admin()` and raises an exception for
  non-admins, the functions should not be callable at all by non-admin roles.
- This migration REVOKEs EXECUTE from anon on all 11 admin functions, and
  REVOKEs EXECUTE from authenticated on the functions that should only be
  callable by admins. The `is_admin()` function is kept callable by
  `authenticated` (it is used in RLS policies) but revoked from `anon`.
  `seed_default_services()` is revoked from both since it is a one-time setup
  function that has already been run.

2. Functions affected
- is_admin() — revoke from anon only (authenticated needs it for RLS)
- set_booking_status() — revoke from anon only (admin uses it via authenticated)
- admin_upsert_helper() — revoke from anon only
- admin_delete_helper() — revoke from anon only
- admin_upsert_service() — revoke from anon only
- admin_delete_service() — revoke from anon only
- admin_upsert_package() — revoke from anon only
- admin_delete_package() — revoke from anon only
- admin_upsert_promo() — revoke from anon only
- admin_delete_promo() — revoke from anon only
- resolve_support_request() — revoke from anon only
- seed_default_services() — revoke from anon and authenticated (one-time, already run)

3. Important Notes
- No function definitions are changed — only EXECUTE grants are revoked.
- All functions already check is_admin() internally, so this is defense-in-depth.
- authenticated role retains EXECUTE on admin functions because the admin panel
  uses supabase.rpc() with an authenticated session; is_admin() gates access.
- No data is lost or modified.
*/

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_booking_status(uuid,text,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_helper(text,text,uuid,text,text[],text[],text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_helper(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_service(text,text,text,integer,uuid,boolean,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_service(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_package(text,text,integer,integer,text[],uuid,boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_package(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_promo(text,integer,uuid,integer,boolean,timestamptz,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_promo(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_support_request(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_services() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_services() FROM authenticated;
