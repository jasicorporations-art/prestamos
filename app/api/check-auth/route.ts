import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'

// Marcar como dinámico para poder leer cookies
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Endpoint para verificar autenticación desde el cliente
 * GET /api/check-auth
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    
    // Obtener todas las cookies para debugging
    const allCookies = request.cookies.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('supabase')
    )
    
    // Intentar obtener usuario
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    // Si falla, intentar con getSession
    let finalUser = user
    let sessionError = null
    if (!finalUser || getUserError) {
      const sessionResult = await supabase.auth.getSession()
      finalUser = sessionResult.data?.session?.user || null
      sessionError = sessionResult.error
    }
    
    return NextResponse.json({
      authenticated: !!finalUser,
      user: finalUser ? {
        id: finalUser.id,
        email: finalUser.email,
      } : null,
      cookies: {
        all: cookieNames,
        supabase: supabaseCookies.map(c => c.name),
        count: allCookies.length,
      },
      errors: {
        getUser: getUserError?.message,
        getSession: sessionError?.message,
      },
      debug: {
        hasSupabaseCookies: supabaseCookies.length > 0,
        cookieCount: allCookies.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

