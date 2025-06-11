
'use client';

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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
      .select('name, role, organizationName, bio')
      .eq('auth_user_id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Error fetching user profile:', error);
      toast({ title: 'Error', description: 'Could not fetch user profile.', variant: 'destructive' });
      return null;
    }

    if (profile) {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.name,
        role: profile.role as UserRole,
        organizationName: profile.organizationName,
        bio: profile.bio,
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
          // User is authenticated with Supabase, but no profile in our DB yet
          // This can happen if sign-up process was interrupted or if it's an old user
          // Set basic user info from Supabase, role will be null
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User', // Placeholder name
          });
          setRole(null);
          // If no role, they should be directed to /dashboard to select one (or create profile)
          if (router.pathname !== '/dashboard' && router.pathname !== '/sign-up' && router.pathname !== '/login') {
             // router.push('/dashboard'); // Let page specific useEffects handle this more gracefully
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    // Check initial session
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   if (session?.user) {
    //     fetchUserProfile(session.user).then(userProfile => {
    //       if (userProfile) {
    //         setUser(userProfile);
    //         setRole(userProfile.role || null);
    //       }
    //       setIsLoading(false);
    //     });
    //   } else {
    //     setIsLoading(false);
    //   }
    // });


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
      // onAuthStateChange will handle setting user and role, then page effects will redirect.
      // No direct router.push here needed if pages handle their redirects based on auth state.
      // However, a common pattern is to push to dashboard if login page initiated it.
      // For now, let onAuthStateChange and page logic handle it.
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
        organizationName: selectedRole === 'organizer' ? userData.organizationName : null,
        bio: selectedRole === 'organizer' ? userData.bio : null,
      });

      if (insertError) {
        setIsLoading(false);
        // Potentially roll back Supabase auth user or notify admin, but for now, just error
        console.error("Error inserting user profile:", insertError);
        toast({ title: 'Sign Up Failed', description: `Could not create user profile: ${insertError.message}`, variant: 'destructive'});
        // Try to sign out the user if profile creation failed.
        await supabase.auth.signOut();
        return { error: { name: "ProfileCreationError", message: insertError.message } as AuthError };
      }
      
      // User is signed up and profile created. onAuthStateChange should pick them up.
      // Forcing a refresh of user state based on the newly created user.
      const newUserProfile = await fetchUserProfile(signUpData.user);
      if (newUserProfile) {
        setUser(newUserProfile);
        setRole(newUserProfile.role || null);
        toast({ title: 'Account Created!', description: `Welcome, ${newUserProfile.name}!` });
      } else {
         // Fallback if fetchUserProfile fails immediately after insert (should be rare)
         setUser({ id: signUpData.user.id, email: signUpData.user.email!, name: userData.name || "User"});
         setRole(selectedRole);
         toast({ title: 'Account Created! Profile pending.', description: `Welcome!` });
      }
    }
    setIsLoading(false);
    return { error: null }; // Success
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
      
      // Redirect based on new role
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
      {isLoading && ( /* Optional: Global loading indicator can be placed here or handled by Toaster/individual pages */
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[200]">
          {/* <Loader2 className="h-10 w-10 animate-spin text-primary" /> */}
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

    