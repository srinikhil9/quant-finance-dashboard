// Anonymous session management for tracking users without accounts

const SESSION_KEY = 'qfd_session_id';

/**
 * Generate a unique session ID
 * Uses crypto.randomUUID if available, fallback to timestamp + random
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create a session ID for the current user
 * Session persists across page reloads but not across browsers/devices
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side, return a placeholder
    return 'server-side';
  }

  // Try to get existing session from localStorage
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Create new session
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clear the current session (for debugging/testing)
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Get session metadata for analytics
 */
export function getSessionMetadata(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    user_agent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_width: window.screen.width.toString(),
    screen_height: window.screen.height.toString(),
    referrer: document.referrer || 'direct',
  };
}
