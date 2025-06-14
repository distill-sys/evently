
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Venue, Event as EventType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Edit, CalendarIcon, Save, Frown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format, parseISO } from 'date-fns';

const NO_VENUE_SENTINEL_VALUE = "--no-venue--";

// Re-using the schema from create event page
const eventSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  date: z.date({ required_error: "Event date is required." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s(AM|PM))?$/, { message: "Invalid time format (e.g., 10:00 AM or 14:30)." }),
  location: z.string().optional(),
  venue_id: z.string().uuid({ message: "Invalid venue ID." }).optional().nullable(),
  category: z.string().min(2, { message: "Category is required." }),
  ticketPriceRange: z.string().min(1, { message: "Ticket price/range is required (e.g., Free, $20, $15-$40)." }),
  imageUrl: z.string().url({ message: "Invalid image URL." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.venue_id && data.venue_id !== NO_VENUE_SENTINEL_VALUE) {
      return true; 
    }
    return !!data.location && data.location.trim().length >= 3;
  }, {
    message: "Event location details (min 3 chars) are required if no venue is selected.",
    path: ["location"],
});

type EventFormData = z.infer<typeof eventSchema>;

export default function EditEventPage() {
  const { user: authUser, role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const { toast } = useToast();

  const [eventData, setEventData] = useState<EventType | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Pick<Venue, 'venue_id' | 'name'>[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      date: undefined,
      time: '',
      location: '',
      venue_id: null,
      category: '',
      ticketPriceRange: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (!authLoading && (!authUser || authRole !== 'organizer')) {
      toast({ title: "Access Denied", description: "You must be logged in as an organizer.", variant: "destructive" });
      router.push('/login');
    }
  }, [authUser, authRole, authLoading, router, toast]);

  useEffect(() => {
    async function fetchVenuesData() {
      setIsLoadingVenues(true);
      const { data, error } = await supabase
        .from('venues')
        .select('venue_id, name')
        .order('name', { ascending: true });

      if (error) {
        setVenues([]);
      } else {
        setVenues(data || []);
      }
      setIsLoadingVenues(false);
    }
    if (authRole === 'organizer') {
        fetchVenuesData();
    }
  }, [authRole]);

  useEffect(() => {
    async function fetchEventData() {
      if (!eventId || !authUser) return;
      setIsLoadingPageData(true);
      setFetchError(null);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error || !data) {
        setFetchError('Could not fetch event data or event not found.');
        setEventData(null);
      } else if (data.organizer_id !== authUser.id) {
        setFetchError('You are not authorized to edit this event.');
        setEventData(null);
        toast({ title: "Access Denied", description: "You can only edit your own events.", variant: "destructive" });
        router.push(`/organizer/${authUser.id}`);
      } else {
        setEventData(data as EventType);
        form.reset({
          title: data.title,
          description: data.description,
          date: data.date ? parseISO(data.date) : undefined,
          time: data.time,
          location: data.location || '',
          venue_id: data.venue_id || null, // Will be handled by sentinel value if null
          category: data.category,
          ticketPriceRange: data.ticket_price_range,
          imageUrl: data.image_url || '',
        });
      }
      setIsLoadingPageData(false);
    }

    if (!authLoading && authUser && authRole === 'organizer') {
      fetchEventData();
    }
  }, [eventId, authUser, authRole, authLoading, form, router, toast]);


  const onSubmit = async (data: EventFormData) => {
    if (!authUser?.id || authRole !== 'organizer' || !eventData) {
      toast({ title: "Error", description: "Cannot save event. Authorization or data missing.", variant: "destructive" });
      return;
    }
    if (eventData.organizer_id !== authUser.id) {
      toast({ title: "Access Denied", description: "You can only edit your own events.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const actualVenueId = data.venue_id === NO_VENUE_SENTINEL_VALUE ? null : data.venue_id;
    let newVenueBookingStatus = eventData.venue_booking_status;

    if (actualVenueId !== eventData.venue_id) { // If venue has changed
      newVenueBookingStatus = actualVenueId ? 'pending' : 'not_requested';
    } else if (actualVenueId && !eventData.venue_booking_status) { // If venue was selected but had no status before
        newVenueBookingStatus = 'pending';
    }


    const eventPayload: Partial<EventType> = { // Use Partial<EventType>
      title: data.title,
      description: data.description,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      location: data.location || (actualVenueId ? '' : 'Online'),
      venue_id: actualVenueId,
      category: data.category,
      ticket_price_range: data.ticketPriceRange,
      image_url: data.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.title)}`,
      updated_at: new Date().toISOString(),
      venue_booking_status: newVenueBookingStatus,
    };

    const { error } = await supabase
      .from('events')
      .update(eventPayload)
      .eq('event_id', eventId);

    setIsSaving(false);
    if (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error Updating Event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event Updated!",
        description: `Event "${data.title}" has been successfully updated.`,
      });
      router.push(`/organizer/${authUser.id}`);
    }
  };

  if (authLoading || isLoadingPageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  if (fetchError) {
     return (
      <Card className="max-w-3xl mx-auto bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <Frown className="mr-2 h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-destructive">{fetchError}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href={authUser ? `/organizer/${authUser.id}` : '/login'}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!eventData) {
    return <p className="text-center font-body">Event not found or you are not authorized.</p>;
  }


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Edit className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Edit Event: {eventData.title}</h1>
            <p className="text-md font-body text-muted-foreground">Make changes to your event details below.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/organizer/${authUser?.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Profile
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Update the information for your event. Current venue booking status: <span className="font-semibold">{eventData.venue_booking_status || 'Not Set'}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Event Title</FormLabel>
                    <FormControl><Input {...field} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Description</FormLabel>
                    <FormControl><Textarea {...field} className="font-body" rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-headline mb-1">Event Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal font-body ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Time</FormLabel>
                      <FormControl><Input {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Venue (Optional)</FormLabel>
                    <Select
                        onValueChange={(value) => field.onChange(value === NO_VENUE_SENTINEL_VALUE ? null : value)}
                        value={field.value || NO_VENUE_SENTINEL_VALUE}
                        disabled={isLoadingVenues}
                    >
                      <FormControl>
                        <SelectTrigger className="font-body">
                          {isLoadingVenues && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <SelectValue placeholder={isLoadingVenues ? "Loading venues..." : "Select a venue or choose 'No specific venue'"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_VENUE_SENTINEL_VALUE} className="font-body text-muted-foreground italic">
                          No specific venue / Online
                        </SelectItem>
                        {venues.map((venue) => (
                          <SelectItem key={venue.venue_id} value={venue.venue_id} className="font-body">
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">
                        Event Location Details <span className="text-xs text-muted-foreground font-normal">(e.g., specific address if no venue, or "Online")</span>
                    </FormLabel>
                    <FormControl><Input {...field} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Category</FormLabel>
                      <FormControl><Input {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ticketPriceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Ticket Price / Range</FormLabel>
                      <FormControl><Input {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Event Image URL (Optional)</FormLabel>
                    <FormControl><Input type="url" {...field} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSaving || isLoadingVenues} className="font-body">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

