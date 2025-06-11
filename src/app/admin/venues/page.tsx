
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Venue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Frown, ArrowLeft, Building, Edit, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminVenuesPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!authUser || role !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, role, authLoading, router]);

  useEffect(() => {
    const fetchVenues = async () => {
      if (role === 'admin') {
        setIsLoadingData(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from('venues')
          .select(`
            *,
            creator:users (name)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(
            'Error fetching venues. Message:', error.message, 
            'Details:', error.details, 
            'Hint:', error.hint, 
            'Code:', error.code
          );
          if (Object.keys(error).length === 0 || (!error.message && !error.details && !error.hint && !error.code)) {
            console.error('Full error object was empty or lacked specific details. Query was: supabase.from(\'venues\').select(`*, creator:users (name)`).order(\'created_at\', { ascending: false })');
          } else {
            console.error('Full error object:', JSON.stringify(error, null, 2));
          }
          setFetchError('Could not fetch venues. Please try again later.');
          setVenues([]);
        } else {
          setVenues(data as Venue[] || []);
        }
        setIsLoadingData(false);
      }
    };

    if (!authLoading && authUser && role === 'admin') {
      fetchVenues();
    }
  }, [authLoading, authUser, role]);

  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading venue data...</p>
      </div>
    );
  }

  if (!authUser || role !== 'admin') {
    return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Building className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Venue Management</h1>
            <p className="text-md font-body text-muted-foreground">View, add, and manage event venues.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin Panel
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/venues/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Venue
            </Link>
          </Button>
        </div>
      </div>

      {fetchError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Frown className="mr-2 h-6 w-6" /> Error Fetching Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
          </CardContent>
        </Card>
      ) : venues.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Frown className="mr-2 h-6 w-6 text-muted-foreground" /> No Venues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-muted-foreground">There are no venues in the system yet. Add one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Venues ({venues.length})</CardTitle>
            <CardDescription>A list of all venues available in the Evently platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline">Location</TableHead>
                  <TableHead className="font-headline">Capacity</TableHead>
                  <TableHead className="font-headline">Added By</TableHead>
                  <TableHead className="font-headline">Date Added</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((venue) => (
                  <TableRow key={venue.venue_id} className="font-body">
                    <TableCell className="font-semibold">{venue.name}</TableCell>
                    <TableCell>{venue.city}, {venue.country}</TableCell>
                    <TableCell>{venue.capacity || 'N/A'}</TableCell>
                    <TableCell>{venue.creator?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {venue.created_at ? format(new Date(venue.created_at), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/venues/${venue.venue_id}/edit`}>
                           <Edit className="mr-1 h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
