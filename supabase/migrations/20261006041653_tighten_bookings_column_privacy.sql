/*
# Tighten bookings column-level privacy

1. Purpose
- The customer app is a no-auth public booking experience. Bookings are displayed
  on the home page and bookings tab, but only id, service_name, location,
  scheduled_date, time_slot, customer_name, price, and status are shown.
- Sensitive columns — customer_phone, notes, admin_notes, payment_status,
  helper_id, service_icon, created_at — must NOT be readable by the anon role.
- The admin panel uses SECURITY DEFINER functions (which run with elevated
  privileges and bypass RLS/column grants), so restricting these columns
  does not affect admin functionality.

2. Changes
- REVOKE all column-level privileges on bookings from anon and authenticated.
- GRANT SELECT only on the customer-visible columns to anon and authenticated.
- GRANT INSERT only on the columns the booking form writes to.
- Authenticated (admin) role gets full SELECT/UPDATE/DELETE since admin RLS
  policies gate access and admin reads use SECURITY DEFINER functions anyway.

3. Important Notes
- This does NOT change the booking flow, pricing, services, or any existing
  functionality. It only restricts which columns the public anon key can read.
- No columns are dropped, renamed, or type-changed.
*/

-- Revoke everything first
REVOKE ALL PRIVILEGES ON public.bookings FROM anon;
REVOKE ALL PRIVILEGES ON public.bookings FROM authenticated;

-- Public (anon) can SELECT only customer-visible columns
GRANT SELECT (id, service_name, location, scheduled_date, time_slot, customer_name, price, status)
  ON public.bookings TO anon;

-- Public (anon) can INSERT only booking-form columns
GRANT INSERT (service_name, service_icon, location, scheduled_date, time_slot, customer_name, customer_phone, notes, price)
  ON public.bookings TO anon;

-- Authenticated gets full access (admin RLS policies gate this to admin_profiles only)
GRANT SELECT, UPDATE, DELETE
  ON public.bookings TO authenticated;
