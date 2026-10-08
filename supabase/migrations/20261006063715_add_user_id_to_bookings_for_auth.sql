/*
# Add user_id to bookings for per-customer authentication

1. Purpose
- The customer app previously had no authentication. All visitors saw a hardcoded
  "Raghav Kumar" account and all bookings were publicly visible. This migration
  adds per-user ownership to bookings so each customer sees only their own data.

2. Changes
- Add `user_id` column to `bookings` table (uuid, references auth.users)
- Set existing bookings' user_id to the admin's ID so no data is orphaned
- Make user_id NOT NULL with DEFAULT auth.uid() for new inserts
- Replace public (anon) RLS policies with authenticated, owner-scoped policies
- Admin retains full access via is_admin() check in SELECT policy
- Revoke all anon access to bookings (customers must now sign in)

3. Important Notes
- No existing data is deleted or modified beyond setting user_id on old rows
- Admin panel continues to work: is_admin() check in SELECT policy + SECURITY DEFINER functions
- New bookings automatically get user_id from auth.uid() DEFAULT
- The booking form does not need to send user_id explicitly
- Column-level grants: authenticated gets SELECT on all columns (RLS gates rows),
  INSERT on booking-form columns only, UPDATE/DELETE for admin via RLS
*/

-- Add user_id column (nullable initially so existing rows can be backfilled)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id') THEN
    ALTER TABLE public.bookings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill existing bookings to the admin's user ID (preserves data, admin can still see them)
UPDATE public.bookings
SET user_id = (SELECT id FROM public.admin_profiles ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

-- Make NOT NULL with DEFAULT auth.uid() so new authenticated inserts get the owner automatically
ALTER TABLE public.bookings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old public policies (anon can no longer access bookings)
DROP POLICY IF EXISTS "public can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "public can create bookings" ON public.bookings;

-- New SELECT policy: users see their own bookings, admins see all
DROP POLICY IF EXISTS "users_read_own_bookings" ON public.bookings;
CREATE POLICY "users_read_own_bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- New INSERT policy: users can only insert their own bookings
DROP POLICY IF EXISTS "users_insert_own_bookings" ON public.bookings;
CREATE POLICY "users_insert_own_bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin UPDATE and DELETE policies already exist (admin_update_bookings, admin_delete_bookings)
-- They use EXISTS check on admin_profiles, which is correct

-- Revoke all anon access to bookings (customers must now be authenticated)
REVOKE ALL PRIVILEGES ON public.bookings FROM anon;

-- Authenticated gets full SELECT (RLS gates which rows they can see)
GRANT SELECT ON public.bookings TO authenticated;

-- Authenticated gets INSERT on booking-form columns (user_id filled by DEFAULT)
GRANT INSERT (service_name, service_icon, location, scheduled_date, time_slot, customer_name, customer_phone, notes, price)
  ON public.bookings TO authenticated;

-- Admin UPDATE/DELETE (gated by RLS to admin_profiles members only)
GRANT UPDATE ON public.bookings TO authenticated;
GRANT DELETE ON public.bookings TO authenticated;
