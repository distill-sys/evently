import OrganizerCard from '@/components/organizers/OrganizerCard';
import EventCard from '@/components/events/EventCard';
import { mockOrganizers, mockEvents } from '@/lib/mockData';
import type { Organizer as OrganizerType, Event as EventType } from '@/lib/types';
import { Frown } from 'lucide-react';

interface OrganizerPageProps {
  params: { organizerId: string };
}

// This is a server component
export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const organizerId = params.organizerId;
  // In a real app, you'd fetch this data from a database or API
  const organizer: OrganizerType | undefined = mockOrganizers.find(org => org.id === organizerId || org.id === 'org-mock-user-id' || org.name.toLowerCase().includes(organizerId.toLowerCase())); //Added fallback logic for mock user id

  const organizerEvents: EventType[] = mockEvents.filter(event => event.organizerId === organizer?.id);

  if (!organizer) {
    return (
      <div className="text-center py-16">
        <Frown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-semibold">Organizer Not Found</h1>
        <p className="font-body text-muted-foreground mt-2">
          Sorry, we couldn&apos;t find the organizer you&apos;re looking for.
        </p>
      </div>
    );
  }
  
  // If mock organizerId is the user's ID, update name and bio for display
  // This is a hack for the mock scenario where user.id is used for organizerId
  let displayOrganizer = {...organizer};
  if (organizerId.startsWith('mock-user-')) {
      displayOrganizer.name = "My Organizer Profile (Mock)";
      displayOrganizer.bio = "This is a mock organizer profile page. As an organizer, you can showcase your events and tell attendees more about your organization here.";
      displayOrganizer.profilePictureUrl = 'https://placehold.co/120x120.png'; // Default for mock user-as-organizer
  }


  return (
    <div className="space-y-12">
      <OrganizerCard organizer={displayOrganizer} />

      <section>
        <h2 className="text-3xl font-headline font-semibold mb-8 text-center md:text-left">
          Events by {displayOrganizer.name}
        </h2>
        {organizerEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizerEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow">
             <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-muted-foreground">
              {displayOrganizer.name} has no upcoming events listed.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
