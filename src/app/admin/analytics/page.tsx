
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CalendarDays, BuildingIcon, ArrowLeft, LineChart as LineChartIcon, ServerCrash, PieChart as PieChartIcon, Ticket } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { UserRole } from '@/lib/types';

interface PlatformStats {
  users: number;
  events: number;
  venues: number;
  ticketPurchases: number;
}

interface UserRoleDistribution {
  role: string;
  count: number;
}

const COLORS = ['#4285F4', '#00A2E8', '#34A853', '#FBBC05', '#EA4335'];

export default function AdminAnalyticsPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [userRoleData, setUserRoleData] = useState<UserRoleDistribution[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!authUser || role !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, role, authLoading, router]);

  useEffect(() => {
    const fetchAllAnalyticsData = async () => {
      if (role === 'admin') {
        setIsLoadingData(true);
        setFetchError(null);
        try {
          const [usersCountRes, eventsCountRes, venuesCountRes, ticketPurchasesCountRes, userRolesRpcResult] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('events').select('*', { count: 'exact', head: true }),
            supabase.from('venues').select('*', { count: 'exact', head: true }),
            supabase.from('ticket_purchases').select('*', { count: 'exact', head: true }),
            supabase.rpc('get_user_role_distribution')
          ]);

          if (usersCountRes.error) throw usersCountRes.error;
          if (eventsCountRes.error) throw eventsCountRes.error;
          if (venuesCountRes.error) throw venuesCountRes.error;
          if (ticketPurchasesCountRes.error) throw ticketPurchasesCountRes.error;
          if (userRolesRpcResult.error) {
            console.error(
              'Error fetching user role distribution via RPC. Message:', userRolesRpcResult.error.message,
              'Details:', userRolesRpcResult.error.details,
              'Hint:', userRolesRpcResult.error.hint,
              'Code:', userRolesRpcResult.error.code
            );
            if (Object.keys(userRolesRpcResult.error).length === 0 || (!userRolesRpcResult.error.message && !userRolesRpcResult.error.details && !userRolesRpcResult.error.hint && !userRolesRpcResult.error.code)) {
                console.error('Full rpcError object was empty or lacked specific details. RPC call was: get_user_role_distribution');
            } else {
                console.error('Full rpcError object:', JSON.stringify(userRolesRpcResult.error, null, 2));
            }
            throw userRolesRpcResult.error;
          }
          
          setStats({
            users: usersCountRes.count || 0,
            events: eventsCountRes.count || 0,
            venues: venuesCountRes.count || 0,
            ticketPurchases: ticketPurchasesCountRes.count || 0,
          });
          
          const formattedRolesData = (userRolesRpcResult.data || []).map(item => ({
            role: item.role || 'Unknown',
            count: item.user_count || 0, 
          }));
          setUserRoleData(formattedRolesData as UserRoleDistribution[]);

        } catch (error: any) {
          // Enhanced error logging for the generic catch block
          console.error('Error fetching platform analytics. The error object received by the catch block is:', error);

          let descriptiveError = 'An unexpected error occurred while fetching platform statistics.';
          if (error && typeof error === 'object') {
            if (error.message) {
              descriptiveError = `Error: ${error.message}`;
              console.error(`Specific error details - Message: ${error.message}, Code: ${error.code}, Details: ${error.details}, Hint: ${error.hint}`);
            } else if (Object.keys(error).length === 0) {
              descriptiveError = 'An empty error object was received. This often indicates an RLS issue or a silent failure in a Supabase query. Please check your Supabase logs and RLS policies for the tables: users, events, venues, ticket_purchases, and the RPC function get_user_role_distribution.';
              console.error(descriptiveError); // Log this specific guidance
            } else {
               // Try to stringify if it's an object but not empty and has no message
               try {
                 const errorString = JSON.stringify(error, null, 2);
                 descriptiveError = `Received a non-standard error object: ${errorString}`;
                 console.error('Non-standard error object details:', errorString);
               } catch (e) {
                 descriptiveError = 'Received a non-standard error object that could not be stringified. Check the raw error object logged above.';
                 console.error('Non-standard error object (unstringifiable):', error);
               }
            }
          } else if (error) {
            descriptiveError = `Received an error: ${String(error)}`;
            console.error('Error content (non-object):', error);
          }
          setFetchError(descriptiveError);
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    if (!authLoading && authUser && role === 'admin') {
      fetchAllAnalyticsData();
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
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-headline">Total Tickets Sold</CardTitle>
                <Ticket className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{stats.ticketPurchases}</div>
                <p className="text-xs text-muted-foreground font-body">Confirmed ticket purchases.</p>
              </CardContent>
            </Card>
          </div>

          {userRoleData.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                  User Role Distribution
                </CardTitle>
                <CardDescription className="font-body">Breakdown of users by their assigned roles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={userRoleData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-body">
                              {`${userRoleData[index].role} (${(percent * 100).toFixed(0)}%)`}
                            </text>
                          );
                        }}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="role"
                      >
                        {userRoleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} users`, name as string]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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

