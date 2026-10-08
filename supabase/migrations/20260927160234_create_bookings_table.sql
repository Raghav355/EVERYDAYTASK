/*
# Create bookings table for Everyday Task

1. New Tables
- `bookings` stores customer service requests created from the public booking flow.
- `id` is the generated booking identifier.
- `service_name` stores the selected service label.
- `service_icon` stores the display icon key used by the app.
- `location` stores the requested service location.
- `scheduled_date` stores the requested date.
- `time_slot` stores the requested time window.
- `customer_name` and `customer_phone` store contact details for fulfilment.
- `notes` stores optional task instructions.
- `price` stores the quoted amount in whole rupees.
- `status` stores the current booking lifecycle state.
- `created_at` stores when the request was submitted.

2. Security
- Row level security is enabled.
- This is a single-tenant public booking experience without sign-in, so anon and authenticated roles may create and read booking rows.
- Update and delete are limited to authenticated operators to prevent anonymous tampering with submitted requests.

3. Important Notes
- No customer authentication is introduced in this change.
- Monetary values are stored as integers in INR.
*/

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_icon text NOT NULL DEFAULT 'sparkles',
  location text NOT NULL,
  scheduled_date date NOT NULL,
  time_slot text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  notes text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'on_the_way', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read bookings" ON public.bookings;
CREATE POLICY "public can read bookings" ON public.bookings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public can create bookings" ON public.bookings;
CREATE POLICY "public can create bookings" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "operators can update bookings" ON public.bookings;
CREATE POLICY "operators can update bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "operators can delete bookings" ON public.bookings;
CREATE POLICY "operators can delete bookings" ON public.bookings
  FOR DELETE TO authenticated USING (true);
