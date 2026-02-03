/**
 * Visitor Information Management
 *
 * Fetches and caches visitor IP and geolocation data using free public APIs.
 * Uses sessionStorage to avoid repeated API calls within a session.
 *
 * Note: We use client-side geolocation APIs since we removed the server-side
 * API to stay under Vercel's 12 function limit.
 */

const VISITOR_INFO_KEY = 'qfd_visitor_info';
const VISITOR_INFO_TIMESTAMP_KEY = 'qfd_visitor_info_timestamp';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

export interface VisitorInfo {
  ip: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  org: string | null;
  timezone: string | null;
  timestamp: string;
  isDevelopment?: boolean;
  geoLookupFailed?: boolean;
}

// In-memory cache for the current page
let cachedVisitorInfo: VisitorInfo | null = null;
let fetchPromise: Promise<VisitorInfo> | null = null;

/**
 * Get cached visitor info from sessionStorage
 */
function getCachedVisitorInfo(): VisitorInfo | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(VISITOR_INFO_KEY);
    const timestamp = sessionStorage.getItem(VISITOR_INFO_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    // Check if cache is still valid
    const cacheTime = parseInt(timestamp, 10);
    if (Date.now() - cacheTime > CACHE_DURATION_MS) {
      // Cache expired
      sessionStorage.removeItem(VISITOR_INFO_KEY);
      sessionStorage.removeItem(VISITOR_INFO_TIMESTAMP_KEY);
      return null;
    }

    return JSON.parse(cached) as VisitorInfo;
  } catch {
    return null;
  }
}

/**
 * Save visitor info to sessionStorage
 */
function cacheVisitorInfo(info: VisitorInfo): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(VISITOR_INFO_KEY, JSON.stringify(info));
    sessionStorage.setItem(VISITOR_INFO_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

/**
 * Fetch visitor info from free public geolocation APIs
 * Tries multiple APIs in case one is down
 */
async function fetchVisitorInfoFromAPI(): Promise<VisitorInfo> {
  const fallbackInfo: VisitorInfo = {
    ip: 'unknown',
    country: null,
    countryCode: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
    isp: null,
    org: null,
    timezone: typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null,
    timestamp: new Date().toISOString(),
    geoLookupFailed: true,
  };

  // Try ip-api.com first (free, no API key, 45 req/min)
  // Note: HTTP only on free tier, but works for basic info
  try {
    const response = await fetch(
      'http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,query',
      { mode: 'cors' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          ip: data.query || 'unknown',
          country: data.country || null,
          countryCode: data.countryCode || null,
          region: data.regionName || data.region || null,
          city: data.city || null,
          latitude: data.lat || null,
          longitude: data.lon || null,
          isp: data.isp || null,
          org: data.org || null,
          timezone: data.timezone || fallbackInfo.timezone,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.debug('[visitorInfo] ip-api.com failed:', e);
  }

  // Try ipapi.co as fallback (HTTPS, 1000 req/day free)
  try {
    const response = await fetch('https://ipapi.co/json/', { mode: 'cors' });

    if (response.ok) {
      const data = await response.json();
      if (!data.error) {
        return {
          ip: data.ip || 'unknown',
          country: data.country_name || null,
          countryCode: data.country_code || null,
          region: data.region || null,
          city: data.city || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          isp: data.org || null,
          org: data.org || null,
          timezone: data.timezone || fallbackInfo.timezone,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.debug('[visitorInfo] ipapi.co failed:', e);
  }

  // All APIs failed, return fallback
  console.warn('[visitorInfo] All geolocation APIs failed');
  return fallbackInfo;
}

/**
 * Get visitor info (with caching)
 *
 * Returns cached data if available, otherwise fetches from API.
 * Multiple concurrent calls will share the same fetch promise.
 */
export async function getVisitorInfo(): Promise<VisitorInfo> {
  // Check in-memory cache first (fastest)
  if (cachedVisitorInfo) {
    return cachedVisitorInfo;
  }

  // Check sessionStorage cache
  const sessionCached = getCachedVisitorInfo();
  if (sessionCached) {
    cachedVisitorInfo = sessionCached;
    return sessionCached;
  }

  // If a fetch is already in progress, wait for it
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = fetchVisitorInfoFromAPI().then((info) => {
    cachedVisitorInfo = info;
    cacheVisitorInfo(info);
    fetchPromise = null;
    return info;
  }).catch((error) => {
    fetchPromise = null;
    console.warn('[visitorInfo] Fetch failed:', error);
    // Return fallback on error
    return {
      ip: 'unknown',
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      isp: null,
      org: null,
      timezone: typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null,
      timestamp: new Date().toISOString(),
      geoLookupFailed: true,
    };
  });

  return fetchPromise;
}

/**
 * Get visitor info synchronously (returns cached data or null)
 *
 * Use this when you need visitor info but can't wait for async.
 * Call getVisitorInfo() early in the app lifecycle to populate cache.
 */
export function getVisitorInfoSync(): VisitorInfo | null {
  if (cachedVisitorInfo) {
    return cachedVisitorInfo;
  }

  const sessionCached = getCachedVisitorInfo();
  if (sessionCached) {
    cachedVisitorInfo = sessionCached;
    return sessionCached;
  }

  return null;
}

/**
 * Clear visitor info cache (for testing/debugging)
 */
export function clearVisitorInfoCache(): void {
  cachedVisitorInfo = null;
  fetchPromise = null;

  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(VISITOR_INFO_KEY);
    sessionStorage.removeItem(VISITOR_INFO_TIMESTAMP_KEY);
  }
}

/**
 * Initialize visitor info fetching
 *
 * Call this early in app lifecycle to start fetching visitor info
 * in the background. This ensures data is ready when needed.
 */
export function initVisitorInfo(): void {
  if (typeof window === 'undefined') return;

  // Only fetch if not already cached
  if (!cachedVisitorInfo && !getCachedVisitorInfo()) {
    getVisitorInfo().catch(() => {
      // Silently handle errors - we'll use fallback data
    });
  }
}
