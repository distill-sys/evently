
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
    console.log('Fetching user profile for:', supabaseUser.id);
    const { data: profile, error } = await supabase
      .from('users')
      .select('name, role, organization_name, bio, profile_picture_url')
      .eq('auth_user_id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
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
      console.log('User profile fetched successfully:', profile);
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
    console.log('No user profile found for:', supabaseUser.id);
    return null;
  }, [toast]);


  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      console.log('onAuthStateChange event:', _event, 'session:', session);
      try {
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
      } catch (e) {
        console.error("Error during onAuthStateChange processing:", e);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
        console.log('onAuthStateChange finished, isLoading set to false.');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password_unsafe: string) => {
    setIsLoading(true);
    console.log('Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password_unsafe });
    if (error) {
      setIsLoading(false);
      console.error('Sign in failed:', error);
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
        console.error('Sign up failed:', err.message);
        toast({ title: 'Sign Up Failed', description: err.message, variant: 'destructive'});
        return { error: err };
    }
    console.log('Attempting sign up for:', email, 'with role:', selectedRole);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: password_unsafe,
    });

    if (signUpError) {
      setIsLoading(false);
      console.error('Supabase auth.signUp failed:', signUpError);
      toast({ title: 'Sign Up Failed', description: signUpError.message, variant: 'destructive'});
      return { error: signUpError };
    }

    console.log('Supabase auth.signUp successful. signUpData:', signUpData);

    if (signUpData.user) {
      const insertPayload = {
        auth_user_id: signUpData.user.id,
        email: signUpData.user.email, // email should be defined if signUpData.user exists
        name: userData.name || 'New User',
        role: selectedRole,
        organization_name: selectedRole === 'organizer' ? userData.organizationName : null,
        bio: selectedRole === 'organizer' ? userData.bio : null,
        profile_picture_url: userData.profilePictureUrl || null,
      };
      console.log('Attempting to insert user profile with payload:', insertPayload);

      const { data: insertedProfileData, error: insertError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select()
        .single(); // Attempt to get the inserted row back

      console.log('User profile insert operation completed. Error:', insertError, 'Data:', insertedProfileData);

      if (insertError) {
        setIsLoading(false); 
        console.error(
            'Error inserting user profile. Message:', insertError.message,
            'Details:', insertError.details,
            'Hint:', insertError.hint,
            'Code:', insertError.code
        );
        if (Object.keys(insertError).length === 0 || (!insertError.message && !insertError.details && !insertError.hint && !insertError.code)) {
            console.error('Full insertError object was empty or lacked specific details. Payload was:', insertPayload);
        } else {
            console.error('Full insertError object:', JSON.stringify(insertError, null, 2), '. Payload was:', insertPayload);
        }
        toast({ title: 'Sign Up Failed', description: `Could not create user profile: ${insertError.message || 'Unknown profile creation error.'}`, variant: 'destructive'});
        // Consider deleting the auth.users entry here if profile creation fails and you have admin rights,
        // or guide the user to try again or contact support.
        // For now, we return the error. The auth user might be orphaned.
        return { error: { name: "ProfileCreationError", message: insertError.message || 'Unknown profile creation error.' } as AuthError };
      }
      
      console.log('User profile inserted successfully:', insertedProfileData);
      toast({ title: 'Account Created!', description: `Welcome, ${userData.name || 'User'}! Please check your email to confirm your account if required.` });
      // onAuthStateChange will set isLoading to false after processing.
    } else {
      // This case implies supabase.auth.signUp succeeded (no signUpError) but signUpData.user is null.
      // This can happen if "Email confirmation" is enabled and you're checking signUpData.session instead of signUpData.user
      // However, signUpData.user should generally be populated.
      setIsLoading(false); 
      console.warn("Supabase auth.signUp was successful but signUpData.user is null. This might be expected if email confirmation is required and no immediate session is created. Full signUpData:", signUpData);
      // If email confirmation is on, this path might be okay, but the profile insert would fail above.
      // For clarity, let's assume profile insertion is critical.
      // If `signUpData.user` is null, we can't create a profile link.
      const noUserError = { name: "NoUserObjectAfterSignUp", message: "Sign up process anomaly: no user object returned from auth system to link profile." } as AuthError;
      toast({ title: 'Sign Up Issue', description: "Your account needs email confirmation, or an unexpected issue occurred. Profile not created yet.", variant: 'destructive'});
      return { error: noUserError };
    }
    return { error: null };
  };

  const logout = async () => {
    setIsLoading(true);
    console.log('Attempting logout.');
    await supabase.auth.signOut();
    // setUser, setRole, and setIsLoading(false) will be handled by onAuthStateChange
    router.push('/'); 
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };

  const selectRole = async (selectedRole: UserRole) => {
    if (user) {
      setIsLoading(true);
      console.log('Attempting to select role:', selectedRole, 'for user:', user.id);
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('auth_user_id', user.id);

      if (error) {
        setIsLoading(false);
        console.error('Role selection failed:', error);
        toast({ title: 'Error', description: `Could not update role: ${error.message}`, variant: 'destructive'});
        return;
      }

      setRole(selectedRole);
      setUser(prevUser => prevUser ? { ...prevUser, role: selectedRole } : null);
      setIsLoading(false);
      toast({ title: 'Role Selected', description: `Your role has been set to ${selectedRole}.` });
      console.log('Role selected successfully. Navigating...');
      
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
    } else {
      console.warn('selectRole called without a user.');
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, role, isLoading, signIn, logout, selectRole, signUp }}>
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
    
