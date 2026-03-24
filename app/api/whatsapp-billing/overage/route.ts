import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireSuperAdmin } from '@/lib/auth-super-admin'
import { getOrCreateBillingAccount, validateOveragePrice } from '@/lib/services/whatsapp-billing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/whatsapp-billing/overage
 * Body: { empresa_id, overage_enabled: boolean, overage_price_per_message_usd?: number }
 * Validates overage price >= cost + minimum_profit_margin before saving.
 * Requires super_admin.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  let body: { empresa_id?: string; account_id?: string; overage_enabled?: boolean; overage_price_per_message_usd?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const empresaId = body.empresa_id
  const accountId = body.account_id
  if (!empresaId && !accountId) {
    return NextResponse.json({ error: 'Missing empresa_id or account_id' }, { status: 400 })
  }

  const overage_enabled = body.overage_enabled
  const overage_price_per_message_usd = body.overage_price_per_message_usd

  try {
    const admin = getSupabaseAdmin()
    let accId = accountId
    if (!accId && empresaId) {
      const account = await getOrCreateBillingAccount(admin, empresaId)
      accId = account.id
    }
    if (!accId) {
      return NextResponse.json({ error: 'Could not resolve account' }, { status: 400 })
    }

    if (overage_enabled === true && typeof overage_price_per_message_usd === 'number') {
      const validation = await validateOveragePrice(admin, accId, overage_price_per_message_usd)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.reason, min_allowed_usd: validation.min_allowed_usd },
          { status: 400 }
        )
      }
    }

    const updates: { overage_enabled?: boolean; overage_price_per_message_usd?: number | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }
    if (typeof overage_enabled === 'boolean') updates.overage_enabled = overage_enabled
    if (overage_price_per_message_usd !== undefined) {
      updates.overage_price_per_message_usd = overage_price_per_message_usd === null ? null : overage_price_per_message_usd
    }

    const { data, error } = await admin
      .from('whatsapp_billing_accounts')
      .update(updates)
      .eq('id', accId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error('[whatsapp-billing/overage]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error updating overage' },
      { status: 500 }
    )
  }
}
