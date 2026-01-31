// Database types for Supabase tables

export interface Calculation {
  id?: string;
  session_id: string;
  module: string;
  input_params: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  execution_time_ms?: number;
  created_at?: string;
}

export interface AnalyticsEvent {
  id?: string;
  session_id: string;
  event_type: 'pageview' | 'calculation' | 'error' | 'feature_click';
  event_data?: Record<string, unknown>;
  created_at?: string;
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
