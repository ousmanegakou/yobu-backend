-- ═══════════════════════════════════════════════════════════════
-- YOBU DATABASE SCHEMA
-- Same-Day Delivery Platform
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('merchant', 'driver', 'admin');
CREATE TYPE route_status     AS ENUM ('pending', 'assigned', 'picked_up', 'in_progress', 'completed', 'cancelled');
CREATE TYPE stop_status      AS ENUM ('pending', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed');
CREATE TYPE route_priority   AS ENUM ('standard', 'express', 'urgent');
CREATE TYPE proof_method     AS ENUM ('qr_scan', 'barcode', 'otp', 'signature', 'photo');
CREATE TYPE driver_status    AS ENUM ('offline', 'available', 'on_route');
CREATE TYPE merchant_plan    AS ENUM ('starter', 'standard', 'premium');
CREATE TYPE invoice_status   AS ENUM ('pending', 'paid', 'overdue');

-- ─── MERCHANTS ────────────────────────────────────────────────
CREATE TABLE merchants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  phone         VARCHAR(30),
  address       TEXT,
  category      VARCHAR(80),               -- "Cosmetics & Beauty", "Electronics", etc.
  plan          merchant_plan DEFAULT 'standard',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DRIVERS ──────────────────────────────────────────────────
CREATE TABLE drivers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  phone         VARCHAR(30) NOT NULL,
  vehicle       VARCHAR(80),               -- "Toyota Corolla 2020"
  plate         VARCHAR(20),
  status        driver_status DEFAULT 'offline',
  lat           DECIMAL(10,7),             -- current GPS latitude
  lng           DECIMAL(10,7),             -- current GPS longitude
  last_seen     TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ADMINS ───────────────────────────────────────────────────
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DELIVERY ROUTES ─────────────────────────────────────────
CREATE TABLE routes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_code      VARCHAR(20) UNIQUE NOT NULL,  -- "YB-R4825"
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES drivers(id),
  status          route_status DEFAULT 'pending',
  priority        route_priority DEFAULT 'standard',
  distance_miles  DECIMAL(8,2) DEFAULT 0,
  price_base      DECIMAL(8,2) NOT NULL,
  price_stops     DECIMAL(8,2) NOT NULL,
  price_distance  DECIMAL(8,2) NOT NULL,
  price_total     DECIMAL(8,2) NOT NULL,
  pickup_barcode  VARCHAR(80) NOT NULL,         -- "YB-R4825-PKP"
  pickup_scanned_at   TIMESTAMPTZ,
  pickup_scan_lat     DECIMAL(10,7),
  pickup_scan_lng     DECIMAL(10,7),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DELIVERY STOPS ──────────────────────────────────────────
CREATE TABLE stops (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id         UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_number      INT NOT NULL,              -- 1, 2, 3 ...
  customer_name    VARCHAR(120) NOT NULL,
  customer_phone   VARCHAR(30) NOT NULL,
  delivery_address TEXT NOT NULL,
  product_desc     TEXT,
  instructions     TEXT,
  status           stop_status DEFAULT 'pending',
  qr_code          VARCHAR(120) NOT NULL,     -- "YB-R4825-S1-DLV"
  qr_token         VARCHAR(80) NOT NULL,      -- random token
  qr_hmac          VARCHAR(120) NOT NULL,     -- HMAC-SHA256
  otp_code         VARCHAR(6) NOT NULL,       -- 4-digit OTP
  otp_verified     BOOLEAN DEFAULT false,
  proof_method     proof_method,
  proof_data       TEXT,                      -- base64 image or signature data
  delivered_at     TIMESTAMPTZ,
  delivery_lat     DECIMAL(10,7),
  delivery_lng     DECIMAL(10,7),
  tracking_token   VARCHAR(80) UNIQUE NOT NULL, -- for public tracking URL
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, stop_number)
);

-- ─── GPS TRACKING LOG ────────────────────────────────────────
CREATE TABLE driver_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  route_id    UUID REFERENCES routes(id),
  lat         DECIMAL(10,7) NOT NULL,
  lng         DECIMAL(10,7) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
-- Keep only last 24h of tracking data (run daily cleanup)
CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_time   ON driver_locations(recorded_at);

-- ─── SMS LOG ─────────────────────────────────────────────────
CREATE TABLE sms_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id      UUID REFERENCES stops(id),
  phone        VARCHAR(30) NOT NULL,
  message      TEXT NOT NULL,
  twilio_sid   VARCHAR(80),
  status       VARCHAR(30) DEFAULT 'sent',
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MONTHLY INVOICES ────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  period_month    INT NOT NULL,              -- 1-12
  period_year     INT NOT NULL,
  total_routes    INT DEFAULT 0,
  total_stops     INT DEFAULT 0,
  total_miles     DECIMAL(10,2) DEFAULT 0,
  charge_base     DECIMAL(10,2) DEFAULT 0,
  charge_stops    DECIMAL(10,2) DEFAULT 0,
  charge_distance DECIMAL(10,2) DEFAULT 0,
  total_amount    DECIMAL(10,2) DEFAULT 0,
  status          invoice_status DEFAULT 'pending',
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  UNIQUE(merchant_id, period_month, period_year)
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_routes_merchant    ON routes(merchant_id);
CREATE INDEX idx_routes_driver      ON routes(driver_id);
CREATE INDEX idx_routes_status      ON routes(status);
CREATE INDEX idx_routes_code        ON routes(route_code);
CREATE INDEX idx_stops_route        ON stops(route_id);
CREATE INDEX idx_stops_tracking     ON stops(tracking_token);
CREATE INDEX idx_stops_status       ON stops(status);
CREATE INDEX idx_invoices_merchant  ON invoices(merchant_id);
CREATE INDEX idx_invoices_period    ON invoices(period_year, period_month);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_merchants_upd BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_upd   BEFORE UPDATE ON drivers   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_routes_upd    BEFORE UPDATE ON routes    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stops_upd     BEFORE UPDATE ON stops     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
