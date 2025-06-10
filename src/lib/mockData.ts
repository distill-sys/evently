import type { Event, Organizer } from './types';

export const mockOrganizers: Organizer[] = [
  {
    id: 'org1',
    name: 'Tech Events Inc.',
    profilePictureUrl: 'https://placehold.co/100x100.png',
    bio: 'Leading organizers of premier technology conferences and workshops worldwide. Join us to explore the future of tech.',
    eventsHeld: 15,
  },
  {
    id: 'org2',
    name: 'Music Fest Group',
    profilePictureUrl: 'https://placehold.co/100x100.png',
    bio: 'Bringing you the best music festivals with top artists and unforgettable experiences. Est. 2010.',
    eventsHeld: 25,
  },
  {
    id: 'org3',
    name: 'Art & Culture Collective',
    profilePictureUrl: 'https://placehold.co/100x100.png',
    bio: 'Curators of fine art exhibitions, cultural showcases, and community art projects. Celebrating creativity in all its forms.',
    eventsHeld: 8,
  },
];

export const mockEvents: Event[] = [
  {
    id: 'evt1',
    title: 'Global Tech Summit 2024',
    description: 'Join industry leaders and innovators to discuss the latest trends in technology.',
    date: '2024-10-15',
    time: '9:00 AM - 5:00 PM',
    location: 'San Francisco, CA',
    category: 'Technology',
    ticketPriceRange: '$299 - $799',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org1',
    organizerName: 'Tech Events Inc.'
  },
  {
    id: 'evt2',
    title: 'Summer Sounds Music Festival',
    description: 'An outdoor music festival featuring top international artists and bands.',
    date: '2024-07-20',
    time: '12:00 PM - 11:00 PM',
    location: 'Central Park, New York',
    category: 'Music',
    ticketPriceRange: '$75 - $150',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org2',
    organizerName: 'Music Fest Group'
  },
  {
    id: 'evt3',
    title: 'Modern Art Exhibition',
    description: 'A curated collection of modern art from emerging and established artists.',
    date: '2024-09-05',
    time: '10:00 AM - 6:00 PM (Closed Mondays)',
    location: 'City Art Gallery',
    category: 'Arts & Culture',
    ticketPriceRange: 'Free - $25',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org3',
    organizerName: 'Art & Culture Collective'
  },
  {
    id: 'evt4',
    title: 'AI in Business Conference',
    description: 'Explore the practical applications of AI in various business sectors.',
    date: '2024-11-10',
    time: '9:30 AM - 4:30 PM',
    location: 'Online',
    category: 'Technology',
    ticketPriceRange: '$99 - $199',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org1',
    organizerName: 'Tech Events Inc.'
  },
   {
    id: 'evt5',
    title: 'Indie Rock Showcase',
    description: 'Discover the best new indie rock bands in an intimate venue setting.',
    date: '2024-08-15',
    time: '7:00 PM - 11:00 PM',
    location: 'The Underground Venue, Chicago',
    category: 'Music',
    ticketPriceRange: '$20 - $35',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org2',
    organizerName: 'Music Fest Group'
  },
  {
    id: 'evt6',
    title: 'Photography Masterclass',
    description: 'Learn advanced photography techniques from a renowned professional photographer.',
    date: '2024-09-22',
    time: '1:00 PM - 5:00 PM',
    location: 'Creative Studio Hub',
    category: 'Arts & Culture',
    ticketPriceRange: '$150',
    imageUrl: 'https://placehold.co/600x400.png',
    organizerId: 'org3',
    organizerName: 'Art & Culture Collective'
  }
];
