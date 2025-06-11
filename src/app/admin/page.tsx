
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Users, BarChart3, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      router.push('/login'); // Or an access denied page
    }
  }, [user, role, authLoading, router]);

  if (authLoading || !user || role !== 'admin') {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-16 w-16 text-primary" />
        <div>
            <h1 className="text-4xl font-headline font-bold text-primary">Administrator Panel</h1>
            <p className="text-lg font-body text-muted-foreground">Manage and oversee the Evently platform.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> User Management
            </CardTitle>
            <CardDescription className="font-body">View, edit, and manage user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full font-body" asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" /> Event Oversight
            </CardTitle>
            <CardDescription className="font-body">Monitor event listings and platform statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full font-body" variant="outline" disabled>View Analytics (Coming Soon)</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" /> Platform Settings
            </CardTitle>
            <CardDescription className="font-body">Configure global settings and features.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full font-body" variant="outline" disabled>Configure Settings (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>
       <Card className="mt-8 bg-secondary/30">
        <CardHeader>
            <CardTitle className="font-headline">Admin Note</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="font-body text-muted-foreground">
                This is a placeholder for the admin dashboard. Full administrative functionalities like user management, event approval workflows, content moderation, and analytics would be developed here in a production application.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
