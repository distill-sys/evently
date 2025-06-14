
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Corrected import
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Frown, BarChart3, ArrowLeft, Ticket, CalendarDays, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Event as EventType, UserProfile } from '@/lib/types';

interface EventAnalytic {
  eventId: string;
  eventTitle: string | null;
  ticketsSold: number;
}

export default function OrganizerAnalyticsPage() {
  const params = useParams();
  const organizerId = params.organizerId as string;
  const { user: authUser, role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [analyticsData, setAnalyticsData] = useState<EventAnalytic[]>([]);
  const [totalEventsByOrganizer, setTotalEventsByOrganizer] = useState(0);
  const [totalTicketsSoldOverall, setTotalTicketsSoldOverall] = useState(0);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrganizerData = useCallback(async () => {
    if (!organizerId || !authUser || authUser.id !== organizerId || authRole !== 'organizer') {
      setIsLoadingPageData(false);
      if (!authLoading) { // Only set error if auth is done loading
          setFetchError("Access denied or invalid organizer.");
      }
      return;
    }

    setIsLoadingPageData(true);
    setFetchError(null);

    try {
      // Fetch organizer details (optional, could just use authUser.name)
      const { data: orgDetails, error: orgError } = await supabase
        .from('users')
        .select('name, organization_name')
        .eq('auth_user_id', organizerId)
        .single();

      if (orgError) throw orgError;
      setOrganizer(orgDetails);

      // Fetch events for this organizer
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('event_id, title')
        .eq('organizer_id', organizerId);

      if (eventsError) throw eventsError;
      if (!events) {
        setTotalEventsByOrganizer(0);
        setAnalyticsData([]);
        setTotalTicketsSoldOverall(0);
        setIsLoadingPageData(false);
        return;
      }

      setTotalEventsByOrganizer(events.length);

      if (events.length === 0) {
        setAnalyticsData([]);
        setTotalTicketsSoldOverall(0);
        setIsLoadingPageData(false);
        return;
      }
      
      // Fetch ticket purchases for each event
      const purchasePromises = events.map(event =>
        supabase
          .from('ticket_purchases')
          .select('quantity')
          .eq('event_id', event.event_id)
          .eq('status', 'confirmed') // Only count confirmed tickets
      );

      const purchaseResults = await Promise.all(purchasePromises);

      let overallTickets = 0;
      const eventAnalytics: EventAnalytic[] = events.map((event, index) => {
        const purchasesRes = purchaseResults[index];
        if (purchasesRes.error) {
          console.warn(`Error fetching purchases for event ${event.event_id}:`, purchasesRes.error);
          return { eventId: event.event_id, eventTitle: event.title, ticketsSold: 0 };
        }
        const ticketsForThisEvent = purchasesRes.data?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
        overallTickets += ticketsForThisEvent;
        return { eventId: event.event_id, eventTitle: event.title, ticketsSold: ticketsForThisEvent };
      });

      setAnalyticsData(eventAnalytics.sort((a, b) => b.ticketsSold - a.ticketsSold)); // Sort by tickets sold
      setTotalTicketsSoldOverall(overallTickets);

    } catch (error: any) {
      console.error("Error fetching organizer analytics:", error);
      setFetchError(error.message || "Failed to load analytics data.");
    } finally {
      setIsLoadingPageData(false);
    }
  }, [organizerId, authUser, authRole, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        if (!authUser || authUser.id !== organizerId || authRole !== 'organizer') {
            router.push('/login'); // Or an access denied page
        } else {
            fetchOrganizerData();
        }
    }
  }, [authLoading, authUser, organizerId, authRole, router, fetchOrganizerData]);

  if (authLoading || isLoadingPageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading your event analytics...</p>
      </div>
    );
  }

  if (!authUser || authUser.id !== organizerId || authRole !== 'organizer') {
    return (
         <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-xl font-body text-muted-foreground text-center">
             Access Denied. You must be logged in as the correct organizer to view these analytics.
            </p>
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
          <BarChart3 className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">My Event Analytics</h1>
            <p className="text-md font-body text-muted-foreground">Performance overview for {organizer?.name || authUser.name}.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/organizer/${organizerId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Profile
          </Link>
        </Button>
      </div>

      {fetchError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Frown className="mr-2 h-6 w-6" /> Error Fetching Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
             <Button variant="outline" onClick={fetchOrganizerData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-headline">Total Events Created</CardTitle>
                <CalendarDays className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{totalEventsByOrganizer}</div>
                <p className="text-xs text-muted-foreground font-body">Events you have created.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-headline">Total Tickets Sold</CardTitle>
                <Ticket className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{totalTicketsSoldOverall}</div>
                <p className="text-xs text-muted-foreground font-body">Confirmed tickets across all your events.</p>
              </CardContent>
            </Card>
          </div>

          {analyticsData.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Tickets Sold Per Event</CardTitle>
                <CardDescription className="font-body">Breakdown of confirmed ticket sales for each of your events.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div style={{ width: '100%', height: 300 + Math.max(0, analyticsData.length - 5) * 30 }}> {/* Dynamic height */}
                    <ResponsiveContainer>
                        <BarChart data={analyticsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="eventTitle" type="category" width={150} interval={0} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ticketsSold" name="Tickets Sold" fill="hsl(var(--primary))" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl">Event Sales Details</CardTitle>
                <CardDescription className="font-body">Table view of tickets sold per event.</CardDescription>
            </CardHeader>
            <CardContent>
                {analyticsData.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="font-headline">Event Title</TableHead>
                            <TableHead className="font-headline text-right">Tickets Sold (Confirmed)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyticsData.map((event) => (
                            <TableRow key={event.eventId} className="font-body">
                                <TableCell>{event.eventTitle}</TableCell>
                                <TableCell className="text-right font-semibold">{event.ticketsSold}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="font-body text-muted-foreground text-center py-8">No ticket sales data available yet. Host some events!</p>
                )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
