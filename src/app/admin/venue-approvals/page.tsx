
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Event as EventType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Frown, ArrowLeft, CheckSquare, AlertTriangle, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminVenueApprovalsPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [pendingEvents, setPendingEvents] = useState<EventType[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actioningEventId, setActioningEventId] = useState<string | null>(null);

  const fetchPendingVenueApprovals = useCallback(async () => {
    if (role !== 'admin') return;

    setIsLoadingData(true);
    setFetchError(null);
    const selectQuery = `
        event_id,
        title,
        date,
        venue_booking_status,
        organizer:users ( name ),
        venue:venues ( name )
      `;
    const { data, error } = await supabase
      .from('events')
      .select(selectQuery)
      .not('venue_id', 'is', null) 
      .eq('venue_booking_status', 'pending')
      .order('date', { ascending: true });

    if (error) {
      let descriptiveError = 'Could not fetch pending venue approvals. Please try again later.';
      if (error && typeof error === 'object') {
        if (error.message) {
          descriptiveError = `Error fetching approvals: ${error.message}`;
          console.error(
            `Error fetching pending venue approvals - Message: ${error.message}, Code: ${error.code}, Details: ${error.details}, Hint: ${error.hint}`
          );
        } else if (Object.keys(error).length === 0) {
          descriptiveError = 'An empty error object was received while fetching venue approvals. This often indicates an RLS issue or a silent failure in a Supabase query. Please check your Supabase logs and RLS policies for the "events", "users", and "venues" tables.';
          console.error(descriptiveError);
        } else {
           try {
             const errorString = JSON.stringify(error, null, 2);
             descriptiveError = `Received a non-standard error object while fetching approvals: ${errorString}`;
             console.error('Non-standard error object details:', errorString);
           } catch (e) {
             descriptiveError = 'Received a non-standard error object that could not be stringified while fetching approvals. Check the raw error object logged above.';
             console.error('Non-standard error object (unstringifiable):', error);
           }
        }
      } else if (error) {
        descriptiveError = `Received an error: ${String(error)}`;
        console.error('Error fetching pending venue approvals (non-object):', error);
      }
      setFetchError(descriptiveError);
      setPendingEvents([]);
    } else {
      setPendingEvents(data as EventType[] || []);
    }
    setIsLoadingData(false);
  }, [role]);

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || role !== 'admin') {
        router.push('/login');
      } else {
        fetchPendingVenueApprovals();
      }
    }
  }, [authLoading, authUser, role, router, fetchPendingVenueApprovals]);

  const handleApprovalAction = async (eventId: string, newStatus: 'approved' | 'rejected') => {
    setActioningEventId(eventId);
    const { error } = await supabase
      .from('events')
      .update({ venue_booking_status: newStatus, updated_at: new Date().toISOString() })
      .eq('event_id', eventId);
    
    setActioningEventId(null);
    if (error) {
      toast({
        title: `Error ${newStatus === 'approved' ? 'Approving' : 'Rejecting'} Venue`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: `Venue ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The venue booking status for the event has been updated.`,
      });
      fetchPendingVenueApprovals(); 
    }
  };


  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading venue approvals...</p>
      </div>
    );
  }

  if (!authUser || role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-body text-muted-foreground">Access Denied.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CheckSquare className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Venue Booking Approvals</h1>
            <p className="text-md font-body text-muted-foreground">Manage pending venue requests for events.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
        </Button>
      </div>

      {fetchError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Frown className="mr-2 h-6 w-6" /> Error Fetching Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={fetchPendingVenueApprovals} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : pendingEvents.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <CardTitle className="font-headline text-2xl">No Pending Approvals</CardTitle>
            <CardDescription className="font-body">There are currently no venue booking requests awaiting approval.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests ({pendingEvents.length})</CardTitle>
            <CardDescription>Review and act on these venue booking requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Event Title</TableHead>
                  <TableHead className="font-headline">Organizer</TableHead>
                  <TableHead className="font-headline">Venue Requested</TableHead>
                  <TableHead className="font-headline">Event Date</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEvents.map((event) => (
                  <TableRow key={event.event_id} className="font-body">
                    <TableCell className="font-semibold">{event.title}</TableCell>
                    <TableCell>{typeof event.organizer === 'object' && event.organizer !== null && 'name' in event.organizer ? event.organizer.name : 'N/A'}</TableCell>
                    <TableCell>{typeof event.venue === 'object' && event.venue !== null && 'name' in event.venue ? event.venue.name : 'N/A'}</TableCell>
                    <TableCell>
                      {event.date ? format(new Date(event.date), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleApprovalAction(event.event_id, 'approved')}
                        disabled={actioningEventId === event.event_id}
                        className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                      >
                        {actioningEventId === event.event_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleApprovalAction(event.event_id, 'rejected')}
                        disabled={actioningEventId === event.event_id}
                      >
                         {actioningEventId === event.event_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        Reject
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

