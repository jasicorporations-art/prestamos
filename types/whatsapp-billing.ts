/**
 * Types for WhatsApp Billing & Usage Control Module
 */

export type MessageDirection = 'inbound' | 'outbound'
export type MessageCategory = 'marketing' | 'utility' | 'authentication' | 'service' | 'free-form'
export type MessageStatus = 'delivered' | 'sent' | 'failed' | 'read'

export interface WhatsAppBillingPlan {
  id: string
  name: string
  plan_price_usd: number
  included_messages: number
  warning_threshold_percent: number
  overage_allowed: boolean
  overage_price_per_message_usd: number | null
  minimum_profit_margin_percent: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface WhatsAppBillingAccount {
  id: string
  empresa_id: string
  plan_id: string
  overage_enabled: boolean
  overage_price_per_message_usd: number | null
  billing_cycle_day: number
  created_at: string
  updated_at: string
  plan?: WhatsAppBillingPlan
}

export interface WhatsAppBillingMessage {
  id: string
  account_id: string
  direction: MessageDirection
  message_category: MessageCategory
  destination_country: string | null
  inside_service_window: boolean
  twilio_fee_usd: number
  meta_fee_usd: number
  failed_fee_usd: number
  total_cost_usd: number
  status: MessageStatus
  external_id: string | null
  created_at: string
}

export interface WhatsAppMonthlyUsage {
  id: string
  account_id: string
  period: string
  messages_used: number
  included_messages: number
  overage_messages: number
  total_provider_cost_usd: number
  revenue_usd: number
  overage_revenue_usd: number
  created_at: string
  updated_at: string
}

export interface WhatsAppPricingConfigRow {
  id: string
  config_key: string
  config_value: unknown
  description: string | null
}

/** Input to record a single message for billing */
export interface RecordMessageInput {
  account_id: string
  direction: MessageDirection
  message_category: MessageCategory
  destination_country?: string | null
  inside_service_window: boolean
  status: MessageStatus
  external_id?: string | null
}

/** Result of profitability calculation */
export interface WhatsAppProfitabilityResult {
  messages_used: number
  revenue_usd: number
  total_provider_cost_usd: number
  overage_revenue_usd: number
  gross_profit_usd: number
  gross_margin_percent: number
  included_messages: number
  overage_messages: number
  is_profitable: boolean
  alert_unprofitable?: boolean
}

/** Dashboard payload for admin */
export interface WhatsAppBillingDashboard {
  account_id: string
  empresa_id: string
  empresa_nombre?: string
  period: string
  messages_used: number
  remaining_included: number
  included_messages: number
  estimated_provider_cost_usd: number
  revenue_usd: number
  profit_usd: number
  margin_percent: number
  projected_cost_at_limit_usd: number
  alert_unprofitable: boolean
  warning_90_percent: boolean
  limit_reached: boolean
  overage_enabled: boolean
  profitability: WhatsAppProfitabilityResult
}

/** Can-send check result */
export interface WhatsAppCanSendResult {
  allowed: boolean
  reason?: string
  messages_used: number
  included_messages: number
  remaining: number
  warning_90_percent: boolean
  limit_reached: boolean
  overage_available: boolean
}
