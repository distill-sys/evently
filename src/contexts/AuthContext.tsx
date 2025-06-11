
'use client';

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
      if (Object.keys(error).length === 0 || (!error.message && !error.details && !error.hint && !error.code)) {
          console.error('Full error object was empty or lacked specific details. Querying for columns: name, role, organization_name, bio, profile_picture_url. Filter: auth_user_id =', supabaseUser.id);
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
        organizationName: profile.organization_name,
        bio: profile.bio,
        profilePictureUrl: profile.profile_picture_url,
      };
    }
    return null;
  }, [toast]);


  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      try {
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user);
          if (userProfile) {
            setUser(userProfile);
            setRole(userProfile.role || null);
          } else {
            // Fallback if profile doesn't exist yet or fetch failed
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
            });
            setRole(null); // No role if profile is missing
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (e) {
        console.error("Error during onAuthStateChange processing:", e);
        // Ensure state is reset on error
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password_unsafe: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password_unsafe });
    // isLoading will be set to false by onAuthStateChange
    if (error) {
      setIsLoading(false); // Explicitly set false on direct error
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive'});
    } else {
      toast({ title: 'Logged In!', description: 'Welcome back!' });
      // onAuthStateChange will handle setUser, setRole and final setIsLoading(false)
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
        organization_name: selectedRole === 'organizer' ? userData.organizationName : null,
        bio: selectedRole === 'organizer' ? userData.bio : null,
        profile_picture_url: userData.profilePictureUrl || null,
      });

      if (insertError) {
        setIsLoading(false);
        console.error("Error inserting user profile:", insertError);
        toast({ title: 'Sign Up Failed', description: `Could not create user profile: ${insertError.message}`, variant: 'destructive'});
        await supabase.auth.signOut();
        return { error: { name: "ProfileCreationError", message: insertError.message } as AuthError };
      }
      
      // onAuthStateChange will handle fetching the profile, setting user/role, and isLoading
      toast({ title: 'Account Created!', description: `Welcome, ${userData.name || 'User'}! Please check your email to confirm your account if required.` });
    } else {
        // Should not happen if signUpError is null, but as a safeguard:
        setIsLoading(false);
    }
    return { error: null };
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // setUser, setRole, and setIsLoading(false) will be handled by onAuthStateChange
    router.push('/'); // Redirect immediately
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
      {/* Render children immediately; loading state is handled by the spinner overlay */}
      {children}
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
    
