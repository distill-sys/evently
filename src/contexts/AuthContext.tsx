'use client';

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
  selectRole: (selectedRole: UserRole) => void;
  signUp: (userData: Partial<User>, role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER_STORAGE_KEY = 'evently_mock_user';
const MOCK_ROLE_STORAGE_KEY = 'evently_mock_role';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(MOCK_USER_STORAGE_KEY);
      const storedRole = localStorage.getItem(MOCK_ROLE_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedRole) {
        setRole(storedRole as UserRole);
      }
    } catch (error) {
      console.error("Failed to load user/role from localStorage", error);
      // Clear potentially corrupted storage
      localStorage.removeItem(MOCK_USER_STORAGE_KEY);
      localStorage.removeItem(MOCK_ROLE_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, name: string = "Mock User") => {
    setIsLoading(true);
    const mockUser: User = { id: 'mock-user-id', email, name };
    setUser(mockUser);
    localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
    // Don't set role here, user will select it on dashboard
    localStorage.removeItem(MOCK_ROLE_STORAGE_KEY); 
    setRole(null);
    setIsLoading(false);
    router.push('/dashboard');
  };

  const signUp = (userData: Partial<User>, selectedRole: UserRole) => {
    setIsLoading(true);
    const mockUser: User = { 
      id: `mock-user-${Date.now()}`, 
      email: userData.email || 'test@example.com', 
      name: userData.name || 'New User',
      role: selectedRole, // Store role directly from sign up
      ...userData
    };
    setUser(mockUser);
    setRole(selectedRole);
    localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
    localStorage.setItem(MOCK_ROLE_STORAGE_KEY, selectedRole);
    setIsLoading(false);
    // Redirect based on signed up role
     switch (selectedRole) {
      case 'attendee':
        router.push('/attendee');
        break;
      case 'organizer':
        // For simplicity, redirect to a generic organizer page or their profile if ID exists
        router.push(`/organizer/${mockUser.id}`); // Needs an organizer ID, using user ID as placeholder
        break;
      case 'admin':
        router.push('/admin');
        break;
      default:
        router.push('/dashboard'); // Fallback
    }
  };

  const logout = () => {
    setIsLoading(true);
    setUser(null);
    setRole(null);
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
    localStorage.removeItem(MOCK_ROLE_STORAGE_KEY);
    setIsLoading(false);
    router.push('/');
  };

  const selectRole = (selectedRole: UserRole) => {
    if (user) {
      setIsLoading(true);
      setRole(selectedRole);
      localStorage.setItem(MOCK_ROLE_STORAGE_KEY, selectedRole);
      const updatedUser = { ...user, role: selectedRole };
      setUser(updatedUser);
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setIsLoading(false);
      switch (selectedRole) {
        case 'attendee':
          router.push('/attendee');
          break;
        case 'organizer':
           // Using user ID as placeholder for organizer ID
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
  
  if (isLoading && typeof window !== 'undefined' ) {
     // Render a simple loading state or null during SSR/initial client load
     // This check helps avoid flashing content during hydration.
     return null;
  }


  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout, selectRole, signUp }}>
      {children}
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
