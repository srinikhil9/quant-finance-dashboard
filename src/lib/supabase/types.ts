// Database types for Supabase tables

export interface Calculation {
  id?: string;
  session_id: string;
  module: string;
  input_params: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  execution_time_ms?: number;
  created_at?: string;
  // Enhanced tracking fields
  ip_address?: string | null;
  country?: string | null;
  city?: string | null;
}

export interface AnalyticsEvent {
  id?: string;
  session_id: string;
  event_type: 'pageview' | 'calculation' | 'error' | 'feature_click';
  event_data?: Record<string, unknown>;
  created_at?: string;
  // Enhanced tracking fields
  ip_address?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  isp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Session {
  id?: string;
  session_id: string;
  first_seen?: string;
  last_seen: string;
  // Geolocation
  ip_address?: string | null;
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  isp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Device/Browser info
  user_agent?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  language?: string;
  timezone?: string;
  screen_width?: number;
  screen_height?: number;
  // Traffic source
  referrer?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  // Activity metrics
  total_pageviews?: number;
  total_calculations?: number;
  modules_used?: string[];
  tickers_analyzed?: string[];
  // User journey
  landing_page?: string | null;
  last_page?: string | null;
  page_sequence?: string[];
  // Session duration
  session_duration_seconds?: number;
}

export interface Watchlist {
  id?: string;
  session_id: string;
  name: string;
  tickers: string[];
  created_at?: string;
}

// Module names for tracking
export type ModuleName =
  | 'black-scholes'
  | 'monte-carlo'
  | 'var'
  | 'volatility'
  | 'ml-prediction'
  | 'pairs-trading'
  | 'fixed-income'
  | 'basket-trading'
  | 'spo-portfolio'
  | 'rl-hedging'
  | 'regime-detection'
  | 'stock-clustering'
  | 'anomaly-detection'
  | 'options-chain'
  | 'portfolio'
  | 'technical'
  | 'backtest';
