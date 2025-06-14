

export type UserRole = 'attendee' | 'organizer' | 'admin';

// Represents the structure in your 'users' table
export interface UserProfile {
  auth_user_id: string; // Primary Key, maps to Supabase auth.users.id
  email: string;
  name: string;
  role: UserRole;
  organization_name?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Represents the user object used within the AuthContext and application state
export interface User {
  id: string; // Supabase auth.users.id
  email: string;
  name: string; // From UserProfile
  role?: UserRole; // From UserProfile
  organizationName?: string | null; // From UserProfile, mapped to camelCase
  bio?: string | null; // From UserProfile, mapped to camelCase
  profilePictureUrl?: string | null; // From UserProfile, mapped to camelCase
}


// Represents the structure in your 'events' table
export interface Event {
  event_id: string; // Primary Key
  title: string;
  description: string;
  date: string; // ISO string for date YYYY-MM-DD
  time: string; // e.g., "10:00 AM - 5:00 PM"
  location: string; // Used if no venue_id, or for specific instructions
  category: string;
  ticket_price_range: string; // e.g., "$20 - $50" or "Free"
  image_url: string;
  organizer_id: string; // Foreign Key to users.auth_user_id
  venue_id?: string | null; // Optional Foreign Key to venues.venue_id
  created_at?: string;
  updated_at?: string;
  venue_booking_status?: 'pending' | 'approved' | 'rejected' | 'not_requested' | null;
  admin_notes_venue_booking?: string | null;
  organizer?: {
    auth_user_id: string;
    name: string;
    organization_name: string | null;
  } | UserProfile | null;
  venue?: Pick<Venue, 'venue_id' | 'name' | 'address' | 'city' | 'state_province' | 'country'> | null;
}

export interface Organizer extends UserProfile {
  eventsHeld?: number;
}


export interface SavedCard {
  id: string;
  last4: string;
  expiryDate: string; // "MM/YY"
  cardType: string;
}

// Represents the structure in your 'venues' table
export interface Venue {
  venue_id: string; // Primary Key
  name: string;
  address: string;
  city: string;
  state_province?: string | null;
  country: string;
  capacity?: number | null;
  description?: string | null;
  amenities?: string[] | null; // Array of strings
  contact_email?: string | null;
  contact_phone?: string | null;
  image_url?: string | null;
  created_by: string; // UUID of admin user who created it
  created_at?: string;
  updated_at?: string;
  creator?: {
    name: string;
  } | null;
}

export interface TicketPurchase {
  purchase_id: string;
  event_id: string;
  attendee_user_id: string;
  organizer_user_id: string;
  quantity: number;
  purchase_date: string; // ISO string
  payment_method_id?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  // updated_at is removed as it's not in the DB schema currently

  // Joined event details - Supabase returns joined table as a nested object
  events?: { // Property name 'events' matches the table name
    event_id: string;
    title: string;
    date: string;
    time: string;
    image_url: string | null;
    location: string;
    ticket_price_range: string;
  } | null;
}

