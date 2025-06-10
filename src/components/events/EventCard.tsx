import type { Event } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Ticket, Heart, DollarSign } from 'lucide-react';
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

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0 relative">
        <Image
          src={event.imageUrl}
          alt={event.title}
          width={600}
          height={400}
          className="w-full h-48 object-cover"
          data-ai-hint="event concert"
        />
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="font-headline text-xl mb-2 leading-tight hover:text-primary transition-colors">
          <Link href={`/event/${event.id}`}>{event.title}</Link>
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
            <span>{event.ticketPriceRange}</span>
          </div>
          <div className="flex items-center">
            <Ticket className="h-4 w-4 mr-2 text-primary" />
            <span>Category: {event.category}</span>
          </div>
           {event.organizerName && (
             <p className="text-xs pt-1">
              Organized by: <Link href={`/organizer/${event.organizerId}`} className="text-primary hover:underline">{event.organizerName}</Link>
            </p>
           )}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <div className="flex gap-2 w-full">
            <Button variant="outline" className="w-full font-body" asChild>
                 <Link href={`/event/${event.id}`}>View Details</Link>
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
