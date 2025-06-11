
import type { Event } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Ticket, Heart, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Use the 'organizer' property which now holds the joined data
  const organizerDisplayName = event.organizer?.organization_name || event.organizer?.name || 'Unknown Organizer';

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0 relative">
        <Image
          src={event.image_url || 'https://placehold.co/600x400.png'}
          alt={event.title}
          width={600}
          height={400}
          className="w-full h-48 object-cover"
          data-ai-hint="event concert"
        />
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="font-headline text-xl mb-2 leading-tight hover:text-primary transition-colors">
          <Link href={`/event/${event.event_id}`}>{event.title}</Link>
        </CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground font-body">
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-2 text-primary" />
            <span>{eventDate} &bull; {event.time}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-primary" />
            <span>{event.ticket_price_range}</span>
          </div>
          <div className="flex items-center">
            <Ticket className="h-4 w-4 mr-2 text-primary" />
            <span>Category: {event.category}</span>
          </div>
           {event.organizer && ( // Check if organizer info is available (now using event.organizer)
             <div className="flex items-center text-xs pt-1">
              <Users className="h-4 w-4 mr-2 text-primary" />
              <span>
                Organized by: <Link href={`/organizer/${event.organizer_id}`} className="text-primary hover:underline">{organizerDisplayName}</Link>
              </span>
            </div>
           )}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <div className="flex gap-2 w-full">
            <Button variant="outline" className="w-full font-body" asChild>
                 <Link href={`/event/${event.event_id}`}>View Details</Link>
            </Button>
            <Button variant="ghost" size="icon" className="border border-border hover:bg-destructive/10 hover:text-destructive group">
                <Heart className="h-5 w-5 text-muted-foreground group-hover:fill-destructive" />
                <span className="sr-only">Save event</span>
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
