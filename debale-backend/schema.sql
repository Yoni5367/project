-- ================================================================
-- DEBALE PLATFORM — Complete Database Schema
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  email                   TEXT UNIQUE NOT NULL,
  phone                   TEXT,
  password_hash           TEXT NOT NULL,
  role                    TEXT NOT NULL CHECK (role IN ('seeker', 'provider', 'admin')),
  status                  TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned')),

  -- Subscription
  subscribed              BOOLEAN DEFAULT false,
  subscription_plan       TEXT,
  subscription_expires_at TIMESTAMPTZ,

  -- Verification
  verified                BOOLEAN DEFAULT false,
  national_id             TEXT,
  id_photo_url            TEXT,

  -- Seeker-specific profile fields
  age                     INTEGER,
  gender                  TEXT,
  occupation              TEXT,
  budget_min              INTEGER,
  budget_max              INTEGER,
  move_in_date            DATE,
  city                    TEXT,
  subcity                 TEXT,
  neighborhood            TEXT,
  sleep_schedule          TEXT,
  cleanliness             TEXT,
  smoking                 TEXT DEFAULT 'no',
  drinking                TEXT DEFAULT 'no',
  pets                    TEXT DEFAULT 'no_pets',
  housemate_gender        TEXT DEFAULT 'any',
  languages               TEXT,
  intro                   TEXT,
  emergency_name          TEXT,
  emergency_phone         TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── LISTINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id         UUID REFERENCES users(id) ON DELETE CASCADE,

  title               TEXT NOT NULL,
  property_type       TEXT,
  price               INTEGER NOT NULL,
  city                TEXT,
  subcity             TEXT,
  neighborhood        TEXT,
  landmark            TEXT,
  furnishing          TEXT,
  rooms_available     INTEGER DEFAULT 1,
  lease_duration      TEXT,
  move_in_date        DATE,

  -- Amenities included in rent
  includes_wifi        BOOLEAN DEFAULT false,
  includes_electricity BOOLEAN DEFAULT false,
  includes_water       BOOLEAN DEFAULT false,

  -- Requirements
  preferred_gender    TEXT DEFAULT 'any',
  preferred_occupation TEXT DEFAULT 'any',
  age_min             INTEGER,
  age_max             INTEGER,
  smoking_allowed     BOOLEAN DEFAULT false,
  pets_allowed        BOOLEAN DEFAULT false,
  visitors_allowed    TEXT DEFAULT 'no',

  house_rules         TEXT,
  deal_breakers       TEXT,
  photos              TEXT[] DEFAULT '{}',
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'filled', 'expired', 'hidden')),
  views               INTEGER DEFAULT 0,
  payment_id          UUID REFERENCES payments(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── APPLICATIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seeker_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id   UUID REFERENCES listings(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','shortlist','interview','accepted','rejected')),
  match_score  INTEGER DEFAULT 60,
  interview_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seeker_id, listing_id)
);

-- ── PAYMENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  gateway      TEXT NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  reference    TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID REFERENCES applications(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGREEMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agreements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   UUID REFERENCES applications(id) ON DELETE CASCADE UNIQUE,
  seeker_id        UUID REFERENCES users(id),
  provider_id      UUID REFERENCES users(id),
  paid             BOOLEAN DEFAULT false,
  gateway          TEXT,
  paid_at          TIMESTAMPTZ,
  generated_text   TEXT,
  signed_file_url  TEXT,
  signed_file_name TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','downloaded','signed','active')),
  signed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SAVED LISTINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_listings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ── REVIEWS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id),
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, application_id)
);

-- ── REPORTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type  TEXT CHECK (target_type IN ('user','listing')),
  target_id    UUID NOT NULL,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_status       ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_city         ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_provider     ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker   ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_listing  ON applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_application  ON messages(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_user         ON payments(user_id);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_apps_updated     BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED ADMIN USER ───────────────────────────────────────────────
-- Replace the password hash below with your own (use bcrypt hash of your password)
-- Default password: Admin@Debale2025
INSERT INTO users (name, email, password_hash, role, subscribed, verified)
VALUES (
  'Debale Admin',
  'admin@debale.et',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc.0.N8kbzV3I9fG3fBZ5N7QIi',
  'admin',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- ── FORGOT PASSWORD SUPPORT ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_photo_back_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rooms_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS applies_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS groups_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_applies_used INTEGER DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'draft', 'banned'));

-- ================================================================
-- DONE! Your database is ready.
-- Next: Copy .env.example to .env and fill in your Supabase keys.
-- ================================================================
