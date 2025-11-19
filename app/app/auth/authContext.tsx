'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  _id: string;
  workos_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          return parsed;
        } catch (err) {
          console.error('Failed to parse stored user:', err);
          localStorage.removeItem('user');
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Re-check localStorage on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser && !user) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } catch (err) {
          console.error('Failed to re-parse stored user:', err);
        }
      }
    };

    checkAuth();

    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [user]);

  const login = () => {
    const clientId = process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID;

    // Dynamically determine redirect URI based on current hostname
    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUri = `${currentUrl}/app`;

    if (!clientId) {
      console.error('WorkOS configuration missing');
      return;
    }

    // Redirect to WorkOS hosted authentication
    const authUrl = `https://api.workos.com/user_management/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&provider=authkit`;

    window.location.href = authUrl;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
