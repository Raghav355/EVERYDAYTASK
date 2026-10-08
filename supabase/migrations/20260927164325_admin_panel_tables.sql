/*
# Admin panel support tables and helpers

Adds backend structures for the Everyday Task admin panel:
- admin_profiles, helpers, services_catalogue, packages, promo_codes,
  support_requests, ratings, notifications
- bookings table gets helper_id, payment_status, admin_notes; status enum widened
- RLS on all tables; operator writes via SECURITY DEFINER functions checking is_admin()
- Functions: is_admin, set_booking_status, admin_upsert and admin_delete helpers,
  resolve_support_request, seed_default_services
*/

-- admin_profiles (created FIRST so other policies can reference it)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  full_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_own_profile" ON public.admin_profiles;
CREATE POLICY "admin_read_own_profile" ON public.admin_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- helpers
CREATE TABLE IF NOT EXISTS public.helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE,
  areas text[] NOT NULL DEFAULT '{}',
  specialties text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','offline')),
  rating numeric NOT NULL DEFAULT 5.0,
  total_tasks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_helpers" ON public.helpers;
CREATE POLICY "public_read_helpers" ON public.helpers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_helpers" ON public.helpers;
CREATE POLICY "admin_write_helpers" ON public.helpers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- services_catalogue
CREATE TABLE IF NOT EXISTS public.services_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  icon_tone text NOT NULL DEFAULT 'blue',
  price integer NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_services_catalogue" ON public.services_catalogue;
CREATE POLICY "public_read_services_catalogue" ON public.services_catalogue
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_services_catalogue" ON public.services_catalogue;
CREATE POLICY "admin_write_services_catalogue" ON public.services_catalogue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- packages
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  tasks_included integer NOT NULL DEFAULT 4,
  perks text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_packages" ON public.packages;
CREATE POLICY "public_read_packages" ON public.packages
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_packages" ON public.packages;
CREATE POLICY "admin_write_packages" ON public.packages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- promo_codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_promo_codes" ON public.promo_codes;
CREATE POLICY "public_read_promo_codes" ON public.promo_codes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_promo_codes" ON public.promo_codes;
CREATE POLICY "admin_write_promo_codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- support_requests
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_create_support" ON public.support_requests;
CREATE POLICY "public_create_support" ON public.support_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_support" ON public.support_requests;
CREATE POLICY "public_read_support" ON public.support_requests
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_support" ON public.support_requests;
CREATE POLICY "admin_update_support" ON public.support_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- ratings
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  helper_id uuid REFERENCES public.helpers(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_ratings" ON public.ratings;
CREATE POLICY "public_read_ratings" ON public.ratings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_create_ratings" ON public.ratings;
CREATE POLICY "public_create_ratings" ON public.ratings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','helpers')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_notifications" ON public.notifications;
CREATE POLICY "public_read_notifications" ON public.notifications
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_notifications" ON public.notifications;
CREATE POLICY "admin_write_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- bookings table additions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'helper_id') THEN
    ALTER TABLE public.bookings ADD COLUMN helper_id uuid REFERENCES public.helpers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
      CHECK (payment_status IN ('unpaid','pending','paid','refunded'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.bookings ADD COLUMN admin_notes text NOT NULL DEFAULT '';
  END IF;
END $$;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('new','accepted','assigned','on_the_way','in_progress','completed','cancelled'));

DROP POLICY IF EXISTS "operators can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "anon_update_bookings" ON public.bookings;
CREATE POLICY "admin_update_bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

DROP POLICY IF EXISTS "operators can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "anon_delete_bookings" ON public.bookings;
CREATE POLICY "admin_delete_bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

REVOKE INSERT ON public.bookings FROM anon, authenticated;
GRANT INSERT (service_name, service_icon, location, scheduled_date, time_slot,
              customer_name, customer_phone, notes, price)
ON public.bookings TO anon, authenticated;

-- is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- set_booking_status()
CREATE OR REPLACE FUNCTION public.set_booking_status(
  p_booking_id uuid,
  p_status text,
  p_helper_id uuid DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.bookings;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('new','accepted','assigned','on_the_way','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.bookings
    SET status = p_status,
        helper_id = COALESCE(p_helper_id, helper_id),
        payment_status = COALESCE(p_payment_status, payment_status),
        admin_notes = COALESCE(p_admin_notes, admin_notes)
    WHERE id = p_booking_id
    RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_booking_status(uuid,text,uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid,text,uuid,text,text) TO authenticated;

-- admin_upsert_helper()
CREATE OR REPLACE FUNCTION public.admin_upsert_helper(
  p_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_areas text[] DEFAULT '{}',
  p_specialties text[] DEFAULT '{}',
  p_status text DEFAULT 'available'
)
RETURNS public.helpers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.helpers;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.helpers (name, phone, email, areas, specialties, status)
    VALUES (p_name, p_phone, p_email, p_areas, p_specialties, p_status)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.helpers SET name=p_name, phone=p_phone, email=p_email,
      areas=p_areas, specialties=p_specialties, status=p_status, updated_at=now()
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_helper(text,text,uuid,text,text[],text[],text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_helper(text,text,uuid,text,text[],text[],text) TO authenticated;

-- admin_delete_helper()
CREATE OR REPLACE FUNCTION public.admin_delete_helper(p_helper_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.helpers WHERE id = p_helper_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_helper(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_helper(uuid) TO authenticated;

-- admin_upsert_service()
CREATE OR REPLACE FUNCTION public.admin_upsert_service(
  p_name text DEFAULT '',
  p_subtitle text DEFAULT '',
  p_icon_tone text DEFAULT 'blue',
  p_price integer DEFAULT 99,
  p_id uuid DEFAULT NULL,
  p_active boolean DEFAULT true,
  p_sort_order integer DEFAULT 0
)
RETURNS public.services_catalogue
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.services_catalogue;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.services_catalogue (name, subtitle, icon_tone, price, active, sort_order)
    VALUES (p_name, p_subtitle, p_icon_tone, p_price, p_active, p_sort_order)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.services_catalogue SET name=p_name, subtitle=p_subtitle, icon_tone=p_icon_tone,
      price=p_price, active=p_active, sort_order=p_sort_order, updated_at=now()
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_service(text,text,text,integer,uuid,boolean,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_service(text,text,text,integer,uuid,boolean,integer) TO authenticated;

-- admin_delete_service()
CREATE OR REPLACE FUNCTION public.admin_delete_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.services_catalogue WHERE id = p_service_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_service(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_service(uuid) TO authenticated;

-- admin_upsert_package()
CREATE OR REPLACE FUNCTION public.admin_upsert_package(
  p_name text DEFAULT '',
  p_description text DEFAULT '',
  p_price integer DEFAULT 1999,
  p_tasks_included integer DEFAULT 4,
  p_perks text[] DEFAULT '{}',
  p_id uuid DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS public.packages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.packages (name, description, price, tasks_included, perks, active)
    VALUES (p_name, p_description, p_price, p_tasks_included, p_perks, p_active)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.packages SET name=p_name, description=p_description, price=p_price,
      tasks_included=p_tasks_included, perks=p_perks, active=p_active, updated_at=now()
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_package(text,text,integer,integer,text[],uuid,boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_package(text,text,integer,integer,text[],uuid,boolean) TO authenticated;

-- admin_delete_package()
CREATE OR REPLACE FUNCTION public.admin_delete_package(p_package_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.packages WHERE id = p_package_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_package(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_package(uuid) TO authenticated;

-- admin_upsert_promo()
CREATE OR REPLACE FUNCTION public.admin_upsert_promo(
  p_code text DEFAULT '',
  p_discount_percent integer DEFAULT 0,
  p_id uuid DEFAULT NULL,
  p_max_uses integer DEFAULT NULL,
  p_active boolean DEFAULT true,
  p_valid_from timestamptz DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL
)
RETURNS public.promo_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.promo_codes;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.promo_codes (code, discount_percent, max_uses, active, valid_from, valid_until)
    VALUES (upper(p_code), p_discount_percent, p_max_uses, p_active, p_valid_from, p_valid_until)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.promo_codes SET code=upper(p_code), discount_percent=p_discount_percent,
      max_uses=p_max_uses, active=p_active, valid_from=p_valid_from, valid_until=p_valid_until
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_promo(text,integer,uuid,integer,boolean,timestamptz,timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_promo(text,integer,uuid,integer,boolean,timestamptz,timestamptz) TO authenticated;

-- admin_delete_promo()
CREATE OR REPLACE FUNCTION public.admin_delete_promo(p_promo_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.promo_codes WHERE id = p_promo_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_promo(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_promo(uuid) TO authenticated;

-- resolve_support_request()
CREATE OR REPLACE FUNCTION public.resolve_support_request(p_id uuid, p_status text)
RETURNS public.support_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.support_requests;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('open','in_progress','resolved','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.support_requests SET status=p_status, updated_at=now()
  WHERE id=p_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_support_request(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_support_request(uuid,text) TO authenticated;

-- seed_default_services()
CREATE OR REPLACE FUNCTION public.seed_default_services()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.services_catalogue) THEN
    INSERT INTO public.services_catalogue (name, subtitle, icon_tone, price, sort_order) VALUES
      ('Single Errand','Shopping, bills, documents','blue',99,1),
      ('Hospital / Doctor','Accompaniment & assistance','coral',249,2),
      ('Grocery & Medicine','Pickup and home delivery','yellow',149,3),
      ('Government & Online','Forms, bookings, digital help','green',99,4),
      ('Travel & Appointment','Airport, railway, local trips','lavender',399,5),
      ('Home & Personal','Small tasks made easy','peach',99,6),
      ('Digital Assistance','Online payments and forms','mint',99,7),
      ('Family Support','A little extra helping hand','rose',199,8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.packages) THEN
    INSERT INTO public.packages (name, description, price, tasks_included, perks) VALUES
      ('Monthly Family Care','For the little things that keep life moving. Four tasks, one free — plus priority slots when you need us.',1999,4,
       ARRAY['4 tasks included','1 task free','Priority support']);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code='FIRST50') THEN
    INSERT INTO public.promo_codes (code, discount_percent, max_uses, active) VALUES ('FIRST50',50,NULL,true);
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.seed_default_services() FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_default_services() TO authenticated;

SELECT public.seed_default_services();
