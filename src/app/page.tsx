
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import EventCard from '@/components/events/EventCard';
import type { Event } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { CalendarDays, MapPin, Search } from 'lucide-react';

async function getFeaturedEvents(): Promise<Event[]> {
  // Fetch a few events, e.g., order by creation date or a specific 'featured' flag if you add one.
  // Joining with users table to get organizer name.
  // The 'users' table is aliased to 'users' in the select if not specified otherwise with a custom alias.
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
      users (
        name,
        organization_name
      )
    `)
    .limit(3) // Get 3 featured events
    .order('created_at', { ascending: false }); // Example: newest events first

  if (error) {
    console.error('Error fetching featured events:', error);
    return [];
  }
  // Supabase returns the joined table as a property with the table name, e.g., event.users
  return data as Event[] || [];
}


export default async function HomePage() {
  const featuredEvents = await getFeaturedEvents();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-br from-primary/10 via-background to-background rounded-lg shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary mb-6">
            Discover Your Next Experience
          </h1>
          <p className="text-xl font-body text-muted-foreground mb-10 max-w-2xl mx-auto">
            Evently helps you find and join exciting events happening near you or online. From concerts to conferences, your next adventure starts here.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/attendee" className="font-body">
                <Search className="mr-2 h-5 w-5" /> Explore Events
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/sign-up" className="font-body">
                Join Evently Today
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works / Features Overview Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-4xl font-headline font-semibold text-center mb-12">How Evently Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <Search className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-headline font-medium mb-2">Find Events</h3>
            <p className="font-body text-muted-foreground">
              Easily search and filter events by category, date, location, and more.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <CalendarDays className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-headline font-medium mb-2">Stay Organized</h3>
            <p className="font-body text-muted-foreground">
              Save your favorite events and get personalized recommendations.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <MapPin className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-headline font-medium mb-2">Connect & Go</h3>
            <p className="font-body text-muted-foreground">
              Connect with organizers and experience events like never before.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-4xl font-headline font-semibold text-center mb-12">Featured Events</h2>
        {featuredEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-center font-body text-muted-foreground">No featured events available at the moment. Check back soon!</p>
        )}
        <div className="text-center mt-12">
          <Button size="lg" variant="link" asChild>
            <Link href="/attendee" className="font-body text-lg">
              View All Events &rarr;
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
