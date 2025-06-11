
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Venue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, PlusCircle, CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';

const eventSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  date: z.date({ required_error: "Event date is required." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s(AM|PM))?$/, { message: "Invalid time format (e.g., 10:00 AM or 14:30)." }),
  location: z.string().min(3, { message: "Location is required if no venue is selected." }),
  venue_id: z.string().uuid({ message: "Invalid venue ID." }).optional().nullable(),
  category: z.string().min(2, { message: "Category is required." }),
  ticketPriceRange: z.string().min(1, { message: "Ticket price/range is required (e.g., Free, $20, $15-$40)." }),
  imageUrl: z.string().url({ message: "Invalid image URL." }).optional().or(z.literal('')),
}).refine(data => data.venue_id || data.location, {
    message: "Either a venue must be selected or a location manually entered.",
    path: ["location"], 
});


type EventFormData = z.infer<typeof eventSchema>;

const NO_VENUE_SENTINEL_VALUE = "--no-venue--"; // Sentinel value for 'No venue' option

export default function CreateEventPage() {
  const { user: authUser, role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
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
      toast({ title: "Access Denied", description: "You must be logged in as an organizer to create events.", variant: "destructive" });
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
        console.error('Error fetching venues:', error);
        toast({ title: "Error", description: "Could not fetch venues for selection.", variant: "destructive" });
        setVenues([]);
      } else {
        setVenues(data || []);
      }
      setIsLoadingVenues(false);
    }
    if (authRole === 'organizer') {
        fetchVenuesData();
    }
  }, [toast, authRole]);

  const onSubmit = async (data: EventFormData) => {
    if (!authUser?.id || authRole !== 'organizer') {
      toast({ title: "Authentication Error", description: "Organizer user ID not found or invalid role.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const eventPayload = {
      title: data.title,
      description: data.description,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      location: data.location, 
      venue_id: data.venue_id || null,
      category: data.category,
      ticket_price_range: data.ticketPriceRange,
      image_url: data.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.title)}`,
      organizer_id: authUser.id,
    };

    const { error } = await supabase.from('events').insert([eventPayload]);

    setIsSaving(false);
    if (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error Creating Event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event Created!",
        description: `Event "${data.title}" has been successfully created.`,
      });
      router.push(`/organizer/${authUser.id}`);
    }
  };

  if (authLoading || !authUser || authRole !== 'organizer') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PlusCircle className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Create New Event</h1>
            <p className="text-md font-body text-muted-foreground">Fill in the details for your new event.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/organizer/${authUser.id}`}>
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
              <CardDescription>Provide all the necessary information for your event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Event Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Annual Summer Music Fest" {...field} className="font-body" /></FormControl>
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
                    <FormControl><Textarea placeholder="Tell attendees all about your event..." {...field} className="font-body" rows={4} /></FormControl>
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
                      <FormControl><Input placeholder="e.g., 7:00 PM or 19:00" {...field} className="font-body" /></FormControl>
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
                        value={field.value || ""} // If field.value is null, Select shows placeholder
                        disabled={isLoadingVenues}
                    >
                      <FormControl>
                        <SelectTrigger className="font-body">
                          {isLoadingVenues && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <SelectValue placeholder={isLoadingVenues ? "Loading venues..." : "Select a venue"} />
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
                    <FormControl><Input placeholder="123 Main St, City OR Online" {...field} className="font-body" /></FormControl>
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
                      <FormControl><Input placeholder="e.g., Music, Technology, Workshop" {...field} className="font-body" /></FormControl>
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
                      <FormControl><Input placeholder="e.g., Free, $25, $50-$100" {...field} className="font-body" /></FormControl>
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
                    <FormControl><Input type="url" placeholder="https://example.com/event-image.png" {...field} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSaving || isLoadingVenues} className="font-body">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Event
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
