
-- Users Table
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

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  ticket_price_range TEXT NOT NULL,
  image_url TEXT,
  organizer_id UUID REFERENCES users(auth_user_id) ON DELETE SET NULL, -- Or ON DELETE CASCADE if events should be removed if organizer is deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues Table
CREATE TABLE IF NOT EXISTS venues (
  venue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_province TEXT,
  country TEXT NOT NULL,
  capacity INTEGER,
  description TEXT,
  amenities TEXT[], -- Array of strings for amenities
  contact_email TEXT,
  contact_phone TEXT,
  image_url TEXT,
  created_by UUID REFERENCES users(auth_user_id) ON DELETE SET NULL, -- Admin who added the venue
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- RLS Policies (Example for users table, adapt as needed for others)
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to users table
CREATE POLICY "Public read access to users" ON users
  FOR SELECT USING (true);

-- Policy: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow public read access to events
CREATE POLICY "Public read access to events" ON events
  FOR SELECT USING (true);

-- Policy: Allow authenticated users (organizers) to insert events
CREATE POLICY "Organizers can insert events" ON events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'organizer') AND
    organizer_id = auth.uid()
  );

-- Policy: Allow organizers to update their own events
CREATE POLICY "Organizers can update their own events" ON events
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'organizer') AND
    organizer_id = auth.uid()
  ) WITH CHECK (organizer_id = auth.uid());

-- Policy: Allow organizers to delete their own events
CREATE POLICY "Organizers can delete their own events" ON events
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'organizer') AND
    organizer_id = auth.uid()
  );

-- Policy: Allow public read access to venues
CREATE POLICY "Public read access to venues" ON venues
  FOR SELECT USING (true);

-- Policy: Allow admins to insert venues
CREATE POLICY "Admins can insert venues" ON venues
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin') AND
    created_by = auth.uid()
  );

-- Policy: Allow admins to update venues
CREATE POLICY "Admins can update venues" ON venues
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin')
  ); -- No specific check on who created it, admins can update any.

-- Policy: Allow admins to delete venues
CREATE POLICY "Admins can delete venues" ON venues
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin')
  );


-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for 'users' table
DROP TRIGGER IF EXISTS set_users_timestamp ON users;
CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger for 'events' table
DROP TRIGGER IF EXISTS set_events_timestamp ON events;
CREATE TRIGGER set_events_timestamp
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger for 'venues' table
DROP TRIGGER IF EXISTS set_venues_timestamp ON venues;
CREATE TRIGGER set_venues_timestamp
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Sample Data (Illustrative - replace UUIDs with actual ones after user creation)
-- Note: auth_user_id must match an existing id in auth.users table.
-- For testing, sign up users first, get their UUIDs, then insert/update here.

-- Upsert sample users (admin, organizer, attendee)
INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@evently.com', 'Admin User', 'admin', NULL, 'Platform administrator.', 'https://placehold.co/100x100.png?text=Admin'),
  ('00000000-0000-0000-0000-000000000002', 'organizer@evently.com', 'Tech Events Inc.', 'organizer', 'Tech Events Global', 'Leading organizers of premier technology conferences.', 'https://placehold.co/100x100.png?text=Org1'),
  ('00000000-0000-0000-0000-000000000003', 'musicfest@evently.com', 'Music Fest Group', 'organizer', 'Music Festivals Co.', 'Bringing you the best music festivals.', 'https://placehold.co/100x100.png?text=Org2'),
  ('00000000-0000-0000-0000-000000000004', 'attendee@evently.com', 'John Doe', 'attendee', NULL, 'Event enthusiast.', 'https://placehold.co/100x100.png?text=User')
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_name = EXCLUDED.organization_name,
  bio = EXCLUDED.bio,
  profile_picture_url = EXCLUDED.profile_picture_url,
  updated_at = NOW();


-- Upsert sample events
INSERT INTO events (event_id, title, description, date, time, location, category, ticket_price_range, image_url, organizer_id)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Global Tech Summit 2024', 'Join industry leaders and innovators to discuss the latest trends in technology.', '2024-10-15', '9:00 AM - 5:00 PM', 'San Francisco, CA', 'Technology', '$299 - $799', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000002'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Summer Sounds Music Festival', 'An outdoor music festival featuring top international artists and bands.', '2024-07-20', '12:00 PM - 11:00 PM', 'Central Park, New York', 'Music', '$75 - $150', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000003'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Modern Art Exhibition', 'A curated collection of modern art from emerging and established artists.', '2024-09-05', '10:00 AM - 6:00 PM', 'City Art Gallery, London', 'Arts & Culture', 'Free - $25', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000003'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'AI in Business Conference', 'Explore the practical applications of AI in various business sectors.', '2024-11-10', '9:30 AM - 4:30 PM', 'Online', 'Technology', '$99 - $199', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000002'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Indie Rock Showcase', 'Discover the best new indie rock bands in an intimate venue setting.', '2024-08-15', '7:00 PM - 11:00 PM', 'The Underground, Chicago', 'Music', '$20 - $35', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000003'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Photography Masterclass', 'Learn advanced photography techniques from a renowned professional.', '2024-09-22', '1:00 PM - 5:00 PM', 'Creative Studio, Paris', 'Arts & Culture', '$150', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000003'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Startup Pitch Night', 'Entrepreneurs pitch their innovative ideas to a panel of investors.', '2024-10-01', '6:00 PM - 9:00 PM', 'Innovation Hub, Berlin', 'Business', 'Free (RSVP Required)', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000002'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Food & Wine Festival', 'Experience a variety of cuisines and fine wines from around the world.', '2024-11-05', '11:00 AM - 7:00 PM', 'Downtown Plaza, Austin', 'Food & Drink', '$50 - $100', 'https://placehold.co/600x400.png', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (event_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  date = EXCLUDED.date,
  time = EXCLUDED.time,
  location = EXCLUDED.location,
  category = EXCLUDED.category,
  ticket_price_range = EXCLUDED.ticket_price_range,
  image_url = EXCLUDED.image_url,
  organizer_id = EXCLUDED.organizer_id,
  updated_at = NOW();

-- Upsert sample venues (assuming admin '00000000-0000-0000-0000-000000000001' adds them)
INSERT INTO venues (venue_id, name, address, city, state_province, country, capacity, description, amenities, contact_email, contact_phone, image_url, created_by)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'The Grand Hall', '123 Main St', 'San Francisco', 'CA', 'USA', 500, 'A large, versatile event space suitable for conferences and gala dinners.', '{"AV System", "Stage", "WiFi", "Catering Area"}', 'grandhall@example.com', '555-1234', 'https://placehold.co/600x400.png?text=Grand+Hall', '00000000-0000-0000-0000-000000000001'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'The Music Box', '456 Beat Ave', 'New York', 'NY', 'USA', 250, 'Intimate venue perfect for live music performances and club nights.', '{"Sound System", "Bar", "Stage Lights", "Green Room"}', 'musicbox@example.com', '555-5678', 'https://placehold.co/600x400.png?text=Music+Box', '00000000-0000-0000-0000-000000000001'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Tech Park Auditorium', '789 Innovation Dr', 'Austin', 'TX', 'USA', 1000, 'State-of-the-art auditorium for tech conferences and presentations.', '{"Projector", "Large Screen", "Podium", "Breakout Rooms", "WiFi"}', 'techpark@example.com', '555-9012', 'https://placehold.co/600x400.png?text=Tech+Auditorium', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (venue_id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state_province = EXCLUDED.state_province,
  country = EXCLUDED.country,
  capacity = EXCLUDED.capacity,
  description = EXCLUDED.description,
  amenities = EXCLUDED.amenities,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  image_url = EXCLUDED.image_url,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

-- Note on Foreign Keys:
-- The organizer_id in the events table and created_by in venues table reference users(auth_user_id).
-- Ensure that the UUIDs used for these foreign keys exist in your users table.
-- The sample UUIDs above are placeholders. You should replace them with actual UUIDs
-- from your Supabase auth.users table after you have signed up these users through your app.
-- Or, create these users directly in Supabase Auth dashboard and copy their IDs.
-- For RLS policies to work correctly, users must be authenticated and their role correctly set in the users table.
```