-- Housemate Group Matching Feature — Debale
-- Add these tables alongside existing listings, users, applications, etc.

CREATE TABLE IF NOT EXISTS housemate_intake (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  languages       TEXT[],
  sociability     TEXT,
  lifestyle_notes TEXT,
  sleep_schedule  TEXT,
  cleanliness     TEXT,
  smoking         TEXT,
  guests_habit    TEXT,
  budget_min      INTEGER,
  budget_max      INTEGER,
  preferred_city  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housemate_groups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status            TEXT DEFAULT 'forming' CHECK (status IN ('forming','applying','accepted','rejected')),
  target_listing_id UUID REFERENCES listings(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housemate_group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS housemate_suggestions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seeker_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  suggested_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  compatibility_pct INTEGER,
  ai_explanation    TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housemate_group_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housemate_group_applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,
  listing_id    UUID REFERENCES listings(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  applied_at    TIMESTAMPTZ DEFAULT NOW(),
  decided_at    TIMESTAMPTZ
);

-- Add filled_at column to listings (used when group is accepted)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_housemate_suggestions_seeker ON housemate_suggestions(seeker_id);
CREATE INDEX IF NOT EXISTS idx_housemate_group_members_group ON housemate_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_housemate_group_messages_group ON housemate_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_housemate_group_applications_listing ON housemate_group_applications(listing_id);

-- ═══════════════════════════════════════════════════════════════════
-- Migration v2: Group-based system (name, max_members, owner_id, join requests)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 2;
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS housemate_group_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, requester_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- Migration v3: Interview status for group applications + messaging
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE housemate_group_applications DROP CONSTRAINT IF EXISTS housemate_group_applications_status_check;
ALTER TABLE housemate_group_applications ADD CONSTRAINT housemate_group_applications_status_check CHECK (status IN ('pending','interview','accepted','rejected'));
ALTER TABLE housemate_group_applications ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_application_id UUID REFERENCES housemate_group_applications(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- Migration v4: Group agreement system
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS group_application_id UUID REFERENCES housemate_group_applications(id) ON DELETE CASCADE;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES housemate_groups(id) ON DELETE CASCADE;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS group_agreement_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agreement_id, user_id)
);
