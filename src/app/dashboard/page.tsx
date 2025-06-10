'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Building, Shield, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/lib/types';

export default function DashboardPage() {
  const { user, role, selectRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    // If user is logged in and already has a role, redirect them.
    // This handles cases where user might navigate to /dashboard directly after role selection.
    if (!isLoading && user && role) {
      switch (role) {
        case 'attendee':
          router.push('/attendee');
          break;
        case 'organizer':
          router.push(`/organizer/${user.id}`); // Using user ID as placeholder for organizer ID
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          // Stay on dashboard if role is somehow invalid
          break;
      }
    }
  }, [user, role, isLoading, router]);
  
  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-64"><p className="font-body">Loading dashboard...</p></div>;
  }

  // If user has a role, this page content won't be shown due to redirect.
  // This content is for users who have logged in but not yet selected a role,
  // or if their role was cleared.
  const handleRoleSelect = (selectedRole: UserRole) => {
    selectRole(selectedRole);
  };

  const roleOptions = [
    { value: 'attendee' as UserRole, label: 'Attendee', description: 'Explore events and manage your tickets.', icon: <UserCircle2 className="h-10 w-10 text-primary mb-4" /> },
    { value: 'organizer' as UserRole, label: 'Organizer', description: 'Create and manage your events.', icon: <Building className="h-10 w-10 text-primary mb-4" /> },
    { value: 'admin' as UserRole, label: 'Administrator', description: 'Oversee the platform and manage users.', icon: <Shield className="h-10 w-10 text-primary mb-4" /> },
  ];

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-headline font-bold text-primary">Welcome, {user?.name}!</h1>
        <p className="text-xl text-muted-foreground font-body mt-2">Please select your role to continue.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {roleOptions.map((opt) => (
          <Card key={opt.value} className="hover:shadow-xl transition-shadow cursor-pointer group text-center">
            <CardHeader>
              <div className="flex justify-center">{opt.icon}</div>
              <CardTitle className="font-headline text-2xl">{opt.label}</CardTitle>
              <CardDescription className="font-body h-12">{opt.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleRoleSelect(opt.value)} className="w-full font-body group-hover:bg-accent group-hover:text-accent-foreground">
                Continue as {opt.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
