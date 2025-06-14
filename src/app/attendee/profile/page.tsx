'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CreditCard, PlusCircle, ShieldCheck, Trash2, Loader2, UserCircle2 } from 'lucide-react';
import type { SavedCard } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const cardSchema = z.object({
  cardNumber: z.string()
    .transform(val => val.replace(/\s/g, '')) // Remove spaces
    .refine(val => /^\d{16}$/.test(val), { // Test if it's exactly 16 digits
      message: "Card number must be 16 digits.",
    }),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY."),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits."),
  nameOnCard: z.string().min(2, "Name on card is required."),
});

const MOCK_SAVED_CARDS_KEY = 'evently_mock_saved_cards';

export default function AttendeeProfilePage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      nameOnCard: '',
    },
  });

  useEffect(() => {
    if (!authLoading && (!user || role !== 'attendee')) {
      router.push('/login');
    } else if (user) {
      try {
        const storedCards = localStorage.getItem(`${MOCK_SAVED_CARDS_KEY}_${user.id}`);
        if (storedCards) {
          setSavedCards(JSON.parse(storedCards));
        }
      } catch (error) {
        console.error("Failed to load saved cards from localStorage", error);
        localStorage.removeItem(`${MOCK_SAVED_CARDS_KEY}_${user.id}`);
      }
    }
  }, [user, role, authLoading, router]);

  const handleSaveCard = (values: z.infer<typeof cardSchema>) => {
    setIsSaving(true);
    // Mock saving card
    // In a real app, `values.cardNumber` would be the space-stripped 16-digit number due to the transform
    setTimeout(() => {
      const newCard: SavedCard = {
        id: `card_${Date.now()}`,
        last4: values.cardNumber.slice(-4), // This will use the transformed (space-stripped) card number
        expiryDate: values.expiryDate,
        cardType: 'Visa', // Mock card type
      };
      const updatedCards = [...savedCards, newCard];
      setSavedCards(updatedCards);
      if (user) {
        localStorage.setItem(`${MOCK_SAVED_CARDS_KEY}_${user.id}`, JSON.stringify(updatedCards));
      }
      toast({
        title: "Card Saved!",
        description: `Your card ending in ${newCard.last4} has been securely saved (mock).`,
      });
      setIsSaving(false);
      setIsDialogOpen(false);
      form.reset();
    }, 1000);
  };

  const handleDeleteCard = (cardId: string) => {
    const updatedCards = savedCards.filter(card => card.id !== cardId);
    setSavedCards(updatedCards);
    if (user) {
        localStorage.setItem(`${MOCK_SAVED_CARDS_KEY}_${user.id}`, JSON.stringify(updatedCards));
    }
    toast({
      title: "Card Removed",
      description: "The selected card has been removed (mock).",
      variant: "destructive"
    });
  };

  if (authLoading || !user || role !== 'attendee') {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <UserCircle2 className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-4xl font-headline font-bold text-primary">{user.name}</h1>
          <p className="text-lg font-body text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl flex items-center">
              <CreditCard className="mr-3 h-6 w-6 text-primary" />
              Saved Payment Methods
            </CardTitle>
            <CardDescription className="font-body">Manage your saved credit/debit cards for faster checkout.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) form.reset(); }}>
            <DialogTrigger asChild>
              <Button className="font-body" onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Add New Card</DialogTitle>
                <DialogDescription className="font-body">
                  Your card details are securely processed. This is a mock form.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSaveCard)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="nameOnCard" className="font-headline">Name on Card</Label>
                  <Input id="nameOnCard" {...form.register("nameOnCard")} className="font-body mt-1" />
                  {form.formState.errors.nameOnCard && <p className="text-sm text-destructive mt-1">{form.formState.errors.nameOnCard.message}</p>}
                </div>
                <div>
                  <Label htmlFor="cardNumber" className="font-headline">Card Number</Label>
                  <Input id="cardNumber" placeholder="•••• •••• •••• ••••" {...form.register("cardNumber")} className="font-body mt-1" />
                  {form.formState.errors.cardNumber && <p className="text-sm text-destructive mt-1">{form.formState.errors.cardNumber.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate" className="font-headline">Expiry Date</Label>
                    <Input id="expiryDate" placeholder="MM/YY" {...form.register("expiryDate")} className="font-body mt-1" />
                    {form.formState.errors.expiryDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.expiryDate.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="font-headline">CVV</Label>
                    <Input id="cvv" placeholder="•••" {...form.register("cvv")} className="font-body mt-1" />
                    {form.formState.errors.cvv && <p className="text-sm text-destructive mt-1">{form.formState.errors.cvv.message}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); form.reset(); }} className="font-body">Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="font-body">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Card
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {savedCards.length > 0 ? (
            <ul className="space-y-4">
              {savedCards.map(card => (
                <li key={card.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <CreditCard className="h-8 w-8 mr-4 text-primary" />
                    <div>
                      <p className="font-body font-semibold">{card.cardType} ending in •••• {card.last4}</p>
                      <p className="font-body text-sm text-muted-foreground">Expires: {card.expiryDate}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCard(card.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-5 w-5" />
                    <span className="sr-only">Delete card</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-muted-foreground text-center py-8">You have no saved cards.</p>
          )}
          <div className="mt-6 p-4 bg-secondary/50 rounded-lg flex items-start">
            <ShieldCheck className="h-6 w-6 mr-3 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-headline text-sm font-semibold">Security Note</h4>
              <p className="font-body text-xs text-muted-foreground">
                Evently uses industry-standard encryption to protect your payment information. For this demo, card details are not processed or stored by a real payment gateway.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
