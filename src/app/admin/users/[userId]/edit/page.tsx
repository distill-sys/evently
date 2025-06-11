
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { UserProfile, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Frown, ArrowLeft, UserCog, Save } from 'lucide-react';

export default function AdminEditUserPage() {
  const { user: authUser, role: adminRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state - typically you'd use react-hook-form for more complex forms
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<UserRole | ''>('');
  const [organizationName, setOrganizationName] = useState<string | null | undefined>('');
  const [bio, setBio] = useState<string | null | undefined>('');


  useEffect(() => {
    if (!authLoading && (!authUser || adminRole !== 'admin')) {
      router.push('/login');
    }
  }, [authUser, adminRole, authLoading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (adminRole === 'admin' && userId) {
        setIsLoadingData(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          setFetchError('Could not fetch user data. Please try again later.');
          setUserData(null);
        } else {
          setUserData(data);
          // Populate form fields
          if (data) {
            setName(data.name || '');
            setEmail(data.email || '');
            setCurrentRole(data.role || '');
            setOrganizationName(data.organization_name);
            setBio(data.bio);
          }
        }
        setIsLoadingData(false);
      }
    };

    if (!authLoading && authUser && adminRole === 'admin') {
      fetchUserData();
    }
  }, [authLoading, authUser, adminRole, userId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userData) return;

    setIsSaving(true);
    const updatedFields: Partial<UserProfile> = {
        name,
        // email: email, // Generally, avoid allowing admins to change email directly due to auth implications
        role: currentRole as UserRole,
        organization_name: currentRole === 'organizer' ? organizationName : null,
        bio: currentRole === 'organizer' ? bio : null,
    };

    const { error } = await supabase
      .from('users')
      .update(updatedFields)
      .eq('auth_user_id', userId);

    setIsSaving(false);
    if (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error Updating User",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Updated",
        description: `${name}'s profile has been successfully updated.`,
      });
      // Optionally re-fetch data or update local state if UI needs to reflect changes immediately without full reload
      setUserData(prev => prev ? {...prev, ...updatedFields} : null);
      router.push('/admin/users'); // Navigate back to user list
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-body text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  if (!authUser || adminRole !== 'admin') {
    return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  if (fetchError) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <Frown className="mr-2 h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-destructive">{fetchError}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to User List
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!userData) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Frown className="mr-2 h-6 w-6 text-muted-foreground" /> User Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground">The requested user could not be found.</p>
           <Button variant="outline" asChild className="mt-4">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to User List
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UserCog className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Edit User: {userData.name}</h1>
            <p className="text-md font-body text-muted-foreground">Modify the details for user ID: {userId}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User List
          </Link>
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>User Profile Details</CardTitle>
            <CardDescription>Make changes to the user's profile information below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-headline">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-headline">Email Address</Label>
                <Input id="email" type="email" value={email} disabled className="font-body bg-muted/50" />
                 <p className="text-xs text-muted-foreground">Email cannot be changed by admins directly. User must change it via their account settings.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="font-headline">Role</Label>
              <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as UserRole)}>
                <SelectTrigger className="w-full md:w-1/2 font-body">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendee">Attendee</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentRole === 'organizer' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="font-headline">Organization Name</Label>
                  <Input id="organizationName" value={organizationName || ''} onChange={(e) => setOrganizationName(e.target.value)} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="font-headline">Organizer Bio</Label>
                  <Textarea id="bio" value={bio || ''} onChange={(e) => setBio(e.target.value)} className="font-body" placeholder="Tell us about the organization..." />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isSaving} className="font-body">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
