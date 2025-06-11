
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Import useRouter

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginPage() {
  const { signIn, isLoading: authLoading, user } = useAuth(); // Renamed login to signIn
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter(); // Initialize useRouter

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if user is already logged in
  if (!authLoading && user) {
    router.push('/dashboard'); // Or any other appropriate page
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Redirecting...</p>
      </div>
    );
  }


  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    await signIn(values.email, values.password);
    setIsSubmitting(false);
    // Redirection is handled by AuthContext's onAuthStateChange or page-level useEffects now
    // No explicit router.push here unless signIn returns specific routing instructions
  }

  const currentLoading = authLoading || isSubmitting;

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Welcome Back to Evently</h1>
        <p className="text-muted-foreground font-body mt-2">
          Log in to continue your event journey.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-headline">Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} className="font-body" disabled={currentLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-headline">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="font-body pr-10" disabled={currentLoading} />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={currentLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-end">
            <Button variant="link" asChild className="text-sm font-body p-0 h-auto">
              <Link href="/forgot-password">
                Forgot password?
              </Link>
            </Button>
          </div>
          <Button type="submit" className="w-full font-body" disabled={currentLoading}>
            {currentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
        </form>
      </Form>
      <p className="mt-8 text-center text-sm text-muted-foreground font-body">
        Don&apos;t have an account?{' '}
        <Button variant="link" asChild className="font-body p-0 h-auto text-primary hover:underline">
          <Link href="/sign-up">
            Sign up
          </Link>
        </Button>
      </p>
    </>
  );
}

    