
-- Create user_role enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('attendee', 'organizer', 'admin');
    END IF;
END$$;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'attendee',
    organization_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create venues table
CREATE TABLE IF NOT EXISTS public.venues (
    venue_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    created_by UUID REFERENCES public.users(auth_user_id) ON DELETE SET NULL, -- Admin user who created it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL, -- Changed to DATE type for YYYY-MM-DD
    time TEXT NOT NULL, -- e.g., "10:00 AM - 5:00 PM"
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    ticket_price_range TEXT, -- e.g., "$20 - $50" or "Free"
    image_url TEXT,
    organizer_id UUID REFERENCES public.users(auth_user_id) ON DELETE CASCADE, -- Foreign Key to users table
    venue_id UUID REFERENCES public.venues(venue_id) ON DELETE SET NULL, -- Optional link to a venue
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- FUNCTIONS for RLS and Triggers
-- =============================================

-- Helper function to check if the current user is an admin
-- Ensure this function is owned by a superuser (e.g., postgres or supabase_admin)
-- or a role that has BYPASSRLS attribute to break RLS recursion.
DROP FUNCTION IF EXISTS public.is_admin(); -- Drop if exists to ensure clean re-creation
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  -- Explicitly schema-qualify the table and ensure no ambiguous column references.
  -- This query runs with the privileges of the function definer.
  SELECT (public.users.role = 'admin')
  INTO v_is_admin
  FROM public.users
  WHERE public.users.auth_user_id = auth.uid();

  -- If no row is found (auth.uid() not in users table or role is null), v_is_admin will be NULL.
  -- Coalesce NULL to FALSE.
  RETURN COALESCE(v_is_admin, false);
EXCEPTION
  WHEN OTHERS THEN -- Catch any unexpected errors during the select
    RAISE WARNING 'Error in is_admin function: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- STABLE: Indicates the function cannot modify the database and always
--         produces the same results for the same argument values within a single
--         statement. This can help the query planner.
-- SECURITY DEFINER: The function is to be executed with the privileges
--                   of the user that created it.

-- Grant necessary permissions for is_admin
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;


-- Function to update updated_at column for users table
DROP FUNCTION IF EXISTS public.handle_user_updated_at();
CREATE OR REPLACE FUNCTION public.handle_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user update
DROP TRIGGER IF EXISTS on_user_updated ON public.users;
CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated_at();


-- Function to update updated_at column for venues table
DROP FUNCTION IF EXISTS public.handle_venue_updated_at();
CREATE OR REPLACE FUNCTION public.handle_venue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on venue update
DROP TRIGGER IF EXISTS on_venue_updated ON public.venues;
CREATE TRIGGER on_venue_updated
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_venue_updated_at();


-- Function to update updated_at column for events table
DROP FUNCTION IF EXISTS public.handle_event_updated_at();
CREATE OR REPLACE FUNCTION public.handle_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on event update
DROP TRIGGER IF EXISTS on_event_updated ON public.events;
CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_event_updated_at();

-- Function to get user role distribution for analytics
DROP FUNCTION IF EXISTS public.get_user_role_distribution();
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE(role public.user_role, user_count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT u.role, count(u.auth_user_id)
    FROM public.users u
    GROUP BY u.role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated; -- Or specific admin role if created
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO service_role;


-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- --- Users Table RLS ---
-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Policy: Admins can manage (view, insert, update, delete) all user profiles
DROP POLICY IF EXISTS "Admins can manage all user profiles" ON public.users;
DROP POLICY IF EXISTS "Allow admins to manage all user profiles" ON public.users; -- old name
CREATE POLICY "Admins can manage all user profiles"
ON public.users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- --- Venues Table RLS ---
-- Policy: Admins can do anything on venues
DROP POLICY IF EXISTS "Allow admins full access on venues" ON public.venues;
CREATE POLICY "Allow admins full access on venues"
ON public.venues
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy: Authenticated users can view venues
DROP POLICY IF EXISTS "Allow authenticated users to read venues" ON public.venues;
CREATE POLICY "Allow authenticated users to read venues"
ON public.venues
FOR SELECT
TO authenticated
USING (true); -- Or more restrictive if needed, e.g., only organizers


-- --- Events Table RLS ---
-- Policy: Public can view events (assuming events are generally public)
DROP POLICY IF EXISTS "Allow public read access on events" ON public.events;
CREATE POLICY "Allow public read access on events"
ON public.events
FOR SELECT
TO anon, authenticated -- Allows both anonymous and authenticated users
USING (true);

-- Policy: Organizers can manage their own events
DROP POLICY IF EXISTS "Allow organizers to manage their own events" ON public.events;
CREATE POLICY "Allow organizers to manage their own events"
ON public.events
FOR ALL -- Covers INSERT, SELECT, UPDATE, DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND
  organizer_id = auth.uid() -- For existing events
)
WITH CHECK (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND
  organizer_id = auth.uid() -- For new/updated events
);

-- Policy: Admins can do anything on events
DROP POLICY IF EXISTS "Allow admins full access on events" ON public.events;
CREATE POLICY "Allow admins full access on events"
ON public.events
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Seed Data (Optional - uncomment to add some initial data if needed)
/*
-- Example: Add a default admin user (replace with your actual admin user's auth_user_id and email after they sign up)
-- This needs to be run AFTER the user exists in auth.users
-- INSERT INTO public.users (auth_user_id, email, name, role)
-- VALUES ('your-admin-auth-uuid', 'admin@example.com', 'Admin User', 'admin')
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- Example: Add a default organizer user
-- INSERT INTO public.users (auth_user_id, email, name, role, organization_name, bio)
-- VALUES ('your-organizer-auth-uuid', 'organizer@example.com', 'Event Organizer Pro', 'organizer', 'Pro Events LLC', 'We host the best events.')
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- Example: Add a default venue (assuming an admin or specific user created it)
-- INSERT INTO public.venues (name, address, city, country, capacity, created_by)
-- VALUES ('The Grand Hall', '123 Main St', 'Metropolis', 'USA', 500, 'your-admin-auth-uuid');

-- Example: Add a default event (assuming an organizer created it)
-- INSERT INTO public.events (title, description, date, time, location, category, organizer_id)
-- VALUES ('Annual Tech Conference', 'Join us for the latest in tech.', '2024-12-01', '9:00 AM - 5:00 PM', 'Metropolis', 'Technology', 'your-organizer-auth-uuid');
*/
