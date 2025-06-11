
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (for all roles: attendee, organizer, admin)
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  auth_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Corresponds to Supabase auth.users.id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('attendee', 'organizer', 'admin')) NOT NULL,
  organization_name TEXT, -- For organizers
  bio TEXT, -- For organizers
  profile_picture_url TEXT, -- For organizers, can be a placeholder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- Initially off as requested, but good practice to note

-- Events Table
DROP TABLE IF EXISTS events CASCADE;
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT, -- e.g., "9:00 AM - 5:00 PM"
  location TEXT,
  category TEXT,
  ticket_price_range TEXT, -- e.g., "$20 - $50" or "Free"
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Event Registrations (Tickets) Table
DROP TABLE IF EXISTS event_registrations CASCADE;
CREATE TABLE event_registrations (
  registration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE, -- User with 'attendee' role
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  ticket_type TEXT, -- e.g., "General Admission", "VIP"
  price_paid NUMERIC(10, 2),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  UNIQUE (event_id, attendee_id) -- An attendee can register for an event only once (can be adjusted if multiple tickets allowed)
);
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Saved Payment Methods (Mocked for security, PCI compliance is complex)
DROP TABLE IF EXISTS saved_payment_methods CASCADE;
CREATE TABLE saved_payment_methods (
  payment_method_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
  card_type TEXT, -- e.g., "Visa", "Mastercard"
  last4 TEXT, -- Last 4 digits of the card
  expiry_date TEXT, -- "MM/YY"
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- User Saved/Favorited Events
DROP TABLE IF EXISTS user_saved_events CASCADE;
CREATE TABLE user_saved_events (
  saved_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_id) -- User can save an event only once
);
ALTER TABLE user_saved_events ENABLE ROW LEVEL SECURITY;

-- User Event Views (for browsing history, recommendations)
DROP TABLE IF EXISTS user_event_views CASCADE;
CREATE TABLE user_event_views (
  view_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_event_views ENABLE ROW LEVEL SECURITY;


-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for 'updated_at'
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Turn off RLS for all tables as requested (Not recommended for production without careful consideration)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_views DISABLE ROW LEVEL SECURITY;


-- SAMPLE DATA --

-- Insert Sample Users (including organizers)
-- Replace with actual Supabase auth user IDs if you are manually creating these after sign-up.
-- For this sample, we'll assume these auth_user_ids exist or will be created.
-- It's often better to let the app's sign-up process create these user entries linked to actual auth.users.
-- For demo purposes, creating some directly:

DO $$
DECLARE
    org1_uuid UUID := uuid_generate_v4();
    org2_uuid UUID := uuid_generate_v4();
    attendee1_uuid UUID := uuid_generate_v4();
BEGIN
    -- Ensure these UUIDs correspond to actual entries in auth.users if testing with real auth
    -- For a clean slate, you might sign up these users through your app first.

    -- Organizer 1
    INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
    VALUES (org1_uuid, 'organizer1@example.com', 'Tech Conferences Global', 'organizer', 'Tech Conferences Global LLC', 'Hosting premier tech conferences worldwide since 2010. Join us for cutting-edge insights and networking.', 'https://placehold.co/100x100.png')
    ON CONFLICT (email) DO NOTHING;

    -- Organizer 2
    INSERT INTO users (auth_user_id, email, name, role, organization_name, bio, profile_picture_url)
    VALUES (org2_uuid, 'musicfest@example.com', 'Indie Fest Productions', 'organizer', 'Indie Fest Productions', 'Curating unforgettable music festival experiences with a focus on independent artists and community vibes.', 'https://placehold.co/100x100.png')
    ON CONFLICT (email) DO NOTHING;

    -- Attendee 1
    INSERT INTO users (auth_user_id, email, name, role)
    VALUES (attendee1_uuid, 'attendee1@example.com', 'Amin Danial', 'attendee')
    ON CONFLICT (email) DO NOTHING;


    -- Insert Sample Events
    -- Event 1 by Organizer 1
    INSERT INTO events (event_id, organizer_id, title, description, date, time, location, category, ticket_price_range, image_url)
    VALUES (
        uuid_generate_v4(),
        org1_uuid,
        'InnovateAI Summit 2024',
        'Explore the future of Artificial Intelligence with leading researchers, developers, and ethicists. Keynotes, workshops, and panel discussions.',
        '2024-10-20',
        '9:00 AM - 6:00 PM PST',
        'San Francisco, CA & Online',
        'Technology',
        '$199 - $599',
        'https://placehold.co/600x400.png'
    );

    -- Event 2 by Organizer 1
    INSERT INTO events (event_id, organizer_id, title, description, date, time, location, category, ticket_price_range, image_url)
    VALUES (
        uuid_generate_v4(),
        org1_uuid,
        'WebDev Masters Workshop',
        'A hands-on workshop for advanced web developers. Dive deep into modern frameworks, performance optimization, and security best practices.',
        '2024-11-15',
        '10:00 AM - 4:00 PM EST',
        'Online',
        'Technology',
        '$149',
        'https://placehold.co/600x400.png'
    );

    -- Event 3 by Organizer 2
    INSERT INTO events (event_id, organizer_id, title, description, date, time, location, category, ticket_price_range, image_url)
    VALUES (
        uuid_generate_v4(),
        org2_uuid,
        'Echoes & Rhythms Fest',
        'A 3-day outdoor music festival celebrating diverse genres. Featuring indie bands, electronic artists, and folk musicians.',
        '2024-08-23',
        'Fri 2PM - Sun 11PM',
        'Willow Creek Park, Denver, CO',
        'Music',
        '$65 (Day) - $150 (3-Day Pass)',
        'https://placehold.co/600x400.png'
    );

    -- Event 4 by Organizer 2
    INSERT INTO events (event_id, organizer_id, title, description, date, time, location, category, ticket_price_range, image_url)
    VALUES (
        uuid_generate_v4(),
        org2_uuid,
        'Acoustic Nights Showcase',
        'An intimate evening with talented singer-songwriters. Enjoy original music in a cozy, relaxed atmosphere.',
        '2024-09-12',
        '7:30 PM - 10:00 PM',
        'The Local Brew Cafe, Austin, TX',
        'Music',
        '$15 - $25',
        'https://placehold.co/600x400.png'
    );

    -- Event 5 (General, could be by Org1 or a new one)
    INSERT INTO events (event_id, organizer_id, title, description, date, time, location, category, ticket_price_range, image_url)
    VALUES (
        uuid_generate_v4(),
        org1_uuid,
        'Digital Art & Design Expo',
        'Discover groundbreaking digital art and innovative design solutions. Meet artists, attend talks, and explore interactive exhibits.',
        '2024-07-30',
        '11:00 AM - 7:00 PM',
        'Metro Convention Center, Chicago, IL',
        'Arts & Culture',
        'Free Entry (Registration Required)',
        'https://placehold.co/600x400.png'
    );
END $$;


-- Note: For a real application, ensure RLS policies are correctly configured if you enable RLS.
-- The sample data uses uuid_generate_v4() for primary keys.
-- Organizer_id in events table should correspond to an auth_user_id from users table with 'organizer' role.
-- Profile picture URLs are placeholders.
