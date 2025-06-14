
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
import { Frown, Loader2, PlusCircle, BarChart3 } from 'lucide-react';

// Helper function to fetch organizer details
async function getOrganizerDetails(organizerId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', organizerId)
    .eq('role', 'organizer') // Important: ensure we are fetching an organizer
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error('OrganizerPage: getOrganizerDetails - Error fetching organizer details:', JSON.stringify(error, null, 2));
    return null; 
  }
  return data as UserProfile | null;
}

// Helper function to fetch events by organizer
async function getOrganizerEvents(organizerId: string): Promise<EventType[]> {
  const selectQuery =
    'event_id, ' +
    'title, ' +
    'description, ' +
    'date, ' +
    'time, ' +
    'location, ' +
    'category, ' +
    'ticket_price_range, ' +
    'image_url, ' +
    'organizer_id, ' +
    'organizer:users (name, organization_name), ' +
    'venue:venues (name, city)';

  const { data, error } = await supabase
    .from('events')
    .select(selectQuery)
    .eq('organizer_id', organizerId)
    .order('date', { ascending: true });

  if (error) {
    console.error('OrganizerPage: getOrganizerEvents - Error fetching organizer events:', JSON.stringify(error, null, 2));
    return []; 
  }
  return (data as EventType[] || []);
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
    if (!organizerId) {
      setIsLoadingPageData(false);
      setOrganizer(null);
      setOrganizerEvents([]);
      setFetchError("No organizer ID was found in the URL.");
      return;
    }

    if (authLoading) {
        return;
    }
    
    async function fetchDataForOrganizer() {
      setIsLoadingPageData(true); 
      setFetchError(null);
      setOrganizer(null); 
      setOrganizerEvents([]);

      try {
        const [details, events] = await Promise.all([
          getOrganizerDetails(organizerId),
          getOrganizerEvents(organizerId)
        ]);

        if (!details) {
          console.warn(`OrganizerPage: Organizer details not found or user is not an organizer for ID: ${organizerId}.`);
          setFetchError("Organizer profile not found, or this user account is not configured as an organizer.");
        } else {
          setOrganizer(details);
          setOrganizerEvents(events || []); 
        }
      } catch (error: any) {
        console.error(`OrganizerPage: Error in fetchDataForOrganizer's try block:`, error);
        setFetchError(`Failed to load organizer data: ${error.message || 'An unknown error occurred'}`);
      } finally {
        setIsLoadingPageData(false);
      }
    }

    fetchDataForOrganizer();

  }, [organizerId, authLoading]); 

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
      <div className="text-center py-16 bg-card rounded-lg shadow-md">
        <Frown className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-semibold text-destructive">{fetchError || 'Organizer Not Found'}</h1>
        <p className="font-body text-muted-foreground mt-2 max-w-md mx-auto">
          {fetchError ? "Sorry, there was an issue loading the organizer's data." : "Sorry, we couldn't find the organizer you're looking for."}
        </p>
        <Button variant="link" asChild className="mt-6">
            <Link href="/attendee">Back to events</Link>
        </Button>
      </div>
    );
  }
  
  const displayOrganizer: OrganizerType = {
    ...organizer,
    id: organizer.auth_user_id, 
    profilePictureUrl: organizer.profile_picture_url || 'https://placehold.co/120x120.png',
    eventsHeld: organizerEvents.length, 
  };

  return (
    <div className="space-y-12">
      <OrganizerCard organizer={displayOrganizer} />

      {isViewingOwnProfile && (
        <div className="text-center my-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild className="font-body shadow-md hover:shadow-lg transition-shadow">
            <Link href="/organizer/events/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Event
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="font-body shadow-md hover:shadow-lg transition-shadow">
            <Link href={`/organizer/${organizerId}/analytics`}>
              <BarChart3 className="mr-2 h-5 w-5" /> View My Analytics
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
              <EventCard key={event.event_id} event={event} isEditable={isViewingOwnProfile} />
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
