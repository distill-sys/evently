
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
      .select('name, role, organization_name, bio, profile_picture_url')
      .eq('auth_user_id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "exactly one row was expected, but 0 or more than 1 were found"
      const isRecursionError = error.code === '42P17'; // PostgreSQL "infinite recursion" error code
      const recursionMessage = "Database RLS Error: Infinite recursion detected in policy for 'users' table. Please check and fix your RLS policies in the Supabase SQL Editor. The 'public.is_admin()' function and related policies might be misconfigured.";
      
      console.error(
        isRecursionError ? recursionMessage : 'Error fetching user profile. Message:', error.message,
        'Details:', error.details,
        'Hint:', error.hint,
        'Code:', error.code
      );

      if (!isRecursionError) {
        if (Object.keys(error).length === 0 || (!error.message && !error.details && !error.hint && !error.code)) {
            console.error('Full error object was empty or lacked specific details. Querying for columns: name, role, organization_name, bio, profile_picture_url. Filter: auth_user_id =', supabaseUser.id);
        } else {
            console.error('Full error object:', JSON.stringify(error, null, 2));
        }
      }
      
      toast({ 
        title: isRecursionError ? 'Database RLS Policy Error' : 'Error Fetching Profile', 
        description: isRecursionError ? recursionMessage : 'Could not fetch user profile.', 
        variant: 'destructive',
        duration: isRecursionError ? 20000 : 5000 // Longer duration for critical RLS error
      });
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
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password_unsafe: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password_unsafe });
    if (error) {
      setIsLoading(false);
      console.error('Sign in failed:', error);
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
        console.error('Sign up failed:', err.message);
        toast({ title: 'Sign Up Failed', description: err.message, variant: 'destructive'});
        return { error: err };
    }

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

    if (signUpData.user) {
      const insertPayload = {
        auth_user_id: signUpData.user.id,
        email: signUpData.user.email, 
        name: userData.name || 'New User',
        role: selectedRole,
        organization_name: selectedRole === 'organizer' ? userData.organizationName : null,
        bio: selectedRole === 'organizer' ? userData.bio : null,
        profile_picture_url: userData.profilePictureUrl || null,
      };

      const { data: insertedProfileData, error: insertError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select()
        .single(); 

      if (insertError) {
        setIsLoading(false); 
        const isRecursionError = insertError.code === '42P17';
        const recursionMessage = "Database RLS Error: Infinite recursion detected. User account created in auth, but profile creation failed due to RLS policy issues on 'users' table. Please fix RLS policies in Supabase SQL Editor.";

        console.error(
            isRecursionError ? recursionMessage : 'Error inserting user profile. Message:', insertError.message,
            'Details:', insertError.details,
            'Hint:', insertError.hint,
            'Code:', insertError.code
        );
        if (!isRecursionError) {
            if (Object.keys(insertError).length === 0 || (!insertError.message && !insertError.details && !insertError.hint && !insertError.code)) {
                console.error('Full insertError object was empty or lacked specific details. Payload was:', insertPayload);
            } else {
                console.error('Full insertError object:', JSON.stringify(insertError, null, 2), '. Payload was:', insertPayload);
            }
        }
        toast({ 
            title: isRecursionError ? 'Database RLS Policy Error' : 'Sign Up Failed', 
            description: isRecursionError ? recursionMessage : `Could not create user profile: ${insertError.message || 'Unknown profile creation error.'}`, 
            variant: 'destructive',
            duration: isRecursionError ? 20000 : 5000
        });
        return { error: { name: "ProfileCreationError", message: isRecursionError ? recursionMessage : (insertError.message || 'Unknown profile creation error.') } as AuthError };
      }
      
      toast({ title: 'Account Created!', description: `Welcome, ${userData.name || 'User'}! Please check your email to confirm your account if required.` });
    } else {
      setIsLoading(false); 
      console.warn("Supabase auth.signUp was successful but signUpData.user is null. This might be expected if email confirmation is required and no immediate session is created. Full signUpData:", signUpData);
      const noUserError = { name: "NoUserObjectAfterSignUp", message: "Sign up process anomaly: no user object returned from auth system to link profile." } as AuthError;
      toast({ title: 'Sign Up Issue', description: "Your account needs email confirmation, or an unexpected issue occurred. Profile not created yet.", variant: 'destructive'});
      return { error: noUserError };
    }
    return { error: null };
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
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
        const isRecursionError = error.code === '42P17';
        const recursionMessage = "Database RLS Error: Infinite recursion detected when updating role. Please check your RLS policies in the Supabase SQL Editor.";
        console.error(isRecursionError ? recursionMessage : 'Role selection failed:', error);
        toast({ 
          title: isRecursionError ? 'Database RLS Policy Error' : 'Error', 
          description: isRecursionError ? recursionMessage : `Could not update role: ${error.message}`, 
          variant: 'destructive',
          duration: isRecursionError ? 20000 : 5000
        });
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
    
