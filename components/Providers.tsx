'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
