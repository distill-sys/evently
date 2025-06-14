
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { TicketPurchase } from '@/lib/types';
import TicketStubCard from '@/components/attendee/TicketStubCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Frown, ListOrdered, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AttendeeTicketsPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);

  const fetchTicketHistory = useCallback(async () => {
    if (!authUser) return;

    setIsLoadingTickets(true);
    setFetchError(null);

    const selectQuery = `
      purchase_id,
      quantity,
      purchase_date,
      status,
      updated_at,
      event_id,
      events (
        event_id,
        title,
        date,
        time,
        image_url,
        location,
        ticket_price_range
      )
    `;

    const { data, error } = await supabase
      .from('ticket_purchases')
      .select(selectQuery)
      .eq('attendee_user_id', authUser.id)
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error(
        'Error fetching ticket history. Message:', error.message, 
        'Details:', error.details, 
        'Hint:', error.hint, 
        'Code:', error.code
      );
      if (Object.keys(error).length === 0 || (!error.message && !error.details && !error.hint && !error.code)) {
        console.error(`Full error object was empty or lacked specific details. Query was: supabase.from('ticket_purchases').select("${selectQuery.replace(/\s+/g, ' ').trim()}").eq('attendee_user_id', authUser.id).order('purchase_date', { ascending: false })`);
      } else {
        console.error('Full error object:', JSON.stringify(error, null, 2));
      }
      setFetchError('Could not fetch your ticket history. Please try again later.');
      setTickets([]);
    } else {
      setTickets(data as TicketPurchase[] || []);
    }
    setIsLoadingTickets(false);
  }, [authUser]);

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || role !== 'attendee') {
        router.push('/login');
      } else {
        fetchTicketHistory();
      }
    }
  }, [authLoading, authUser, role, router, fetchTicketHistory]);

  const handleCancelTicket = async (purchaseId: string) => {
    if (!authUser) return;
    setCancellingTicketId(purchaseId);

    const { error } = await supabase
      .from('ticket_purchases')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('purchase_id', purchaseId)
      .eq('attendee_user_id', authUser.id); // Ensure user can only cancel their own

    setCancellingTicketId(null);
    if (error) {
      toast({
        title: "Cancellation Failed",
        description: `Could not cancel ticket: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ticket Cancelled",
        description: "Your ticket has been successfully cancelled. A refund has been processed.",
      });
      fetchTicketHistory(); // Re-fetch tickets to update the list
    }
  };

  if (authLoading || (!authUser && !authLoading)) { // Show loader if auth is loading or if auth is done but no user (pre-redirect)
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading your tickets...</p>
      </div>
    );
  }

  if (!authUser || role !== 'attendee') {
    // This case should ideally be handled by the redirect in useEffect, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-body text-muted-foreground">Access Denied. Please log in as an attendee.</p>
         <Button asChild variant="link" className="mt-4">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ListOrdered className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">My Tickets</h1>
          <p className="text-md font-body text-muted-foreground">View your event ticket purchase history.</p>
        </div>
      </div>

      {isLoadingTickets ? (
         <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-body text-muted-foreground">Fetching your tickets...</p>
        </div>
      ) : fetchError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Frown className="mr-2 h-6 w-6" /> Error Fetching Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={fetchTicketHistory} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="shadow-md">
          <CardHeader className="items-center text-center">
            <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <CardTitle className="font-headline text-2xl">No Tickets Yet</CardTitle>
            <CardDescription className="font-body">You haven&apos;t purchased any tickets. Time to explore some events!</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/attendee" className="font-body">Explore Events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tickets.map((ticket) => (
            <TicketStubCard 
              key={ticket.purchase_id} 
              ticket={ticket} 
              onCancel={handleCancelTicket}
              isCancelling={cancellingTicketId === ticket.purchase_id} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
