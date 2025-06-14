
'use client'; 

import type { Event as EventType, Organizer as OrganizerType, UserProfile, TicketPurchase } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Ticket, Users, DollarSign, ArrowLeft, Building, Frown, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation'; 
import { useEffect, useState } from 'react'; 
import { useToast } from '@/hooks/use-toast';
import TicketPurchaseDialog from '@/components/events/TicketPurchaseDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EventPage() {
  const params = useParams(); 
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  useEffect(() => {
    async function getEventDetails(id: string): Promise<EventType | null> {
      const selectQuery =
        '*, ' +
        'venue_booking_status, admin_notes_venue_booking, ' +
        'organizer:users (auth_user_id, name, email, organization_name, bio, profile_picture_url), ' +
        'venue:venues (venue_id, name, address, city, state_province, country)';

      const { data, error } = await supabase
        .from('events')
        .select(selectQuery)
        .eq('event_id', id)
        .single();

      if (error) {
        console.error('Error fetching event details:', error);
        setFetchError(error.message || 'Failed to fetch event details.');
        return null;
      }
      return data as EventType | null;
    }

    if (eventId) {
      setIsLoading(true);
      setFetchError(null);
      getEventDetails(eventId).then(data => {
        setEvent(data);
        setIsLoading(false);
        if (!data && !fetchError) {
            setFetchError("Event not found.");
        }
      });
    } else {
        setIsLoading(false);
        setFetchError("No event ID provided.");
    }
  }, [eventId, fetchError]); // fetchError was in deps, keep it or remove? Usually not needed.


  const handlePurchaseSuccess = (details: { eventTitle: string; ticketQuantity: number; purchaseRecord: TicketPurchase }) => {
    toast({
      title: "Purchase Successful!",
      description: (
        <div className="font-body">
          <p>You've purchased {details.ticketQuantity} ticket(s) for "{details.eventTitle}".</p>
          <p className="mt-1 text-xs">Your e-tickets will be sent to your email.</p>
        </div>
      ),
      variant: "default",
      duration: 7000,
    });
  };


  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl font-body text-muted-foreground">Loading event details...</p>
        </div>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center">
        <Frown className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-headline font-semibold text-destructive mb-2">
          {fetchError && fetchError.includes("Event not found") ? "Event Not Found" : "Error Loading Event"}
        </h1>
        <p className="font-body text-muted-foreground mb-6">
          {fetchError || "Sorry, we couldn't find or load the event you're looking for."}
        </p>
        <Button asChild variant="outline">
          <Link href="/attendee">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
          </Link>
        </Button>
      </div>
    );
  }

  const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'Date not available';

  const organizerForDisplay = event.organizer as (UserProfile & { id?: string });
  const organizerIdForLink = organizerForDisplay?.auth_user_id || (organizerForDisplay as any)?.id;

  const canPurchaseTickets = event.venue_booking_status === 'approved' || 
                             event.venue_booking_status === 'not_requested' || 
                             !event.venue_booking_status; // Allow if status is null/undefined or not_requested (e.g. online event)

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <Button asChild variant="outline" className="font-body self-start mb-4">
          <Link href="/attendee">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
          </Link>
      </Button>

      {event.venue_booking_status === 'pending' && event.venue && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400">
          <Info className="h-5 w-5" />
          <AlertTitle className="font-headline">Venue Confirmation Pending</AlertTitle>
          <AlertDescription className="font-body">
            The venue for this event ({event.venue.name}) is currently pending confirmation from platform administrators. Ticket purchases may be enabled once confirmed.
          </AlertDescription>
        </Alert>
      )}
      {event.venue_booking_status === 'rejected' && event.venue && (
         <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-headline">Venue Not Available</AlertTitle>
          <AlertDescription className="font-body">
            The requested venue for this event ({event.venue.name}) was not approved. The organizer is working on securing an alternative or updating event details.
            {event.admin_notes_venue_booking && <p className="mt-1 text-xs italic">Admin note: {event.admin_notes_venue_booking}</p>}
          </AlertDescription>
        </Alert>
      )}


      <Card className="overflow-hidden shadow-xl">
        <Image
          src={event.image_url || 'https://placehold.co/1200x500.png'}
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
              <span>{event.venue && event.venue_booking_status !== 'rejected' ? `${event.venue.name}, ${event.venue.city}` : event.location}</span>
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
                <Button 
                    className="w-full mt-4 font-body" 
                    size="lg" 
                    onClick={() => setIsPurchaseDialogOpen(true)}
                    disabled={!canPurchaseTickets || event.venue_booking_status === 'pending' || event.venue_booking_status === 'rejected'}
                >
                  Purchase Tickets
                </Button>
                 {(!canPurchaseTickets && (event.venue_booking_status === 'pending' || event.venue_booking_status === 'rejected')) && (
                    <p className="text-xs text-muted-foreground mt-2 font-body text-center">
                        Ticket sales are disabled as the venue is {event.venue_booking_status}.
                    </p>
                )}
              </CardContent>
            </Card>

            {organizerForDisplay && organizerIdForLink && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/organizer/${organizerIdForLink}`} className="block group">
                    <div className="flex items-center gap-3">
                        <Image
                            src={organizerForDisplay.profile_picture_url || 'https://placehold.co/48x48.png'}
                            alt={organizerForDisplay.name}
                            width={48} height={48}
                            className="rounded-full"
                            data-ai-hint="person avatar"
                        />
                        <div>
                            <p className="font-body text-lg font-semibold group-hover:text-primary transition-colors">
                                {organizerForDisplay.name}
                            </p>
                            {organizerForDisplay.organization_name && (
                                <p className="font-body text-xs text-muted-foreground">
                                    {organizerForDisplay.organization_name}
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

          {event.venue && event.venue_booking_status !== 'rejected' && (
            <Card className="bg-secondary/30">
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center">
                        <Building className="h-5 w-5 mr-2 text-primary" />
                        Venue Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="font-body space-y-1">
                    <p className="font-semibold">{event.venue.name}</p>
                    <p>{event.venue.address || 'Address not available'}</p>
                    <p>{event.venue.city}{event.venue.state_province ? `, ${event.venue.state_province}` : ''}{event.venue.country ? `, ${event.venue.country}`: ''}</p>
                     {event.venue_booking_status === 'pending' && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold italic"> (Venue booking pending confirmation)</p>
                    )}
                </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      <TicketPurchaseDialog
        event={event}
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}

