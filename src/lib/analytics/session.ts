// Anonymous session management for tracking users without accounts

import { getVisitorInfoSync, type VisitorInfo } from './visitorInfo';

const SESSION_KEY = 'qfd_session_id';
const SESSION_START_KEY = 'qfd_session_start';
const SESSION_PAGES_KEY = 'qfd_session_pages';
const SESSION_MODULES_KEY = 'qfd_session_modules';
const SESSION_TICKERS_KEY = 'qfd_session_tickers';

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
    // Record session start time
    localStorage.setItem(SESSION_START_KEY, new Date().toISOString());
  }

  return sessionId;
}

/**
 * Get session start time
 */
export function getSessionStartTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_START_KEY);
}

/**
 * Calculate session duration in seconds
 */
export function getSessionDuration(): number {
  const startTime = getSessionStartTime();
  if (!startTime) return 0;

  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

/**
 * Track a page visit in the session
 */
export function trackPageInSession(page: string): void {
  if (typeof window === 'undefined') return;

  try {
    const pagesJson = localStorage.getItem(SESSION_PAGES_KEY);
    const pages: string[] = pagesJson ? JSON.parse(pagesJson) : [];
    pages.push(page);
    // Keep only last 100 pages to avoid localStorage limits
    if (pages.length > 100) pages.shift();
    localStorage.setItem(SESSION_PAGES_KEY, JSON.stringify(pages));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the sequence of pages visited in this session
 */
export function getSessionPages(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const pagesJson = localStorage.getItem(SESSION_PAGES_KEY);
    return pagesJson ? JSON.parse(pagesJson) : [];
  } catch {
    return [];
  }
}

/**
 * Get the landing page (first page visited)
 */
export function getLandingPage(): string | null {
  const pages = getSessionPages();
  return pages.length > 0 ? pages[0] : null;
}

/**
 * Get the last page visited
 */
export function getLastPage(): string | null {
  const pages = getSessionPages();
  return pages.length > 0 ? pages[pages.length - 1] : null;
}

/**
 * Track a module used in the session
 */
export function trackModuleInSession(module: string): void {
  if (typeof window === 'undefined') return;

  try {
    const modulesJson = localStorage.getItem(SESSION_MODULES_KEY);
    const modules: string[] = modulesJson ? JSON.parse(modulesJson) : [];
    if (!modules.includes(module)) {
      modules.push(module);
      localStorage.setItem(SESSION_MODULES_KEY, JSON.stringify(modules));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get all modules used in this session
 */
export function getSessionModules(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const modulesJson = localStorage.getItem(SESSION_MODULES_KEY);
    return modulesJson ? JSON.parse(modulesJson) : [];
  } catch {
    return [];
  }
}

/**
 * Track a ticker analyzed in the session
 */
export function trackTickerInSession(ticker: string): void {
  if (typeof window === 'undefined') return;

  try {
    const tickersJson = localStorage.getItem(SESSION_TICKERS_KEY);
    const tickers: string[] = tickersJson ? JSON.parse(tickersJson) : [];
    if (!tickers.includes(ticker)) {
      tickers.push(ticker);
      // Keep only last 50 tickers
      if (tickers.length > 50) tickers.shift();
      localStorage.setItem(SESSION_TICKERS_KEY, JSON.stringify(tickers));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get all tickers analyzed in this session
 */
export function getSessionTickers(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const tickersJson = localStorage.getItem(SESSION_TICKERS_KEY);
    return tickersJson ? JSON.parse(tickersJson) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the current session (for debugging/testing)
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(SESSION_PAGES_KEY);
    localStorage.removeItem(SESSION_MODULES_KEY);
    localStorage.removeItem(SESSION_TICKERS_KEY);
  }
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android')) deviceType = 'mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) deviceType = 'tablet';

  return { browser, os, deviceType };
}

/**
 * Get session metadata for analytics (basic info)
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

/**
 * Get enhanced session metadata including geo info if available
 */
export function getEnhancedSessionMetadata(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return {};
  }

  const basicMetadata = getSessionMetadata();
  const { browser, os, deviceType } = parseUserAgent(navigator.userAgent);

  // Get visitor info if available (sync to avoid blocking)
  const visitorInfo = getVisitorInfoSync();

  // Parse UTM parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');

  return {
    ...basicMetadata,

    // Parsed device info
    browser,
    os,
    device_type: deviceType,

    // Session tracking
    session_start: getSessionStartTime(),
    session_duration_seconds: getSessionDuration(),
    landing_page: getLandingPage(),
    last_page: getLastPage(),
    pages_visited: getSessionPages().length,
    modules_used: getSessionModules(),
    tickers_analyzed: getSessionTickers(),

    // UTM tracking
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,

    // Geo info (if available)
    ip_address: visitorInfo?.ip || null,
    country: visitorInfo?.country || null,
    country_code: visitorInfo?.countryCode || null,
    region: visitorInfo?.region || null,
    city: visitorInfo?.city || null,
    latitude: visitorInfo?.latitude || null,
    longitude: visitorInfo?.longitude || null,
    isp: visitorInfo?.isp || null,
  };
}

/**
 * Get session data suitable for upserting to the sessions table
 */
export interface SessionData {
  session_id: string;
  first_seen?: string;
  last_seen: string;
  ip_address: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string;
  browser: string;
  os: string;
  device_type: string;
  language: string;
  timezone: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  total_pageviews: number;
  total_calculations: number;
  modules_used: string[];
  tickers_analyzed: string[];
  landing_page: string | null;
  last_page: string | null;
  page_sequence: string[];
  session_duration_seconds: number;
}

export function getSessionData(): SessionData {
  const metadata = getEnhancedSessionMetadata();
  const visitorInfo = getVisitorInfoSync();

  return {
    session_id: getSessionId(),
    last_seen: new Date().toISOString(),
    ip_address: visitorInfo?.ip || null,
    country: visitorInfo?.country || null,
    country_code: visitorInfo?.countryCode || null,
    city: visitorInfo?.city || null,
    region: visitorInfo?.region || null,
    isp: visitorInfo?.isp || null,
    latitude: visitorInfo?.latitude || null,
    longitude: visitorInfo?.longitude || null,
    user_agent: navigator.userAgent,
    browser: metadata.browser as string,
    os: metadata.os as string,
    device_type: metadata.device_type as string,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    referrer: document.referrer || 'direct',
    utm_source: metadata.utm_source as string | null,
    utm_medium: metadata.utm_medium as string | null,
    utm_campaign: metadata.utm_campaign as string | null,
    total_pageviews: getSessionPages().length,
    total_calculations: 0, // Will be updated by trackCalculation
    modules_used: getSessionModules(),
    tickers_analyzed: getSessionTickers(),
    landing_page: getLandingPage(),
    last_page: getLastPage(),
    page_sequence: getSessionPages(),
    session_duration_seconds: getSessionDuration(),
  };
}
