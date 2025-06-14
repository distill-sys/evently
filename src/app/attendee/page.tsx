
'use client';

import { useState, useMemo, useEffect } from 'react';
import EventCard from '@/components/events/EventCard';
import SearchFilterBar from '@/components/events/SearchFilterBar';
import PersonalizedRecommendations from '@/components/events/PersonalizedRecommendations';
import type { Event } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Frown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AttendeePage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Mock user data for recommendations - this can be replaced later with actual user data
  const mockUserPreferences = "Likes technology conferences and music festivals. Interested in events in San Francisco or online. Budget-conscious but willing to pay for value.";
  const mockBrowsingHistory = "Viewed 'Global Tech Summit 2024', 'Summer Sounds Music Festival'. Saved 'AI in Business Conference'.";

  useEffect(() => {
    if (!authLoading && (!user || role !== 'attendee')) {
      router.push('/login');
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from('events')
        .select(`
          event_id,
          title,
          description,
          date,
          time,
          location,
          category,
          ticket_price_range,
          image_url,
          organizer_id,
          organizer:users (
            name,
            organization_name
          ),
          venue:venues (
            name,
            city
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        setFetchError('Could not fetch events. Please try again later.');
        setAllEvents([]);
        setFilteredEvents([]);
      } else {
        setAllEvents(data as Event[] || []);
        setFilteredEvents(data as Event[] || []);
      }
      setIsLoadingEvents(false);
    };

    if (user && role === 'attendee') {
      fetchEvents();
    }
  }, [user, role]);

  const categories = useMemo(() => {
    if (!allEvents) return [];
    return Array.from(new Set(allEvents.map(event => event.category).filter(Boolean) as string[]));
  }, [allEvents]);

  const locations = useMemo(() => {
    if (!allEvents) return [];
    // Consider combining venue city and event location if venue exists
    const eventLocations = allEvents.map(event => {
      if (event.venue && event.venue.city) return event.venue.city;
      return event.location;
    });
    return Array.from(new Set(eventLocations.filter(Boolean) as string[]));
  }, [allEvents]);

  const handleSearch = (filters: { keyword: string; location: string; date: Date | undefined; category: string }) => {
    let eventsToFilter = [...allEvents]; // Start with a fresh copy of all events

    if (filters.keyword) {
      eventsToFilter = eventsToFilter.filter(event =>
        (event.title?.toLowerCase() || '').includes(filters.keyword.toLowerCase()) ||
        (event.description?.toLowerCase() || '').includes(filters.keyword.toLowerCase())
      );
    }
    if (filters.location) {
      eventsToFilter = eventsToFilter.filter(event => {
        const eventLocation = (event.venue && event.venue.city) ? event.venue.city : event.location;
        return eventLocation === filters.location;
      });
    }
    if (filters.date) {
      const filterDateStr = filters.date.toISOString().split('T')[0];
      eventsToFilter = eventsToFilter.filter(event => event.date === filterDateStr);
    }
    if (filters.category) {
      eventsToFilter = eventsToFilter.filter(event => event.category === filters.category);
    }
    setFilteredEvents(eventsToFilter);
  };

  if (authLoading) { // Show primary auth loading first
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  if (!user || role !== 'attendee') {
     // This case should ideally be handled by the redirect, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Frown className="h-12 w-12 text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Access Denied. Please log in as an attendee.</p>
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

      {isLoadingEvents ? (
         <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl font-body text-muted-foreground">Fetching events...</p>
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 bg-card rounded-lg shadow">
          <Frown className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-headline font-semibold mb-2 text-destructive">Error Fetching Events</h2>
          <p className="font-body text-muted-foreground">{fetchError}</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <EventCard key={event.event_id} event={event} />
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
