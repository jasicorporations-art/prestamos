'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, Users, MapPin, Phone, MessageCircle, Download, RefreshCw, Search } from 'lucide-react'
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
      alert('Error al cargar los datos de mora')
    } finally {
      setLoading(false)
    }
  }

  function generarMensajeCobro(cliente: ClienteMoroso): string {
    const mensaje = `Hola ${cliente.cliente_nombre}, te contactamos de ${EMPRESA.nombre}.\n\n` +
      `📋 *Recordatorio de Pago*\n\n` +
      `Tienes un pago pendiente por el préstamo de tu motor ${cliente.motor_marca || ''}.\n\n` +
      `💰 *Monto Pendiente:* $${cliente.montoPendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n` +
      `⚠️ *Días de Atraso:* ${cliente.diasAtraso} días\n` +
      `📊 *Total a Pagar (con mora):* $${cliente.totalDeuda.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n\n` +
      `Por favor, comunícate con nosotros para coordinar el pago. Gracias.`
    
    return encodeURIComponent(mensaje)
  }

  function abrirWhatsApp(cliente: ClienteMoroso) {
    if (!cliente.telefono || cliente.telefono === 'N/A') {
      alert('No hay teléfono disponible para este cliente')
      return
    }
    const mensaje = generarMensajeCobro(cliente)
    const url = generarUrlWhatsApp(cliente.telefono, mensaje)
    window.open(url, '_blank')
  }

  function llamar(telefono: string) {
    if (!telefono || telefono === 'N/A') {
      alert('No hay teléfono disponible para este cliente')
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
      doc.text(`Total en Riesgo: $${resumen.totalEnRiesgo.toLocaleString('es-DO')}`, 14, 36)
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
        cliente.diasAtraso.toString(),
        obtenerNombreNivelMora(cliente.nivelMora),
        `$${cliente.totalDeuda.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Cédula', 'Días Atraso', 'Nivel', 'Total Deuda']],
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando reporte de mora...</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total en Riesgo</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${resumen.totalEnRiesgo.toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Préstamos en Atraso</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {resumen.totalClientesEnAtraso}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sucursal más Afectada</p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {resumen.sucursalMasAfectada?.nombre || 'N/A'}
                </p>
                {resumen.sucursalMasAfectada && (
                  <p className="text-xs text-gray-500 mt-1">
                    ${resumen.sucursalMasAfectada.totalRiesgo.toLocaleString('es-DO')} - {resumen.sucursalMasAfectada.clientesAfectados} clientes
                  </p>
                )}
              </div>
              <MapPin className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Distribución por Nivel</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Temprana:</span>
                    <span className="font-semibold">{resumen.distribucionPorNivel.temprana.cantidad}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Media:</span>
                    <span className="font-semibold">{resumen.distribucionPorNivel.media.cantidad}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Crítica:</span>
                    <span className="font-semibold">{resumen.distribucionPorNivel.critica.cantidad}</span>
                  </div>
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          {esAdmin && (
            <>
              <select
                value={sucursalFiltro}
                onChange={(e) => setSucursalFiltro(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todas las Sucursales</option>
                {/* Las sucursales se cargarían aquí si fuera necesario */}
              </select>
            </>
          )}
          
          <select
            value={nivelFiltro}
            onChange={(e) => setNivelFiltro(e.target.value as NivelMora | '')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los Niveles</option>
            <option value="temprana">Mora Temprana (1-7 días)</option>
            <option value="media">Mora Media (8-30 días)</option>
            <option value="critica">Mora Crítica (+30 días)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Morosos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Morosos ({clientesFiltrados.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                {esAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días de Atraso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Pendiente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Deuda
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.map((cliente) => (
                <tr 
                  key={cliente.venta_id} 
                  className={`hover:bg-gray-50 border-l-4 ${obtenerClaseColorMora(cliente.nivelMora).replace('bg-', 'border-').split(' ')[0]}-500`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cliente.cliente_nombre}</div>
                    <div className="text-xs text-gray-500">{cliente.cliente_cedula || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cliente.telefono}
                  </td>
                  {esAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cliente.sucursal_nombre || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{cliente.diasAtraso}</div>
                    <div className="text-xs text-gray-500">{cliente.cuotasVencidas} cuota(s) vencida(s)</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${obtenerClaseColorMora(cliente.nivelMora)}`}>
                      {obtenerNombreNivelMora(cliente.nivelMora)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${cliente.montoPendiente.toLocaleString('es-DO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-red-600">
                      ${cliente.totalDeuda.toLocaleString('es-DO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    {cliente.montoMora > 0 && (
                      <div className="text-xs text-orange-600">
                        +${cliente.montoMora.toLocaleString('es-DO')} mora
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => llamar(cliente.telefono)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Llamar"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirWhatsApp(cliente)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
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
            <div className="text-center py-8 text-gray-500">
              No hay clientes en mora con los filtros seleccionados. Tu cartera está al día en este rango.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

