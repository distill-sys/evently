
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('attendee', 'organizer', 'admin')),
  organization_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL, -- e.g., "10:00 AM - 5:00 PM"
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  ticket_price_range TEXT NOT NULL, -- e.g., "$20 - $50" or "Free"
  image_url TEXT,
  organizer_id UUID REFERENCES users(auth_user_id) ON DELETE SET NULL, -- Link to users table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_payment_methods table (Example, adjust as needed)
-- This is a simplified example. In a real app, you'd use a payment gateway's tokenization.
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  payment_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
  card_type TEXT, -- e.g., "Visa", "Mastercard"
  last4 TEXT, -- Last 4 digits of the card
  expiry_date TEXT, -- "MM/YY"
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies
-- Allow public read access to events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to events" ON events FOR SELECT USING (true);

-- Allow public read access to user profiles (organizers)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to user profiles" ON users FOR SELECT USING (true);

-- Allow users to manage their own profile
CREATE POLICY "Allow users to update their own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to insert their own profile after signup
CREATE POLICY "Allow users to insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Allow authenticated users to manage their own payment methods
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own payment methods" ON saved_payment_methods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for 'users' table
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger for 'events' table
CREATE TRIGGER set_timestamp_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Sample Data (Ensure these UUIDs for auth_user_id exist in your auth.users table after signup)
-- Or, replace with actual UUIDs from your Supabase auth.users table.
-- For this example, we'll use placeholders and assume you will replace them or create users with these details.

-- To get actual auth_user_ids, sign up users via the app or Supabase dashboard,
-- then query `select id, email from auth.users;`
-- and replace 'auth-user-attendee1', 'auth-user-org1', etc. with real UUIDs.

-- Sample Organizers (replace with actual auth_user_id after creating these users via auth)
-- Example: If you sign up an organizer with 'organizer1@example.com'
-- And their auth.users.id is 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
-- Then use that UUID for auth_user_id below.

-- Let's assume you've signed up these users and obtained their auth.users IDs:
-- organizer1@example.com -> auth_user_id: '00000000-0000-0000-0000-000000000001' (Replace with actual)
-- organizer2@example.com -> auth_user_id: '00000000-0000-0000-0000-000000000002' (Replace with actual)
-- organizer3@example.com -> auth_user_id: '00000000-0000-0000-0000-000000000003' (Replace with actual)

-- To make this script runnable, you might need to create these auth users first,
-- or temporarily disable the foreign key constraint if inserting dummy profiles without matching auth users.
-- For this script, we'll provide example UUIDs. YOU MUST REPLACE THEM WITH ACTUAL AUTH.USERS IDs.
-- Consider these as placeholders.

-- Insert sample users (Organizers)
-- Replace these placeholder UUIDs with actual auth_user_id from your Supabase auth.users table
DO $$
DECLARE
    org1_auth_id UUID := '00000000-0000-0000-0000-000000000001'; -- Replace!
    org2_auth_id UUID := '00000000-0000-0000-0000-000000000002'; -- Replace!
    org3_auth_id UUID := '00000000-0000-0000-0000-000000000003'; -- Replace!
BEGIN
    -- Check if users exist to avoid error if script is run multiple times.
    -- This requires a Supabase user with these emails/IDs to be created via the Auth system first.
    -- For a fresh setup, you would run the auth user creation, then get their IDs, then run this.

    -- Upsert Organizer 1
    INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
    VALUES (org1_auth_id, 'organizer1@example.com', 'Tech Conferences Global', 'organizer', 'TechCon Global', 'Leading organizers of premier technology conferences.', 'https://placehold.co/100x100.png')
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        organization_name = EXCLUDED.organization_name,
        bio = EXCLUDED.bio,
        profile_picture_url = EXCLUDED.profile_picture_url,
        updated_at = NOW();

    -- Upsert Organizer 2
    INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
    VALUES (org2_auth_id, 'organizer2@example.com', 'SoundWave Festivals', 'organizer', 'SoundWave Fests', 'Bringing you the best music festivals with top artists.', 'https://placehold.co/100x100.png')
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        organization_name = EXCLUDED.organization_name,
        bio = EXCLUDED.bio,
        profile_picture_url = EXCLUDED.profile_picture_url,
        updated_at = NOW();

    -- Upsert Organizer 3
    INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
    VALUES (org3_auth_id, 'organizer3@example.com', 'Art & Culture Now', 'organizer', 'ArtCulture Now', 'Curators of fine art exhibitions and cultural showcases.', 'https://placehold.co/100x100.png')
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        organization_name = EXCLUDED.organization_name,
        bio = EXCLUDED.bio,
        profile_picture_url = EXCLUDED.profile_picture_url,
        updated_at = NOW();

    -- Insert sample events, referencing the organizer_id placeholders
    -- If an event with the same title and date by the same organizer exists, update it.
    INSERT INTO events (title, description, date, time, location, category, ticket_price_range, image_url, organizer_id)
    VALUES
      ('Global Tech Summit 2024', 'Join industry leaders and innovators to discuss the latest trends in technology.', '2024-10-15', '9:00 AM - 5:00 PM', 'San Francisco, CA', 'Technology', '$299 - $799', 'https://placehold.co/600x400.png', org1_auth_id),
      ('Summer Sounds Music Festival', 'An outdoor music festival featuring top international artists and bands.', '2024-07-20', '12:00 PM - 11:00 PM', 'Central Park, New York', 'Music', '$75 - $150', 'https://placehold.co/600x400.png', org2_auth_id),
      ('Modern Art Exhibition', 'A curated collection of modern art from emerging and established artists.', '2024-09-05', '10:00 AM - 6:00 PM', 'City Art Gallery, London', 'Arts & Culture', 'Free - $25', 'https://placehold.co/600x400.png', org3_auth_id),
      ('AI in Business Conference', 'Explore the practical applications of AI in various business sectors.', '2024-11-10', '9:30 AM - 4:30 PM', 'Online', 'Technology', '$99 - $199', 'https://placehold.co/600x400.png', org1_auth_id),
      ('Indie Rock Showcase', 'Discover the best new indie rock bands in an intimate venue setting.', '2024-08-15', '7:00 PM - 11:00 PM', 'The Underground Venue, Chicago', 'Music', '$20 - $35', 'https://placehold.co/600x400.png', org2_auth_id),
      ('Photography Masterclass', 'Learn advanced photography techniques from a renowned professional photographer.', '2024-09-22', '1:00 PM - 5:00 PM', 'Creative Studio Hub, Berlin', 'Workshop', '$150', 'https://placehold.co/600x400.png', org3_auth_id),
      ('Startup Pitch Night', 'Watch innovative startups pitch their ideas to a panel of investors.', '2024-10-01', '6:00 PM - 9:00 PM', 'Innovation Hub, Austin', 'Business', 'Free (RSVP Required)', 'https://placehold.co/600x400.png', org1_auth_id),
      ('Jazz Evening by the River', 'Relax to smooth jazz tunes under the stars.', '2024-08-25', '7:30 PM - 10:00 PM', 'Riverside Amphitheater, New Orleans', 'Music', '$30', 'https://placehold.co/600x400.png', org2_auth_id),
      ('Culinary Arts Festival', 'Taste dishes from world-renowned chefs and local culinary talents.', '2024-11-02', '11:00 AM - 8:00 PM', 'Grand Food Park, Paris', 'Food & Drink', '$50 (All Access)', 'https://placehold.co/600x400.png', org3_auth_id),
      ('Web Development Bootcamp Finale', 'See the final projects from our latest cohort of web developers.', '2024-12-05', '2:00 PM - 5:00 PM', 'Tech Training Center, Seattle', 'Education', 'Free', 'https://placehold.co/600x400.png', org1_auth_id)
    ON CONFLICT (title, date, organizer_id) DO UPDATE SET
        description = EXCLUDED.description,
        time = EXCLUDED.time,
        location = EXCLUDED.location,
        category = EXCLUDED.category,
        ticket_price_range = EXCLUDED.ticket_price_range,
        image_url = EXCLUDED.image_url,
        updated_at = NOW();
END $$;


-- Note on `auth_user_id` placeholders:
-- For this script to fully work, you need to:
-- 1. Sign up three users in your Supabase application that will serve as organizers.
--    (e.g., organizer1@example.com, organizer2@example.com, organizer3@example.com)
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Run `SELECT id, email FROM auth.users;`
-- 4. Copy the `id` (UUID) for each of these organizer users.
-- 5. Replace the placeholder UUIDs (e.g., '00000000-0000-0000-0000-000000000001') in the `DO $$ ... END $$;` block above
--    with the actual UUIDs you copied.
-- 6. Then, run this entire SQL script.
-- This ensures that the `organizer_id` in the `events` table correctly references actual authenticated users.
-- The `ON CONFLICT` clauses are added to make the script idempotent for easier re-running.
