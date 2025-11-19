'use client';

import { AuthProvider } from './app/auth/authContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
