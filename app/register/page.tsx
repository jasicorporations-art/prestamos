'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TerminosModal } from '@/components/TerminosModal'
import { authService } from '@/lib/services/auth'
import { empresasService } from '@/lib/services/empresas'
import { CheckCircle, ArrowRight, Shield, Users, TrendingUp, UserPlus } from 'lucide-react'
import Link from 'next/link'

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  compania: z.string().min(1, 'La compañía es requerida'),
  rnc: z.string().min(1, 'El RNC es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Debe confirmar la contraseña'),
  terminosAceptados: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar los términos y condiciones para continuar',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

const features = [
  {
    icon: Users,
    title: 'Multi-sucursal',
    desc: 'Gestiona múltiples sucursales y equipos desde un solo panel.',
  },
  {
    icon: TrendingUp,
    title: 'Control en tiempo real',
    desc: 'Mora, pagos y vencimientos actualizados al instante.',
  },
  {
    icon: Shield,
    title: 'Datos seguros',
    desc: 'Cifrado de extremo a extremo y backups automáticos diarios.',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [terminosModalOpen, setTerminosModalOpen] = useState(false)
  const [politicaModalOpen, setPoliticaModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terminosAceptados: false,
    },
  })

  const terminosAceptados = watch('terminosAceptados')

  useEffect(() => {
    // Verificar si ya está autenticado
    authService.getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  async function onSubmit(data: RegisterFormData) {
    try {
      setLoading(true)
      setError('')
      
      // Validar que el nombre de empresa sea único
      const validacionEmpresa = await empresasService.verificarEmpresaDisponible(data.compania)
      if (!validacionEmpresa.disponible) {
        setError(validacionEmpresa.mensaje || 'Esta empresa ya está registrada. Por favor, usa un nombre diferente.')
        setLoading(false)
        return
      }
      
      const signUpResult = await authService.signUp(data.email, data.password, {
        nombre: data.nombre,
        apellido: data.apellido,
        compania: data.compania,
        rnc: data.rnc,
        telefono: data.telefono,
        direccion: data.direccion,
      })

      if (signUpResult.user) {
        const token = (signUpResult as { session?: { access_token?: string } }).session?.access_token
        await fetch('/api/registro-asegurar-admin', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        setSuccess(true)
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error en el registro'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── estilos reutilizables (igual que login) ──────────────────────────────
  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '12px',
    padding: '11px 14px',
    fontSize: '14px',
    color: '#f1f5f9',
    outline: 'none',
    caretColor: '#3b82f6',
    transition: 'border 0.15s, box-shadow 0.15s',
  }
  const labelBase: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(148,163,184,0.55)',
    marginBottom: '7px',
  }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(59,130,246,0.55)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #050b18 0%, #0a1628 55%, #050e1f 100%)' }}
      >
        <div
          className="max-w-sm w-full rounded-2xl p-10 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: '#4ade80' }} />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Cuenta creada con éxito</h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(148,163,184,0.6)' }}>Redirigiendo al Dashboard...</p>
          <Link href="/dashboard">
            <Button
              className="w-full py-3 text-white text-sm font-bold rounded-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                boxShadow: '0 4px 24px rgba(59,130,246,0.32)',
              }}
            >
              Ir al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // pre-extraer refs para encadenar onBlur con validación
  const regNombre = register('nombre')
  const regApellido = register('apellido')
  const regDireccion = register('direccion')
  const regCompania = register('compania')
  const regRnc = register('rnc')
  const regTelefono = register('telefono')
  const regEmail = register('email')
  const regPassword = register('password')
  const regConfirmPassword = register('confirmPassword')

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
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
          top: '-160px', right: '-160px',
          width: '620px', height: '620px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)',
        }}
      />
      {/* Glow inferior izquierdo */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-120px', left: '-120px',
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)',
        }}
      />
      {/* Línea decorativa superior */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }}
      />

      {/* ── Panel izquierdo (marketing) ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative z-10 flex-shrink-0">
        {/* Divisor vertical derecho */}
        <div
          className="absolute top-0 right-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.15) 30%, rgba(59,130,246,0.15) 70%, transparent)' }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              boxShadow: '0 0 0 1px rgba(59,130,246,0.3)',
            }}
          >
            <span className="text-white font-black text-base">J</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-widest uppercase leading-none">JasiCorporations</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(59,130,246,0.6)', letterSpacing: '0.1em' }}>Sistema Financiero</p>
          </div>
        </div>

        {/* Contenido central */}
        <div className="space-y-10">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#60a5fa' }} />
              <span className="text-xs font-semibold" style={{ color: '#60a5fa', letterSpacing: '0.12em' }}>
                PLATAFORMA DE PRÉSTAMOS
              </span>
            </div>
            <h1
              className="text-4xl xl:text-[2.8rem] font-black text-white leading-[1.1] mb-5"
              style={{ letterSpacing: '-0.02em' }}
            >
              El sistema que<br />
              tu empresa<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #818cf8)' }}
              >
                necesita.
              </span>
            </h1>
            <p className="text-[0.9rem] leading-relaxed max-w-[270px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Controla sucursales, automatiza cobros y toma decisiones con datos en tiempo real.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.18)',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none mb-1">{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(100,116,139,0.7)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
            © {new Date().getFullYear()} JasiCorporations
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-70" style={{ animation: 'pulse 2s infinite' }} />
            <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)', letterSpacing: '0.06em' }}>
              Sistema activo
            </span>
          </div>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-8 overflow-y-auto relative z-10">
        <div className="w-full max-w-[480px] py-6">

          {/* ── Cabecera con logo (igual que login) ── */}
          <div className="text-center mb-8">
            {/* Ícono con glow */}
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
                <UserPlus className="w-7 h-7 text-white drop-shadow" />
              </div>
            </div>

            {/* Nombre de la marca */}
            <h1
              className="text-2xl font-black text-white tracking-tight"
              style={{ letterSpacing: '-0.01em' }}
            >
              JASICORPORATIONS
            </h1>

            {/* Subtítulo con líneas decorativas */}
            <div className="flex items-center justify-center gap-2 mt-2 mb-1">
              <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4))' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(148,163,184,0.45)', letterSpacing: '0.14em' }}>
                NUEVA CUENTA
              </span>
              <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.4), transparent)' }} />
            </div>

            <p className="text-sm mt-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Comienza tu prueba gratuita — sin tarjeta de crédito.
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div
            className="rounded-3xl p-6 sm:p-7"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm mb-6 flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
              >
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">

              {/* ── Datos personales ── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #3b82f6, #818cf8)' }} />
                  <p style={{ ...labelBase, color: 'rgba(148,163,184,0.7)', marginBottom: 0, letterSpacing: '0.14em' }}>
                    Datos personales
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelBase}>Nombre</label>
                      <input
                        {...regNombre}
                        placeholder="Juan"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regNombre.onBlur(e) }}
                      />
                      {errors.nombre && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nombre.message}</p>}
                    </div>
                    <div>
                      <label style={labelBase}>Apellido</label>
                      <input
                        {...regApellido}
                        placeholder="Pérez"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regApellido.onBlur(e) }}
                      />
                      {errors.apellido && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.apellido.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label style={labelBase}>Dirección</label>
                    <input
                      {...regDireccion}
                      placeholder="Calle Principal #123"
                      style={inputBase}
                      onFocus={inputFocus}
                      onBlur={(e) => { inputBlur(e); regDireccion.onBlur(e) }}
                    />
                    {errors.direccion && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.direccion.message}</p>}
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className="mb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

              {/* ── Datos empresa ── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #3b82f6, #818cf8)' }} />
                  <p style={{ ...labelBase, color: 'rgba(148,163,184,0.7)', marginBottom: 0, letterSpacing: '0.14em' }}>
                    Datos de la empresa
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label style={labelBase}>Compañía</label>
                    <input
                      {...regCompania}
                      placeholder="Nombre de la empresa"
                      style={inputBase}
                      onFocus={inputFocus}
                      onBlur={(e) => { inputBlur(e); regCompania.onBlur(e) }}
                    />
                    {errors.compania && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.compania.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelBase}>RNC</label>
                      <input
                        {...regRnc}
                        placeholder="123-45678-9"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regRnc.onBlur(e) }}
                      />
                      {errors.rnc && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.rnc.message}</p>}
                      <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>Aparece en contratos.</p>
                    </div>
                    <div>
                      <label style={labelBase}>Teléfono</label>
                      <input
                        {...regTelefono}
                        type="tel"
                        placeholder="(809) 555-1234"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regTelefono.onBlur(e) }}
                      />
                      {errors.telefono && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.telefono.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className="mb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

              {/* ── Credenciales ── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #3b82f6, #818cf8)' }} />
                  <p style={{ ...labelBase, color: 'rgba(148,163,184,0.7)', marginBottom: 0, letterSpacing: '0.14em' }}>
                    Credenciales de acceso
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label style={labelBase}>Email</label>
                    <input
                      {...regEmail}
                      type="email"
                      placeholder="usuario@empresa.com"
                      autoComplete="email"
                      style={inputBase}
                      onFocus={inputFocus}
                      onBlur={(e) => { inputBlur(e); regEmail.onBlur(e) }}
                    />
                    {errors.email && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelBase}>Contraseña</label>
                      <input
                        {...regPassword}
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regPassword.onBlur(e) }}
                      />
                      {errors.password && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>}
                    </div>
                    <div>
                      <label style={labelBase}>Confirmar</label>
                      <input
                        {...regConfirmPassword}
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={inputBase}
                        onFocus={inputFocus}
                        onBlur={(e) => { inputBlur(e); regConfirmPassword.onBlur(e) }}
                      />
                      {errors.confirmPassword && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className="mb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

              {/* Términos */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('terminosAceptados', {
                      required: 'Debe aceptar los términos para continuar',
                    })}
                    className="mt-0.5 h-4 w-4 rounded flex-shrink-0 cursor-pointer"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    He leído y acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setTerminosModalOpen(true)}
                      className="font-semibold transition-colors"
                      style={{ color: '#60a5fa' }}
                    >
                      Términos de Servicio
                    </button>
                    {' '}y la{' '}
                    <button
                      type="button"
                      onClick={() => setPoliticaModalOpen(true)}
                      className="font-semibold transition-colors"
                      style={{ color: '#60a5fa' }}
                    >
                      Política de Privacidad
                    </button>
                    {' '}de JasiCorporations.
                  </span>
                </label>
                {errors.terminosAceptados && (
                  <p className="text-xs mt-2 ml-7" style={{ color: '#f87171' }}>
                    {errors.terminosAceptados.message}
                  </p>
                )}
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading || !terminosAceptados}
                className="w-full font-bold rounded-xl py-3.5 text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.15)',
                  letterSpacing: '0.03em',
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear cuenta gratis
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Nota seguridad */}
              <p className="flex items-center justify-center gap-1.5 mt-4 text-xs" style={{ color: 'rgba(100,116,139,0.45)' }}>
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                Datos cifrados y protegidos — nunca los compartimos.
              </p>
            </form>
          </div>

          <TerminosModal
            isOpen={terminosModalOpen}
            onClose={() => setTerminosModalOpen(false)}
            tipo="terminos"
          />
          <TerminosModal
            isOpen={politicaModalOpen}
            onClose={() => setPoliticaModalOpen(false)}
            tipo="politica"
          />

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.45)' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-semibold transition-colors" style={{ color: '#60a5fa' }}>
                Inicia sesión →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

