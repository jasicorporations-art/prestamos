'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { authService } from '@/lib/services/auth'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { perfilesService, invalidatePerfilCache } from '@/lib/services/perfiles'
import { evaluarAceptacionLegal } from '@/lib/services/legal'
import { limpiarSesionParaReintentarLogin } from '@/lib/utils/swCleanup'
import { registrarSesionActiva, forzarCierreOtrasSesiones } from '@/lib/services/sesiones'
import { supabase } from '@/lib/supabase'
import { getAppId } from '@/lib/utils/appId'
import { authTraceReset, authTraceStart, authTraceEnd } from '@/lib/utils/authInstrumentation'
import { withTimeout } from '@/lib/utils/authTimeout'
import { isValidUUID } from '@/lib/utils/compania'
import { Lock, User } from 'lucide-react'

const LOGIN_TIMEOUT_MS = 30000
const PERFIL_TIMEOUT_MS = 20000
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setCompania } = useCompania()
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [tipoCuenta, setTipoCuenta] = useState<'empresa' | 'cliente'>('empresa')
  const [loadingCliente, setLoadingCliente] = useState(false)
  const [errorCliente, setErrorCliente] = useState('')
  const [empresaIdCliente, setEmpresaIdCliente] = useState('')
  const [empresaInputCliente, setEmpresaInputCliente] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const err = searchParams.get('error')
    setError(err ? decodeURIComponent(err) : '')
    const tipo = searchParams.get('tipo')
    if (tipo === 'cliente') setTipoCuenta('cliente')
    const empresaIdQuery = searchParams.get('empresa_id')
    if (empresaIdQuery) setEmpresaIdCliente(empresaIdQuery.trim())
    const empresaNombreQuery = searchParams.get('empresa')
    if (empresaNombreQuery) setEmpresaInputCliente(empresaNombreQuery.trim())
  }, [searchParams])

  useEffect(() => {
    authService.getSession().then(async (session) => {
      if (session) {
        const perfil = await perfilesService.getPerfilActual()
        if (perfil?.rol === 'super_admin') {
          router.push('/super-admin')
        } else {
          router.push('/dashboard')
        }
      }
    })
  }, [router])

  async function getPerfilWithRetry(): Promise<Awaited<ReturnType<typeof perfilesService.getPerfilActual>>> {
    const intentar = async () => {
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PERFIL_TIMEOUT_MS)
      )
      return await Promise.race([perfilesService.getPerfilActual(), timeoutPromise])
    }

    let perfil = await intentar()

    if (!perfil) {
      if (isDev) console.warn('[login] Perfil timeout o null, limpiando caché y reintentando...')
      invalidatePerfilCache()
      await new Promise((r) => setTimeout(r, 1200))
      perfil = await intentar()
    }

    return perfil
  }

  async function onSubmit(data: LoginFormData) {
    authTraceReset()
    authTraceStart('clickLogin')
    if (isDev) console.log('[login] Inicio de login:', data.email)
    try {
      setLoading(true)
      setError('')
      setLoadingStep('Conectando...')

      authTraceStart('signInRequest')
      const authData = await withTimeout(
        authService.signIn(data.email, data.password),
        LOGIN_TIMEOUT_MS,
        () => {
          throw new Error('Timeout')
        },
        'login-signIn'
      )
      authTraceStart('signInResolved')
      if (isDev) console.log('[login] Auth OK, usuario:', authData.user?.id?.slice(0, 8))

      const user = authData.user
      setLoadingStep('Cargando tu cuenta...')
      let perfil = await getPerfilWithRetry()
      authTraceStart('perfilFetched')

      if (!perfil) {
        try {
          const res = await fetch('/api/crear-perfil', { method: 'POST', credentials: 'include' })
          const apiData = await res.json().catch(() => ({}))
          if (apiData?.ok) {
            perfil = await getPerfilWithRetry()
          }
        } catch (crearErr) {
          if (isDev) console.warn('[login] No se pudo crear perfil automático:', crearErr)
        }
      }

      if (!perfil) {
        await supabase.auth.signOut()
        throw new Error('No se pudo cargar tu perfil. Contacta al administrador.')
      }
      if (isDev) console.log('[login] Perfil OK, rol:', perfil.rol)

      const appId = getAppId()
      // super_admin y perfiles sin app_id (creados manualmente) tienen acceso
      const appIdValido = !appId || perfil.rol === 'super_admin' || !perfil.app_id || perfil.app_id === appId
      if (!appIdValido) {
        await supabase.auth.signOut()
        throw new Error('Acceso denegado para esta plataforma')
      }

      if (!perfil.activo) {
        // Cerrar sesión si el perfil está inactivo
        await supabase.auth.signOut()
        throw new Error('Tu cuenta está desactivada. Por favor, contacta al administrador.')
      }

      // Obtener empresa_id del perfil (UUID) o user_metadata.compania solo si es UUID válido
      const metaCompania = user?.user_metadata?.compania
      const empresaId = perfil.empresa_id || (metaCompania && isValidUUID(metaCompania) ? metaCompania : null)

      if (empresaId && perfil.rol !== 'super_admin') {
        try {
          const empPromise = supabase.from('empresas').select('status').eq('id', empresaId).single() as Promise<{ data: { status?: string } | null }>
          const empTimeout = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000))
          const { data: empresa } = await Promise.race([empPromise, empTimeout])
          if (empresa?.status === 'inactive') {
            await supabase.auth.signOut()
            throw new Error('Mantenimiento: tu empresa está en mantenimiento. Contacta al administrador.')
          }
        } catch (e: any) {
          if (e?.message?.includes('Mantenimiento')) throw e
        }
      }

      if (!empresaId && perfil.rol !== 'super_admin') {
        await supabase.auth.signOut()
        throw new Error('Tu cuenta no tiene una empresa asignada. Por favor, contacta al administrador.')
      }

      // Guardar la empresa del usuario en el contexto (super_admin puede no tener empresa)
      setCompania(empresaId || '')
      
      // Registrar sesión activa y cerrar otras sesiones simultáneas
      if (user?.id) {
        const nuevaSessionId = await registrarSesionActiva(user.id)
        forzarCierreOtrasSesiones(user.id, nuevaSessionId)
        console.log('✅ [login] Sesión registrada. Otras sesiones cerradas.')
      }
      
      const estadoLegal = evaluarAceptacionLegal(perfil)
      if (!estadoLegal.actualizado) {
        router.push('/aceptacion-legal')
        return
      }

      if (isDev) console.log('[login] Redirección a', perfil.rol === 'super_admin' ? '/super-admin' : '/dashboard')
      authTraceStart('uiRedirect')
      if (perfil.rol === 'super_admin') {
        router.push('/super-admin')
      } else {
        router.push('/dashboard')
      }
      authTraceEnd()
      router.refresh()
    } catch (error: any) {
      authTraceEnd()
      if (isDev) console.error('[login] Error:', error)
      const msg = error?.message === 'Timeout'
        ? 'El servidor tardó en responder. Intenta de nuevo en unos segundos.'
        : (error?.message ?? 'Usuario o contraseña incorrectos')
      setError(msg)
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  async function onSubmitCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorCliente('')
    const form = new FormData(e.currentTarget)
    const cedula = String(form.get('cedula') || '').trim()
    const pin = String(form.get('pin_o_ultimos4') || '').trim()
    const empresaUUID = empresaIdCliente.trim()
    const empresaNombre = empresaInputCliente.trim()
    if ((!empresaUUID && !empresaNombre) || !cedula || !pin) {
      setErrorCliente('Completa empresa, cédula y PIN/últimos 4.')
      return
    }
    try {
      setLoadingCliente(true)
      const res = await fetch('/api/public/cliente-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaUUID || undefined,
          empresa_nombre: empresaNombre || undefined,
          cedula,
          pin_o_ultimos4: pin,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'No se pudo iniciar sesión de cliente')
      const resolvedEmpresaId = String(json?.empresa_id || empresaUUID || '').trim()
      if (!resolvedEmpresaId) throw new Error('No se pudo resolver la empresa')
      router.push(`/portal-cliente?empresa_id=${encodeURIComponent(resolvedEmpresaId)}`)
    } catch (err: unknown) {
      setErrorCliente(err instanceof Error ? err.message : 'Error de acceso de cliente')
    } finally {
      setLoadingCliente(false)
    }
  }

  // ─── estilos reutilizables ────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#f1f5f9',
    outline: 'none',
    caretColor: '#3b82f6',
    transition: 'border 0.15s, box-shadow 0.15s',
  }
  const labelBase: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(148,163,184,0.65)',
    marginBottom: '8px',
  }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(59,130,246,0.55)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050b18 0%, #0a1628 55%, #050e1f 100%)' }}
    >
      {/* Grid de fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Glow superior derecho */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-140px', right: '-140px',
          width: '560px', height: '560px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 65%)',
        }}
      />
      {/* Glow inferior izquierdo */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-120px', left: '-120px',
          width: '440px', height: '440px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.11) 0%, transparent 65%)',
        }}
      />
      {/* Línea decorativa superior */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.45), transparent)' }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Cabecera ── */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center mb-5 relative">
            <div
              className="absolute inset-0 rounded-2xl blur-xl"
              style={{ background: 'rgba(59,130,246,0.42)', transform: 'scale(1.35)' }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                boxShadow: '0 0 0 1px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Lock className="w-7 h-7 text-white drop-shadow" />
            </div>
          </div>

          <h1
            className="text-2xl font-black text-white tracking-tight"
            style={{ letterSpacing: '-0.01em' }}
          >
            JASICORPORATIONS
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4))' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(148,163,184,0.45)', letterSpacing: '0.14em' }}>
              SISTEMA FINANCIERO
            </span>
            <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.4), transparent)' }} />
          </div>
        </div>

        {/* ── Tarjeta ── */}
        <div
          className="rounded-3xl p-7"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Toggle empresa / cliente */}
          <div
            className="grid grid-cols-2 mb-7 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {(['empresa', 'cliente'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoCuenta(tipo)}
                className="rounded-lg py-2.5 text-xs font-bold transition-all duration-200"
                style={
                  tipoCuenta === tipo
                    ? {
                        background: 'rgba(59,130,246,0.18)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        color: '#93c5fd',
                        boxShadow: '0 2px 8px rgba(59,130,246,0.15)',
                        letterSpacing: '0.06em',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'rgba(148,163,184,0.45)',
                        letterSpacing: '0.06em',
                      }
                }
              >
                {tipo === 'empresa' ? 'EMPRESA' : 'CLIENTE'}
              </button>
            ))}
          </div>

          {/* ── FORM EMPRESA ── */}
          {tipoCuenta === 'empresa' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm space-y-1"
                  style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
                >
                  <p>{error}</p>
                  {(error.includes('tardó') || error.includes('servidor')) && (
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="font-semibold underline text-xs"
                      style={{ color: '#93c5fd' }}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}

              <div>
                <label style={labelBase}>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  autoComplete="email"
                  style={inputBase}
                  {...register('email')}
                  onFocus={inputFocus}
                  onBlur={(e) => { inputBlur(e); register('email').onBlur(e) }}
                />
                {errors.email && (
                  <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ ...labelBase, marginBottom: 0 }}>Contraseña</label>
                  <Link
                    href="/recuperar-contrasena"
                    className="text-xs font-semibold transition-colors"
                    style={{ color: '#60a5fa' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={inputBase}
                  {...register('password')}
                  onFocus={inputFocus}
                  onBlur={(e) => { inputBlur(e); register('password').onBlur(e) }}
                />
                {errors.password && (
                  <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold rounded-xl py-3.5 text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.15)',
                  letterSpacing: '0.03em',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 32px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 24px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    {loadingStep || 'Verificando...'}
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/register"
                  className="text-xs font-semibold transition-colors"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                >
                  ¿Sin cuenta?{' '}
                  <span style={{ color: '#60a5fa' }}>Crear cuenta de empresa →</span>
                </Link>
              </div>
            </form>

          ) : (

          /* ── FORM CLIENTE ── */
            <form onSubmit={onSubmitCliente} className="space-y-4">
              {errorCliente && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
                >
                  {errorCliente}
                </div>
              )}

              <div>
                <label style={labelBase}>Empresa</label>
                <input
                  placeholder="Nombre de tu empresa"
                  value={empresaInputCliente}
                  onChange={(e) => setEmpresaInputCliente(e.target.value)}
                  style={inputBase}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </div>

              {!!empresaIdCliente && (
                <div>
                  <label style={labelBase}>ID de empresa</label>
                  <input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={empresaIdCliente}
                    onChange={(e) => setEmpresaIdCliente(e.target.value)}
                    style={inputBase}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
              )}

              <div>
                <label style={labelBase}>Cédula</label>
                <input
                  name="cedula"
                  placeholder="00112345678"
                  required
                  style={inputBase}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </div>

              <div>
                <label style={labelBase}>Contraseña / PIN</label>
                <input
                  name="pin_o_ultimos4"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Contraseña o últimos 4 dígitos"
                  required
                  style={inputBase}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(100,116,139,0.7)' }}>
                  Primer acceso: últimos 4 dígitos del celular o PIN de solicitud.
                </p>
              </div>

              <div
                className="rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: 'rgba(252,211,77,0.75)' }}
              >
                ¿Olvidó su contraseña? Contacte a su sucursal para restablecer el acceso.
              </div>

              <button
                type="submit"
                disabled={loadingCliente}
                className="w-full font-bold rounded-xl py-3.5 text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.15)',
                  letterSpacing: '0.03em',
                }}
                onMouseEnter={(e) => { if (!loadingCliente) e.currentTarget.style.boxShadow = '0 6px 32px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { if (!loadingCliente) e.currentTarget.style.boxShadow = '0 4px 24px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                {loadingCliente ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Verificando...
                  </>
                ) : (
                  'Acceder como cliente'
                )}
              </button>

              <div className="text-center">
                <Link
                  href={
                    empresaIdCliente.trim()
                      ? `/solicitud-prestamo?empresa_id=${encodeURIComponent(empresaIdCliente.trim())}`
                      : empresaInputCliente.trim()
                        ? `/solicitud-prestamo?empresa=${encodeURIComponent(empresaInputCliente.trim())}`
                        : '/solicitud-prestamo'
                  }
                  className="text-xs font-semibold"
                  style={{ color: '#60a5fa' }}
                >
                  ¿Sin cuenta? Solicitar crédito →
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* ── Badge seguridad + limpiar sesión ── */}
        <div className="flex items-center justify-between mt-7 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" style={{ color: 'rgba(100,116,139,0.45)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', opacity: 0.7 }} />
              <span className="text-xs" style={{ letterSpacing: '0.06em' }}>Conexión segura</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(100,116,139,0.35)', letterSpacing: '0.06em' }}>
              Datos cifrados
            </span>
          </div>
          <button
            type="button"
            onClick={limpiarSesionParaReintentarLogin}
            className="text-xs transition-colors"
            style={{ color: 'rgba(100,116,139,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(100,116,139,0.35)' }}
          >
            Limpiar sesión
          </button>
        </div>

      </div>
    </div>
  )
}




