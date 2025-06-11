
'use client';

import { useState, useMemo, useEffect } from 'react';
import EventCard from '@/components/events/EventCard';
import SearchFilterBar from '@/components/events/SearchFilterBar';
import PersonalizedRecommendations from '@/components/events/PersonalizedRecommendations';
import { mockEvents } from '@/lib/mockData';
import type { Event } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Frown } from 'lucide-react';

export default function AttendeePage() {
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(mockEvents);
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Mock user data for recommendations
  const mockUserPreferences = "Likes technology conferences and music festivals. Interested in events in San Francisco or online. Budget-conscious but willing to pay for value.";
  const mockBrowsingHistory = "Viewed 'Global Tech Summit 2024', 'Summer Sounds Music Festival'. Saved 'AI in Business Conference'.";

  useEffect(() => {
    if (!authLoading && (!user || role !== 'attendee')) {
      router.push('/login'); // Or a generic access denied page
    }
  }, [user, role, authLoading, router]);

  const categories = useMemo(() => Array.from(new Set(mockEvents.map(event => event.category))), []);
  const locations = useMemo(() => Array.from(new Set(mockEvents.map(event => event.location))), []);

  const handleSearch = (filters: { keyword: string; location: string; date: Date | undefined; category: string }) => {
    let events = mockEvents;

    if (filters.keyword) {
      events = events.filter(event =>
        event.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        event.description.toLowerCase().includes(filters.keyword.toLowerCase())
      );
    }
    // An empty string for location or category means no filter is applied for that field.
    if (filters.location) {
      events = events.filter(event => event.location === filters.location);
    }
    if (filters.date) {
      const filterDateStr = filters.date.toISOString().split('T')[0];
      events = events.filter(event => event.date === filterDateStr);
    }
    // An empty string for location or category means no filter is applied for that field.
    if (filters.category) {
      events = events.filter(event => event.category === filters.category);
    }
    setFilteredEvents(events);
  };

  if (authLoading || !user || role !== 'attendee') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading attendee dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Explore Events</h1>
        <p className="text-lg font-body text-muted-foreground">Find your next amazing experience.</p>
      </div>
      
      <SearchFilterBar onSearch={handleSearch} categories={categories} locations={locations} />

      {user && (
        <div className="my-8">
          <PersonalizedRecommendations 
            userPreferences={mockUserPreferences} 
            browsingHistory={mockBrowsingHistory} 
          />
        </div>
      )}

      {filteredEvents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-lg shadow">
          <Frown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-headline font-semibold mb-2">No Events Found</h2>
          <p className="font-body text-muted-foreground">
            Try adjusting your search filters or check back later for new events.
          </p>
        </div>
      )}
    </div>
  );
}
