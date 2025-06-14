
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { useToast } from '@/hooks/use-toast'; // No longer directly used here for success, parent handles it.
import { useAuth } from '@/contexts/AuthContext';
import type { Event as EventType, SavedCard, TicketPurchase } from '@/lib/types';
import { Loader2, CreditCard, Ticket } from 'lucide-react';

const MOCK_SAVED_CARDS_KEY = 'evently_mock_saved_cards';

const ticketPurchaseSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  ticketQuantity: z.coerce.number().min(1, "Select at least 1 ticket.").max(5, "Cannot purchase more than 5 tickets at once."),
  paymentMethodId: z.string().min(1, "Please select a payment method."),
});

type TicketPurchaseFormData = z.infer<typeof ticketPurchaseSchema>;

interface TicketPurchaseDialogProps {
  event: EventType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseSuccess: (details: { eventTitle: string; ticketQuantity: number, purchaseRecord: TicketPurchase }) => void;
}

export default function TicketPurchaseDialog({ event, open, onOpenChange, onPurchaseSuccess }: TicketPurchaseDialogProps) {
  const { user } = useAuth();
  // const { toast } = useToast(); // Removed as success toast is handled by parent page
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  const form = useForm<TicketPurchaseFormData>({
    resolver: zodResolver(ticketPurchaseSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      ticketQuantity: 1,
      paymentMethodId: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        ticketQuantity: 1,
        paymentMethodId: '',
      });
      try {
        const storedCards = localStorage.getItem(MOCK_SAVED_CARDS_KEY + '_' + user.id);
        if (storedCards) {
          setSavedCards(JSON.parse(storedCards));
        } else {
          setSavedCards([]);
        }
      } catch (error) {
        console.error("Failed to load saved cards from localStorage", error);
        setSavedCards([]);
      }
    } else {
      setSavedCards([]); // No user, no cards
       form.reset({
        name: '',
        email: '',
        ticketQuantity: 1,
        paymentMethodId: '',
      });
    }
  }, [user, form, open]); // Re-run if dialog opens to refresh cards/user details

  if (!event) return null;

  const onSubmit = async (data: TicketPurchaseFormData) => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);

    if (!user) {
        // This case should ideally be handled by disabling the form or button if no user
        console.error("Purchase attempted without a logged-in user.");
        // Optionally show a toast error here, though the form should prevent submission
        return;
    }
    
    const purchaseRecord: TicketPurchase = {
        purchase_id: `purchase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        event_id: event.event_id,
        attendee_user_id: user.id,
        organizer_user_id: event.organizer_id, // Assuming event object has organizer_id
        quantity: data.ticketQuantity,
        purchase_date: new Date().toISOString(),
        payment_method_id: data.paymentMethodId,
        status: 'confirmed'
    };

    console.log("Simulating saving ticket purchase to backend:", purchaseRecord);
    // In a real app, you would now send this purchaseRecord to your backend/Supabase.
    // e.g., await supabase.from('ticket_purchases').insert([purchaseRecord]);

    onPurchaseSuccess({ eventTitle: event.title, ticketQuantity: data.ticketQuantity, purchaseRecord });
    form.reset();
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Ticket className="mr-2 h-6 w-6 text-primary" />
            Purchase Tickets for {event.title}
          </DialogTitle>
          <DialogDescription className="font-body">
            Complete your details below to get your tickets.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Full Name</FormLabel>
                  <FormControl><Input {...field} className="font-body" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Email Address</FormLabel>
                  <FormControl><Input type="email" {...field} className="font-body" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Number of Tickets</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Select quantity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(qty => (
                        <SelectItem key={qty} value={String(qty)} className="font-body">{qty}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!user}>
                    <FormControl>
                      <SelectTrigger className="font-body">
                         <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select a saved card" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {savedCards.length > 0 ? (
                        savedCards.map(card => (
                          <SelectItem key={card.id} value={card.id} className="font-body">
                            {card.cardType} ending in •••• {card.last4} (Exp: {card.expiryDate})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground font-body">
                          {user ? "No saved cards. Please add a card in your profile." : "Log in to use saved cards."}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {user && savedCards.length === 0 && (
                     <p className="text-xs text-muted-foreground mt-1 font-body">
                        Go to your <a href="/attendee/profile" className="underline text-primary">profile</a> to add a payment method.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-start">
              <Button type="submit" disabled={isProcessing || !user || (user && savedCards.length === 0)} className="w-full sm:w-auto font-body">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Purchase
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto font-body">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
