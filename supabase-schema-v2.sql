-- Enhanced Analytics Schema for Quant Finance Dashboard
-- Run this SQL AFTER the initial schema (supabase-schema.sql)
-- This adds IP tracking, geolocation, and comprehensive session management

-- ================================================================
-- STEP 1: Add IP and geolocation columns to analytics_events
-- ================================================================
ALTER TABLE analytics_events
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS isp TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,6);

-- ================================================================
-- STEP 2: Add IP and geolocation columns to calculations
-- ================================================================
ALTER TABLE calculations
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- ================================================================
-- STEP 3: Create comprehensive sessions table
-- This tracks the full user journey for each session
-- ================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,

  -- Timing
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),

  -- Geolocation (captured from IP)
  ip_address TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  region TEXT,
  isp TEXT,
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),

  -- Device/Browser info
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,  -- 'desktop', 'mobile', 'tablet'
  language TEXT,
  timezone TEXT,
  screen_width INTEGER,
  screen_height INTEGER,

  -- Traffic source
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Activity metrics
  total_pageviews INTEGER DEFAULT 1,
  total_calculations INTEGER DEFAULT 0,
  modules_used TEXT[] DEFAULT '{}',
  tickers_analyzed TEXT[] DEFAULT '{}',

  -- User journey
  landing_page TEXT,
  last_page TEXT,
  page_sequence TEXT[] DEFAULT '{}',

  -- Session duration
  session_duration_seconds INTEGER DEFAULT 0
);

-- ================================================================
-- STEP 4: Create indexes for efficient queries
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_country ON sessions(country);
CREATE INDEX IF NOT EXISTS idx_sessions_country_code ON sessions(country_code);
CREATE INDEX IF NOT EXISTS idx_sessions_city ON sessions(city);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON sessions(first_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_device_type ON sessions(device_type);

-- Indexes for analytics_events geolocation
CREATE INDEX IF NOT EXISTS idx_events_country ON analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_events_ip ON analytics_events(ip_address);

-- Indexes for calculations geolocation
CREATE INDEX IF NOT EXISTS idx_calcs_country ON calculations(country);
CREATE INDEX IF NOT EXISTS idx_calcs_ip ON calculations(ip_address);

-- ================================================================
-- STEP 5: Enable Row Level Security (RLS) for sessions table
-- ================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous inserts" ON sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous reads (for admin dashboard)
CREATE POLICY "Allow anonymous reads" ON sessions
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous updates (for session activity tracking)
CREATE POLICY "Allow anonymous updates" ON sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- USEFUL QUERIES FOR ENHANCED ADMIN DASHBOARD
-- ================================================================

-- Top countries by visitor count
-- SELECT country, COUNT(DISTINCT session_id) as visitors
-- FROM sessions
-- WHERE country IS NOT NULL
-- GROUP BY country
-- ORDER BY visitors DESC
-- LIMIT 20;

-- Top cities
-- SELECT city, country, COUNT(DISTINCT session_id) as visitors
-- FROM sessions
-- WHERE city IS NOT NULL
-- GROUP BY city, country
-- ORDER BY visitors DESC
-- LIMIT 20;

-- Session duration distribution
-- SELECT
--   CASE
--     WHEN session_duration_seconds < 60 THEN '< 1 min'
--     WHEN session_duration_seconds < 300 THEN '1-5 min'
--     WHEN session_duration_seconds < 900 THEN '5-15 min'
--     WHEN session_duration_seconds < 1800 THEN '15-30 min'
--     ELSE '> 30 min'
--   END as duration_bucket,
--   COUNT(*) as sessions
-- FROM sessions
-- GROUP BY duration_bucket
-- ORDER BY MIN(session_duration_seconds);

-- Device breakdown
-- SELECT device_type, COUNT(*) as sessions
-- FROM sessions
-- WHERE device_type IS NOT NULL
-- GROUP BY device_type;

-- Most used modules per session
-- SELECT unnest(modules_used) as module, COUNT(*) as usage_count
-- FROM sessions
-- GROUP BY module
-- ORDER BY usage_count DESC;

-- User journeys (landing -> exit)
-- SELECT landing_page, last_page, COUNT(*) as journeys
-- FROM sessions
-- WHERE landing_page IS NOT NULL AND last_page IS NOT NULL
-- GROUP BY landing_page, last_page
-- ORDER BY journeys DESC
-- LIMIT 20;

-- ISP distribution (identify institutional traders)
-- SELECT isp, COUNT(DISTINCT session_id) as visitors
-- FROM sessions
-- WHERE isp IS NOT NULL
-- GROUP BY isp
-- ORDER BY visitors DESC
-- LIMIT 20;
