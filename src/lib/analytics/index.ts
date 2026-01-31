import { supabase, isSupabaseConfigured } from '../supabase/client';
import { getSessionId, getSessionMetadata } from './session';
import type { Calculation, AnalyticsEvent, ModuleName } from '../supabase/types';

/**
 * Analytics client for tracking user calculations and events
 *
 * All tracking is anonymous - we use session IDs, not user accounts.
 * Data is stored in Supabase for analysis.
 */

// Queue for offline/failed events (retry later)
let eventQueue: AnalyticsEvent[] = [];

/**
 * Track a page view
 */
export async function trackPageView(page: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.debug('[Analytics] Supabase not configured, skipping pageview tracking');
    return;
  }

  const event: AnalyticsEvent = {
    session_id: getSessionId(),
    event_type: 'pageview',
    event_data: {
      page,
      url: typeof window !== 'undefined' ? window.location.href : '',
      ...getSessionMetadata(),
    },
  };

  try {
    const { error } = await supabase.from('analytics_events').insert(event);
    if (error) {
      console.warn('[Analytics] Failed to track pageview:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] Error tracking pageview:', err);
  }
}

/**
 * Track a calculation (the core of what we're tracking!)
 *
 * @param module - Which module was used (e.g., 'black-scholes', 'monte-carlo')
 * @param inputs - The input parameters the user provided
 * @param results - The calculation results (can be large, we'll store summary)
 * @param executionTimeMs - How long the calculation took
 */
export async function trackCalculation(
  module: ModuleName,
  inputs: Record<string, unknown>,
  results: Record<string, unknown> | null,
  executionTimeMs: number
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.debug('[Analytics] Supabase not configured, skipping calculation tracking');
    return;
  }

  // Sanitize inputs - remove any potentially sensitive data
  const sanitizedInputs = sanitizeInputs(inputs);

  // Summarize results to avoid storing huge arrays
  const summarizedResults = summarizeResults(results);

  const calculation: Calculation = {
    session_id: getSessionId(),
    module,
    input_params: sanitizedInputs,
    results: summarizedResults,
    execution_time_ms: executionTimeMs,
  };

  try {
    const { error } = await supabase.from('calculations').insert(calculation);
    if (error) {
      console.warn('[Analytics] Failed to track calculation:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] Error tracking calculation:', err);
  }
}

/**
 * Track a generic event (button clicks, feature usage, etc.)
 */
export async function trackEvent(
  eventType: AnalyticsEvent['event_type'],
  eventData: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const event: AnalyticsEvent = {
    session_id: getSessionId(),
    event_type: eventType,
    event_data: eventData,
  };

  try {
    const { error } = await supabase.from('analytics_events').insert(event);
    if (error) {
      console.warn('[Analytics] Failed to track event:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] Error tracking event:', err);
  }
}

/**
 * Track an error
 */
export async function trackError(
  error: Error | string,
  context: Record<string, unknown> = {}
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  await trackEvent('error', {
    error_message: errorMessage,
    error_stack: errorStack,
    ...context,
  });
}

/**
 * Remove potentially sensitive information from inputs
 */
function sanitizeInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...inputs };

  // List of keys that might contain sensitive data
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Summarize results to avoid storing huge arrays
 * We want to track what kind of results users get, not the full data
 */
function summarizeResults(results: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!results) return null;

  const summary: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(results)) {
    if (Array.isArray(value)) {
      // For arrays, store length and type instead of full data
      summary[key] = {
        _type: 'array',
        _length: value.length,
        _sample: value.length > 0 ? typeof value[0] : 'empty',
      };
    } else if (typeof value === 'object' && value !== null) {
      // For nested objects, recurse but limit depth
      summary[key] = summarizeResults(value as Record<string, unknown>);
    } else {
      // Primitives are stored as-is
      summary[key] = value;
    }
  }

  return summary;
}

/**
 * Wrapper function to track API calls with timing
 * Use this to wrap your fetch calls
 */
export async function trackApiCall<T>(
  module: ModuleName,
  inputs: Record<string, unknown>,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const executionTime = Math.round(performance.now() - startTime);

    // Track successful calculation
    await trackCalculation(
      module,
      inputs,
      result as Record<string, unknown>,
      executionTime
    );

    return result;
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);

    // Track failed calculation
    await trackCalculation(
      module,
      inputs,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      executionTime
    );

    // Also track as error event
    await trackError(error as Error, { module, inputs });

    throw error;
  }
}

// Export session utilities for components that need them
export { getSessionId } from './session';
