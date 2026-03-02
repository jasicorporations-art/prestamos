import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClientFromRequest } from '@/lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kpqvzkgsbawfqdsxjdjc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (token) {
    const anon = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await anon.auth.getUser(token)
    if (!error && user) {
      const { data: perfil } = await anon.from('perfiles').select('rol').eq('user_id', user.id).limit(1).single()
      if (perfil?.rol === 'super_admin') return { ok: true as const }
    }
  }

  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, body: { error: 'No autenticado' } }
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', user.id).limit(1).single()
  if (perfil?.rol !== 'super_admin') return { ok: false, status: 403, body: { error: 'Se requiere rol super_admin' } }
  return { ok: true as const }
}
