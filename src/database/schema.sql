-- Create user_role type if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'attendee',
            'organizer',
            'admin'
        );
    END IF;
END$$;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role public.user_role NOT NULL,
    organization_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    ticket_price_range TEXT NOT NULL,
    image_url TEXT,
    organizer_id UUID REFERENCES public.users(auth_user_id) ON DELETE SET NULL, -- Event can exist even if organizer is deleted
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
    created_by UUID REFERENCES public.users(auth_user_id), -- Admin who created it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for users table
CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Triggers for events table
CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Triggers for venues table
CREATE TRIGGER on_venue_updated
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for users table
-- Allow users to read their own profile
CREATE POLICY "Allow users to read their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Allow admins to read all user profiles
CREATE POLICY "Allow admins to read all user profiles"
ON public.users
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin');

-- Allow admins to update all user profiles
CREATE POLICY "Allow admins to update all user profiles"
ON public.users
FOR UPDATE
TO authenticated
USING ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin');


-- RLS Policies for events table
-- Allow public read access to events
CREATE POLICY "Allow public read access to events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Allow organizers to create events
CREATE POLICY "Allow organizers to create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND organizer_id = auth.uid());

-- Allow organizers to update their own events
CREATE POLICY "Allow organizers to update their own events"
ON public.events
FOR UPDATE
TO authenticated
USING ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer' AND organizer_id = auth.uid());

-- Allow admins to manage all events
CREATE POLICY "Allow admins to manage all events"
ON public.events
FOR ALL
TO authenticated
USING ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin');


-- RLS Policies for venues table
-- Admins can do anything
CREATE POLICY "Allow admins full access on venues"
ON public.venues
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
);

-- Authenticated users can view venues (e.g., for organizers or other roles to see them when creating events)
CREATE POLICY "Allow authenticated users to read venues"
ON public.venues
FOR SELECT
TO authenticated
USING (true);


-- SQL function to get user role distribution
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE(role public.user_role, user_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.role,
        COUNT(u.auth_user_id) AS user_count
    FROM
        public.users u
    GROUP BY
        u.role;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execution rights for the function
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated;


-- Seed Data (Optional: Add some initial data for testing)
-- Example: Create a dummy admin user if one doesn't exist for RLS testing.
-- This part is highly dependent on your setup and might need manual execution or adjustment.
-- INSERT INTO public.users (auth_user_id, email, name, role)
-- VALUES ('your_auth_user_id_for_admin', 'admin@example.com', 'Admin User', 'admin')
-- ON CONFLICT (auth_user_id) DO NOTHING;
