
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Venue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Frown, ArrowLeft, Edit, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Re-using the schema from add venue page for consistency
const venueSchema = z.object({
  name: z.string().min(3, { message: "Venue name must be at least 3 characters." }),
  address: z.string().min(5, { message: "Address is required." }),
  city: z.string().min(2, { message: "City is required." }),
  stateProvince: z.string().optional(),
  country: z.string().min(2, { message: "Country is required." }),
  capacity: z.coerce.number().int().positive("Capacity must be a positive number.").optional().nullable(),
  description: z.string().optional(),
  amenities: z.string().optional(), // Comma-separated, will be converted to array for DB, back to string for form
  contactEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  imageUrl: z.string().url({ message: "Invalid URL for image." }).optional().or(z.literal('')),
});

type VenueFormData = z.infer<typeof venueSchema>;

export default function AdminEditVenuePage() {
  const { user: authUser, role: adminRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const venueId = params.venueId as string;
  const { toast } = useToast();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const form = useForm<VenueFormData>({
    resolver: zodResolver(venueSchema),
    defaultValues: { // Default values will be overwritten by fetched data
      name: '',
      address: '',
      city: '',
      stateProvince: '',
      country: '',
      capacity: null,
      description: '',
      amenities: '',
      contactEmail: '',
      contactPhone: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (!authLoading && (!authUser || adminRole !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, adminRole, authLoading, router]);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (adminRole === 'admin' && venueId) {
        setIsLoadingData(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('venue_id', venueId)
          .single();

        if (error) {
          console.error('Error fetching venue data:', error);
          setFetchError('Could not fetch venue data. Please try again later.');
        } else if (data) {
          form.reset({
            ...data,
            amenities: data.amenities ? data.amenities.join(', ') : '', // Convert array to comma-separated string for form
            capacity: data.capacity ?? null, // Ensure capacity is number or null
          });
        } else {
            setFetchError('Venue not found.');
        }
        setIsLoadingData(false);
      }
    };

    if (!authLoading && authUser && adminRole === 'admin') {
      fetchVenueData();
    }
  }, [authLoading, authUser, adminRole, venueId, form]);

  const onSubmit = async (data: VenueFormData) => {
    if (!venueId) return;
    setIsSaving(true);

    const amenitiesArray = data.amenities?.split(',').map(item => item.trim()).filter(item => item) || null;

    const { error } = await supabase
      .from('venues')
      .update({
        name: data.name,
        address: data.address,
        city: data.city,
        state_province: data.stateProvince || null,
        country: data.country,
        capacity: data.capacity || null,
        description: data.description || null,
        amenities: amenitiesArray,
        contact_email: data.contactEmail || null,
        contact_phone: data.contactPhone || null,
        image_url: data.imageUrl || null,
        // created_by is not updated
      })
      .eq('venue_id', venueId);

    setIsSaving(false);
    if (error) {
      console.error('Error updating venue:', error);
      toast({
        title: "Error Updating Venue",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Venue Updated",
        description: `Venue "${data.name}" has been successfully updated.`,
      });
      router.push('/admin/venues');
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading venue details...</p>
      </div>
    );
  }

  if (!authUser || adminRole !== 'admin') {
    // Fallback, should be handled by useEffect redirect
    return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  if (fetchError) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <Frown className="mr-2 h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-destructive">{fetchError}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/admin/venues">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Venue List
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Edit className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Edit Venue: {form.getValues('name')}</h1>
            <p className="text-md font-body text-muted-foreground">Modify details for venue ID: {venueId}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/venues">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Venue List
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Venue Details</CardTitle>
              <CardDescription>Update the information for this venue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Venue Name</FormLabel>
                    <FormControl><Input placeholder="e.g., The Grand Ballroom" {...field} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Address</FormLabel>
                      <FormControl><Input placeholder="123 Main Street" {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">City</FormLabel>
                      <FormControl><Input placeholder="San Francisco" {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="stateProvince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">State/Province</FormLabel>
                      <FormControl><Input placeholder="CA" {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Country</FormLabel>
                      <FormControl><Input placeholder="USA" {...field} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem className="md:w-1/2">
                      <FormLabel className="font-headline">Capacity</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="500" 
                            {...field} 
                            value={field.value === null || field.value === undefined ? '' : field.value}
                            onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                            className="font-body" 
                        />
                      </FormControl>
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
                    <FormControl><Textarea placeholder="A brief description of the venue..." {...field} value={field.value ?? ''} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Amenities (comma-separated)</FormLabel>
                    <FormControl><Input placeholder="WiFi, Projector, Stage" {...field} value={field.value ?? ''} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Contact Email</FormLabel>
                      <FormControl><Input type="email" placeholder="contact@venue.com" {...field} value={field.value ?? ''} className="font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Contact Phone</FormLabel>
                      <FormControl><Input placeholder="(555) 123-4567" {...field} value={field.value ?? ''} className="font-body" /></FormControl>
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
                    <FormLabel className="font-headline">Image URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} className="font-body" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSaving} className="font-body">
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
