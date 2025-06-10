export type UserRole = 'attendee' | 'organizer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: UserRole; // Role might be selected after initial signup/login
  // Add role-specific fields if necessary
  organizationName?: string; // For organizers
  bio?: string; // For organizers
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string or a more specific date type
  time: string; // e.g., "10:00 AM - 5:00 PM"
  location: string;
  category: string;
  ticketPriceRange: string; // e.g., "$20 - $50" or "Free"
  imageUrl: string;
  organizerId: string;
  organizerName?: string; // Denormalized for convenience
}

export interface Organizer {
  id: string;
  name: string;
  profilePictureUrl: string;
  bio: string;
  eventsHeld: number;
}

export interface SavedCard {
  id: string;
  last4: string;
  expiryDate: string; // "MM/YY"
  cardType: string; // "Visa", "Mastercard", etc.
}
