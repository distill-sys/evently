

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
  // For joined data from the 'users' table (organizer's details)
  // Property name 'organizer' now matches the alias in the Supabase query.
  organizer?: {
    auth_user_id: string; // Ensure organizer_id is available if needed
    name: string;
    organization_name: string | null;
    // include other organizer fields if needed directly in EventCard
  } | UserProfile | null; // Allow null if no organizer found or not joined
  // Optionally, you could also join venue details here if needed frequently
  venue?: Pick<Venue, 'name' | 'address' | 'city' | 'state_province' | 'country'> | null;
}

// This type was previously for mockData, now aligning with UserProfile for organizers
// We'll primarily use UserProfile when displaying organizer details.
export interface Organizer extends UserProfile {
  eventsHeld?: number; // This would need to be calculated dynamically
}


export interface SavedCard {
  id: string; // Corresponds to payment_method_id
  last4: string;
  expiryDate: string; // "MM/YY"
  cardType: string; // "Visa", "Mastercard", etc.
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
  // Optional: include creator's name if joining with users table
  creator?: {
    name: string;
  } | null;
}

export interface TicketPurchase {
  purchase_id: string; // Unique ID for the purchase
  event_id: string;
  attendee_user_id: string;
  organizer_user_id: string;
  quantity: number;
  purchase_date: string; // ISO string
  // total_price?: number; // If you calculate a price
  payment_method_id?: string; // Mock payment method ID
  status?: 'confirmed' | 'pending' | 'cancelled';
}
