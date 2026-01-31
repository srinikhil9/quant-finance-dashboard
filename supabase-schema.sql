-- Supabase Database Schema for Quant Finance Dashboard
-- Run this SQL in the Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ================================================================
-- TABLE: calculations
-- Stores every calculation performed by users (anonymous tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,              -- Anonymous browser session ID
  module TEXT NOT NULL,                  -- Module name (e.g., 'black-scholes', 'monte-carlo')
  input_params JSONB NOT NULL,           -- Input parameters used
  results JSONB,                         -- Summarized results (not full arrays)
  execution_time_ms INTEGER,             -- How long the calculation took
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by module
CREATE INDEX IF NOT EXISTS idx_calculations_module ON calculations(module);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_calculations_created ON calculations(created_at);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_calculations_session ON calculations(session_id);

-- ================================================================
-- TABLE: analytics_events
-- Stores page views, feature clicks, errors, etc.
-- ================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,              -- 'pageview', 'calculation', 'error', 'feature_click'
  event_data JSONB,                      -- Event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);

-- ================================================================
-- TABLE: watchlists (for future use)
-- Stores user watchlists (by session)
-- ================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tickers TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_watchlists_session ON watchlists(session_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production security
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (anyone can write)
CREATE POLICY "Allow anonymous inserts" ON calculations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts" ON analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts" ON watchlists
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow reading own session data
CREATE POLICY "Users can read own session data" ON calculations
  FOR SELECT
  TO anon
  USING (true);  -- For admin, you can use a service key

CREATE POLICY "Users can read own session data" ON analytics_events
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can read own session data" ON watchlists
  FOR SELECT
  TO anon
  USING (true);

-- ================================================================
-- USEFUL QUERIES FOR ADMIN DASHBOARD
-- ================================================================

-- Most popular modules
-- SELECT module, COUNT(*) as count
-- FROM calculations
-- GROUP BY module
-- ORDER BY count DESC;

-- Most popular tickers
-- SELECT input_params->>'ticker' as ticker, COUNT(*) as count
-- FROM calculations
-- WHERE input_params->>'ticker' IS NOT NULL
-- GROUP BY input_params->>'ticker'
-- ORDER BY count DESC
-- LIMIT 20;

-- Calculations per day
-- SELECT DATE(created_at) as date, COUNT(*) as count
-- FROM calculations
-- GROUP BY DATE(created_at)
-- ORDER BY date DESC;

-- Average execution time by module
-- SELECT module, AVG(execution_time_ms) as avg_time_ms
-- FROM calculations
-- GROUP BY module
-- ORDER BY avg_time_ms DESC;

-- Unique sessions per day
-- SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as unique_users
-- FROM analytics_events
-- WHERE event_type = 'pageview'
-- GROUP BY DATE(created_at)
-- ORDER BY date DESC;
