
-- Create user_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('attendee', 'organizer', 'admin');
    END IF;
END$$;

-- Create users table to store public user data
CREATE TABLE IF NOT EXISTS public.users (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    name TEXT,
    role public.user_role DEFAULT 'attendee',
    organization_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.handle_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_user_updated' AND tgrelid = 'public.users'::regclass
    ) THEN
        CREATE TRIGGER on_user_updated
          BEFORE UPDATE ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_user_updated_at();
    END IF;
END$$;

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  -- This SELECT statement runs with the privileges of the function definer,
  -- bypassing the RLS of the calling user for this specific query.
  SELECT role INTO user_role_value FROM public.users WHERE auth_user_id = auth.uid();
  RETURN user_role_value = 'admin';
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN FALSE; -- User not found or no role, not an admin
  WHEN TOO_MANY_ROWS THEN
    RETURN FALSE; -- Should not happen if auth_user_id is unique
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role; -- Grant to service_role as well for backend/trigger usage if needed


-- Policies for users table
-- Users can read their own profile
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.users;
CREATE POLICY "Allow users to read their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
CREATE POLICY "Allow users to update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Admins can manage all user profiles (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow admins to manage all user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all user profiles" ON public.users; -- Drop by new name too, just in case
CREATE POLICY "Admins can manage all user profiles"
ON public.users
FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (
  public.is_admin() -- True if the current session's user is an admin
)
WITH CHECK (
  public.is_admin() -- Ensure consistency for write operations by admins
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
    created_by UUID REFERENCES public.users(auth_user_id), -- Can be null if admin system not tied to a user, or points to an admin user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at column for venues
CREATE OR REPLACE FUNCTION public.handle_venue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on venue update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_venue_updated' AND tgrelid = 'public.venues'::regclass
    ) THEN
        CREATE TRIGGER on_venue_updated
          BEFORE UPDATE ON public.venues
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_venue_updated_at();
    END IF;
END$$;

-- Enable RLS for venues table
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Policies for venues table
-- Admins can do anything on venues
DROP POLICY IF EXISTS "Allow admins full access on venues" ON public.venues;
CREATE POLICY "Allow admins full access on venues"
ON public.venues
FOR ALL
TO authenticated
USING (
  public.is_admin() -- Use the same helper function
)
WITH CHECK (
  public.is_admin()
);

-- Authenticated users can view venues (e.g., for organizers to see them when creating events, attendees to see event details)
DROP POLICY IF EXISTS "Allow authenticated users to read venues" ON public.venues;
CREATE POLICY "Allow authenticated users to read venues"
ON public.venues
FOR SELECT
TO authenticated
USING (true);


-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL, -- Store as DATE for easier date-based filtering
    time TEXT NOT NULL, -- e.g., "10:00 AM - 5:00 PM"
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    ticket_price_range TEXT, -- e.g., "$20 - $50" or "Free"
    image_url TEXT,
    organizer_id UUID REFERENCES public.users(auth_user_id) ON DELETE SET NULL, -- Event remains if organizer is deleted
    venue_id UUID REFERENCES public.venues(venue_id) ON DELETE SET NULL, -- Event can remain if venue is deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at column for events
CREATE OR REPLACE FUNCTION public.handle_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on event update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_event_updated' AND tgrelid = 'public.events'::regclass
    ) THEN
        CREATE TRIGGER on_event_updated
          BEFORE UPDATE ON public.events
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_event_updated_at();
    END IF;
END$$;


-- Enable RLS for events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for events table
-- Organizers can create events
DROP POLICY IF EXISTS "Allow organizers to create events" ON public.events;
CREATE POLICY "Allow organizers to create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND
  organizer_id = auth.uid() -- Ensure they can only create events for themselves
);

-- Organizers can view, update, and delete their own events
DROP POLICY IF EXISTS "Allow organizers to manage their own events" ON public.events;
CREATE POLICY "Allow organizers to manage their own events"
ON public.events
FOR ALL -- Covers SELECT, UPDATE, DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND
  organizer_id = auth.uid()
)
WITH CHECK ( -- For UPDATE
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND
  organizer_id = auth.uid()
);

-- Admins can manage all events
DROP POLICY IF EXISTS "Allow admins full access on events" ON public.events;
CREATE POLICY "Allow admins full access on events"
ON public.events
FOR ALL
TO authenticated
USING (
  public.is_admin() -- Use the same helper function
)
WITH CHECK (
  public.is_admin()
);

-- All authenticated users (including attendees) can view all events
DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
CREATE POLICY "Allow authenticated users to read events"
ON public.events
FOR SELECT
TO authenticated
USING (true);


-- RPC function for user role distribution
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE (role public.user_role, user_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.role, COUNT(u.auth_user_id) as user_count
  FROM public.users u
  GROUP BY u.role;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO service_role;

-- Ensure the `user_role` enum includes 'unknown' or handle NULL roles if they can occur
-- If roles can be NULL, the get_user_role_distribution function might need adjustment
-- For now, assuming 'role' in users table is NOT NULL and always one of the defined enum values.

-- Mock data insertion (Optional, for testing)
-- You might want to run this separately after tables and RLS are set up.
-- Ensure you have auth users created in Supabase Auth that match these UUIDs if you use them.
-- Comment out if not needed or if you handle mock data via application logic.

/*
-- Example: Inserting a user manually (ensure this auth_user_id exists in auth.users)
-- You'd typically sign up a user through the app/Supabase Auth to get an ID.
-- INSERT INTO public.users (auth_user_id, email, name, role)
-- VALUES ('your-auth-user-id-here', 'admin@example.com', 'Admin User', 'admin')
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- INSERT INTO public.users (auth_user_id, email, name, role)
-- VALUES ('another-auth-user-id', 'organizer@example.com', 'Event Organizer Pro', 'organizer')
-- ON CONFLICT (auth_user_id) DO NOTHING;

-- INSERT INTO public.users (auth_user_id, email, name, role)
-- VALUES ('yet-another-auth-user-id', 'attendee@example.com', 'Regular Attendee', 'attendee')
-- ON CONFLICT (auth_user_id) DO NOTHING;
*/
