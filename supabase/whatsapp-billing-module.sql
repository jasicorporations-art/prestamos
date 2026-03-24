-- =============================================================================
-- WhatsApp Billing & Usage Control Module
-- Run in Supabase SQL Editor. Depends on: public.empresas (account = empresa).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. PLANS (global; each account/empresa can reference one)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_price_usd DECIMAL(12,4) NOT NULL DEFAULT 30,
  included_messages INTEGER NOT NULL DEFAULT 1700,
  warning_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 90,
  overage_allowed BOOLEAN NOT NULL DEFAULT false,
  overage_price_per_message_usd DECIMAL(12,6),
  minimum_profit_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_billing_plans IS 'WhatsApp plan definitions. Change included_messages here to adapt limits without code changes.';

-- -----------------------------------------------------------------------------
-- 2. ACCOUNTS (one per empresa; links to plan and overage settings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.whatsapp_billing_plans(id) ON DELETE RESTRICT,
  overage_enabled BOOLEAN NOT NULL DEFAULT false,
  overage_price_per_message_usd DECIMAL(12,6),
  billing_cycle_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_billing_accounts_empresa
  ON public.whatsapp_billing_accounts(empresa_id);

COMMENT ON TABLE public.whatsapp_billing_accounts IS 'One row per tenant (empresa). Override overage at account level.';

-- -----------------------------------------------------------------------------
-- 3. PRICING CONFIG (rates updatable without code; key-based or JSON)
-- Store: twilio_fee, failed_fee, meta fees by category/country/window.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (config_key)
);

COMMENT ON TABLE public.whatsapp_pricing_config IS 'Rates for cost calculation. Keys: twilio_fee, failed_fee, meta_fee_service, meta_fee_utility_inside, meta_fee_utility_outside, meta_fee_marketing, meta_fee_authentication, meta_fee_free_form. Or per-country: meta_fee_by_country = {"US": {...}, "DO": {...}}.';

-- -----------------------------------------------------------------------------
-- 4. WHATSAPP MESSAGES (every message for billing and cost)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_billing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.whatsapp_billing_accounts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_category TEXT NOT NULL CHECK (message_category IN ('marketing', 'utility', 'authentication', 'service', 'free-form')),
  destination_country TEXT,
  inside_service_window BOOLEAN NOT NULL DEFAULT true,
  twilio_fee_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
  meta_fee_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
  failed_fee_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'sent', 'failed', 'read')),
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_billing_messages_account_created
  ON public.whatsapp_billing_messages(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_billing_messages_account_period
  ON public.whatsapp_billing_messages(account_id, (date_trunc('month', created_at)));

COMMENT ON TABLE public.whatsapp_billing_messages IS 'One row per WhatsApp message for usage and cost. Count inbound + outbound toward limit.';

-- -----------------------------------------------------------------------------
-- 5. MONTHLY USAGE (snapshot per account per period; reset quota each cycle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_billing_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.whatsapp_billing_accounts(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  messages_used INTEGER NOT NULL DEFAULT 0,
  included_messages INTEGER NOT NULL,
  overage_messages INTEGER NOT NULL DEFAULT 0,
  total_provider_cost_usd DECIMAL(12,4) NOT NULL DEFAULT 0,
  revenue_usd DECIMAL(12,4) NOT NULL DEFAULT 0,
  overage_revenue_usd DECIMAL(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, period)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_billing_monthly_usage_account_period
  ON public.whatsapp_billing_monthly_usage(account_id, period);

COMMENT ON TABLE public.whatsapp_billing_monthly_usage IS 'Aggregated usage per billing period. Quota resets each cycle; history preserved.';

-- -----------------------------------------------------------------------------
-- 6. INVOICES (optional; for overage and plan charges)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.whatsapp_billing_accounts(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('plan', 'overage', 'adjustment')),
  amount_usd DECIMAL(12,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  stripe_invoice_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_billing_invoices_account_period
  ON public.whatsapp_billing_invoices(account_id, period);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_billing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_billing_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_billing_invoices ENABLE ROW LEVEL SECURITY;

-- Policies: super_admin can manage all; account rows visible by empresa members via empresa_id.
DROP POLICY IF EXISTS whatsapp_billing_plans_super_admin ON public.whatsapp_billing_plans;
CREATE POLICY whatsapp_billing_plans_super_admin ON public.whatsapp_billing_plans FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS whatsapp_billing_accounts_super_admin ON public.whatsapp_billing_accounts;
CREATE POLICY whatsapp_billing_accounts_super_admin ON public.whatsapp_billing_accounts FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS whatsapp_pricing_config_super_admin ON public.whatsapp_pricing_config;
CREATE POLICY whatsapp_pricing_config_super_admin ON public.whatsapp_pricing_config FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS whatsapp_billing_messages_super_admin ON public.whatsapp_billing_messages;
CREATE POLICY whatsapp_billing_messages_super_admin ON public.whatsapp_billing_messages FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS whatsapp_billing_monthly_usage_super_admin ON public.whatsapp_billing_monthly_usage;
CREATE POLICY whatsapp_billing_monthly_usage_super_admin ON public.whatsapp_billing_monthly_usage FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS whatsapp_billing_invoices_super_admin ON public.whatsapp_billing_invoices;
CREATE POLICY whatsapp_billing_invoices_super_admin ON public.whatsapp_billing_invoices FOR ALL USING (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- SEED: Default plan and pricing config
-- -----------------------------------------------------------------------------
INSERT INTO public.whatsapp_billing_plans (id, name, plan_price_usd, included_messages, warning_threshold_percent, overage_allowed, minimum_profit_margin_percent, is_default)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Standard',
  30,
  1700,
  90,
  false,
  10,
  true
)
ON CONFLICT DO NOTHING;

-- Pricing config: update values here to change Meta/country rates without code.
-- Meta pricing by country: https://developers.facebook.com/docs/whatsapp/pricing
-- To add per-country Meta rates: INSERT config_key 'meta_fee_by_country', config_value = {"US": {"marketing": 0.03, "utility": 0.01}, "DO": {...}}
INSERT INTO public.whatsapp_pricing_config (config_key, config_value, description) VALUES
  ('twilio_fee', '0.005', 'USD per message (inbound or outbound)'),
  ('failed_fee', '0.001', 'USD if message status = failed'),
  ('meta_fee_service', '0', 'Service messages default 0'),
  ('meta_fee_utility_inside_window', '0', 'Utility inside 24h window default 0'),
  ('meta_fee_utility_outside_window', '0.005', 'Utility outside 24h window'),
  ('meta_fee_marketing', '0.02', 'Marketing template'),
  ('meta_fee_authentication', '0.01', 'Authentication template'),
  ('meta_fee_free_form', '0.008', 'Free-form/conversational'),
  ('minimum_profit_margin_percent', '10', 'Overage price must be >= cost + this margin')
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
