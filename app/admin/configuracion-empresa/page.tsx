'use client'

import { useEffect, useState } from 'react'
import { Building2, Car, Zap, FileText, Lock, CircleDollarSign } from 'lucide-react'
import { empresaInfoService } from '@/lib/services/empresaInfo'
import { CurrencySelector } from '@/components/CurrencySelector'
import { useFormatCurrency } from '@/lib/contexts/CurrencyContext'
import type { TipoNegocio } from '@/types'

const OPCIONES_TIPO_NEGOCIO: { value: TipoNegocio; label: string; desc: string }[] = [
  { value: 'prestamo_personal', label: 'Préstamo personal', desc: 'Productos como préstamos genéricos (valor, no. de préstamo).' },
  { value: 'dealer', label: 'Dealer (vehículos)', desc: 'Productos con Marca, Modelo, Año, Chasis, Color.' },
  { value: 'electro', label: 'Tienda de electrodomésticos', desc: 'Productos con Tipo de equipo, Marca, Serial, Garantía.' },
]

export default function ConfiguracionEmpresaPage() {
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [sinEmpresa, setSinEmpresa] = useState(false)
  const [empresaNombre, setEmpresaNombre] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    empresaInfoService.getTipoNegocio().then((tn) => {
      if (!cancelled) setTipoNegocio(tn)
      setLoading(false)
    })
    empresaInfoService.getEmpresaId().then((id) => {
      if (!cancelled && !id) setSinEmpresa(true)
    })
    empresaInfoService.getNombreEmpresa().then((n) => {
      if (!cancelled && n) setEmpresaNombre(n)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-200" />
          <div>
            <div className="h-6 w-56 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-80 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-64 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sinEmpresa) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-800 font-medium">No se pudo cargar la empresa.</p>
          <p className="text-amber-700 text-sm mt-1">Asegúrate de tener una empresa asignada en tu perfil.</p>
        </div>
      </div>
    )
  }

  const actual = OPCIONES_TIPO_NEGOCIO.find((o) => o.value === tipoNegocio)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const linkPortalCliente = empresaNombre
    ? `${baseUrl}/login?tipo=cliente&empresa=${encodeURIComponent(empresaNombre)}`
    : ''
  const linkSolicitudNuevo = empresaNombre
    ? `${baseUrl}/solicitud-prestamo?empresa=${encodeURIComponent(empresaNombre)}`
    : ''

  function compartirWhatsapp(link: string, tipo: string) {
    if (!link) return
    const txt = `Hola, este es tu enlace para ${tipo} en ${empresaNombre}:\n${link}`
    const wa = `https://wa.me/?text=${encodeURIComponent(txt)}`
    window.open(wa, '_blank')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de empresa</h1>
          <p className="text-sm text-gray-600">Tipo de negocio de tu empresa (definido al crear la cuenta).</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Lock className="w-4 h-4 text-gray-500" />
          Tipo de negocio
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Este valor se eligió al crear la cuenta y no se puede modificar. Define qué campos se muestran al agregar o editar productos.
        </p>
        {actual && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary-50 border border-primary-200">
            {actual.value === 'dealer' && <Car className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />}
            {actual.value === 'electro' && <Zap className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />}
            {actual.value === 'prestamo_personal' && <FileText className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold text-gray-900">{actual.label}</p>
              <p className="text-sm text-gray-600 mt-0.5">{actual.desc}</p>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500">
          Si necesitas otro tipo de negocio, contacta al administrador del sistema.
        </p>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <CircleDollarSign className="w-4 h-4 text-gray-500" />
          Moneda de visualización
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Cómo se muestran los montos en toda la aplicación (ventas, pagos, caja, etc.). La elección se guarda en este dispositivo.
        </p>
        <CurrencySelector />
        <p className="mt-3 text-xs text-gray-500">
          Ejemplo: <MonedaEjemplo />
        </p>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          Enlaces del Portal Cliente
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Comparte estos enlaces con tus clientes para que inicien sesión o soliciten crédito sin pedir UUID.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Login cliente</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={linkPortalCliente} readOnly className="flex-1 border rounded-md px-3 py-2 text-xs" />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(linkPortalCliente)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={() => compartirWhatsapp(linkPortalCliente, 'iniciar sesión')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Solicitud de crédito (cliente nuevo)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={linkSolicitudNuevo} readOnly className="flex-1 border rounded-md px-3 py-2 text-xs" />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(linkSolicitudNuevo)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={() => compartirWhatsapp(linkSolicitudNuevo, 'solicitar crédito')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MonedaEjemplo() {
  const formatCurrency = useFormatCurrency()
  return <span className="font-medium text-gray-700">{formatCurrency(1200)}</span>
}
