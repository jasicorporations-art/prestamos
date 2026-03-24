'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { LandingNavbar } from '@/components/LandingNavbar'
import { DescargaAppAndroid } from '@/components/DescargaAppAndroid'
import { PLANES } from '@/lib/config/planes'
import {
  Users,
  FileText,
  Calculator,
  Bell,
  Printer,
  Shield,
  Check,
  Mail,
  Car,
  Banknote,
  Monitor,
  Send,
  Package,
  Building2,
  UserCheck,
  BarChart3,
  MapPin,
  Wallet,
  Smartphone,
  ClipboardList,
  CreditCard,
  MessageCircle,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const CAPACIDADES_IMAGES = [
  { id: 'feature-tesoreria', file: 'Tesoreria.jpg', desc: 'Control de capital consolidado.' },
  { id: 'feature-admin', file: 'Panel Admin.jpg', desc: 'Gestión de Inventario y Cartera: motor de amortización, registro de Chasis de vehículos o Seriales de electrodomésticos en un solo lugar.' },
  { id: 'feature-seguridad', file: 'Historial.jpg', desc: 'Auditoría y registro cronológico de cada movimiento.' },
] as const

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <LandingNavbar variant="dark" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-zinc-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(99, 102, 241, 0.12), transparent)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              {/* Badge superior */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Plataforma financiera #1</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-[3.25rem] font-black text-white leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
                La plataforma definitiva para{' '}
                <span className="bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
                  Ventas a Crédito e Inventario
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-zinc-400 mb-10 leading-relaxed max-w-xl">
                Gestiona múltiples sucursales, automatiza contratos y controla tu mora de vehículos, electrodomésticos o préstamos personales — todo en tiempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-4 text-white rounded-xl font-bold text-base transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                    boxShadow: '0 4px 24px rgba(59,130,246,0.35)',
                  }}
                >
                  Comenzar gratis →
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-8 py-4 text-zinc-300 rounded-xl font-semibold text-base transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Iniciar Sesión
                </button>
              </div>

              {/* Descargar App */}
              <div className="mt-6 flex flex-col gap-2">
                <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Descarga la app</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.jasicorporations.prestamos.twa&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block hover:opacity-90 active:scale-95 transition-all drop-shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/google-play-badge.svg"
                      alt="Disponible en Google Play"
                      style={{ height: '60px', width: 'auto' }}
                    />
                  </a>
                </div>
              </div>
            </AnimatedSection>

            {/* Mockup de celular */}
            <AnimatedSection className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-64 h-[500px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
                    {/* Screen Content */}
                    <div className="pt-8 px-4 h-full overflow-y-auto">
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4">
                          <h3 className="font-bold text-sm text-gray-900 mb-2">Tu centro de mando</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-500">Capital por recuperar</p>
                              <p className="text-lg font-bold text-gray-900">$12,450</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-xs text-gray-500">Desembolsos activos</p>
                              <p className="text-lg font-bold text-gray-900">24</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-900 mb-1">Juan Pérez</p>
                          <p className="text-xs text-gray-500">Cuota #3 - $250</p>
                          <p className="text-xs text-primary-600 mt-1">Vence: 15/01</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-900 mb-1">María García</p>
                          <p className="text-xs text-gray-500">Cuota #5 - $300</p>
                          <p className="text-xs text-green-600 mt-1">Al día</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-500 rounded-full opacity-25 blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary-600 rounded-full opacity-20 blur-2xl"></div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Problema y Solución */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ¿Cansado de los cuadernos y los errores de cálculo?
            </h2>
            <p className="text-lg sm:text-xl text-zinc-400 mb-12 leading-relaxed">
              JasiCorporations automatiza el saldo pendiente y las cuotas, eliminando errores manuales y ahorrándote
              horas de trabajo. Todo se calcula automáticamente y se sincroniza en la nube.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {/* El Problema */}
              <div className="rounded-2xl p-6 text-left"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-red-400 font-black text-base">✗</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Sin JasiCorporations</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Cuadernos físicos con errores de cálculo',
                    'Horas perdidas calculando cuotas manualmente',
                    'Pérdida de información de clientes',
                    'Sin control de qué clientes están en mora',
                    'Sin contratos formales ni recibos de pago',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-red-400 mt-0.5 flex-shrink-0 font-bold">✗</span>
                      <span className="text-zinc-400 text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* La Solución */}
              <div className="rounded-2xl p-6 text-left"
                style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <span className="text-emerald-400 font-black text-base">✓</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Con JasiCorporations</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Cuotas e intereses calculados automáticamente',
                    'Todo en la nube: accesible 24/7 desde cualquier lugar',
                    'Expedientes digitales completos por cliente',
                    'Alertas de mora y recordatorios automáticos',
                    'Contratos, recibos y tablas de amortización al instante',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                      <span className="text-zinc-400 text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Para la Empresa / Para el Cliente ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Una plataforma, dos mundos</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Diseñado para <span className="bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">todos los involucrados</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              JasiCorporations sirve a ambos lados de la operación: el negocio que presta y el cliente que paga.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Card: Para la Empresa */}
            <AnimatedSection>
              <div className="relative h-full rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  boxShadow: '0 0 60px rgba(59,130,246,0.06)',
                }}>
                {/* Glow interno */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

                <div className="relative p-8">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', boxShadow: '0 0 24px rgba(59,130,246,0.3)' }}>
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Para la empresa</p>
                      <h3 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.01em' }}>
                        Control total de tu cartera
                      </h3>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    {[
                      { icon: BarChart3,    text: 'Dashboard con capital activo, mora y cobros del día en tiempo real' },
                      { icon: Users,        text: 'Gestión de clientes, garantes y expedientes completos por cliente' },
                      { icon: Calculator,   text: 'Motor de amortización automático: cuotas, intereses y saldo pendiente' },
                      { icon: MapPin,       text: 'Rutas de cobro y mapa de clientes para cobros en campo' },
                      { icon: Bell,         text: 'Recordatorios automáticos por WhatsApp y correo antes del vencimiento' },
                      { icon: FileText,     text: 'Contratos y cartas de saldo generados automáticamente listos para imprimir' },
                      { icon: Printer,      text: 'Recibos de pago y tablas de amortización en PDF con tu marca' },
                      { icon: Building2,    text: 'Multi-sucursal: controla varias oficinas y equipos de cobranza' },
                      { icon: Wallet,       text: 'Control de caja y tesorería con cierre diario' },
                      { icon: Shield,       text: 'Historial de auditoría y backups automáticos en la nube' },
                    ].map(({ icon: Icon, text }, i) => (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
                          <Icon className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed pt-1">{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(59,130,246,0.1)' }}>
                    <button
                      onClick={() => router.push('/register')}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                        boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                      }}
                    >
                      Empezar gratis como empresa →
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Card: Para el Cliente */}
            <AnimatedSection>
              <div className="relative h-full rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #0d1a0d 0%, #0f1f10 100%)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.04)',
                }}>
                {/* Glow interno */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

                <div className="relative p-8">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #14532d, #22c55e)', boxShadow: '0 0 24px rgba(34,197,94,0.25)' }}>
                      <UserCheck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Para el cliente</p>
                      <h3 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.01em' }}>
                        Transparencia y control propio
                      </h3>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    {[
                      { icon: CreditCard,     text: 'Portal personal para consultar su saldo pendiente y estado del préstamo' },
                      { icon: ClipboardList,  text: 'Tabla de amortización completa: ve todas tus cuotas futuras de un vistazo' },
                      { icon: Receipt,        text: 'Historial de pagos realizados con recibos descargables en cualquier momento' },
                      { icon: Bell,           text: 'Notificaciones de vencimiento por WhatsApp antes de que caiga en mora' },
                      { icon: MessageCircle,  text: 'Recibe tu recibo de pago por correo o WhatsApp al instante después de pagar' },
                      { icon: Smartphone,     text: 'Acceso desde el celular: app Android disponible en Google Play Store' },
                      { icon: UserCheck,      text: 'Sin contraseñas complicadas: accede con tu cédula y los últimos 4 del celular' },
                      { icon: Shield,         text: 'Tus datos están protegidos y solo tú puedes ver tu información' },
                      { icon: Calculator,     text: 'Calcula cuánto debes en cualquier momento sin llamar a la empresa' },
                      { icon: FileText,       text: 'Solicitud de crédito en línea: aplica sin ir a la oficina' },
                    ].map(({ icon: Icon, text }, i) => (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)' }}>
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed pt-1">{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(34,197,94,0.1)' }}>
                    <button
                      onClick={() => router.push('/login?tipo=cliente')}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #14532d, #16a34a)',
                        boxShadow: '0 4px 20px rgba(34,197,94,0.2)',
                      }}
                    >
                      Acceder como cliente →
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedSection>

          </div>
        </div>
      </section>

      {/* Capacidades Core del Sistema */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Capacidades Core del Sistema</h2>
            <p className="text-lg sm:text-xl text-zinc-400 mb-4">Funcionalidades esenciales que potencian tu operación</p>
            <div className="flex flex-wrap justify-center gap-6 text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Car className="w-6 h-6 text-primary-600" />
                <span className="text-sm font-medium">Dealers / Vehículos</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Banknote className="w-6 h-6 text-primary-600" />
                <span className="text-sm font-medium">Préstamos / Efectivo</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Monitor className="w-6 h-6 text-primary-600" />
                <span className="text-sm font-medium">Electrodomésticos</span>
              </span>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CAPACIDADES_IMAGES.map((item) => (
              <AnimatedSection key={item.id}>
                <div id={item.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-lg hover:shadow-xl hover:border-zinc-700 transition-all h-full flex flex-col">
                  <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                    <Image
                      src={`/${encodeURIComponent(item.file)}`}
                      alt={item.desc}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 flex-1">
                    <p className="text-zinc-300 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Características Clave */}
      <section id="funciones" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Características Clave Multi-Industria</h2>
            <p className="text-lg sm:text-xl text-zinc-400">Para préstamos personales, dealers de vehículos o tiendas de electrodomésticos</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Contratos Especializados',
                description: 'Genera contratos legales automáticos para préstamos personales, venta de vehículos (Dealers) o factura de artículos (Electro).',
              },
              {
                icon: Send,
                title: 'Notificaciones Inteligentes',
                description: 'Envío automático de recibos y tablas de amortización por Correo y WhatsApp para cualquier tipo de financiamiento.',
              },
              {
                icon: Package,
                title: 'Gestión de Colateral',
                description: 'Controla los datos específicos del bien (Marca, Modelo, Chasis, Serial) dentro del mismo expediente del cliente.',
              },
              {
                icon: Users,
                title: 'Registro de Clientes',
                description: 'Gestiona toda la información de tus clientes y garantes en un solo lugar.',
              },
              {
                icon: Calculator,
                title: 'Sistema de Cuotas y Deducción Automática',
                description: 'El sistema calcula automáticamente las cuotas y actualiza los saldos pendientes.',
              },
              {
                icon: Bell,
                title: 'Recordatorios por WhatsApp y Correo',
                description: 'Envía recordatorios automáticos a tus clientes antes de que venzan sus cuotas.',
              },
              {
                icon: Printer,
                title: 'Impresión de Facturas Profesionales',
                description: 'Genera facturas y recibos profesionales listos para imprimir.',
              },
              {
                icon: Shield,
                title: 'Seguridad de Datos en la Nube',
                description: 'Tus datos están seguros y respaldados en la nube, accesibles desde cualquier dispositivo.',
              },
            ].map((feature, index) => (
              <AnimatedSection key={index}>
                <div className="bg-zinc-900 rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full border border-zinc-800 hover:border-primary-600/40">
                  <div className="w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mb-4 shadow-md">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Precios */}
      <section id="precios" className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Planes que se Adaptan a Ti</h2>
            <p className="text-lg sm:text-xl text-zinc-400">Elige el plan perfecto para tu negocio</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {Object.values(PLANES)
              .filter((plan) => plan.id !== 'INICIAL')
              .map((plan) => (
              <AnimatedSection key={plan.id}>
                <div
                  className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-zinc-700 ${
                    plan.popular ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-black relative' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-500 to-primary-700 text-white px-6 py-2 rounded-bl-2xl">
                      <span className="text-sm font-semibold">Más Popular</span>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.nombre}</h3>
                      <p className="text-zinc-400 text-sm">{plan.descripcion}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-white">${plan.precio}</span>
                        <span className="text-zinc-500 ml-2">/{plan.periodo}</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.caracteristicas.map((caracteristica, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="w-5 h-5 text-primary-400 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-zinc-300">{caracteristica}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => router.push('/register')}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-500 hover:to-primary-600 shadow-lg hover:shadow-xl'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      }`}
                    >
                      Suscribirme
                    </button>
                  </div>

                  <div className={`h-2 ${plan.color}`}></div>
                </div>
              </AnimatedSection>
              ))}
          </div>
        </div>
      </section>

      {/* Sección Google Play Store */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
                {/* Texto */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-semibold text-primary-300 uppercase tracking-wider mb-2">App Oficial</p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Descarga <span className="text-primary-300">Jasi</span> en Google Play
                  </h2>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
                    Gestiona tus préstamos, cobros y clientes desde tu celular. Disponible gratis en la Play Store.
                  </p>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.jasicorporations.prestamos.twa&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block hover:opacity-90 active:scale-95 transition-all drop-shadow-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/google-play-badge.svg"
                      alt="Disponible en Google Play"
                      style={{ height: '72px', width: 'auto' }}
                    />
                  </a>
                </div>
                {/* Ícono decorativo */}
                <div className="flex-shrink-0 hidden sm:flex">
                  <div className="w-28 h-28 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none">
                      <path d="M3 4.8L13.2 12 3 19.2V4.8Z" fill="#4285F4"/>
                      <path d="M3 19.2L13.2 12 21 16.5 3 19.2Z" fill="#34A853"/>
                      <path d="M3 4.8L21 7.5 13.2 12 3 4.8Z" fill="#EA4335"/>
                      <path d="M13.2 12L21 7.5V16.5L13.2 12Z" fill="#FBBC04"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Descarga App Android (APK) */}
      <DescargaAppAndroid variant="dark" />

      {/* Sección de Confianza */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 flex flex-col">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Seguridad de nivel empresarial</h3>
              <p className="text-gray-400 text-sm mt-2">Protección de datos y respaldo constante en la nube.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                <Printer className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Documentos siempre disponibles</h3>
              <p className="text-gray-400 text-sm mt-2">Contratos y cartas listos para consultar o imprimir.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Operación en tiempo real</h3>
              <p className="text-gray-400 text-sm mt-2">Control de cartera, cobros y notificaciones desde cualquier lugar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Listo para el control de tus Ventas a Crédito e Inventario?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Únete a JasiCorporations y gestiona préstamos, dealers de vehículos o tiendas de electrodomésticos en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-white text-primary-700 rounded-lg hover:bg-gray-100 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Comenzar Gratis
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-semibold text-lg"
              >
                Iniciar Sesión
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer con Contacto */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-300 to-primary-500 bg-clip-text text-transparent mb-4">
                JasiCorporations
              </h3>
              <p className="text-gray-400">
                La plataforma definitiva para ventas a crédito e inventario: préstamos, dealers y electrodomésticos.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <div className="space-y-2 text-gray-400">
                <a
                  href="mailto:jasicorporations@gmail.com"
                  className="flex items-center hover:text-primary-300 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  jasicorporations@gmail.com
                </a>
                <a
                  href="mailto:johnrijo@jasicorporations.com"
                  className="flex items-center hover:text-primary-300 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  johnrijo@jasicorporations.com
                </a>
                <a
                  href="mailto:soporte@jasicorporations.com"
                  className="flex items-center hover:text-primary-300 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  soporte@jasicorporations.com
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Enlaces</h4>
              <div className="space-y-2">
                <Link href="#funciones" className="block text-gray-400 hover:text-primary-300 transition-colors">
                  Funciones
                </Link>
                <Link href="#precios" className="block text-gray-400 hover:text-primary-300 transition-colors">
                  Precios
                </Link>
                <Link href="/login" className="block text-gray-400 hover:text-primary-300 transition-colors">
                  Iniciar Sesión
                </Link>
                <Link href="/register" className="block text-gray-400 hover:text-primary-300 transition-colors">
                  Registrarse
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} JasiCorporations. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

