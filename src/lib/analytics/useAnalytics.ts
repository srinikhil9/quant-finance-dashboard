'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackCalculation, trackEvent, trackError, trackApiCall } from './index';
import type { ModuleName } from '../supabase/types';

/**
 * Hook for tracking page views automatically
 * Place this in your layout or page components
 */
export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view when path changes
    trackPageView(pathname);
  }, [pathname]);
}

/**
 * Hook for tracking calculations in a specific module
 * Returns a wrapped fetch function that automatically tracks timing and results
 */
export function useCalculationTracking(module: ModuleName) {
  const track = useCallback(
    async <T>(
      inputs: Record<string, unknown>,
      apiCall: () => Promise<T>
    ): Promise<T> => {
      return trackApiCall(module, inputs, apiCall);
    },
    [module]
  );

  return { trackCalculation: track };
}

/**
 * Hook for general event tracking
 */
export function useEventTracking() {
  const trackClick = useCallback((element: string, data?: Record<string, unknown>) => {
    trackEvent('feature_click', { element, ...data });
  }, []);

  const trackErrorEvent = useCallback((error: Error | string, context?: Record<string, unknown>) => {
    trackError(error, context);
  }, []);

  return { trackClick, trackError: trackErrorEvent };
}

export { trackPageView, trackCalculation, trackEvent, trackError };
