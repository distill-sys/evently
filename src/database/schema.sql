
-- Helper function to update updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ENUM for user roles
CREATE TYPE user_role_enum AS ENUM ('attendee', 'organizer', 'admin');

-- Users table
-- This table stores public profile information and app-specific user data.
-- It can be linked to Supabase's auth.users table via the id.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Can be set to match auth.users.id
    email TEXT UNIQUE NOT NULL, -- Should match auth.users.email
    full_name TEXT NOT NULL,
    role user_role_enum NOT NULL,
    profile_picture_url TEXT,
    preferences_text TEXT, -- For explicit user preferences for AI recommendations

    -- Organizer specific fields
    organization_name TEXT,
    organizer_bio TEXT,
    events_held INTEGER DEFAULT 0, -- Number of events organized, managed by app logic or triggers

    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger to automatically update updated_at on users table
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL, -- e.g., "9:00 AM - 5:00 PM"
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    ticket_price_range TEXT, -- e.g., "$299 - $799" or "Free"
    image_url TEXT,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User with 'organizer' role
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger to automatically update updated_at on events table
CREATE TRIGGER set_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Saved Payment Methods table (for attendees)
-- Note: Actual card numbers/CVV should be handled by a payment processor.
CREATE TABLE saved_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User with 'attendee' role
    last4 TEXT NOT NULL, -- Last 4 digits of card
    expiry_date TEXT NOT NULL, -- "MM/YY"
    card_type TEXT NOT NULL, -- e.g., "Visa", "Mastercard"
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger to automatically update updated_at on saved_payment_methods table
CREATE TRIGGER set_saved_payment_methods_updated_at
BEFORE UPDATE ON saved_payment_methods
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE saved_payment_methods DISABLE ROW LEVEL SECURITY;

-- Event Registrations table (linking attendees to events they've "bought" tickets for)
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Attendee
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registration_date TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    ticket_type TEXT, -- e.g., "General Admission", "VIP" (optional)
    price_paid NUMERIC(10, 2), -- Price of the specific ticket purchased
    status TEXT DEFAULT 'confirmed', -- e.g., "confirmed", "cancelled"
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, event_id) -- Assuming a user registers for an event once.
);

-- Trigger to automatically update updated_at on event_registrations table
CREATE TRIGGER set_event_registrations_updated_at
BEFORE UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- User Saved Events table (for attendees favoriting/saving events)
CREATE TABLE user_saved_events (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Attendee
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (user_id, event_id) -- Ensures a user can save an event only once
);

ALTER TABLE user_saved_events DISABLE ROW LEVEL SECURITY;

-- User Event Views table (for browsing history for personalized recommendations)
CREATE TABLE user_event_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE user_event_views DISABLE ROW LEVEL SECURITY;

-- Example of how to seed initial admin user if needed (manual step after table creation)
-- INSERT INTO users (email, full_name, role) VALUES ('admin@example.com', 'Admin User', 'admin');
-- Remember Supabase auth user needs to be created separately.
-- This public.users table entry would then be linked, typically by setting its id to the auth.users.id.
