'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Analytics Provider Component
 *
 * Wrap your app with this to automatically track page views.
 * Add to layout.tsx like:
 *
 * <AnalyticsProvider>
 *   {children}
 * </AnalyticsProvider>
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view on initial load and route changes
    trackPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}

export default AnalyticsProvider;
