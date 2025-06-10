'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    toast({
      title: "Password Reset Requested",
      description: `If an account exists for ${email}, a password reset link has been sent. (This is a mock action)`,
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-12">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-headline font-bold text-primary">Forgot Your Password?</h1>
          <p className="text-muted-foreground font-body mt-2">
            No worries! Enter your email address and we&apos;ll send you a link to reset it.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="font-headline">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required className="font-body mt-1" />
          </div>
          <Button type="submit" className="w-full font-body">
            Send Reset Link
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground font-body">
          Remembered your password?{' '}
          <Button variant="link" asChild className="font-body p-0 h-auto text-primary hover:underline">
            <Link href="/login">
              Log in
            </Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
