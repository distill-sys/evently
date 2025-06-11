
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CalendarDays, BuildingIcon, ArrowLeft, LineChart as LineChartIcon, ServerCrash } from 'lucide-react';

interface PlatformStats {
  users: number;
  events: number;
  venues: number;
}

export default function AdminAnalyticsPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!authUser || role !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, role, authLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (role === 'admin') {
        setIsLoadingData(true);
        setFetchError(null);
        try {
          const [usersCount, eventsCount, venuesCount] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('events').select('*', { count: 'exact', head: true }),
            supabase.from('venues').select('*', { count: 'exact', head: true }),
          ]);

          if (usersCount.error) throw usersCount.error;
          if (eventsCount.error) throw eventsCount.error;
          if (venuesCount.error) throw venuesCount.error;
          
          setStats({
            users: usersCount.count || 0,
            events: eventsCount.count || 0,
            venues: venuesCount.count || 0,
          });

        } catch (error: any) {
          console.error('Error fetching platform stats:', error);
          setFetchError('Could not fetch platform statistics. ' + (error?.message || ''));
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    if (!authLoading && authUser && role === 'admin') {
      fetchStats();
    }
  }, [authLoading, authUser, role]);

  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading platform analytics...</p>
      </div>
    );
  }

  if (!authUser || role !== 'admin') {
    return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LineChartIcon className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Platform Analytics</h1>
            <p className="text-md font-body text-muted-foreground">Overview of Evently platform statistics.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
        </Button>
      </div>

      {fetchError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <ServerCrash className="mr-2 h-6 w-6" /> Error Fetching Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Total Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stats.users}</div>
              <p className="text-xs text-muted-foreground font-body">Registered users on the platform.</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Total Events</CardTitle>
              <CalendarDays className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stats.events}</div>
              <p className="text-xs text-muted-foreground font-body">Events created and listed.</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Total Venues</CardTitle>
              <BuildingIcon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stats.venues}</div>
              <p className="text-xs text-muted-foreground font-body">Venues available in the system.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
         <p className="font-body text-muted-foreground">No statistics to display.</p>
      )}

      <Card className="mt-8">
        <CardHeader>
            <CardTitle className="font-headline">More Analytics Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="font-body text-muted-foreground">
                This page will be expanded with more detailed analytics, including charts for event categories, user roles distribution, event popularity trends, and more.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
