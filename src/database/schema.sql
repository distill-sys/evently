
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
DROP FUNCTION IF EXISTS public.get_user_role_distribution();


-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
#variable_conflict use_column
DECLARE
  user_role_value public.user_role;
BEGIN
  -- This SELECT statement runs with the privileges of the function definer,
  -- bypassing the RLS of the calling user for this specific query.
  SELECT u.role INTO user_role_value FROM public.users AS u WHERE u.auth_user_id = auth.uid();
  RETURN COALESCE(user_role_value = 'admin', FALSE);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN FALSE; -- User not found or no role, not an admin
  WHEN TOO_MANY_ROWS THEN -- Should not happen if auth_user_id is unique
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;


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

-- Policy 1: Allow all authenticated users to read events (public read access)
CREATE POLICY "Allow authenticated users to read events"
ON public.events
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow organizers to create events
CREATE POLICY "Allow organizers to create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  organizer_id = auth.uid() AND
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer'
);

-- Policy 3: Allow organizers to manage (read, update, delete) their own events
CREATE POLICY "Allow organizers to manage their own events"
ON public.events
FOR ALL -- Covers SELECT, UPDATE, DELETE
TO authenticated
USING (
  organizer_id = auth.uid() AND
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer'
)
WITH CHECK (
  organizer_id = auth.uid() AND
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'organizer'
);

-- Policy 4: Admins have full access to events
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
