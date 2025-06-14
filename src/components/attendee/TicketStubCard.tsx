
'use client';

import Image from 'next/image';
import type { TicketPurchase } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, MinusCircle, CheckCircle, Clock, Tag, Hash } from 'lucide-react';
import { format } from 'date-fns';

interface TicketStubCardProps {
  ticket: TicketPurchase;
  onCancel: (purchaseId: string) => void;
  isCancelling: boolean;
}

export default function TicketStubCard({ ticket, onCancel, isCancelling }: TicketStubCardProps) {
  const event = ticket.events;

  if (!event) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 animate-pulse">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Error Loading Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">Event details could not be loaded for this ticket.</p>
        </CardContent>
      </Card>
    );
  }

  const purchaseDate = ticket.purchase_date ? format(new Date(ticket.purchase_date), 'PPpp') : 'N/A';
  const eventDate = event.date ? format(new Date(event.date), 'PPP') : 'Date N/A';

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col md:flex-row overflow-hidden">
      <div className="md:w-1/3 relative">
        <Image
          src={event.image_url || 'https://placehold.co/300x200.png'}
          alt={event.title || 'Event Image'}
          width={300}
          height={200}
          className="w-full h-48 md:h-full object-cover"
          data-ai-hint="event ticket"
        />
      </div>
      <div className="md:w-2/3 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-xl leading-tight mb-1">{event.title}</CardTitle>
          <div className="flex items-center text-xs text-muted-foreground font-body">
            <Tag className="h-3 w-3 mr-1.5" />
            Purchased: {purchaseDate}
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 space-y-2 flex-grow">
          <div className="flex items-center text-sm text-foreground font-body">
            <CalendarDays className="h-4 w-4 mr-2 text-primary" />
            <span>{eventDate} at {event.time}</span>
          </div>
          <div className="flex items-center text-sm text-foreground font-body">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span>{event.location}</span>
          </div>
           <div className="flex items-center text-sm text-foreground font-body">
            <Hash className="h-4 w-4 mr-2 text-primary" />
            <span>Quantity: {ticket.quantity}</span>
          </div>
          <div className="flex items-center text-sm font-body">
            {ticket.status === 'confirmed' ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : ticket.status === 'cancelled' ? (
              <MinusCircle className="h-4 w-4 mr-2 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
            )}
            <span className={`capitalize font-semibold ${
                ticket.status === 'confirmed' ? 'text-green-600' :
                ticket.status === 'cancelled' ? 'text-destructive' :
                'text-yellow-600'
            }`}>
                Status: {ticket.status || 'Unknown'}
            </span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          {ticket.status === 'confirmed' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(ticket.purchase_id)}
              disabled={isCancelling}
              className="font-body w-full md:w-auto"
            >
              <MinusCircle className="mr-2 h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel & Refund Ticket'}
            </Button>
          )}
          {ticket.status === 'cancelled' && (
            <p className="font-body text-sm text-muted-foreground">This ticket has been cancelled.</p>
          )}
        </CardFooter>
      </div>
    </Card>
  );
}
