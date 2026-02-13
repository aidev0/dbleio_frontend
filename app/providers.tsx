'use client';

import { AuthProvider } from './app/video-simulation/auth/authContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
