import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
  verifyEmail: (oobCode: string) => Promise<void>;
  isSalesUser: () => boolean;
  isAdminUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock user for development
const mockUser: User = {
  id: 'dev-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: { role: 'admin' },
  app_metadata: {},
  identities: [],
  last_sign_in_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: undefined,
  factors: undefined,
  is_sso_user: false
};

// Function to determine user role based on email
const getUserRole = (email: string | undefined): string => {
  if (!email) return 'user';
  
  // Sales users
  if (email === '7amza86@gmail.com') {
    return 'sales';
  }
  
  // Admin users (you can add more admin emails here)
  if (email === 'admin@example.com' || email === 'test@example.com') {
    return 'admin';
  }
  
  // Default role
  return 'user';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we're in development mode
    const isDevMode = localStorage.getItem('dev_mode') === 'true';

    if (isDevMode) {
      // In dev mode, check for an existing session first
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          const role = getUserRole(session.user.email);
          setUserRole(role);
          // Update user metadata with role
          const updatedUser = {
            ...session.user,
            user_metadata: { ...session.user.user_metadata, role }
          };
          setUser(updatedUser);
        } else {
          setSession(null);
          const role = getUserRole(mockUser.email);
          setUserRole(role);
          const updatedMockUser = {
            ...mockUser,
            user_metadata: { ...mockUser.user_metadata, role }
          };
          setUser(updatedMockUser);
        }
        setLoading(false);
      });
    } else {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const role = getUserRole(session.user.email);
          setUserRole(role);
          // Update user metadata with role
          const updatedUser = {
            ...session.user,
            user_metadata: { ...session.user.user_metadata, role }
          };
          setUser(updatedUser);
        } else {
          setUser(null);
          setUserRole(null);
        }
        setLoading(false);
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isDevMode && !session) {
        setSession(null);
        const role = getUserRole(mockUser.email);
        setUserRole(role);
        const updatedMockUser = {
          ...mockUser,
          user_metadata: { ...mockUser.user_metadata, role }
        };
        setUser(updatedMockUser);
      } else {
        setSession(session);
        if (session?.user) {
          const role = getUserRole(session.user.email);
          setUserRole(role);
          // Update user metadata with role
          const updatedUser = {
            ...session.user,
            user_metadata: { ...session.user.user_metadata, role }
          };
          setUser(updatedUser);
        } else {
          setUser(null);
          setUserRole(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Clear dev mode if it exists
    localStorage.removeItem('dev_mode');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear the current user
    setSession(null);
    setUser(null);
    setUserRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    });
    if (error) throw error;
  };

  const confirmPasswordReset = async (_oobCode: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    }, {
      emailRedirectTo: `${window.location.origin}/auth/login`
    });
    if (error) throw error;
  };

  const verifyEmail = async (oobCode: string) => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: oobCode,
      type: 'email'
    });
    if (error) throw error;
  };

  // Helper functions to check user roles
  const isSalesUser = (): boolean => {
    return userRole === 'sales';
  };

  const isAdminUser = (): boolean => {
    return userRole === 'admin';
  };

  const value = {
    session,
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmPasswordReset,
    verifyEmail,
    isSalesUser,
    isAdminUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
