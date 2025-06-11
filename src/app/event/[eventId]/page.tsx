
import type { Event as EventType, Organizer as OrganizerType, Venue, UserProfile } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Ticket, Users, DollarSign, ArrowLeft, Building } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';

interface EventPageProps {
  params: { eventId: string };
}

async function getEventDetails(eventId: string): Promise<EventType | null> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:users (
        auth_user_id,
        name,
        email,
        organization_name,
        bio,
        profile_picture_url
      ),
      venue:venues (
        name,
        address,
        city,
        state_province,
        country
      )
    `)
    .eq('event_id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
  // The 'organizer' and 'venue' fields from the query will be nested objects.
  // We need to map them correctly to what EventType expects if direct fields were used.
  // However, EventType is already set up to handle nested organizer and venue objects.
  return data as EventType | null;
}


export default async function EventPage({ params }: EventPageProps) {
  const eventId = params.eventId;
  const event = await getEventDetails(eventId);

  if (!event) {
    notFound(); // This will render the nearest not-found.tsx or Next.js default 404 page
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Adapt UserProfile from event.organizer to OrganizerType for display if needed, or use directly
  const displayOrganizer: OrganizerType | undefined = event.organizer ? {
    ...(event.organizer as UserProfile), // Cast to UserProfile which is the base
    id: (event.organizer as UserProfile).auth_user_id, // Map auth_user_id to id
    profilePictureUrl: (event.organizer as UserProfile).profile_picture_url || 'https://placehold.co/120x120.png',
    eventsHeld: 0, // This would require another query or be part of a more complex type
  } : undefined;


  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <Button asChild variant="outline" className="font-body self-start mb-4">
          <Link href="/attendee">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
          </Link>
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <Image
          src={event.image_url || 'https://placehold.co/600x400.png'}
          alt={event.title}
          width={1200}
          height={500}
          className="w-full h-64 md:h-96 object-cover"
          data-ai-hint="event concert"
        />
        <CardHeader className="p-6 md:p-8">
          <CardTitle className="font-headline text-3xl md:text-4xl text-primary mb-2">{event.title}</CardTitle>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground font-body text-sm md:text-base">
            <div className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-accent" />
              <span>{eventDate} &bull; {event.time}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-accent" />
              <span>{event.venue ? `${event.venue.name}, ${event.venue.city}` : event.location}</span>
            </div>
            <div className="flex items-center">
              <Ticket className="h-5 w-5 mr-2 text-accent" />
              <span>Category: {event.category}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <h2 className="font-headline text-2xl font-semibold mb-4">About this Event</h2>
          <p className="font-body text-lg leading-relaxed text-foreground mb-6">
            {event.description}
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-secondary/30">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-primary" />
                  Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-lg">{event.ticket_price_range}</p>
                <Button className="w-full mt-4 font-body" size="lg">Get Tickets (Mock)</Button>
              </CardContent>
            </Card>
            
            {displayOrganizer && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/organizer/${displayOrganizer.id}`} className="block group">
                    <div className="flex items-center gap-3">
                        <Image 
                            src={displayOrganizer.profilePictureUrl || 'https://placehold.co/48x48.png'} 
                            alt={displayOrganizer.name} 
                            width={48} height={48} 
                            className="rounded-full" 
                            data-ai-hint="person avatar" 
                        />
                        <div>
                            <p className="font-body text-lg font-semibold group-hover:text-primary transition-colors">
                                {displayOrganizer.name}
                            </p>
                            {(displayOrganizer as UserProfile).organization_name && (
                                <p className="font-body text-xs text-muted-foreground">
                                    {(displayOrganizer as UserProfile).organization_name}
                                </p>
                            )}
                            <p className="font-body text-sm text-muted-foreground group-hover:text-primary transition-colors">View Profile &rarr;</p>
                        </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {event.venue && (
            <Card className="bg-secondary/30">
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center">
                        <Building className="h-5 w-5 mr-2 text-primary" />
                        Venue Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="font-body space-y-1">
                    <p className="font-semibold">{event.venue.name}</p>
                    <p>{event.venue.address}</p>
                    <p>{event.venue.city}{event.venue.state_province ? `, ${event.venue.state_province}` : ''}, {event.venue.country}</p>
                </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
