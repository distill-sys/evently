-- Supabase SQL schema for Evently

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom type for user roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('attendee', 'organizer', 'admin');
    END IF;
END$$;

-- Function to set updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- USERS Table
CREATE TABLE IF NOT EXISTS public.users (
  auth_user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'attendee',
  organization_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores user profile information, extending auth.users.';
COMMENT ON COLUMN public.users.auth_user_id IS 'Links to the corresponding user in Supabase auth.';

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- VENUES Table
CREATE TABLE IF NOT EXISTS public.venues (
  venue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_province TEXT,
  country TEXT NOT NULL,
  capacity INTEGER,
  description TEXT,
  amenities TEXT[], -- Array of strings
  contact_email TEXT,
  contact_phone TEXT,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id), -- Admin/System user who created it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.venues IS 'Stores information about event venues.';
COMMENT ON COLUMN public.venues.amenities IS 'List of amenities, e.g., {"WiFi", "Projector", "Parking"}.';
COMMENT ON COLUMN public.venues.created_by IS 'User ID of the admin who created the venue.';

-- Trigger for venues updated_at
DROP TRIGGER IF EXISTS set_venues_updated_at ON public.venues;
CREATE TRIGGER set_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- EVENTS Table
CREATE TABLE IF NOT EXISTS public.events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(venue_id) ON DELETE SET NULL, -- Optional link to a venue
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT,
  location TEXT, -- Used if no venue_id, or for specific instructions
  category TEXT,
  ticket_price_range TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.events IS 'Stores information about events.';
COMMENT ON COLUMN public.events.organizer_id IS 'User ID of the organizer who created the event.';
COMMENT ON COLUMN public.events.venue_id IS 'Optional foreign key to the venues table. If NULL, the event may be online or use the location field directly.';
COMMENT ON COLUMN public.events.location IS 'Can be specific address if no venue, or "Online", or further details about venue location.';


-- Trigger for events updated_at
DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- SAVED_CARDS Table (Example structure - use a real PCI compliant solution for payments)
-- For demo purposes, actual card details are NOT stored.
CREATE TABLE IF NOT EXISTS public.saved_cards (
  card_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  last4 TEXT NOT NULL,
  expiry_date TEXT NOT NULL, -- e.g., "MM/YY"
  card_type TEXT, -- e.g., "Visa", "Mastercard"
  -- DO NOT STORE FULL CARD NUMBER OR CVV IN A REAL APP WITHOUT PCI COMPLIANCE
  -- This table is for mock display purposes only.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.saved_cards IS 'Mock table for displaying saved card information. Not for production use with real card data.';


-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
#variable_conflict use_column
DECLARE
  user_role_value public.user_role;
BEGIN
  SELECT u.role INTO user_role_value FROM public.users AS u WHERE u.auth_user_id = auth.uid();
  RETURN COALESCE(user_role_value = 'admin', FALSE);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN FALSE;
  WHEN TOO_MANY_ROWS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Helper function to check if the current user is an organizer
CREATE OR REPLACE FUNCTION public.is_organizer()
RETURNS boolean AS $$
#variable_conflict use_column
DECLARE
  user_role_value public.user_role;
BEGIN
  SELECT u.role INTO user_role_value FROM public.users AS u WHERE u.auth_user_id = auth.uid();
  RETURN COALESCE(user_role_value = 'organizer', FALSE);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN FALSE;
  WHEN TOO_MANY_ROWS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_organizer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer() TO service_role;


-- RLS POLICIES
-- Enable RLS for all relevant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;


-- USERS Table RLS
DROP POLICY IF EXISTS "Allow individual users to read their own profile" ON public.users;
CREATE POLICY "Allow individual users to read their own profile"
ON public.users FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Allow individual users to update their own profile" ON public.users;
CREATE POLICY "Allow individual users to update their own profile"
ON public.users FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id AND role = (SELECT r.role FROM public.users r WHERE r.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.users;
CREATE POLICY "Allow users to insert their own profile"
ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can SELECT all user profiles" ON public.users;
CREATE POLICY "Admins can SELECT all user profiles"
ON public.users FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can UPDATE all user profiles" ON public.users;
CREATE POLICY "Admins can UPDATE all user profiles"
ON public.users FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can INSERT user profiles" ON public.users;
CREATE POLICY "Admins can INSERT user profiles"
ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can DELETE user profiles" ON public.users;
CREATE POLICY "Admins can DELETE user profiles"
ON public.users FOR DELETE TO authenticated USING (public.is_admin());


-- VENUES Table RLS
DROP POLICY IF EXISTS "Allow authenticated users to read venues" ON public.venues;
CREATE POLICY "Allow authenticated users to read venues"
ON public.venues FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins full access on venues" ON public.venues;
CREATE POLICY "Allow admins full access on venues"
ON public.venues FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- EVENTS Table RLS
DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
CREATE POLICY "Allow authenticated users to read events"
ON public.events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins full access on events" ON public.events;
CREATE POLICY "Allow admins full access on events"
ON public.events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow organizers to create events" ON public.events;
CREATE POLICY "Allow organizers to create events"
ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_organizer() AND auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Allow organizers to manage their own events" ON public.events;
CREATE POLICY "Allow organizers to manage their own events"
ON public.events FOR ALL TO authenticated USING (public.is_organizer() AND auth.uid() = organizer_id)
WITH CHECK (public.is_organizer() AND auth.uid() = organizer_id);


-- SAVED_CARDS Table RLS (Example - very restrictive)
DROP POLICY IF EXISTS "Users can manage their own saved cards" ON public.saved_cards;
CREATE POLICY "Users can manage their own saved cards"
ON public.saved_cards FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Function for user role distribution analytics
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE(role public.user_role, user_count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT u.role, COUNT(u.auth_user_id) as user_count
    FROM public.users u
    GROUP BY u.role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO service_role;

-- Ensure the schema is applied
SELECT pg_catalog.set_config('search_path', 'public', false);
```