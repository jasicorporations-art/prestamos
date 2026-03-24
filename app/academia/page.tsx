'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, FileText, DollarSign, Shield, BookOpen, MapPin, Users, UserPlus, Upload } from 'lucide-react'
import { Button } from '@/components/Button'

interface GuiaConfiguracion {
  id: string
  titulo: string
  icono: LucideIcon
  imagen: string
  alt: string
  pasos: string[]
  nota?: string
}

const GUIA_CONFIGURACION: GuiaConfiguracion[] = [
  {
    id: 'sucursal',
    titulo: 'Creación de Sucursal',
    icono: MapPin,
    imagen: 'CREACION DE SUCURSALES.jpg',
    alt: 'Captura del sistema JasiCorp mostrando el formulario de nueva sucursal: pestaña Sucursales visible en el menú, formulario Nueva Sucursal con campos Dirección y Teléfono. Permite segmentar la caja por localidad.',
    pasos: [
      'Ve a la pestaña Sucursales.',
      'Haz clic en Nueva Sucursal.',
      'Completa Dirección y Teléfono.',
    ],
    nota: 'Esto permite segmentar la caja por localidad.',
  },
  {
    id: 'usuarios',
    titulo: 'Gestión de Usuarios',
    icono: Users,
    imagen: 'CREACION DE USUARIO.jpg',
    alt: 'Captura del sistema JasiCorp mostrando la pantalla de creación de usuario: formulario para crear perfil con campo de correo electrónico y selector de rol. Opciones de rol: Admin (control total del sistema) o Vendedor (operatividad diaria limitada a su sucursal).',
    pasos: [
      'Crea un perfil con nombre y datos de acceso.',
      'Asigna un correo electrónico único al usuario.',
      'Elige el rol: Admin (control total) o Vendedor (operatividad diaria en su sucursal).',
    ],
  },
  {
    id: 'clientes',
    titulo: 'Alta de Clientes',
    icono: UserPlus,
    imagen: 'CLIENTES.jpg',
    alt: 'Captura del sistema JasiCorp mostrando el formulario de alta de clientes: campos para cédula, dirección y datos del Garante. Instrucción para blindar la seguridad del préstamo capturando identificación y datos de contacto del garante.',
    pasos: [
      'Captura la cédula del cliente.',
      'Registra la dirección completa.',
      'Completa los datos del Garante para blindar la seguridad del préstamo.',
    ],
  },
]

export default function AcademiaPage() {
  const router = useRouter()
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>('contratos')

  const articulos = {
    contratos: {
      titulo: 'Contratos',
      icono: FileText,
      color: 'from-blue-500 to-blue-600',
      contenido: [
        {
          titulo: 'Cómo generar el contrato de financiamiento',
          pasos: [
            'Navega a la sección de "Ventas" o "Nuevo Préstamo" en el menú principal.',
            'Selecciona el cliente y el vehículo que deseas financiar.',
            'Completa todos los datos del financiamiento: monto, cuotas, tipo de plazo, etc.',
            'Una vez creado el préstamo, ve a la pestaña "Amortización" en el Panel de Administración.',
            'Busca el préstamo en la lista y haz clic en el botón "Imprimir Contrato".',
            'El sistema generará automáticamente un PDF con el contrato legal blindado incluyendo garante, cláusulas de mora, y todas las condiciones.',
            'Guarda o imprime el contrato PDF para tus archivos legales.',
          ],
        },
        {
          titulo: 'Cómo generar la carta de saldo',
          pasos: [
            'Ve al Panel de Administración y abre la pestaña "Amortización".',
            'Busca el préstamo que está completamente pagado (saldo pendiente = $0).',
            'Verifica que todas las cuotas estén marcadas como "Pagadas".',
            'Haz clic en el botón "Generar Carta de Saldo".',
            'El sistema generará un PDF oficial certificando que el préstamo está completamente cancelado.',
            'Esta carta incluye un código de seguridad QR para verificación.',
            'Imprime y entrega la carta de saldo al cliente para liberar cualquier restricción sobre el vehículo.',
          ],
        },
      ],
    },
    finanzas: {
      titulo: 'Finanzas',
      icono: DollarSign,
      color: 'from-green-500 to-green-600',
      contenido: [
        {
          titulo: 'Manual para el arqueo de caja',
          pasos: [
            'Accede a la sección "Caja" desde el menú principal.',
            'En la parte superior verás el "Fondo Inicial" actual. Puedes actualizarlo haciendo clic en "Actualizar Fondo".',
            'El sistema muestra automáticamente: Ingresos del día (pagos recibidos) y Salidas registradas (gastos o retiros).',
            'El "Monto Esperado" se calcula como: Fondo Inicial + Ingresos - Salidas.',
            'Al final del día, haz clic en "Cerrar Caja" e ingresa el monto físico que tienes en efectivo.',
            'El sistema calculará la diferencia (sobrante o faltante) automáticamente.',
            'Revisa el cuadre diario. Si hay faltante, se generará una alerta para el administrador.',
            'Puedes imprimir el reporte de cierre haciendo clic en "Imprimir Reporte de Cierre".',
          ],
        },
        {
          titulo: 'Cómo registrar gastos diarios',
          pasos: [
            'Ve a la sección "Caja" y busca el área de "Movimientos de Caja".',
            'Haz clic en "Registrar Movimiento" y selecciona "Salida".',
            'Ingresa el monto del gasto y selecciona un concepto (combustible, materiales, servicios, etc.).',
            'Opcionalmente, agrega observaciones sobre el gasto.',
            'Confirma el movimiento. El sistema lo registrará y actualizará automáticamente el monto esperado.',
            'Todos los movimientos quedan registrados en el historial para auditoría.',
          ],
        },
        {
          titulo: 'Visualizar cajas de todas las sucursales (Solo Admin)',
          pasos: [
            'Como administrador, ve a "Admin" > "Cajas" en el menú.',
            'Verás el estado de todas las cajas de todas las sucursales en tiempo real.',
            'Puedes filtrar por período: Últimas 24 horas, 7 días, o 30 días.',
            'Cada caja muestra: monto de apertura, ingresos, salidas, monto esperado y diferencia.',
            'Las cajas cerradas aparecen con indicador visual y no pueden editarse.',
          ],
        },
      ],
    },
    seguridad: {
      titulo: 'Seguridad',
      icono: Shield,
      color: 'from-amber-500 to-amber-600',
      contenido: [
        {
          titulo: 'Cómo gestionar roles de vendedores',
          pasos: [
            'Ve a "Admin" > "Usuarios" en el menú (solo disponible para administradores).',
            'Verás una lista de todos los usuarios de tu empresa.',
            'Para crear un nuevo usuario, haz clic en "Nuevo Usuario" y completa el formulario.',
            'Asigna el rol: "Admin" (acceso completo) o "Vendedor" (acceso limitado a su sucursal).',
            'Selecciona la sucursal a la que pertenece el vendedor.',
            'Puedes activar o desactivar usuarios usando el botón "Activar/Desactivar Usuario".',
            'Los vendedores solo pueden ver y gestionar datos de su sucursal asignada.',
          ],
        },
        {
          titulo: 'Proteger el acceso a las sucursales',
          pasos: [
            'Los administradores pueden crear y gestionar sucursales en "Admin" > "Sucursales".',
            'Cada vendedor debe estar asignado a una sucursal específica en su perfil.',
            'Los vendedores solo pueden registrar pagos y ver clientes de su sucursal.',
            'Los administradores pueden ver todas las sucursales y gestionar cajas de cualquier ubicación.',
            'Cada movimiento queda registrado con el usuario y sucursal que lo realizó para auditoría.',
            'Usa la sección "Historial" para ver todas las actividades de los usuarios.',
          ],
        },
        {
          titulo: 'Cambiar contraseña',
          pasos: [
            'Ve a "Cambiar Contraseña" en el menú de usuario.',
            'Ingresa tu contraseña actual.',
            'Ingresa tu nueva contraseña (mínimo 6 caracteres).',
            'Confirma la nueva contraseña.',
            'Haz clic en "Cambiar Contraseña".',
          ],
        },
        {
          titulo: 'Recuperar contraseña olvidada',
          pasos: [
            'En la página de login, haz clic en "Recuperar Contraseña".',
            'Ingresa tu email registrado.',
            'Recibirás un email con un enlace para restablecer tu contraseña.',
            'Haz clic en el enlace del email y establece una nueva contraseña.',
          ],
        },
      ],
    },
  }

  const categorias = Object.keys(articulos) as Array<keyof typeof articulos>

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Button>
          </div>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Centro de Ayuda</h1>
          <p className="text-lg text-gray-600">
            Manuales completos para usar todas las funcionalidades de JasiCorporations
          </p>
        </div>

        {/* Guías de configuración inicial — para configurar la empresa antes de operar */}
        <section className="mb-12" aria-labelledby="guias-configuracion-titulo">
          <h2 id="guias-configuracion-titulo" className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Configura tu empresa en 3 pasos
          </h2>
          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            Sigue estas guías para dar de alta sucursales, usuarios y clientes antes de comenzar a operar.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {GUIA_CONFIGURACION.map((guia) => {
              const Icono = guia.icono
              return (
                <article
                  key={guia.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary-500 to-primary-600">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icono className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{guia.titulo}</h3>
                    </div>
                  </div>
                  <div className="relative aspect-video w-full bg-gray-100 overflow-hidden group">
                    <Image
                      src={`/${encodeURIComponent(guia.imagen)}`}
                      alt={guia.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 flex-1">
                    <ol className="space-y-2">
                      {guia.pasos.map((paso, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span>{paso}</span>
                        </li>
                      ))}
                    </ol>
                    {guia.nota && (
                      <p className="mt-3 text-sm text-primary-600 font-medium">{guia.nota}</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* CTA Migración e Importador Masivo */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-md p-6 sm:p-8 text-center border-2 border-primary-500">
            <Upload className="w-10 h-10 text-white mx-auto mb-3 opacity-90" />
            <h3 className="text-xl font-bold text-white mb-2">
              ¿Ya tienes un sistema previo?
            </h3>
            <p className="text-primary-100 text-lg mb-4 max-w-2xl mx-auto">
              No pierdas tiempo digitalizando; usa nuestro <strong className="text-white">Importador Masivo</strong> para subir clientes, garantes y préstamos activos de una sola vez.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard')}
              className="bg-white text-primary-700 hover:bg-primary-50 border-0"
            >
              Ir al Dashboard
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categorías */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Categorías</h2>
              <div className="space-y-2">
                {categorias.map((categoria) => {
                  const ArticuloIcono = articulos[categoria].icono
                  return (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaActiva(categoria)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        categoriaActiva === categoria
                          ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <ArticuloIcono className="w-5 h-5" />
                      <span className="font-medium">{articulos[categoria].titulo}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="lg:col-span-3">
            {categoriaActiva && articulos[categoriaActiva as keyof typeof articulos] && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${articulos[categoriaActiva as keyof typeof articulos].color} rounded-lg mb-6`}>
                  {(() => {
                    const Icono = articulos[categoriaActiva as keyof typeof articulos].icono
                    return <Icono className="w-6 h-6 text-white" />
                  })()}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  {articulos[categoriaActiva as keyof typeof articulos].titulo}
                </h2>

                <div className="space-y-8">
                  {articulos[categoriaActiva as keyof typeof articulos].contenido.map((articulo, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">{articulo.titulo}</h3>
                      <ol className="space-y-3">
                        {articulo.pasos.map((paso, pasoIndex) => (
                          <li key={pasoIndex} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                              {pasoIndex + 1}
                            </div>
                            <p className="text-gray-700 leading-relaxed flex-1">{paso}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


