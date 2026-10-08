/*
# Tighten support request privacy

1. Purpose
- Keep customer support requests private from anonymous customers.
- The admin panel remains able to read and update all support requests when signed in as an authorized admin.

2. Modified Table
- `support_requests`
- Remove the public SELECT policy that exposed customer names, phone numbers, subjects, and messages.
- Add an admin-only SELECT policy using the existing `admin_profiles` role check.
- Keep the public INSERT policy so customers can still submit support requests.

3. Security
- Customer support content is no longer readable through the public anon-key API.
- Admin access continues to require an authenticated user present in `admin_profiles`.

4. Important Notes
- No customer-facing booking or support submission functionality is removed.
- This migration does not change columns, data, or existing admin update behavior.
*/

DROP POLICY IF EXISTS "public_read_support" ON public.support_requests;

DROP POLICY IF EXISTS "admin_read_support" ON public.support_requests;
CREATE POLICY "admin_read_support" ON public.support_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
  ));
