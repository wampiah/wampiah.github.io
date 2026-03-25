-- ============================================================
-- PrimeOfficeSolutions Ltd — Full PostgreSQL Database Schema
-- Compliant with UK AML Regulations 2017, GDPR, HMRC requirements
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PLANS & PRICING
-- ============================================================
CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          VARCHAR(50) UNIQUE NOT NULL,  -- 'starter', 'pro', 'premium'
  name          VARCHAR(100) NOT NULL,
  price_pence   INTEGER NOT NULL,             -- e.g. 999 = £9.99
  vat_rate      DECIMAL(5,4) DEFAULT 0.2000, -- 20% UK VAT
  max_addresses INTEGER DEFAULT 1,
  free_scans    INTEGER DEFAULT 0,
  max_items_pm  INTEGER,                      -- NULL = unlimited
  features      JSONB,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (slug, name, price_pence, max_addresses, free_scans, max_items_pm, features) VALUES
('starter',  'Starter',      999,  1, 0,  20, '{"notifications":true,"dashboard":true,"hmrc":true}'),
('pro',      'Business Pro', 2999, 1, 10, NULL,'{"notifications":true,"dashboard":true,"hmrc":true,"priority":true,"director_forward":true}'),
('premium',  'Premium',      4999, 3, -1, NULL,'{"notifications":true,"dashboard":true,"hmrc":true,"priority":true,"api_access":true,"account_manager":true}');

-- ============================================================
-- 2. CLIENTS / USERS
-- ============================================================
CREATE TABLE clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,                     -- bcrypt
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  phone               VARCHAR(30),
  date_of_birth       DATE,
  plan_id             UUID REFERENCES plans(id),
  status              VARCHAR(30) DEFAULT 'pending_kyc', -- pending_kyc, active, suspended, cancelled
  email_verified      BOOLEAN DEFAULT FALSE,
  email_verified_at   TIMESTAMPTZ,
  two_fa_enabled      BOOLEAN DEFAULT FALSE,
  two_fa_secret       TEXT,                              -- encrypted TOTP secret
  marketing_consent   BOOLEAN DEFAULT FALSE,
  last_login_at       TIMESTAMPTZ,
  last_login_ip       INET,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. COMPANIES (can have multiple per client director)
-- ============================================================
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_name        VARCHAR(255) NOT NULL,
  company_type        VARCHAR(100),  -- 'ltd', 'llp', 'sole_trader', 'cic', 'plc', 'charity'
  companies_house_no  VARCHAR(20),   -- verified against CH API
  ch_verified         BOOLEAN DEFAULT FALSE,
  ch_verified_at      TIMESTAMPTZ,
  utr_number          VARCHAR(20),   -- Unique Taxpayer Reference
  vat_number          VARCHAR(20),
  nature_of_business  VARCHAR(200),
  sic_code            VARCHAR(10),   -- Standard Industrial Classification
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MAILBOXES (business addresses)
-- ============================================================
CREATE TABLE mailbox_locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city          VARCHAR(100) NOT NULL,
  county        VARCHAR(100),
  postcode      VARCHAR(15) NOT NULL,
  country       VARCHAR(3) DEFAULT 'GBR',
  active        BOOLEAN DEFAULT TRUE
);

CREATE TABLE mailboxes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clients(id),
  company_id        UUID REFERENCES companies(id),
  location_id       UUID NOT NULL REFERENCES mailbox_locations(id),
  suite_number      VARCHAR(20) NOT NULL,    -- e.g. 'MB-1042'
  full_address      TEXT NOT NULL,           -- formatted complete address
  hmrc_accepted     BOOLEAN DEFAULT TRUE,
  ch_accepted       BOOLEAN DEFAULT TRUE,
  active            BOOLEAN DEFAULT TRUE,
  activated_at      TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. KYC / AML VERIFICATION
-- (required by Money Laundering Regulations 2017)
-- ============================================================
CREATE TABLE kyc_verifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status              VARCHAR(30) DEFAULT 'pending', -- pending, in_review, approved, rejected, expired
  -- Identity Document
  id_document_type    VARCHAR(50),   -- passport, driving_licence, national_id, brp
  id_document_number  VARCHAR(100),  -- encrypted
  id_expiry_date      DATE,
  id_file_url         TEXT,          -- encrypted S3 URL
  id_verified         BOOLEAN DEFAULT FALSE,
  id_verified_at      TIMESTAMPTZ,
  id_verified_by      UUID REFERENCES clients(id),  -- admin user
  -- Proof of Address
  poa_document_type   VARCHAR(50),   -- utility_bill, bank_statement, council_tax
  poa_issued_date     DATE,          -- must be < 3 months old
  poa_file_url        TEXT,          -- encrypted S3 URL
  poa_verified        BOOLEAN DEFAULT FALSE,
  poa_verified_at     TIMESTAMPTZ,
  -- AML Check
  aml_check_ref       VARCHAR(100),  -- reference from AML provider (e.g. Onfido)
  aml_risk_level      VARCHAR(20),   -- low, medium, high
  pep_check           BOOLEAN,       -- Politically Exposed Person check
  sanctions_check     BOOLEAN,       -- Sanctions list check
  -- Overall
  rejection_reason    TEXT,
  notes               TEXT,
  reviewed_by         UUID,          -- admin who reviewed
  reviewed_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,   -- KYC re-verification required date
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Director home address (private, not used for mail, just KYC)
CREATE TABLE director_addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city          VARCHAR(100),
  county        VARCHAR(100),
  postcode      VARCHAR(15),
  country       VARCHAR(3) DEFAULT 'GBR',
  is_current    BOOLEAN DEFAULT TRUE,
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MAIL ITEMS
-- ============================================================
CREATE TABLE mail_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id      UUID NOT NULL REFERENCES mailboxes(id),
  client_id       UUID NOT NULL REFERENCES clients(id),
  -- Sender info
  sender_name     VARCHAR(255),
  sender_type     VARCHAR(30),  -- government, financial, legal, other
  is_hmrc         BOOLEAN DEFAULT FALSE,
  is_urgent       BOOLEAN DEFAULT FALSE,
  -- Physical details
  received_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  num_pages       INTEGER,
  weight_grams    INTEGER,
  -- Status tracking
  status          VARCHAR(30) DEFAULT 'received', -- received, notified, awaiting_action, in_progress, completed
  action_chosen   VARCHAR(20),  -- scan_email, forward_post, shred, no_action
  action_at       TIMESTAMPTZ,
  action_by       VARCHAR(50),  -- 'client' or admin name
  completed_at    TIMESTAMPTZ,
  -- Scan data
  scan_file_url   TEXT,         -- encrypted S3 URL (if scanned)
  scan_emailed_at TIMESTAMPTZ,
  -- Forward data
  forward_address TEXT,
  forward_carrier VARCHAR(50),
  forward_tracking VARCHAR(100),
  forward_sent_at  TIMESTAMPTZ,
  -- Shred data
  shred_cert_url  TEXT,         -- BS EN 15713 certificate URL
  shred_at        TIMESTAMPTZ,
  -- Admin notes
  admin_notes     TEXT,
  flagged         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log for mail items
CREATE TABLE mail_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mail_item_id  UUID NOT NULL REFERENCES mail_items(id),
  client_id     UUID NOT NULL REFERENCES clients(id),
  channel       VARCHAR(20),   -- email, sms, push
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  delivered     BOOLEAN,
  error_msg     TEXT
);

-- ============================================================
-- 7. SUBSCRIPTIONS & PAYMENTS
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               UUID NOT NULL REFERENCES clients(id),
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  status                  VARCHAR(30) DEFAULT 'active', -- trialing, active, past_due, cancelled
  -- Stripe
  stripe_customer_id      VARCHAR(100) UNIQUE,
  stripe_subscription_id  VARCHAR(100) UNIQUE,
  stripe_price_id         VARCHAR(100),
  -- GoCardless
  gocardless_mandate_id   VARCHAR(100),
  gocardless_sub_id       VARCHAR(100),
  -- Billing cycle
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,
  cancel_at               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  -- Usage this period
  scans_used_this_period  INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               UUID NOT NULL REFERENCES clients(id),
  subscription_id         UUID REFERENCES subscriptions(id),
  -- Amounts (all in pence)
  amount_pence            INTEGER NOT NULL,
  vat_pence               INTEGER NOT NULL,
  total_pence             INTEGER NOT NULL,  -- amount + vat
  currency                CHAR(3) DEFAULT 'GBP',
  -- Type
  payment_type            VARCHAR(30),  -- subscription, addon_scan, addon_post, addon_shred
  description             TEXT,
  -- Payment method
  method                  VARCHAR(30),  -- card, direct_debit
  -- Stripe
  stripe_payment_intent   VARCHAR(100),
  stripe_charge_id        VARCHAR(100),
  -- GoCardless
  gc_payment_id           VARCHAR(100),
  -- Status
  status                  VARCHAR(30) DEFAULT 'pending', -- pending, paid, failed, refunded
  paid_at                 TIMESTAMPTZ,
  failed_at               TIMESTAMPTZ,
  failure_reason          TEXT,
  refunded_at             TIMESTAMPTZ,
  refund_amount_pence     INTEGER,
  -- Invoice
  invoice_number          VARCHAR(30) UNIQUE,  -- e.g. INV-2025-001234
  invoice_url             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods stored (tokenised only, no raw card data)
CREATE TABLE payment_methods (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES clients(id),
  method_type           VARCHAR(20),      -- card, direct_debit
  -- Card (tokenised via Stripe)
  stripe_pm_id          VARCHAR(100),
  card_brand            VARCHAR(20),      -- visa, mastercard, amex
  card_last4            CHAR(4),
  card_exp_month        SMALLINT,
  card_exp_year         SMALLINT,
  -- Direct Debit (via GoCardless)
  gc_mandate_id         VARCHAR(100),
  bank_account_last4    CHAR(4),
  bank_name             VARCHAR(100),
  -- Status
  is_default            BOOLEAN DEFAULT FALSE,
  active                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. ADD-ON SERVICE PRICING
-- ============================================================
CREATE TABLE addon_services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  price_pence     INTEGER NOT NULL,
  vat_applies     BOOLEAN DEFAULT TRUE,
  description     TEXT,
  active          BOOLEAN DEFAULT TRUE
);

INSERT INTO addon_services (slug, name, price_pence, description) VALUES
('scan_email',    'Scan & Email',         150, 'High-resolution scan delivered by email within 2 hours'),
('scan_sameday',  'Same-Day Scan',        300, 'Guaranteed within 1 hour'),
('forward_post',  'Post Forward',         350, 'Tracked posting to any UK or international address (+ postage cost)'),
('shred_secure',  'Secure Shredding',      50, 'BS EN 15713 certified secure destruction with certificate');

-- ============================================================
-- 9. ADMIN USERS
-- ============================================================
CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  role            VARCHAR(30) DEFAULT 'staff',  -- superadmin, admin, staff
  active          BOOLEAN DEFAULT TRUE,
  two_fa_enabled  BOOLEAN DEFAULT TRUE,
  two_fa_secret   TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. AUDIT LOG (GDPR & AML Compliance)
-- ============================================================
CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_type    VARCHAR(20),        -- client, admin, system
  actor_id      UUID,
  action        VARCHAR(100) NOT NULL, -- e.g. 'mail.scan_requested', 'kyc.approved'
  entity_type   VARCHAR(50),        -- mail_item, client, payment, etc.
  entity_id     UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. NOTIFICATIONS / PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID UNIQUE NOT NULL REFERENCES clients(id),
  email_new_mail        BOOLEAN DEFAULT TRUE,
  email_urgent_mail     BOOLEAN DEFAULT TRUE,
  email_mail_scanned    BOOLEAN DEFAULT TRUE,
  email_billing         BOOLEAN DEFAULT TRUE,
  sms_new_urgent        BOOLEAN DEFAULT TRUE,
  sms_mail_forwarded    BOOLEAN DEFAULT FALSE,
  auto_shred_junk       BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID REFERENCES clients(id),
  admin_id      UUID REFERENCES admin_users(id),
  token_hash    TEXT UNIQUE NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_mail_items_client ON mail_items(client_id);
CREATE INDEX idx_mail_items_status ON mail_items(status);
CREATE INDEX idx_mail_items_received ON mail_items(received_date DESC);
CREATE INDEX idx_mail_items_urgent ON mail_items(is_urgent) WHERE is_urgent = TRUE;
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_kyc_client ON kyc_verifications(client_id);
CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);

-- ============================================================
-- ROW-LEVEL SECURITY (GDPR - clients can only see own data)
-- ============================================================
ALTER TABLE mail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;

-- Policy: clients only see their own records via API
CREATE POLICY client_own_mail ON mail_items
  USING (client_id = current_setting('app.current_client_id')::UUID);

CREATE POLICY client_own_payments ON payments
  USING (client_id = current_setting('app.current_client_id')::UUID);

CREATE POLICY client_own_mailboxes ON mailboxes
  USING (client_id = current_setting('app.current_client_id')::UUID);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE invoice_seq START 1000;
CREATE TRIGGER set_invoice_number BEFORE INSERT ON payments
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL) EXECUTE FUNCTION generate_invoice_number();

-- Auto-generate mailbox suite numbers
CREATE OR REPLACE FUNCTION generate_suite_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.suite_number := 'MB-' || LPAD(nextval('suite_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE suite_seq START 1000;
CREATE TRIGGER set_suite_number BEFORE INSERT ON mailboxes
  FOR EACH ROW WHEN (NEW.suite_number IS NULL) EXECUTE FUNCTION generate_suite_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mail_items_updated_at BEFORE UPDATE ON mail_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON kyc_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
