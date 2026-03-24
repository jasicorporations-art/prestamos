'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, Users, MapPin, Phone, MessageCircle, Download, RefreshCw, Search } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/Button'
import { 
  obtenerClientesMorosos, 
  obtenerResumenMora,
  obtenerColorMora,
  obtenerNombreNivelMora,
  type ClienteMoroso,
  type ResumenMora,
  type NivelMora
} from '@/lib/services/reporteMora'
import { generarUrlWhatsApp } from '@/lib/services/whatsapp'
import { perfilesService } from '@/lib/services/perfiles'
import { EMPRESA } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils/currency'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function MoraPage() {
  const [clientesMorosos, setClientesMorosos] = useState<ClienteMoroso[]>([])
  const [resumen, setResumen] = useState<ResumenMora | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursalFiltro, setSucursalFiltro] = useState<string>('')
  const [nivelFiltro, setNivelFiltro] = useState<NivelMora | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [sucursalActual, setSucursalActual] = useState<string>('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleRefresh = () => loadData()
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadData() }
    window.addEventListener('dashboard:refresh-mora', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('dashboard:refresh-mora', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      // Verificar si es admin
      const admin = await perfilesService.esAdmin()
      setEsAdmin(admin)
      
      // Si no es admin, filtrar por sucursal
      const sucursalIdRaw = admin ? sucursalFiltro || undefined : await perfilesService.getSucursalActual()
      const sucursalId = sucursalIdRaw || undefined // Convertir null a undefined
      setSucursalActual(sucursalId || '')
      
      const [clientesData, resumenData] = await Promise.all([
        obtenerClientesMorosos(sucursalId),
        admin ? obtenerResumenMora() : null,
      ])
      
      setClientesMorosos(clientesData)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando datos de mora:', error)
      toast.error('Error al cargar los datos de mora')
    } finally {
      setLoading(false)
    }
  }

  function generarMensajeCobro(cliente: ClienteMoroso): string {
    const mensaje = `Hola ${cliente.cliente_nombre}, te contactamos de ${EMPRESA.nombre}.\n\n` +
      `📋 *Recordatorio de Pago*\n\n` +
      `Tienes un pago pendiente de tu Producto.\n\n` +
      `💰 *Monto pendiente:* $${formatCurrency(cliente.sumaCuotasVencidas)}\n` +
      `📌 *Total a pagar:* $${formatCurrency(cliente.totalAPagarCuotasVencidas)}\n` +
      `📊 *Valor del préstamo:* $${formatCurrency(cliente.montoPendiente)}\n` +
      `⚠️ *Días de atraso:* ${cliente.diasAtraso} días\n\n` +
      `Por favor, comunícate con nosotros para coordinar el pago. Gracias.`
    
    return encodeURIComponent(mensaje)
  }

  function abrirWhatsApp(cliente: ClienteMoroso) {
    if (!cliente.telefono || cliente.telefono === 'N/A') {
      toast.warning('No hay teléfono disponible para este cliente')
      return
    }
    const mensaje = generarMensajeCobro(cliente)
    const url = generarUrlWhatsApp(cliente.telefono, mensaje)
    window.open(url, '_blank')
  }

  function llamar(telefono: string) {
    if (!telefono || telefono === 'N/A') {
      toast.warning('No hay teléfono disponible para este cliente')
      return
    }
    window.location.href = `tel:${telefono}`
  }

  function descargarPDF() {
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-DO')
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte de Morosos', 14, 20)
    doc.setFontSize(12)
    doc.text(`Fecha: ${fecha}`, 14, 30)
    if (resumen) {
      doc.text(`Total en Riesgo: $${formatCurrency(resumen.totalEnRiesgo)}`, 14, 36)
      doc.text(`Préstamos en Atraso: ${resumen.totalClientesEnAtraso}`, 14, 42)
    }

    // Agrupar por sucursal
    const porSucursal = new Map<string, ClienteMoroso[]>()
    clientesFiltrados.forEach(cliente => {
      const sucursal = cliente.sucursal_nombre || 'Sin Sucursal'
      if (!porSucursal.has(sucursal)) {
        porSucursal.set(sucursal, [])
      }
      porSucursal.get(sucursal)!.push(cliente)
    })

    let yPos = 50

    porSucursal.forEach((clientes, sucursal) => {
      // Agregar espacio para nueva sección si es necesario
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      // Título de sucursal
      doc.setFontSize(14)
      doc.text(`Sucursal: ${sucursal}`, 14, yPos)
      yPos += 10

      // Tabla de clientes
      const tableData = clientes.map(cliente => [
        cliente.cliente_nombre,
        cliente.cliente_cedula || 'N/A',
        cliente.cuotasVencidas.toString(),
        obtenerNombreNivelMora(cliente.nivelMora),
        `$${formatCurrency(cliente.totalDeuda)}`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Cédula', 'Cuotas vencidas', 'Nivel', 'Total Deuda']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10
    })

    doc.save(`reporte-morosos-${fecha.replace(/\//g, '-')}.pdf`)
  }

  function obtenerClaseColorMora(nivel: NivelMora): string {
    switch (nivel) {
      case 'temprana':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'media':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'critica':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Filtrar clientes
  const clientesFiltrados = clientesMorosos.filter(cliente => {
    const matchSucursal = !sucursalFiltro || cliente.sucursal_id === sucursalFiltro
    const matchNivel = !nivelFiltro || cliente.nivelMora === nivelFiltro
    const matchSearch = !searchTerm.trim() || 
      cliente.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cliente_cedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefono.includes(searchTerm)
    
    return matchSucursal && matchNivel && matchSearch
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-56 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-72" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-gray-200 rounded-md" />
            <div className="h-9 w-36 bg-gray-200 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-28" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-6 bg-gray-100 rounded-full w-20" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="flex gap-2">
                <div className="h-7 w-7 bg-gray-100 rounded" />
                <div className="h-7 w-7 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-tour="gestion-mora">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Mora</h1>
          <p className="text-gray-600">Análisis de riesgo y gestión de pagos atrasados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={descargarPDF}>
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Resumen General */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total en Riesgo</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                ${formatCurrency(resumen.totalEnRiesgo)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En Atraso</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {resumen.totalClientesEnAtraso}
              </p>
              <p className="text-xs text-gray-400">préstamos</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Más Afectada</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                {resumen.sucursalMasAfectada?.nombre || 'N/A'}
              </p>
              {resumen.sucursalMasAfectada && (
                <p className="text-xs text-gray-400">
                  {resumen.sucursalMasAfectada.clientesAfectados} clientes
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por Nivel</p>
              <div className="mt-1 space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-600 font-medium">Temprana</span>
                  <span className="font-bold text-gray-800">{resumen.distribucionPorNivel.temprana.cantidad}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600 font-medium">Media</span>
                  <span className="font-bold text-gray-800">{resumen.distribucionPorNivel.media.cantidad}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-600 font-medium">Crítica</span>
                  <span className="font-bold text-gray-800">{resumen.distribucionPorNivel.critica.cantidad}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {esAdmin && (
            <select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Todas las Sucursales</option>
            </select>
          )}

          <select
            value={nivelFiltro}
            onChange={(e) => setNivelFiltro(e.target.value as NivelMora | '')}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los Niveles</option>
            <option value="temprana">Mora Temprana (1-7 días)</option>
            <option value="media">Mora Media (8-30 días)</option>
            <option value="critica">Mora Crítica (+30 días)</option>
          </select>
        </div>
      </div>

      {/* Lista de Morosos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Morosos
            <span className="ml-2 text-sm font-normal text-gray-500">({clientesFiltrados.length})</span>
          </h2>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {clientesFiltrados.map((cliente) => (
            <div key={cliente.venta_id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{cliente.cliente_nombre}</div>
                  <div className="text-xs text-gray-500">{cliente.cliente_cedula || 'N/A'} · {cliente.telefono}</div>
                  {esAdmin && cliente.sucursal_nombre && (
                    <div className="text-xs text-gray-400 mt-0.5">{cliente.sucursal_nombre}</div>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border flex-shrink-0 ${obtenerClaseColorMora(cliente.nivelMora)}`}>
                  {obtenerNombreNivelMora(cliente.nivelMora)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{cliente.cuotasVencidas} cuota(s) · {cliente.diasAtraso} días atraso</div>
                  <div className="text-sm font-bold text-red-600 mt-0.5">${formatCurrency(cliente.totalDeuda)} total</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => llamar(cliente.telefono)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar
                  </button>
                  <button
                    onClick={() => abrirWhatsApp(cliente)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WA
                  </button>
                </div>
              </div>
            </div>
          ))}
          {clientesFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500 px-4">
              No hay clientes en mora con los filtros seleccionados.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                {esAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuotas vencidas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto pendiente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deuda</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.venta_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cliente.cliente_nombre}</div>
                    <div className="text-xs text-gray-500">{cliente.cliente_cedula || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cliente.telefono}</td>
                  {esAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cliente.sucursal_nombre || 'N/A'}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{cliente.cuotasVencidas}</div>
                    <div className="text-xs text-gray-500">{cliente.diasAtraso} días atraso</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${obtenerClaseColorMora(cliente.nivelMora)}`}>
                      {obtenerNombreNivelMora(cliente.nivelMora)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">${formatCurrency(cliente.totalAPagarCuotasVencidas)}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(cliente.sumaCuotasVencidas)} + {formatCurrency(cliente.montoMora)} mora</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-red-600">${formatCurrency(cliente.totalDeuda)}</div>
                    <div className="text-xs text-gray-500">Saldo + mora</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => llamar(cliente.telefono)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Llamar"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirWhatsApp(cliente)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {clientesFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500 px-4">
              No hay clientes en mora con los filtros seleccionados. Tu cartera está al día en este rango.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

