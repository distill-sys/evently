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
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }), // Min 1 for login, real app would have more checks
});

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    // In a real app, you'd call an API. Here, we use mock auth.
    // The name is hardcoded for mock, could be fetched or part of login response.
    login(values.email, 'Mock User'); 
    toast({
      title: "Logged In!",
      description: "Welcome back to Evently!",
    });
  }

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
                  <Input type="email" placeholder="you@example.com" {...field} className="font-body" />
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
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="font-body pr-10" />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
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
          <Button type="submit" className="w-full font-body">
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
