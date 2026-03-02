'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { LandingNavbar } from '@/components/LandingNavbar'
import { Footer } from '@/components/Footer'
import { SocialProof } from '@/components/SocialProof'
import { DescargaAppAndroid } from '@/components/DescargaAppAndroid'
import {
  LayoutDashboard,
  Banknote,
  FileSignature,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Check,
  Lock,
  Database,
  Cloud,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  FileText,
  Star,
  Sparkles,
  Infinity,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PLANES } from '@/lib/config/planes'

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
  { id: 'feature-admin', file: 'Panel Admin.jpg', desc: 'Motor de amortización y gestión de cartera activa.' },
  { id: 'feature-seguridad', file: 'Historial.jpg', desc: 'Auditoría y registro cronológico de cada movimiento.' },
] as const

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-primary-50 to-white flex flex-col">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection className="text-center max-w-7xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              La plataforma definitiva para{' '}
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                el control total de tus préstamos
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 leading-relaxed">
              Gestiona múltiples sucursales, automatiza contratos legales y controla tu mora en tiempo real. 
              Todo en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Prueba el Control Total Ahora
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/admin/mora')}
                className="px-8 py-4 bg-white text-primary-700 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition-all font-semibold text-lg flex items-center justify-center gap-2"
              >
                Ver Demo de Gestión de Mora
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Capacidades Core del Sistema */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 flex flex-col md:flex-row">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Capacidades Core del Sistema</h2>
            <p className="text-xl text-gray-600">Funcionalidades esenciales que potencian tu operación</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CAPACIDADES_IMAGES.map((item) => (
              <AnimatedSection key={item.id}>
                <div id={item.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
                  <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
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
                    <p className="text-gray-700 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades Grid 3x2 */}
      <section id="funciones" className="py-20 px-4 sm:px-6 lg:px-8 bg-white scroll-mt-16 flex flex-col md:flex-row md:flex-wrap">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Funciones Avanzadas para Gestión de Préstamos
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Todo lo que necesitas para gestionar tu negocio de préstamos con total confianza
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: LayoutDashboard,
                title: 'Gestión Multi-Sucursal',
                description: 'Controla todas tus ubicaciones desde un panel central. Asigna vendedores y supervisa sus cajas de forma independiente.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Banknote,
                title: 'Arqueo de Caja y Auditoría',
                description: 'Cierres de caja diarios por sucursal e historial detallado de movimientos por usuario. Cero pérdidas, total transparencia.',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: FileSignature,
                title: 'Contratos y Cartas de Saldo Automáticas',
                description: 'Genera contratos blindados con garante y cartas de saldo en PDF con un clic. Ahorra horas de papeleo legal.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: AlertCircle,
                title: 'Inteligencia de Mora',
                description: 'Visualiza tu capital en riesgo. Reportes automáticos de atrasos segmentados por días y sucursal para cobros eficientes.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: ShieldCheck,
                title: 'Expediente Digital Blindado',
                description: 'Documentación de préstamos y clientes protegida con cifrado SSL y backups diarios automáticos.',
                color: 'from-amber-500 to-amber-600',
              },
              {
                icon: UserCheck,
                title: 'Seguridad de Acceso',
                description: 'Control por roles (Admin/Vendedor) y términos legales aceptados antes del registro para tu protección.',
                color: 'from-indigo-500 to-indigo-600',
              },
            ].map((feature, index) => (
              <AnimatedSection key={index}>
                <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full border border-gray-100 hover:border-primary-200">
                  <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 shadow-md`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Control de Operaciones */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Control de Operaciones en Tiempo Real
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Monitorea la salud financiera de tu dealer con un vistazo
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Mora Total */}
            <AnimatedSection>
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mora Total</h3>
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-red-600">$125,450</p>
                  <p className="text-sm text-gray-500">12 clientes en atraso</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-400">Última actualización: Hace 5 min</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Cajas Abiertas */}
            <AnimatedSection>
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Cajas Abiertas</h3>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-green-600">3/3</p>
                  <p className="text-sm text-gray-500">Todas las sucursales activas</p>
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-xs text-gray-600">Sucursal Norte</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-xs text-gray-600">Sucursal Sur</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-xs text-gray-600">Sucursal Centro</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Acción Rápida */}
            <AnimatedSection>
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-primary-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Acción Rápida</h3>
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/register')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <FileSignature className="w-4 h-4" />
                    Crear Nuevo Préstamo
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Gestiona préstamos y genera contratos legalmente blindados en segundos
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <SocialProof />

      <DescargaAppAndroid />

      {/* Sección de Confianza */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 flex flex-col">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Conexión HTTPS Segura</h3>
                <p className="text-gray-400 text-sm">
                  Todos los datos viajan cifrados con certificado SSL/TLS de última generación
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Datos Propiedad del Cliente</h3>
                <p className="text-gray-400 text-sm">
                  Tú eres el único dueño de tu información. Nunca compartimos tus datos con terceros
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
                  <Cloud className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Respaldo Diario en la Nube</h3>
                <p className="text-gray-400 text-sm">
                  Backups automáticos diarios garantizan que nunca pierdas tu información
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Sección de Precios */}
      <section id="precios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white scroll-mt-16 flex flex-col">
        <div className="w-full max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Elige el Plan Perfecto para Tu Negocio
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-7xl mx-auto">
              Gestiona tus préstamos de manera eficiente con nuestros planes diseñados para crecer contigo
            </p>
          </AnimatedSection>

          {/* Planes Mensuales (Bronce, Plata y Oro visibles; Inicial no visible) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12 max-w-7xl mx-auto">
            {['BRONCE', 'PLATA', 'ORO'].map((planId) => {
              const plan = PLANES[planId as keyof typeof PLANES]
              return (
                <AnimatedSection key={plan.id}>
                  <div
                    className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-gray-100 ${
                      plan.popular ? 'ring-4 ring-primary-500 ring-opacity-50' : ''
                    }`}
                  >
                    {/* Badge "Más Popular" */}
                    {plan.popular && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-bl-2xl z-10">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <Star className="w-4 h-4 fill-current" />
                          Más Popular
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Nombre del Plan */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.nombre}</h3>
                        <p className="text-gray-600 text-xs">{plan.descripcion}</p>
                      </div>

                      {/* Precio */}
                      <div className="mb-6">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-gray-900">
                            ${plan.precio}
                          </span>
                          <span className="text-gray-600 ml-2 text-sm">/{plan.periodo}</span>
                        </div>
                      </div>

                      {/* Características */}
                      <ul className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                        {plan.caracteristicas.map((caracteristica, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">{caracteristica}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Botón de Suscripción */}
                      <Link
                        href="/precios"
                        className={`block w-full text-center px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                          plan.popular
                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-md'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        Ver Plan
                      </Link>
                    </div>

                    {/* Barra de color inferior */}
                    <div className={`h-2 ${plan.color}`}></div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>

          {/* Plan Infinito Destacado */}
          <AnimatedSection>
            <div className="max-w-7xl mx-auto">
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-primary-400 bg-gradient-to-br from-white via-primary-50 to-primary-100">
                {/* Badge especial para Infinito */}
                <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-3 rounded-bl-3xl z-10">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Sparkles className="w-5 h-5 fill-current" />
                    <Infinity className="w-5 h-5" />
                    <span>Vitalicio</span>
                  </div>
                </div>

                <div className="p-8 md:p-10 pt-16">
                  {/* Nombre del Plan */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 mb-3">
                      <Infinity className="w-8 h-8 text-primary-600" />
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                        {PLANES.INFINITO.nombre}
                      </h3>
                    </div>
                    <p className="text-gray-700 text-lg">{PLANES.INFINITO.descripcion}</p>
                  </div>

                  {/* Precio destacado */}
                  <div className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-baseline justify-center">
                        <span className="text-5xl md:text-6xl font-bold text-white">
                          ${PLANES.INFINITO.precio}
                        </span>
                      </div>
                      <p className="text-primary-100 text-sm mt-2 font-semibold">Pago Único</p>
                      <p className="text-primary-200 text-xs mt-1">Sin renovaciones mensuales</p>
                    </div>
                  </div>

                  {/* Características */}
                  <ul className="space-y-3 mb-6">
                    {PLANES.INFINITO.caracteristicas.map((caracteristica, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-6 h-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-800 font-medium">{caracteristica}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Botón de Suscripción destacado */}
                  <Link
                    href="/precios?plan=INFINITO"
                    className="block w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-lg rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-center"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Adquirir Plan Infinito
                    </span>
                  </Link>

                  {/* Ahorro destacado */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-primary-700">
                        Ahorra más de $1,000 al año
                      </span>
                      {' '}comparado con planes mensuales
                    </p>
                  </div>
                </div>

                {/* Barra de color inferior con gradiente */}
                <div className="h-3 bg-gradient-to-r from-primary-500 to-primary-600"></div>
              </div>
            </div>
          </AnimatedSection>

          {/* Información adicional */}
          <AnimatedSection>
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">
                ¿Necesitas un plan personalizado?{' '}
                <a href="mailto:soporte@jasicorporations.com" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Contáctanos
                </a>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Todos los planes incluyen actualizaciones automáticas y soporte técnico
              </p>
              <Link
                href="/precios"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold"
              >
                Ver Todos los Planes
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-700 flex flex-col">
        <div className="max-w-7xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Listo para tomar el control total de tus préstamos?
            </h2>
            <p className="text-lg sm:text-xl text-primary-100 mb-8">
              Únete a JasiCorporations y transforma la manera en que gestionas tu negocio de préstamos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Prueba el Control Total Ahora
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/admin/mora')}
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-semibold text-lg flex items-center justify-center gap-2"
              >
                Ver Demo de Gestión de Mora
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer con elementos de seguridad */}
      <Footer />
    </div>
  )
}
