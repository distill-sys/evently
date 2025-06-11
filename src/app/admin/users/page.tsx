
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Frown, ArrowLeft, Users, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { user: authUser, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!authUser || role !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, role, authLoading, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (role === 'admin') {
        setIsLoadingData(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          setFetchError('Could not fetch users. Please try again later.');
          setUsers([]);
        } else {
          setUsers(data || []);
        }
        setIsLoadingData(false);
      }
    };

    if (!authLoading && authUser && role === 'admin') {
      fetchUsers();
    }
  }, [authLoading, authUser, role]);

  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  if (!authUser || role !== 'admin') {
    // This is a fallback, useEffect should handle redirect
    return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Users className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">User Management</h1>
            <p className="text-md font-body text-muted-foreground">View and manage all registered users.</p>
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
              <Frown className="mr-2 h-6 w-6" /> Error Fetching Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive">{fetchError}</p>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Frown className="mr-2 h-6 w-6 text-muted-foreground" /> No Users Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-muted-foreground">There are no users in the system yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
            <CardDescription>A list of all users in the Evently platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">User ID</TableHead>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline">Email</TableHead>
                  <TableHead className="font-headline">Role</TableHead>
                  <TableHead className="font-headline">Joined</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.auth_user_id} className="font-body">
                    <TableCell className="font-mono text-xs">{user.auth_user_id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                            user.role === 'organizer' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                            {user.role}
                        </span>
                    </TableCell>
                    <TableCell>
                      {user.created_at ? format(new Date(user.created_at), 'PPP p') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user.auth_user_id}/edit`}>
                           <Edit className="mr-1 h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
