/**
 * WhatsApp Billing & Usage Control
 *
 * - Message limit: included_messages per plan; warning at 90%; block outbound at limit unless overage.
 * - Real cost: twilio_fee + meta_fee + failed_fee from pricing_config.
 * - Profitability: revenue - total_provider_cost; margin %.
 * - Overage: optional; price must be >= cost + minimum_profit_margin.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type {
  MessageCategory,
  MessageStatus,
  RecordMessageInput,
  WhatsAppProfitabilityResult,
  WhatsAppCanSendResult,
  WhatsAppBillingDashboard,
} from '@/types/whatsapp-billing'

const DEFAULT_TWILIO_FEE = 0.005
const DEFAULT_FAILED_FEE = 0.001
const DEFAULT_PLAN_PRICE = 30
const DEFAULT_INCLUDED_MESSAGES = 1700
const DEFAULT_WARNING_PERCENT = 90
const DEFAULT_MIN_MARGIN_PERCENT = 10

/** Get first day of month for a given date (YYYY-MM-01) */
export function getPeriodKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/** Parse numeric value from pricing config (JSONB may be number or string) */
function parseConfigNumber(val: unknown): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val
  if (typeof val === 'string') return parseFloat(val) || 0
  if (val != null && typeof (val as { value?: number }).value === 'number') return (val as { value: number }).value
  return 0
}

/** Load pricing config into a key -> number map (and optional meta_fee_by_country object) */
export async function getPricingConfig(admin: ReturnType<typeof getSupabaseAdmin>): Promise<{
  twilio_fee: number
  failed_fee: number
  meta_fee_service: number
  meta_fee_utility_inside_window: number
  meta_fee_utility_outside_window: number
  meta_fee_marketing: number
  meta_fee_authentication: number
  meta_fee_free_form: number
  minimum_profit_margin_percent: number
  meta_fee_by_country?: Record<string, Record<string, number>>
}> {
  const { data: rows, error } = await admin
    .from('whatsapp_pricing_config')
    .select('config_key, config_value')

  if (error) {
    console.warn('[whatsapp-billing] getPricingConfig error:', error.message)
    return {
      twilio_fee: DEFAULT_TWILIO_FEE,
      failed_fee: DEFAULT_FAILED_FEE,
      meta_fee_service: 0,
      meta_fee_utility_inside_window: 0,
      meta_fee_utility_outside_window: 0.005,
      meta_fee_marketing: 0.02,
      meta_fee_authentication: 0.01,
      meta_fee_free_form: 0.008,
      minimum_profit_margin_percent: DEFAULT_MIN_MARGIN_PERCENT,
    }
  }

  const map = new Map<string, unknown>()
  for (const r of rows || []) {
    map.set(r.config_key, r.config_value)
  }

  const get = (key: string, fallback: number) => parseConfigNumber(map.get(key) ?? fallback)

  return {
    twilio_fee: get('twilio_fee', DEFAULT_TWILIO_FEE),
    failed_fee: get('failed_fee', DEFAULT_FAILED_FEE),
    meta_fee_service: get('meta_fee_service', 0),
    meta_fee_utility_inside_window: get('meta_fee_utility_inside_window', 0),
    meta_fee_utility_outside_window: get('meta_fee_utility_outside_window', 0.005),
    meta_fee_marketing: get('meta_fee_marketing', 0.02),
    meta_fee_authentication: get('meta_fee_authentication', 0.01),
    meta_fee_free_form: get('meta_fee_free_form', 0.008),
    minimum_profit_margin_percent: get('minimum_profit_margin_percent', DEFAULT_MIN_MARGIN_PERCENT),
    meta_fee_by_country: map.get('meta_fee_by_country') as Record<string, Record<string, number>> | undefined,
  }
}

/**
 * Calculate real cost for one message.
 * total_cost = twilio_fee + meta_fee + failed_fee (if status = failed).
 * Meta fee: service = 0, utility inside window = 0; others from config or meta_fee_by_country.
 * To update Meta pricing by country: add/update row config_key = 'meta_fee_by_country',
 * config_value = {"US": {"marketing": 0.03, "utility": 0.01}, "DO": {"marketing": 0.02, ...}}.
 */
export async function getMessageCost(
  admin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    message_category: MessageCategory
    destination_country?: string | null
    inside_service_window: boolean
    status: MessageStatus
  }
): Promise<{ twilio_fee_usd: number; meta_fee_usd: number; failed_fee_usd: number; total_cost_usd: number }> {
  const config = await getPricingConfig(admin)

  const twilio_fee_usd = config.twilio_fee
  let meta_fee_usd = 0

  if (params.message_category === 'service') {
    meta_fee_usd = config.meta_fee_service
  } else if (params.message_category === 'utility') {
    meta_fee_usd = params.inside_service_window
      ? config.meta_fee_utility_inside_window
      : config.meta_fee_utility_outside_window
  } else {
    const country = (params.destination_country || '').toUpperCase() || 'DEFAULT'
    const byCountry = config.meta_fee_by_country?.[country] ?? config.meta_fee_by_country?.DEFAULT
    if (byCountry && typeof byCountry[params.message_category] === 'number') {
      meta_fee_usd = byCountry[params.message_category]
    } else {
      meta_fee_usd =
        params.message_category === 'marketing'
          ? config.meta_fee_marketing
          : params.message_category === 'authentication'
            ? config.meta_fee_authentication
            : config.meta_fee_free_form
    }
  }

  const failed_fee_usd = params.status === 'failed' ? config.failed_fee : 0
  const total_cost_usd = Math.round((twilio_fee_usd + meta_fee_usd + failed_fee_usd) * 1e6) / 1e6

  return { twilio_fee_usd, meta_fee_usd, failed_fee_usd, total_cost_usd }
}

/** Get or create billing account for empresa (uses default plan if none) */
export async function getOrCreateBillingAccount(
  admin: ReturnType<typeof getSupabaseAdmin>,
  empresaId: string
): Promise<{ id: string; empresa_id: string; plan_id: string; included_messages: number; overage_enabled: boolean; overage_price_per_message_usd: number | null }> {
  const { data: account, error: accountError } = await admin
    .from('whatsapp_billing_accounts')
    .select('id, empresa_id, plan_id, overage_enabled, overage_price_per_message_usd')
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (accountError) throw accountError
  if (account) {
    const { data: plan } = await admin
      .from('whatsapp_billing_plans')
      .select('included_messages')
      .eq('id', account.plan_id)
      .single()
    return {
      id: account.id,
      empresa_id: account.empresa_id,
      plan_id: account.plan_id,
      included_messages: plan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES,
      overage_enabled: account.overage_enabled ?? false,
      overage_price_per_message_usd: account.overage_price_per_message_usd ?? null,
    }
  }

  const { data: defaultPlan } = await admin
    .from('whatsapp_billing_plans')
    .select('id, included_messages')
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  const planId = defaultPlan?.id ?? null
  if (!planId) {
    throw new Error('No default WhatsApp billing plan found. Run whatsapp-billing-module.sql seed.')
  }

  const { data: inserted, error: insertError } = await admin
    .from('whatsapp_billing_accounts')
    .insert({
      empresa_id: empresaId,
      plan_id: planId,
      overage_enabled: false,
      billing_cycle_day: 1,
    })
    .select('id, empresa_id, plan_id, overage_enabled, overage_price_per_message_usd')
    .single()

  if (insertError) throw insertError
  return {
    id: inserted.id,
    empresa_id: inserted.empresa_id,
    plan_id: inserted.plan_id,
    included_messages: defaultPlan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES,
    overage_enabled: inserted.overage_enabled ?? false,
    overage_price_per_message_usd: inserted.overage_price_per_message_usd ?? null,
  }
}

/** Get current period message count and monthly_usage row for account */
async function getCurrentPeriodUsage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
): Promise<{ messages_used: number; included_messages: number; overage_enabled: boolean; overage_price: number | null }> {
  const period = getPeriodKey()

  const { data: account } = await admin
    .from('whatsapp_billing_accounts')
    .select('plan_id, overage_enabled, overage_price_per_message_usd')
    .eq('id', accountId)
    .single()

  const planId = account?.plan_id
  const { data: plan } = planId
    ? await admin.from('whatsapp_billing_plans').select('included_messages, warning_threshold_percent').eq('id', planId).single()
    : { data: null }

  const included_messages = plan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES

  const { count, error: countError } = await admin
    .from('whatsapp_billing_messages')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .gte('created_at', `${period}T00:00:00.000Z`)
    .lt('created_at', nextPeriodStart(period))

  if (countError) throw countError
  const messages_used = count ?? 0

  return {
    messages_used,
    included_messages,
    overage_enabled: account?.overage_enabled ?? false,
    overage_price: account?.overage_price_per_message_usd ?? null,
  }
}

function nextPeriodStart(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const next = new Date(y, m, 1)
  return next.toISOString().slice(0, 19).replace('T', 'T') + '.000Z'
}

/**
 * Check if account can send an outbound message.
 * - Count inbound + outbound toward limit.
 * - At 90% (warning threshold): show warning; still allow.
 * - At limit: block unless overage_enabled.
 * - Admin can still see incoming messages after limit (enforced in API: allow inbound to be stored and read).
 */
export async function checkCanSendMessage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  options?: { allowOverage?: boolean }
): Promise<WhatsAppCanSendResult> {
  const usage = await getCurrentPeriodUsage(admin, accountId)
  const remaining = Math.max(0, usage.included_messages - usage.messages_used)
  const warningThreshold = Math.floor((usage.included_messages * 90) / 100)
  const warning_90_percent = usage.messages_used >= warningThreshold
  const limit_reached = usage.messages_used >= usage.included_messages
  const overage_available = usage.overage_enabled && (options?.allowOverage !== false)

  if (limit_reached && !overage_available) {
    return {
      allowed: false,
      reason: 'You have reached your monthly WhatsApp message limit. Enable overage billing to continue sending.',
      messages_used: usage.messages_used,
      included_messages: usage.included_messages,
      remaining: 0,
      warning_90_percent: true,
      limit_reached: true,
      overage_available: false,
    }
  }

  return {
    allowed: true,
    messages_used: usage.messages_used,
    included_messages: usage.included_messages,
    remaining,
    warning_90_percent,
    limit_reached,
    overage_available,
  }
}

/**
 * Profitability helper: for an account (and optional period), compute
 * messages_used, revenue, total_provider_cost, gross_profit, gross_margin_percent.
 * Used by admin dashboard and for overage validation.
 */
export async function calculateWhatsAppProfitability(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  period?: string
): Promise<WhatsAppProfitabilityResult> {
  const periodKey = period ?? getPeriodKey()

  const { data: account } = await admin
    .from('whatsapp_billing_accounts')
    .select('plan_id, overage_enabled, overage_price_per_message_usd')
    .eq('id', accountId)
    .single()

  const { data: plan } = account?.plan_id
    ? await admin.from('whatsapp_billing_plans').select('plan_price_usd, included_messages').eq('id', account.plan_id).single()
    : { data: null }

  const plan_price_usd = plan?.plan_price_usd ?? DEFAULT_PLAN_PRICE
  const included_messages = plan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES

  const start = `${periodKey}T00:00:00.000Z`
  const end = nextPeriodStart(periodKey)

  const { data: messages, error: msgError } = await admin
    .from('whatsapp_billing_messages')
    .select('total_cost_usd')
    .eq('account_id', accountId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (msgError) throw msgError

  const messages_used = messages?.length ?? 0
  const total_provider_cost_usd =
    messages?.reduce((sum, m) => sum + Number(m.total_cost_usd ?? 0), 0) ?? 0

  const overage_messages = Math.max(0, messages_used - included_messages)
  const overage_price = account?.overage_price_per_message_usd ?? 0
  const overage_revenue_usd = overage_messages * overage_price
  const revenue_usd = plan_price_usd + overage_revenue_usd
  const gross_profit_usd = revenue_usd - total_provider_cost_usd
  const gross_margin_percent = revenue_usd > 0 ? (gross_profit_usd / revenue_usd) * 100 : 0
  const is_profitable = gross_profit_usd >= 0

  return {
    messages_used,
    revenue_usd: Math.round(revenue_usd * 100) / 100,
    total_provider_cost_usd: Math.round(total_provider_cost_usd * 100) / 100,
    overage_revenue_usd: Math.round(overage_revenue_usd * 100) / 100,
    gross_profit_usd: Math.round(gross_profit_usd * 100) / 100,
    gross_margin_percent: Math.round(gross_margin_percent * 100) / 100,
    included_messages,
    overage_messages,
    is_profitable,
    alert_unprofitable: !is_profitable,
  }
}

/**
 * Validate that overage price per message is not below cost + minimum margin.
 * Use before saving overage_price_per_message_usd.
 */
export async function validateOveragePrice(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  overage_price_per_message_usd: number
): Promise<{ valid: boolean; min_allowed_usd?: number; reason?: string }> {
  const config = await getPricingConfig(admin)
  const margin = config.minimum_profit_margin_percent / 100
  const { data: account } = await admin
    .from('whatsapp_billing_accounts')
    .select('plan_id')
    .eq('id', accountId)
    .single()

  const planId = account?.plan_id
  const { data: plan } = planId
    ? await admin.from('whatsapp_billing_plans').select('minimum_profit_margin_percent').eq('id', planId).single()
    : { data: null }

  const planMargin = (plan?.minimum_profit_margin_percent ?? config.minimum_profit_margin_percent) / 100

  const avgCostPerMessage = await getAverageCostPerMessage(admin, accountId)
  const min_allowed_usd = Math.round((avgCostPerMessage * (1 + planMargin)) * 1e6) / 1e6

  if (overage_price_per_message_usd < min_allowed_usd) {
    return {
      valid: false,
      min_allowed_usd,
      reason: `Overage price must be at least $${min_allowed_usd.toFixed(4)} (cost + ${(planMargin * 100).toFixed(0)}% margin).`,
    }
  }
  return { valid: true }
}

async function getAverageCostPerMessage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
): Promise<number> {
  const period = getPeriodKey()
  const start = `${period}T00:00:00.000Z`
  const end = nextPeriodStart(period)
  const { data: messages } = await admin
    .from('whatsapp_billing_messages')
    .select('total_cost_usd')
    .eq('account_id', accountId)
    .gte('created_at', start)
    .lt('created_at', end)
  if (!messages?.length) return DEFAULT_TWILIO_FEE + 0.005
  const sum = messages.reduce((s, m) => s + Number(m.total_cost_usd ?? 0), 0)
  return sum / messages.length
}

/**
 * Record one WhatsApp message (inbound or outbound) and update monthly usage.
 * Call this after Twilio (or provider) confirms the message.
 */
export async function recordBillingMessage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  input: RecordMessageInput
): Promise<{ id: string }> {
  const cost = await getMessageCost(admin, {
    message_category: input.message_category,
    destination_country: input.destination_country ?? null,
    inside_service_window: input.inside_service_window,
    status: input.status,
  })

  const { data: row, error: insertError } = await admin
    .from('whatsapp_billing_messages')
    .insert({
      account_id: input.account_id,
      direction: input.direction,
      message_category: input.message_category,
      destination_country: input.destination_country ?? null,
      inside_service_window: input.inside_service_window,
      twilio_fee_usd: cost.twilio_fee_usd,
      meta_fee_usd: cost.meta_fee_usd,
      failed_fee_usd: cost.failed_fee_usd,
      total_cost_usd: cost.total_cost_usd,
      status: input.status,
      external_id: input.external_id ?? null,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  const period = getPeriodKey()
  const { data: usage } = await admin
    .from('whatsapp_billing_monthly_usage')
    .select('id, messages_used, total_provider_cost_usd')
    .eq('account_id', input.account_id)
    .eq('period', period)
    .maybeSingle()

  const newCount = (usage?.messages_used ?? 0) + 1
  const newCost = (Number(usage?.total_provider_cost_usd ?? 0)) + cost.total_cost_usd

  if (usage?.id) {
    await admin
      .from('whatsapp_billing_monthly_usage')
      .update({
        messages_used: newCount,
        total_provider_cost_usd: Math.round(newCost * 1e4) / 1e4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usage.id)
  } else {
    const { data: acc } = await admin
      .from('whatsapp_billing_accounts')
      .select('plan_id')
      .eq('id', input.account_id)
      .single()
    const { data: plan } = acc?.plan_id
      ? await admin.from('whatsapp_billing_plans').select('plan_price_usd, included_messages').eq('id', acc.plan_id).single()
      : { data: null }
    await admin.from('whatsapp_billing_monthly_usage').insert({
      account_id: input.account_id,
      period,
      messages_used: newCount,
      included_messages: plan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES,
      overage_messages: Math.max(0, newCount - (plan?.included_messages ?? DEFAULT_INCLUDED_MESSAGES)),
      total_provider_cost_usd: Math.round(newCost * 1e4) / 1e4,
      revenue_usd: plan?.plan_price_usd ?? DEFAULT_PLAN_PRICE,
      overage_revenue_usd: 0,
    })
  }

  return { id: row.id }
}

/** Get dashboard data for admin (current period) */
export async function getWhatsAppBillingDashboard(
  admin: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
): Promise<WhatsAppBillingDashboard | null> {
  const usage = await getCurrentPeriodUsage(admin, accountId)
  const profitability = await calculateWhatsAppProfitability(admin, accountId)

  const { data: account } = await admin
    .from('whatsapp_billing_accounts')
    .select('empresa_id')
    .eq('id', accountId)
    .single()

  if (!account) return null

  const config = await getPricingConfig(admin)
  const avgCost = usage.messages_used > 0
    ? profitability.total_provider_cost_usd / usage.messages_used
    : config.twilio_fee + 0.005
  const projected_cost_at_limit = avgCost * usage.included_messages
  const warningThreshold = Math.floor((usage.included_messages * 90) / 100)

  let empresa_nombre: string | undefined
  const { data: emp } = await admin.from('empresas').select('nombre').eq('id', account.empresa_id).maybeSingle()
  if (emp?.nombre) empresa_nombre = String(emp.nombre)

  return {
    account_id: accountId,
    empresa_id: account.empresa_id,
    empresa_nombre,
    period: getPeriodKey(),
    messages_used: usage.messages_used,
    remaining_included: Math.max(0, usage.included_messages - usage.messages_used),
    included_messages: usage.included_messages,
    estimated_provider_cost_usd: Math.round(profitability.total_provider_cost_usd * 100) / 100,
    revenue_usd: profitability.revenue_usd,
    profit_usd: profitability.gross_profit_usd,
    margin_percent: profitability.gross_margin_percent,
    projected_cost_at_limit_usd: Math.round(projected_cost_at_limit * 100) / 100,
    alert_unprofitable: profitability.alert_unprofitable ?? false,
    warning_90_percent: usage.messages_used >= warningThreshold,
    limit_reached: usage.messages_used >= usage.included_messages,
    overage_enabled: usage.overage_enabled,
    profitability,
  }
}

/** Get warning message for 90% usage (for API/dashboard) */
export function getUsageWarningMessage(messages_used: number, included_messages: number): string | null {
  const pct = included_messages > 0 ? (messages_used / included_messages) * 100 : 0
  if (pct >= 90) {
    return `You have used ${Math.floor(pct)}% of your monthly WhatsApp quota.`
  }
  return null
}
