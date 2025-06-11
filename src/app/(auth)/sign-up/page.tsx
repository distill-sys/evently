
'use client';

import React from 'react';
import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Building, Shield, UserCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';


const baseSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  role: z.enum(['attendee', 'organizer', 'admin'], { required_error: 'You must select a role.' }),
});

const attendeeSchema = baseSchema;
const organizerSchema = baseSchema.extend({
  organizationName: z.string().min(2, { message: 'Organization name must be at least 2 characters.' }),
  organizerBio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }).max(500, { message: 'Bio must be less than 500 characters.' }),
});
const adminSchema = baseSchema;

type CombinedSchemaType = z.infer<typeof attendeeSchema> | z.infer<typeof organizerSchema> | z.infer<typeof adminSchema>;


export default function SignUpPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('attendee');
  const { signUp, isLoading: authLoading, user, role: authRole } = useAuth(); // Added authRole
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttemptingRedirect, setIsAttemptingRedirect] = useState(false);
  const router = useRouter();

  const currentSchema = selectedRole === 'organizer' ? organizerSchema : (selectedRole === 'admin' ? adminSchema : attendeeSchema);

  const form = useForm<CombinedSchemaType>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'attendee',
      organizationName: '',
      organizerBio: '',
    },
    context: { role: selectedRole },
  });

  React.useEffect(() => {
    form.trigger();
  }, [selectedRole, form]);

  useEffect(() => {
    if (!authLoading && user && !isAttemptingRedirect) {
      setIsAttemptingRedirect(true);
      if (authRole) { // Role is known from AuthContext
        switch (authRole) {
          case 'attendee':
            router.push('/attendee');
            break;
          case 'organizer':
            router.push(`/organizer/${user.id}`);
            break;
          case 'admin':
            router.push('/admin');
            break;
          default:
            router.push('/dashboard'); // Fallback
            break;
        }
      } else {
        // This case should ideally not be hit often after signup as role is set.
        // But if role somehow isn't immediately available, go to dashboard.
        router.push('/dashboard');
      }
    }
  }, [authLoading, user, authRole, router, isAttemptingRedirect]); // Added authRole to dependencies

  async function onSubmit(values: CombinedSchemaType) {
    setIsSubmitting(true);
    const { password, role: formRole, ...userData } = values; // Renamed role to formRole to avoid conflict

    const userDetailsForSignUp = {
        name: userData.name,
        email: userData.email,
        organizationName: formRole === 'organizer' && 'organizationName' in userData ? userData.organizationName : undefined,
        bio: formRole === 'organizer' && 'organizerBio' in userData ? userData.organizerBio : undefined,
    };

    await signUp(userDetailsForSignUp, formRole as UserRole, password);
    setIsSubmitting(false);
    // Redirection is handled by the useEffect above based on authLoading, user, and authRole state
  }

  const handleRoleChange = (value: string) => {
    const newRole = value as UserRole;
    setSelectedRole(newRole);
    form.setValue('role', newRole);
    if (newRole !== 'organizer') {
      form.setValue('organizationName', '', { shouldValidate: true });
      form.setValue('organizerBio', '', { shouldValidate: true });
    }
    Object.keys(form.getValues()).forEach(key => {
        form.trigger(key as keyof CombinedSchemaType);
    });
  };

  const currentLoading = authLoading || isSubmitting;

  // Show loading spinner if redirecting or initial auth check is in progress
  if (authLoading || (!authLoading && user && isAttemptingRedirect)) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Create Your Evently Account</h1>
        <p className="text-muted-foreground font-body mt-2">
          Join our community of event enthusiasts and creators.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="font-headline">I am an...</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={handleRoleChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    aria-disabled={currentLoading}
                  >
                    {[
                      { value: 'attendee' as UserRole, label: 'Attendee', icon: <UserCircle2 className="mr-2 h-5 w-5" /> },
                      { value: 'organizer' as UserRole, label: 'Organizer', icon: <Building className="mr-2 h-5 w-5" /> },
                      { value: 'admin' as UserRole, label: 'Admin', icon: <Shield className="mr-2 h-5 w-5" /> },
                    ].map((roleOption) => (
                      <FormItem key={roleOption.value} className="flex-1">
                        <FormControl>
                           <RadioGroupItem value={roleOption.value} id={roleOption.value} className="sr-only peer" disabled={currentLoading}/>
                        </FormControl>
                        <FormLabel
                          htmlFor={roleOption.value}
                          className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${currentLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          {roleOption.icon}
                          <span className="font-body">{roleOption.label}</span>
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-headline">Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="font-body" disabled={currentLoading}/>
                </FormControl>
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
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} className="font-body" disabled={currentLoading}/>
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
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="font-body pr-10" disabled={currentLoading}/>
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

          {selectedRole === 'organizer' && (
            <>
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company LLC" {...field} className="font-body" disabled={currentLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organizerBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Organizer Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about your organization..." {...field} className="font-body" disabled={currentLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <Button type="submit" className="w-full font-body" disabled={currentLoading}>
             {currentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </Form>
      <p className="mt-8 text-center text-sm text-muted-foreground font-body">
        Already have an account?{' '}
        <Button variant="link" asChild className="font-body p-0 h-auto text-primary hover:underline">
          <Link href="/login">
            Log in
          </Link>
        </Button>
      </p>
    </>
  );
}
