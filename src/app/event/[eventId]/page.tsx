import { mockEvents, mockOrganizers } from '@/lib/mockData';
import type { Event as EventType, Organizer as OrganizerType } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Ticket, Users, DollarSign, ArrowLeft } from 'lucide-react';

interface EventPageProps {
  params: { eventId: string };
}

// This is a server component
export default async function EventPage({ params }: EventPageProps) {
  const eventId = params.eventId;
  // In a real app, you'd fetch this data from a database or API
  const event: EventType | undefined = mockEvents.find(e => e.id === eventId);
  const organizer: OrganizerType | undefined = event ? mockOrganizers.find(org => org.id === event.organizerId) : undefined;

  if (!event) {
    return (
      <div className="text-center py-16">
        <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-semibold">Event Not Found</h1>
        <p className="font-body text-muted-foreground mt-2">
          Sorry, we couldn&apos;t find the event you&apos;re looking for.
        </p>
        <Button asChild variant="link" className="mt-4 font-body">
          <Link href="/attendee">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <Button asChild variant="outline" className="font-body self-start mb-4">
          <Link href="/attendee">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
          </Link>
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <Image
          src={event.imageUrl}
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
              <span>{event.location}</span>
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
                <p className="font-body text-lg">{event.ticketPriceRange}</p>
                <Button className="w-full mt-4 font-body" size="lg">Get Tickets (Mock)</Button>
              </CardContent>
            </Card>
            {organizer && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/organizer/${organizer.id}`} className="block group">
                    <div className="flex items-center gap-3">
                        <Image src={organizer.profilePictureUrl} alt={organizer.name} width={48} height={48} className="rounded-full" data-ai-hint="person avatar" />
                        <div>
                            <p className="font-body text-lg font-semibold group-hover:text-primary transition-colors">{organizer.name}</p>
                            <p className="font-body text-sm text-muted-foreground group-hover:text-primary transition-colors">View Profile &rarr;</p>
                        </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generate static paths for mock events if needed for SSG, though for this dynamic route it's usually SSR/ISR.
// export async function generateStaticParams() {
//   return mockEvents.map((event) => ({
//     eventId: event.id,
//   }));
// }
