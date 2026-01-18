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

/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    // Only check expiration if token looks like a JWT
    const parts = token.split('.');
    if (parts.length !== 3) return false; // Not a JWT, assume valid

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    if (!exp) return false;
    // Add 30 second buffer
    return Date.now() >= (exp * 1000) - 30000;
  } catch {
    // If parsing fails, assume token is valid (let backend validate)
    return false;
  }
}

/**
 * Check if user has a valid (non-expired) access token
 */
function hasValidToken(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('access_token');
  return !!token; // Just check if token exists, let backend validate
}

/**
 * Clear all auth data from localStorage
 */
function clearAuthData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = () => {
      // Check if we have a valid token
      if (!hasValidToken()) {
        // Token is missing or expired - clear everything
        clearAuthData();
        setUser(null);
        setLoading(false);
        return;
      }

      // Token is valid, load user from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } catch (err) {
          console.error('Failed to parse stored user:', err);
          clearAuthData();
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

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
    window.location.href = '/';
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
