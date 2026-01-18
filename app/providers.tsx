'use client';

import { AuthProvider } from './app/video-simulation/auth/authContext';
import ChatWidget from '@/components/ChatWidget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ChatWidget />
    </AuthProvider>
  );
}
