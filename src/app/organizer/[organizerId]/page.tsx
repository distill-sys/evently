
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import OrganizerCard from '@/components/organizers/OrganizerCard';
import EventCard from '@/components/events/EventCard';
import type { Organizer as OrganizerType, Event as EventType, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Frown, Loader2, PlusCircle } from 'lucide-react';

// Helper function to fetch organizer details
async function getOrganizerDetails(organizerId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', organizerId)
    .eq('role', 'organizer')
    .single();
  if (error && error.code !== 'PGRST116') { // PGRST116 means 0 rows, which is fine
    console.error('Error fetching organizer details:', error);
    return null;
  }
  return data as UserProfile | null;
}

// Helper function to fetch events by organizer
async function getOrganizerEvents(organizerId: string): Promise<EventType[]> {
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
      )
    `)
    .eq('organizer_id', organizerId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }
  return data as EventType[] || [];
}


export default function OrganizerPage() {
  const params = useParams();
  const organizerId = params.organizerId as string;
  const { user: authUser, role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [organizerEvents, setOrganizerEvents] = useState<EventType[]>([]);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizerId) return;

    async function fetchData() {
      setIsLoadingPageData(true);
      setFetchError(null);
      try {
        const [details, events] = await Promise.all([
          getOrganizerDetails(organizerId),
          getOrganizerEvents(organizerId)
        ]);

        if (!details) {
          setFetchError("Organizer not found or is not an organizer.");
        }
        setOrganizer(details);
        setOrganizerEvents(events);

      } catch (error) {
        console.error("Error in organizer page data fetching pipeline:", error);
        setFetchError("Failed to load organizer data.");
      } finally {
        setIsLoadingPageData(false);
      }
    }
    fetchData();
  }, [organizerId]);

  const isViewingOwnProfile = authUser && authUser.id === organizerId && authRole === 'organizer';

  if (authLoading || isLoadingPageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading organizer profile...</p>
      </div>
    );
  }

  if (fetchError || !organizer) {
    return (
      <div className="text-center py-16">
        <Frown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-semibold">{fetchError || 'Organizer Not Found'}</h1>
        <p className="font-body text-muted-foreground mt-2">
          Sorry, we couldn&apos;t find the organizer you&apos;re looking for or there was an issue loading their data.
        </p>
      </div>
    );
  }
  
  // Adapt UserProfile to OrganizerType for OrganizerCard (mocking eventsHeld for now)
  const displayOrganizer: OrganizerType = {
    ...organizer,
    id: organizer.auth_user_id, // OrganizerCard expects 'id'
    profilePictureUrl: organizer.profile_picture_url || 'https://placehold.co/120x120.png',
    eventsHeld: organizerEvents.length, // Actual events count
  };


  return (
    <div className="space-y-12">
      <OrganizerCard organizer={displayOrganizer} />

      {isViewingOwnProfile && (
        <div className="text-center my-8">
          <Button size="lg" asChild>
            <Link href="/organizer/events/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Event
            </Link>
          </Button>
        </div>
      )}

      <section>
        <h2 className="text-3xl font-headline font-semibold mb-8 text-center md:text-left">
          Events by {organizer.name}
        </h2>
        {organizerEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizerEvents.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow">
             <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-muted-foreground">
              {organizer.name} has no events listed yet.
              {isViewingOwnProfile && " Why not create one?"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

