-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User roles ENUM type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('attendee', 'organizer', 'admin');
    END IF;
END$$;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  auth_user_id UUID PRIMARY KEY DEFAULT auth.uid(), -- Links to Supabase auth.users.id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'attendee',
  organization_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table
CREATE TABLE IF NOT EXISTS public.venues (
  venue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_by UUID REFERENCES public.users(auth_user_id) ON DELETE SET NULL, -- Admin who created it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL, -- Can be a physical address or "Online"
  category TEXT NOT NULL,
  ticket_price_range TEXT NOT NULL,
  image_url TEXT,
  organizer_id UUID REFERENCES public.users(auth_user_id) ON DELETE CASCADE, -- Organizer who created it
  venue_id UUID REFERENCES public.venues(venue_id) ON DELETE SET NULL, -- Optional link to a venue
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN public.events.location IS 'Physical address, name of a place, or "Online" if virtual.';
COMMENT ON COLUMN public.events.venue_id IS 'Optional foreign key to the venues table. If NULL, the event may be online or use the location field directly.';


-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for 'updated_at'
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'venues', 'events')
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'set_timestamp_trigger' AND tgrelid = tbl_name::regclass
    ) THEN
      EXECUTE format('CREATE TRIGGER set_timestamp_trigger
                      BEFORE UPDATE ON public.%I
                      FOR EACH ROW
                      EXECUTE FUNCTION trigger_set_timestamp();', tbl_name);
    END IF;
  END LOOP;
END $$;


-- RLS POLICIES AND HELPER FUNCTIONS

-- Drop existing policies and function if they exist to ensure a clean state
DROP POLICY IF EXISTS "Allow admins to manage all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can SELECT all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can UPDATE all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can INSERT user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can DELETE user profiles" ON public.users;
DROP POLICY IF EXISTS "Allow individual users to read their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow individual users to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.users;


DROP POLICY IF EXISTS "Allow admins full access on venues" ON public.venues;
DROP POLICY IF EXISTS "Allow authenticated users to read venues" ON public.venues;

DROP POLICY IF EXISTS "Allow admins full access on events" ON public.events;
DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
DROP POLICY IF EXISTS "Allow organizers to create events" ON public.events;
DROP POLICY IF EXISTS "Allow organizers to manage their own events" ON public.events;


DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_organizer();
DROP FUNCTION IF EXISTS public.get_user_role_distribution();


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


-- USERS TABLE RLS POLICIES

CREATE POLICY "Allow individual users to read their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
);

CREATE POLICY "Allow individual users to update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
)
WITH CHECK (
  auth.uid() = auth_user_id
  AND role = (SELECT r.role FROM public.users r WHERE r.auth_user_id = auth.uid()) -- Prevent user from changing their own role
);

CREATE POLICY "Allow users to insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = auth_user_id
);

CREATE POLICY "Admins can SELECT all user profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

CREATE POLICY "Admins can UPDATE all user profiles"
ON public.users
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

CREATE POLICY "Admins can INSERT user profiles" -- For admins creating other users
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

CREATE POLICY "Admins can DELETE user profiles"
ON public.users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);


-- VENUES TABLE RLS POLICIES

CREATE POLICY "Allow authenticated users to read venues"
ON public.venues
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins full access on venues"
ON public.venues
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- EVENTS TABLE RLS POLICIES

CREATE POLICY "Allow authenticated users to read events"
ON public.events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins full access on events"
ON public.events
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

CREATE POLICY "Allow organizers to create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_organizer() AND auth.uid() = organizer_id
);

CREATE POLICY "Allow organizers to manage their own events"
ON public.events
FOR ALL -- Covers SELECT, UPDATE, DELETE for their own events
TO authenticated
USING (
  public.is_organizer() AND auth.uid() = organizer_id
)
WITH CHECK (
  public.is_organizer() AND auth.uid() = organizer_id
);


-- SQL function to get user role distribution
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

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
