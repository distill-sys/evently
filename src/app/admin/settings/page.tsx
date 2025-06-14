
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Settings, ToggleLeft, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export default function AdminSettingsPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      router.push('/login');
    }
  }, [user, role, authLoading, router]);

  if (authLoading || !user || role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Settings className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Platform Settings</h1>
            <p className="text-md font-body text-muted-foreground">Manage global configuration for the Evently platform.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
        </Button>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="font-headline text-xl">General Settings</CardTitle>
          <CardDescription className="font-body">Configure basic platform parameters. (These are currently placeholders)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="maintenance-mode" className="font-headline text-base">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground font-body">Temporarily disable public access to the site.</p>
            </div>
            <Switch id="maintenance-mode" disabled aria-label="Maintenance Mode Toggle" />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="enable-recommendations" className="font-headline text-base">Enable AI Recommendations</Label>
              <p className="text-sm text-muted-foreground font-body">Allow AI to generate personalized event recommendations for users.</p>
            </div>
            <Switch id="enable-recommendations" checked disabled aria-label="Enable AI Recommendations Toggle" />
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <Label htmlFor="default-event-image" className="font-headline text-base flex items-center">
              <ImageIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              Default Event Image URL
            </Label>
            <Input id="default-event-image" placeholder="https://example.com/default-event.png" disabled className="font-body" />
            <p className="text-xs text-muted-foreground font-body">Image to use if an organizer doesn't upload one for their event.</p>
          </div>

        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-amber-700 dark:text-amber-400 flex items-center">
            <ToggleLeft className="mr-2 h-5 w-5" />
            Feature Under Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-amber-600 dark:text-amber-300">
            Actual functionality for these settings is not yet implemented. This page serves as a placeholder for future development.
            Changes made here will not currently affect the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
