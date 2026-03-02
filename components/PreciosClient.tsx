'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Check,
  X,
  Star,
  CheckCircle,
  XCircle,
  Shield,
  Database,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react'
import type { PlanType } from '@/lib/config/planes'

// Datos de planes según especificación
const PLANES_PRICING = [
  {
    id: 'BRONCE' as PlanType,
    nombre: 'Plan Bronce',
    precio: 19.99,
    precioLabel: '$19.99',
    periodo: '/mes',
    badge: 'Para comenzar',
    idealPara: 'Micro negocio',
    descripcion:
      'Ideal para empezar con un presupuesto bajo. Control básico de clientes, ventas y pagos.',
    incluye: [
      '1 sucursal',
      'Hasta 200 clientes',
      'Hasta 60 préstamos activos',
      'Hasta 3 vendedores',
      'Gestión de ventas y pagos',
      'Caja diaria',
      'WhatsApp manual',
      'Soporte por email',
    ],
    noIncluye: [
      'Creación de administradores',
      'WhatsApp automático',
      'Factura PDF personalizada',
      'Importación o exportación de datos',
      'Backups automáticos',
    ],
    nota: 'Perfecto para probar el sistema con un costo accesible.',
    destacado: false,
    neonBorder: 'bronze',
  },
  {
    id: 'PLATA' as PlanType,
    nombre: 'Plan Plata',
    precio: 50,
    precioLabel: '$50',
    periodo: '/mes',
    badge: 'Ideal para comenzar',
    idealPara: 'Negocio pequeño',
    descripcion:
      'Pensado para negocios pequeños con hasta 3 sucursales que necesitan control diario sin complejidad.',
    incluye: [
      '500 clientes (límite total)',
      '200 préstamos en inventario',
      '3 sucursales',
      'Gestión de clientes, ventas y pagos',
      'Caja diaria',
      'Contratos automáticos',
      'Carta de saldo automática',
      'Operación estable y segura',
    ],
    noIncluye: [
      'Importación o exportación de datos',
      'Backups automáticos',
      'Restauración de información',
    ],
    nota: 'Recomendado si estás empezando y aún no necesitas mover o respaldar datos.',
    destacado: false,
    neonBorder: 'blue',
  },
  {
    id: 'ORO' as PlanType,
    nombre: 'Plan Oro',
    precio: 100,
    precioLabel: '$100',
    periodo: '/mes',
    badge: 'Recomendado',
    idealPara: 'Negocio en crecimiento',
    descripcion:
      'Diseñado para negocios que ya operan con más volumen y necesitan respaldo, auditoría y escalabilidad.',
    incluye: [
      'Todo lo del Plan Plata, más:',
      '2 sucursales incluidas',
      'Exportación PDF, CSV, Excel',
      'Importación de clientes',
      'Backups y restauración bajo demanda',
      'Auditoría completa de acciones',
      'Soporte prioritario',
    ],
    sucursalAdicional: '$100 por sucursal',
    nota: 'Ideal para negocios que están abriendo su segunda o tercera ubicación.',
    destacado: true,
    neonBorder: 'green',
  },
  {
    id: 'INFINITO' as PlanType,
    nombre: 'Plan Infinito',
    precio: 1699,
    precioLabel: '$1,699',
    periodo: ' pago único',
    badge: 'De por vida',
    idealPara: 'Empresa en expansión',
    descripcion:
      'El plan más completo, de por vida. Una sola vez: sin renovaciones mensuales. Pensado para operaciones multi-sucursal que requieren estabilidad y control total.',
    incluye: [
      'Todo lo del Plan Oro, de por vida:',
      '3 sucursales incluidas',
      'Exportación PDF, CSV, Excel e importación',
      'Menor costo por sucursal adicional',
      'Acceso completo a herramientas avanzadas',
      'Prioridad máxima en soporte y estabilidad',
      'Sin renovaciones: pago único, acceso permanente',
    ],
    sucursalAdicional: '$70 por sucursal',
    nota: 'Pago único de $1,699. Acceso de por vida, sin cuotas mensuales.',
    destacado: false,
    neonBorder: 'violet',
  },
]

const COMPARATIVA = [
  { funcionalidad: 'Precio', bronce: '$19.99/mes', plata: '$50/mes', oro: '$100/mes', infinito: '$1,699 pago único (por vida)' },
  { funcionalidad: 'Sucursales incluidas', bronce: '1', plata: '3', oro: '2', infinito: '3' },
  { funcionalidad: 'Sucursal adicional', bronce: '—', plata: '—', oro: '$100 / sucursal', infinito: '$70 / sucursal' },
  { funcionalidad: 'Usuarios (máx.)', bronce: '3 vendedores (no admin)', plata: 'Ilimitados', oro: 'Ilimitados', infinito: '5 Admin + 15 Vendedores' },
  { funcionalidad: 'Gestión de clientes', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Ventas y pagos', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Caja por sucursal', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Reportes básicos', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Contratos automáticos', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Carta de saldo automática', bronce: true, plata: true, oro: true, infinito: true },
  { funcionalidad: 'Importar clientes', bronce: false, plata: false, oro: true, infinito: true },
  { funcionalidad: 'Exportar PDF, CSV, Excel', bronce: false, plata: false, oro: true, infinito: true },
  { funcionalidad: 'Backups y restauración', bronce: false, plata: false, oro: true, infinito: true },
  { funcionalidad: 'Auditoría de acciones', bronce: false, plata: false, oro: true, infinito: true },
  { funcionalidad: 'Soporte prioritario', bronce: false, plata: false, oro: true, infinito: true },
  { funcionalidad: 'Ideal para', bronce: 'Micro negocio', plata: 'Negocio pequeño', oro: 'Negocio en crecimiento', infinito: 'Empresa en expansión' },
]

const SOBRE_TUS_DATOS = [
  { icono: Shield, texto: 'Tus datos siempre son tuyos' },
  { icono: Database, texto: 'Nunca se eliminan sin advertencia' },
  { icono: FileText, texto: 'Puedes solicitar exportación asistida en cualquier plan' },
  { icono: Zap, texto: 'Los planes avanzados incluyen control total de respaldo y restauración' },
]

const POR_QUE_SUCURSAL = [
  { titulo: 'Más datos', texto: 'Cada sucursal genera más datos', icono: Database },
  { titulo: 'Más control', texto: 'Cada sucursal requiere más control', icono: Shield },
  { titulo: 'Mayor uso', texto: 'Cada sucursal implica mayor uso del sistema', icono: Zap },
]

function getCardBorderGlow(neonBorder: string) {
  switch (neonBorder) {
    case 'bronze':
      return 'border-amber-600/60 shadow-[0_0_25px_rgba(217,119,6,0.25)]'
    case 'blue':
      return 'border-blue-400/60 shadow-[0_0_25px_rgba(96,165,250,0.25)]'
    case 'green':
      return 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
    case 'violet':
      return 'border-violet-400/70 shadow-[0_0_25px_rgba(167,139,250,0.3)]'
    default:
      return 'border-zinc-500/40'
  }
}

export function PreciosClient() {
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [showTrialExpired, setShowTrialExpired] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
    if (searchParams.get('subscription_inactive') === 'true') setShowInactive(true)
    if (searchParams.get('trial_expired') === 'true') setShowTrialExpired(true)
  }, [searchParams])

  async function handleSubscribe(planType: PlanType) {
    setLoading(planType)
    try {
      const session = await import('@/lib/services/auth').then(m => m.authService.getSession())
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ planType }),
      })
      const data = await response.json()

      if (response.status === 401) {
        alert('No estás autenticado. Por favor, inicia sesión primero.')
        router.push('/login')
        setLoading(null)
        return
      }

      if (!response.ok) throw new Error(data.error || 'Error al crear sesión de checkout')
      if (data.url) window.location.href = data.url
      else throw new Error('No se recibió URL de checkout')
    } catch (error: any) {
      console.error('Error al suscribirse:', error)
      alert(`Error: ${error.message || 'Error desconocido'}. Intenta nuevamente.`)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans antialiased relative overflow-hidden">
      {/* Fondos con gradientes circulares azul/violeta */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header y alertas */}
        <header className="border-b border-white/5">
          <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            {showSuccess && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-4 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-300">¡Pago exitoso!</p>
                  <p className="text-sm text-emerald-200/80">Tu suscripción ha sido activada. Recarga la página para ver los cambios.</p>
                </div>
              </div>
            )}
            {showInactive && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-400/30 p-4 backdrop-blur-sm">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-300">Suscripción Inactiva</p>
                  <p className="text-sm text-red-200/80">Suscríbete a un plan para continuar usando el sistema.</p>
                </div>
              </div>
            )}
            {showTrialExpired && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 backdrop-blur-sm">
                <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">Período de Prueba Expirado</p>
                  <p className="text-sm text-amber-200/80">Elige un plan para continuar.</p>
                </div>
              </div>
            )}

            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                Planes que crecen contigo
              </h1>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Gestiona clientes, ventas y caja con control total. Elige el plan adecuado para tu negocio.
              </p>
            </div>
          </div>
        </header>

        {/* Tarjetas glassmorphism con bordes neón */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {PLANES_PRICING.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border bg-white/5 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    plan.destacado ? 'md:scale-105' : ''
                  } ${getCardBorderGlow(plan.neonBorder)} ${plan.destacado ? 'ring-2 ring-emerald-400/30' : ''}`}
                >
                  {plan.destacado && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500/90 to-emerald-600/90 text-white py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-1.5 backdrop-blur-sm">
                      <Star className="w-4 h-4 fill-current" />
                      {plan.badge}
                    </div>
                  )}

                  <div className={`p-6 sm:p-8 ${plan.destacado ? 'pt-14' : ''}`}>
                    {!plan.destacado && (
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-zinc-300 border border-white/10 mb-4">
                        {plan.badge}
                      </span>
                    )}

                    <h2 className="text-xl font-bold text-white mb-1">{plan.nombre}</h2>
                    <p className="text-sm text-zinc-400 mb-5">{plan.descripcion}</p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">{plan.precioLabel}</span>
                        <span className="text-zinc-500 text-lg">{plan.periodo}</span>
                      </div>
                      <span className="inline-block mt-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-zinc-300 border border-white/10">
                        Ideal para: {plan.idealPara}
                      </span>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.incluye.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.noIncluye && plan.noIncluye.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {plan.noIncluye.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-500">
                            <X className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {plan.sucursalAdicional && (
                      <p className="text-sm text-zinc-400 mb-4 font-medium">
                        Sucursales adicionales: {plan.sucursalAdicional}
                      </p>
                    )}

                    <p className="text-xs text-zinc-500 mb-6 italic">{plan.nota}</p>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading === plan.id}
                      className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {loading === plan.id ? 'Procesando...' : plan.id === 'INFINITO' ? 'Comprar por vida — $1,699' : 'Comenzar'}
                    </button>
                  </div>

                  <div
                    className={`h-1 ${
                      plan.neonBorder === 'bronze'
                        ? 'bg-amber-600'
                        : plan.neonBorder === 'blue'
                        ? 'bg-blue-500/80'
                        : plan.neonBorder === 'green'
                        ? 'bg-emerald-500'
                        : 'bg-violet-500/80'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabla comparativa — minimalista, líneas finas */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Comparativa de características
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm w-full max-w-full">
              <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
                <thead>
                  <tr className="border-b border-zinc-700/80">
                    <th className="text-left py-4 px-5 font-semibold text-zinc-300">Funcionalidad</th>
                    <th className="text-center py-4 px-5 font-semibold text-amber-300/90">Bronce</th>
                    <th className="text-center py-4 px-5 font-semibold text-blue-300/90">Plata</th>
                    <th className="text-center py-4 px-5 font-semibold text-emerald-300/90">Oro</th>
                    <th className="text-center py-4 px-5 font-semibold text-violet-300/90">Infinito</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/80 last:border-b-0">
                      <td className="py-3.5 px-5 font-medium text-zinc-300">{row.funcionalidad}</td>
                      <td className="py-3.5 px-5 text-center text-zinc-400">
                        {typeof (row as { bronce?: boolean | string }).bronce === 'boolean' ? ((row as { bronce?: boolean }).bronce ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-zinc-600 mx-auto" />) : (row as { bronce?: string }).bronce}
                      </td>
                      <td className="py-3.5 px-5 text-center text-zinc-400">
                        {typeof row.plata === 'boolean' ? (row.plata ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-zinc-600 mx-auto" />) : row.plata}
                      </td>
                      <td className="py-3.5 px-5 text-center text-zinc-400">
                        {typeof row.oro === 'boolean' ? (row.oro ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-zinc-600 mx-auto" />) : row.oro}
                      </td>
                      <td className="py-3.5 px-5 text-center text-zinc-400">
                        {typeof row.infinito === 'boolean' ? (row.infinito ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-zinc-600 mx-auto" />) : row.infinito}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Sobre tus datos — minimalista, líneas finas */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Sobre tus datos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SOBRE_TUS_DATOS.map((item, i) => {
                const Icon = item.icono
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-2xl bg-white/5 backdrop-blur-sm p-5 border border-zinc-700/50"
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-white/10">
                      <Icon className="w-5 h-5 text-cyan-300" />
                    </div>
                    <p className="text-zinc-300 font-medium pt-1.5">{item.texto}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ¿Por qué cobramos por sucursal? — iconos con gradiente, cajas redondeadas */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              ¿Por qué cobramos por sucursal?
            </h2>
            <p className="text-zinc-400 text-center mb-10 max-w-2xl mx-auto">
              Porque cada sucursal genera más datos, requiere más control e implica mayor uso del sistema. Así mantenemos precios justos para negocios pequeños y escalables para empresas grandes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {POR_QUE_SUCURSAL.map((card, i) => {
                const IconCard = card.icono
                const gradients = [
                  'from-blue-500/30 to-cyan-500/30',
                  'from-emerald-500/30 to-teal-500/30',
                  'from-violet-500/30 to-fuchsia-500/30',
                ]
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-center hover:border-white/20 transition-colors"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center mx-auto mb-4 border border-white/10`}
                    >
                      <IconCard className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{card.titulo}</h3>
                    <p className="text-sm text-zinc-400">{card.texto}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA final — gradiente cian-violeta con glow */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="rounded-2xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-white/10 backdrop-blur-sm p-10">
              <HelpCircle className="w-12 h-12 text-cyan-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                ¿No estás seguro qué plan elegir?
              </h2>
              <p className="text-zinc-300 mb-6">
                Empieza con el plan que necesitas hoy. Puedes subir de plan en cualquier momento sin perder información.
              </p>
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all duration-300"
              >
                Comenzar ahora
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
