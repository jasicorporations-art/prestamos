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
  { id: 'feature-admin', file: 'Panel Admin.jpg', desc: 'Motor de amortización y gestión de cartera activa.' },
  { id: 'feature-seguridad', file: 'Historial.jpg', desc: 'Auditoría y registro cronológico de cada movimiento.' },
] as const

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-rose-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                La manera más{' '}
                <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  inteligente
                </span>{' '}
                de gestionar tu empresa de préstamos
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Lleva el control de cobros, clientes, garantes y motores desde un solo lugar. Disponible en cualquier
                dispositivo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg hover:from-rose-700 hover:to-pink-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Comenzar Gratis
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:border-rose-600 hover:text-rose-600 transition-all font-semibold text-lg"
                >
                  Iniciar Sesión
                </button>
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
                        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg p-4">
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
                          <p className="text-xs text-rose-600 mt-1">Vence: 15/01</p>
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
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-rose-200 rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-200 rounded-full opacity-20 blur-2xl"></div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Problema y Solución */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              ¿Cansado de los cuadernos y los errores de cálculo?
            </h2>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              JasiCorporations automatiza el saldo pendiente y las cuotas, eliminando errores manuales y ahorrándote
              horas de trabajo. Todo se calcula automáticamente y se sincroniza en la nube.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <div className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">El Problema</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Cuadernos físicos propensos a errores</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Cálculos manuales que consumen tiempo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Pérdida de información importante</span>
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">La Solución</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Cálculos automáticos precisos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Todo en la nube, accesible 24/7</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Recordatorios automáticos</span>
                  </li>
                </ul>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Capacidades Core del Sistema */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
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

      {/* Características Clave */}
      <section id="funciones" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Características Clave</h2>
            <p className="text-xl text-gray-600">Todo lo que necesitas para gestionar tu negocio de préstamos</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Registro de Clientes',
                description: 'Gestiona toda la información de tus clientes y garantes en un solo lugar.',
              },
              {
                icon: FileText,
                title: 'Gestión de Clientes y Garantes',
                description: 'Mantén un registro completo y organizado de todos tus clientes y sus garantes.',
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
                <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
                  <div className="w-12 h-12 bg-gradient-to-r from-rose-600 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Precios */}
      <section id="precios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Planes que se Adaptan a Ti</h2>
            <p className="text-xl text-gray-600">Elige el plan perfecto para tu negocio</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {Object.values(PLANES)
              .filter((plan) => plan.id !== 'INICIAL')
              .map((plan) => (
              <AnimatedSection key={plan.id}>
                <div
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                    plan.popular ? 'ring-4 ring-rose-500 ring-opacity-50 relative' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-2 rounded-bl-2xl">
                      <span className="text-sm font-semibold">Más Popular</span>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.nombre}</h3>
                      <p className="text-gray-600 text-sm">{plan.descripcion}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">${plan.precio}</span>
                        <span className="text-gray-600 ml-2">/{plan.periodo}</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.caracteristicas.map((caracteristica, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="w-5 h-5 text-rose-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{caracteristica}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => router.push('/register')}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
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

      {/* Descarga App Android */}
      <DescargaAppAndroid />

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-rose-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Listo para organizar tu negocio?
            </h2>
            <p className="text-xl text-rose-100 mb-8">
              Únete a JasiCorporations hoy y transforma la manera en que gestionas tus préstamos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-white text-rose-600 rounded-lg hover:bg-gray-100 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent mb-4">
                JasiCorporations
              </h3>
              <p className="text-gray-400">
                La solución inteligente para gestionar tu empresa de préstamos.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <div className="space-y-2 text-gray-400">
                <a
                  href="mailto:jasicorporations@gmail.com"
                  className="flex items-center hover:text-rose-400 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  jasicorporations@gmail.com
                </a>
                <a
                  href="mailto:johnrijo@jasicorporations.com"
                  className="flex items-center hover:text-rose-400 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  johnrijo@jasicorporations.com
                </a>
                <a
                  href="mailto:soporte@jasicorporations.com"
                  className="flex items-center hover:text-rose-400 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  soporte@jasicorporations.com
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Enlaces</h4>
              <div className="space-y-2">
                <Link href="#funciones" className="block text-gray-400 hover:text-rose-400 transition-colors">
                  Funciones
                </Link>
                <Link href="#precios" className="block text-gray-400 hover:text-rose-400 transition-colors">
                  Precios
                </Link>
                <Link href="/login" className="block text-gray-400 hover:text-rose-400 transition-colors">
                  Iniciar Sesión
                </Link>
                <Link href="/register" className="block text-gray-400 hover:text-rose-400 transition-colors">
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

