
'use client';

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react'; // Import Loader2

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  selectRole: (selectedRole: UserRole) => Promise<void>;
  signUp: (userData: Partial<User>, role: UserRole, password_unsafe: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('name, role, organization_name, bio, profile_picture_url') // Use snake_case for DB columns
      .eq('auth_user_id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      console.error(
        'Error fetching user profile. Message:', error.message,
        'Details:', error.details,
        'Hint:', error.hint,
        'Code:', error.code
      );
      // Check if the error object is effectively empty or lacks specific details
      if (Object.keys(error).length === 0 || (!error.message && !error.details && !error.hint && !error.code)) {
          console.error('Full error object was empty or lacked specific details. This often indicates RLS (though disabled here) or a malformed query (e.g., incorrect column names). Querying for columns: name, role, organization_name, bio, profile_picture_url. Filter: auth_user_id =', supabaseUser.id);
      } else {
          console.error('Full error object:', JSON.stringify(error, null, 2));
      }
      toast({ title: 'Error', description: 'Could not fetch user profile.', variant: 'destructive' });
      return null;
    }

    if (profile) {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.name,
        role: profile.role as UserRole,
        organizationName: profile.organization_name, // Map from DB snake_case to app camelCase
        bio: profile.bio,                           // Map from DB snake_case to app camelCase
        profilePictureUrl: profile.profile_picture_url, // Map from DB snake_case to app camelCase
      };
    }
    return null; // Profile not yet created or not found
  }, [toast]);


  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        if (userProfile) {
          setUser(userProfile);
          setRole(userProfile.role || null);
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User', 
          });
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProfile, router]);

  const signIn = async (email: string, password_unsafe: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password_unsafe });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive'});
    } else {
      toast({ title: 'Logged In!', description: 'Welcome back!' });
    }
    return { error };
  };

  const signUp = async (userData: Partial<User>, selectedRole: UserRole, password_unsafe: string) => {
    setIsLoading(true);
    const email = userData.email;
    if (!email) {
        setIsLoading(false);
        const err = { name: "AuthError", message: "Email is required for sign up." } as AuthError;
        toast({ title: 'Sign Up Failed', description: err.message, variant: 'destructive'});
        return { error: err };
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: password_unsafe,
    });

    if (signUpError) {
      setIsLoading(false);
      toast({ title: 'Sign Up Failed', description: signUpError.message, variant: 'destructive'});
      return { error: signUpError };
    }

    if (signUpData.user) {
      const { error: insertError } = await supabase.from('users').insert({
        auth_user_id: signUpData.user.id,
        email: signUpData.user.email,
        name: userData.name || 'New User',
        role: selectedRole,
        organization_name: selectedRole === 'organizer' ? userData.organizationName : null, // Use snake_case for DB column
        bio: selectedRole === 'organizer' ? userData.bio : null, // Use snake_case for DB column
        profile_picture_url: userData.profilePictureUrl || null, // Use snake_case for DB column
      });

      if (insertError) {
        setIsLoading(false);
        console.error("Error inserting user profile:", insertError);
        toast({ title: 'Sign Up Failed', description: `Could not create user profile: ${insertError.message}`, variant: 'destructive'});
        // Attempt to clean up the auth user if profile creation fails
        // Note: This might not be desirable in all cases, consider user experience
        await supabase.auth.signOut(); // Sign out the partially created user session
        // Optionally, try to delete the auth user if your policies allow admin actions,
        // but this is complex and usually handled server-side or manually.
        // For now, just signing out is a safer client-side action.
        return { error: { name: "ProfileCreationError", message: insertError.message } as AuthError };
      }
      
      // After successful insert, fetch the complete profile to update context
      const newUserProfile = await fetchUserProfile(signUpData.user);
      if (newUserProfile) {
        setUser(newUserProfile);
        setRole(newUserProfile.role || null);
        toast({ title: 'Account Created!', description: `Welcome, ${newUserProfile.name}!` });
      } else {
         // Fallback if fetchUserProfile fails immediately after insert (should be rare)
         setUser({ id: signUpData.user.id, email: signUpData.user.email!, name: userData.name || "User"});
         setRole(selectedRole); // Set role based on selection during sign-up
         toast({ title: 'Account Created! Profile pending.', description: `Welcome!` });
      }
    }
    setIsLoading(false);
    return { error: null }; 
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setIsLoading(false);
    router.push('/');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };

  const selectRole = async (selectedRole: UserRole) => {
    if (user) {
      setIsLoading(true);
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('auth_user_id', user.id);

      if (error) {
        setIsLoading(false);
        toast({ title: 'Error', description: `Could not update role: ${error.message}`, variant: 'destructive'});
        return;
      }

      setRole(selectedRole);
      setUser(prevUser => prevUser ? { ...prevUser, role: selectedRole } : null);
      setIsLoading(false);
      toast({ title: 'Role Selected', description: `Your role has been set to ${selectedRole}.` });
      
      switch (selectedRole) {
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
          router.push('/');
      }
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, role, isLoading, signIn, logout, selectRole, signUp }}>
      {!isLoading && children}
      {isLoading && ( 
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[200]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
       )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
    

