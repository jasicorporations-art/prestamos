'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Plus, Edit, Trash2, AlertTriangle, Folder, Download, Printer, FileUp, Search, X, MoreVertical } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { ClienteForm } from '@/components/forms/ClienteForm'
import { AvatarCliente } from '@/components/AvatarCliente'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { clientesService } from '@/lib/services/clientes'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth'
import { perfilesService } from '@/lib/services/perfiles'
import { subscriptionService } from '@/lib/services/subscription'
import { calcularOpcionesCobro } from '@/lib/services/mora'
import { isOnline } from '@/lib/utils/offlineHelper'
import { rutasService } from '@/lib/services/rutas'
import type { Cliente, Ruta, Sucursal } from '@/types'
import type { PlanType } from '@/lib/config/planes'
import { toast } from '@/lib/toast'

export default function ClientesPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: companiaLoading, compania } = useCompania()
  const [clientes, setClientes] = useState<Cliente[]>(() => clientesService.getCachedClientes() || [])
  const [filtroLista, setFiltroLista] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCobrador, setIsCobrador] = useState(false)
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [clientePopoverId, setClientePopoverId] = useState<string | null>(null)
  const [mostrarCobroRapidoId, setMostrarCobroRapidoId] = useState<string | null>(null)
  const [montoCobroRapido, setMontoCobroRapido] = useState<string>('')
  const [guardandoCobroRapido, setGuardandoCobroRapido] = useState(false)
  const [montoSugeridoCobroRapido, setMontoSugeridoCobroRapido] = useState<number | null>(null)
  const [saldoPendienteCobroRapido, setSaldoPendienteCobroRapido] = useState<number | null>(null)
  const [cargandoMontoCobroRapido, setCargandoMontoCobroRapido] = useState(false)
  const [sucursalesById, setSucursalesById] = useState<Record<string, Sucursal>>({})
  const [rutasById, setRutasById] = useState<Record<string, Ruta>>({})
  const [rutaClienteByClienteId, setRutaClienteByClienteId] = useState<Record<string, string | null>>({})
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const badgePalette = useMemo(
    () => [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ],
    []
  )

  function colorIndexFromId(id: string): number {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return hash % badgePalette.length
  }

  useEffect(() => {
    verificarAdmin()
  }, [])

  useEffect(() => {
    const s = (searchParams.get('search') || searchParams.get('q') || '').trim()
    setFiltroLista(s)
  }, [searchParams])

  const clientesVisibles = useMemo(() => {
    const t = filtroLista.trim().toLowerCase()
    if (!t) return clientes
    const digits = filtroLista.replace(/\D/g, '')
    return clientes.filter((c) => {
      const nombre = (c.nombre_completo || '').toLowerCase()
      const garante = (c.nombre_garante || '').toLowerCase()
      const ced = String(c.cedula || '').replace(/\D/g, '')
      const cel = String(c.celular || '').replace(/\D/g, '')
      if (nombre.includes(t) || garante.includes(t)) return true
      if ((c.cedula || '').toLowerCase().includes(t)) return true
      if ((c.celular || '').toLowerCase().includes(t)) return true
      if (digits.length >= 2 && (ced.includes(digits) || cel.includes(digits))) return true
      return false
    })
  }, [clientes, filtroLista])

  // Cargar clientes solo cuando la compañía esté lista (evita race condition)
  useEffect(() => {
    if (!companiaLoading) {
      loadClientes()
    }
  }, [companiaLoading, compania])

  useEffect(() => {
    subscriptionService.getCurrentPlan().then(setPlanType)
  }, [])

  useEffect(() => {
    function onClickFuera(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setClientePopoverId(null)
        setMostrarCobroRapidoId(null)
        setMontoCobroRapido('')
        setMontoSugeridoCobroRapido(null)
        setSaldoPendienteCobroRapido(null)
      }
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  async function verificarAdmin() {
    try {
      const [esAdmin, esCobrador] = await Promise.all([
        perfilesService.esAdmin(),
        perfilesService.esCobrador(),
      ])
      setIsAdmin(esAdmin)
      setIsCobrador(esCobrador)
    } catch (error) {
      console.error('Error verificando rol:', error)
      setIsAdmin(false)
      setIsCobrador(false)
    }
  }

  async function loadClientes() {
    try {
      setLoading(true)
      const cached = clientesService.getCachedClientes()
      if (cached?.length) setClientes(cached)
      const data = await Promise.race([
        clientesService.getAll(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Tiempo agotado')), 15000)),
      ])
      setClientes(data)
      void cargarContextoSucursalRuta(data)
    } catch (error: any) {
      console.error('Error cargando clientes:', error)
      toast.error(error?.message || 'Error al cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  async function cargarContextoSucursalRuta(clientesData: Cliente[]) {
    try {
      const [sucursales, rutas] = await Promise.all([
        perfilesService.getSucursales(),
        rutasService.getAllRutas().catch(() => [] as Ruta[]),
      ])
      const sucMap: Record<string, Sucursal> = {}
      for (const s of sucursales) sucMap[s.id] = s
      setSucursalesById(sucMap)

      const rutaMap: Record<string, Ruta> = {}
      for (const r of rutas) rutaMap[r.id] = r
      setRutasById(rutaMap)

      const clienteIds = clientesData.map((c) => c.id).filter(Boolean)
      if (!clienteIds.length) {
        setRutaClienteByClienteId({})
        return
      }

      const { data: ventasRutas } = await supabase
        .from('ventas')
        .select('cliente_id, ruta_id, created_at')
        .in('cliente_id', clienteIds)
        .eq('status', 'active')
        .not('ruta_id', 'is', null)
        .order('created_at', { ascending: false })

      const routeByCliente: Record<string, string | null> = {}
      for (const row of (ventasRutas || []) as Array<{ cliente_id?: string; ruta_id?: string | null }>) {
        const cid = row.cliente_id
        if (!cid || routeByCliente[cid] != null) continue
        routeByCliente[cid] = row.ruta_id ?? null
      }
      setRutaClienteByClienteId(routeByCliente)
    } catch (e) {
      console.warn('No se pudo cargar contexto de sucursal/ruta para clientes:', e)
    }
  }

  function handleCreate() {
    setEditingCliente(null)
    setIsModalOpen(true)
  }

  function handleEdit(cliente: Cliente) {
    setEditingCliente(cliente)
    setIsModalOpen(true)
  }

  async function handleDeleteClick(cliente: Cliente) {
    // Validar que el cliente existe
    if (!cliente || !cliente.id) {
      toast.error('Cliente inválido. No se puede eliminar.')
      return
    }

    // Verificar que el usuario sea admin
    if (!isAdmin) {
      toast.warning('Solo los administradores pueden eliminar clientes.')
      return
    }

    // Abrir el modal de confirmación (ya no verificamos préstamos, se eliminan automáticamente)
    setAdminPassword('')
    setClienteToDelete(cliente)
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
    setClienteToDelete(null)
    setAdminPassword('')
  }

  async function handleConfirmDelete() {
    if (!clienteToDelete) {
      return
    }

    if (!adminPassword.trim()) {
      toast.warning('Ingresa tu contraseña de administrador para confirmar la eliminación')
      return
    }

    try {
      setDeleting(true)

      // Verificar que la contraseña del admin sea correcta
      const user = await authService.getCurrentUser()
      if (!user || !user.email) {
        throw new Error('No se pudo obtener la información del administrador')
      }

      // Verificar contraseña intentando hacer sign in
      try {
        await authService.signIn(user.email, adminPassword)
        // Si llegamos aquí, la contraseña es correcta y la sesión sigue activa
      } catch (signInError: any) {
        // Si falla el sign in, la contraseña es incorrecta
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('Email not confirmed') ||
            signInError.message?.includes('contraseña') ||
            signInError.message?.includes('password')) {
          throw new Error('Contraseña incorrecta. No se puede eliminar el cliente.')
        }
        throw new Error(`Error al verificar la contraseña: ${signInError.message || 'Error desconocido'}`)
      }

      // Si la contraseña es correcta, eliminar el cliente (y todos sus préstamos y pagos)
      await clientesService.eliminar(clienteToDelete.id)

      handleCloseDeleteModal()
      loadClientes()
      toast.success('Cliente eliminado correctamente')
    } catch (error: any) {
      console.error('Error eliminando cliente:', error)
      toast.error(error.message || 'Error al eliminar el cliente')
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingCliente(null)
  }

  function handleSuccess() {
    handleCloseModal()
    loadClientes()
  }

  async function handleGuardarCobroRapido(cliente: Cliente) {
    const monto = Number(montoCobroRapido)
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.warning('Ingresa un monto válido mayor que 0.')
      return
    }

    try {
      setGuardandoCobroRapido(true)
      const ventasCliente = await ventasService.getByCliente(cliente.id)
      const ventaActiva = ventasCliente
        .filter((v) => Number(v.saldo_pendiente || 0) > 0)
        .sort((a, b) => Number(b.saldo_pendiente || 0) - Number(a.saldo_pendiente || 0))[0]

      if (!ventaActiva) {
        toast.warning('Este cliente no tiene préstamos activos para cobrar.')
        return
      }

      const pagoCreado = await pagosService.create({
        venta_id: ventaActiva.id,
        monto,
        fecha_pago: new Date().toISOString(),
      })

      const online = isOnline()

      if (online) {
        // Enviar recibo automáticamente como hace PagoForm (email + WhatsApp)
        try {
          const session = await authService.getSession()
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

          // Email
          fetch('/api/enviar-recibo-email', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ pago_id: pagoCreado.id }),
          }).catch(() => {})

          // WhatsApp
          fetch('/api/enviar-recibo-whatsapp', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ pago_id: pagoCreado.id }),
          })
            .then(() => {})
            .catch(() => {})
        } catch (e) {
          console.warn('No se pudo enviar el recibo automáticamente:', e)
        }

        setTimeout(() => {
          try {
            window.open(`/pagos/${pagoCreado.id}/recibo?autoPrint=1`, '_blank')
          } catch {
            window.location.href = `/pagos/${pagoCreado.id}/recibo?autoPrint=1`
          }
        }, 100)
      }

      setClientePopoverId(null)
      setMostrarCobroRapidoId(null)
      setMontoCobroRapido('')
      setMontoSugeridoCobroRapido(null)
      setSaldoPendienteCobroRapido(null)
      await loadClientes()

      toast.success('Pago registrado correctamente.')
    } catch (error: any) {
      console.error('Error en cobro rápido:', error)
      toast.error(error?.message || 'No se pudo registrar el pago rápido.')
    } finally {
      setGuardandoCobroRapido(false)
    }
  }

  async function handleAbrirCobroRapido(cliente: Cliente) {
    if (mostrarCobroRapidoId === cliente.id) {
      setMostrarCobroRapidoId(null)
      setMontoCobroRapido('')
      setMontoSugeridoCobroRapido(null)
      setSaldoPendienteCobroRapido(null)
      return
    }

    try {
      setCargandoMontoCobroRapido(true)
      setMostrarCobroRapidoId(cliente.id)
      setMontoCobroRapido('')
      setMontoSugeridoCobroRapido(null)
      setSaldoPendienteCobroRapido(null)

      const ventasCliente = await ventasService.getByCliente(cliente.id)
      const ventaActiva = ventasCliente
        .filter((v) => Number(v.saldo_pendiente || 0) > 0)
        .sort((a, b) => Number(b.saldo_pendiente || 0) - Number(a.saldo_pendiente || 0))[0]

      if (!ventaActiva) return

      setSaldoPendienteCobroRapido(Number(ventaActiva.saldo_pendiente || 0))
      const opciones = await calcularOpcionesCobro(ventaActiva.id)
      const montoSugerido = Number(opciones.cuotaDelDia || 0)
      if (montoSugerido > 0) {
        setMontoSugeridoCobroRapido(montoSugerido)
        setMontoCobroRapido(montoSugerido.toFixed(2))
      }
    } catch (error) {
      console.warn('No se pudo calcular monto sugerido de cobro rápido:', error)
    } finally {
      setCargandoMontoCobroRapido(false)
    }
  }

  async function obtenerResumenPrestamos() {
    const formatDiaPago = (venta: any) => {
      if (venta?.tipo_pago === 'contado') {
        return 'Pago único'
      }
      switch (venta?.tipo_plazo) {
        case 'diario':
          return 'Diario'
        case 'semanal': {
          const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
          const index = typeof venta?.dia_pago_semanal === 'number' ? venta.dia_pago_semanal : null
          return index !== null && index >= 0 && index <= 6
            ? `Semanal (${dias[index]})`
            : 'Semanal'
        }
        case 'quincenal':
          return venta?.fecha_inicio_quincenal
            ? `Quincenal (inicio ${venta.fecha_inicio_quincenal})`
            : 'Quincenal'
        case 'mensual':
          return venta?.dia_pago_mensual
            ? `Mensual (día ${venta.dia_pago_mensual})`
            : 'Mensual'
        default:
          return ''
      }
    }
    const formatMontoCuota = (venta: any, cuotaFijaPorVentaId: Map<string, number>) => {
      const montoTotal = Number(venta?.monto_total || 0)
      const cuotas = Number(venta?.cantidad_cuotas || 0)
      const cuotaFija = cuotaFijaPorVentaId.get(venta?.id || '') || 0
      if (venta?.tipo_pago === 'contado') {
        return `Pago único $${montoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
      }
      if (!cuotas || cuotas <= 0) {
        return ''
      }
      const montoCuota = cuotaFija > 0 ? cuotaFija : montoTotal / cuotas
      return `$${montoCuota.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
    }

    const resumen = await Promise.all(
      clientes.map(async (cliente) => {
        const ventas = await ventasService.getByCliente(cliente.id)
        const cuotaFijaPorVentaId = new Map<string, number>()
        const ventaIds = ventas.map((venta) => venta.id)
        if (ventaIds.length > 0) {
          const { data: cuotasData } = await supabase
            .from('cuotas_detalladas')
            .select('venta_id, cuota_fija')
            .in('venta_id', ventaIds)
            .order('numero_cuota', { ascending: true })
          ;((cuotasData || []) as { venta_id: string; cuota_fija?: number }[]).forEach((cuota) => {
            if (!cuotaFijaPorVentaId.has(cuota.venta_id)) {
              cuotaFijaPorVentaId.set(cuota.venta_id, Number(cuota.cuota_fija || 0))
            }
          })
        }
        const vigentes = ventas.filter((venta) => (venta.saldo_pendiente || 0) > 0)
        const saldados = ventas.filter((venta) => (venta.saldo_pendiente || 0) <= 0)
        const mapPrestamo = (venta: any) => venta.numero_prestamo || venta.id
        const diasPagoVigentes = Array.from(
          new Set(vigentes.map(formatDiaPago).filter(Boolean))
        )
        const montosCuotaVigentes = vigentes
          .map((venta) => formatMontoCuota(venta, cuotaFijaPorVentaId))
          .filter(Boolean)
        const cuotasVigentes = await Promise.all(
          vigentes.map(async (venta) => {
            try {
              const pagos = await pagosService.getByVenta(venta.id, 1000)
              const cuotasPagadasSet = new Set(
                (pagos || [])
                  .map((p) => p.numero_cuota)
                  .filter((n) => n !== null && n !== undefined)
              )
              const cuotasPagadas = cuotasPagadasSet.size
              const totalCuotas = Number(venta.cantidad_cuotas || 0)
              const cuotasPendientes = Math.max(0, totalCuotas - cuotasPagadas)
              return { cuotasPagadas, cuotasPendientes, totalCuotas }
            } catch (error) {
              console.warn('⚠️ Error obteniendo cuotas por venta:', error)
              const totalCuotas = Number(venta.cantidad_cuotas || 0)
              return { cuotasPagadas: 0, cuotasPendientes: totalCuotas, totalCuotas }
            }
          })
        )
        const cuotasPagadasVigentes = cuotasVigentes.map((c) => `${c.cuotasPagadas}/${c.totalCuotas}`)
        const cuotasPendientesVigentes = cuotasVigentes.map((c) => String(c.cuotasPendientes))
        const montoTomadoTotal = ventas.reduce((sum, venta) => sum + (venta.monto_total || 0), 0)
        const montoAdeudadoTotal = ventas.reduce((sum, venta) => sum + (venta.saldo_pendiente || 0), 0)
        return {
          cliente,
          prestamosVigentes: vigentes.map(mapPrestamo),
          prestamosSaldados: saldados.map(mapPrestamo),
          diasPagoVigentes,
          montosCuotaVigentes,
          cuotasPagadasVigentes,
          cuotasPendientesVigentes,
          montoTomadoTotal,
          montoAdeudadoTotal,
        }
      })
    )
    return resumen
  }

  async function exportarClientesCSV(tipo?: 'vigentes' | 'saldados') {
    try {
      if (planType === 'PLATA') {
        toast.warning('El Plan Plata solo permite exportar en PDF. Actualiza tu plan para exportar en CSV/Excel.')
        return
      }
      if (!isAdmin) {
        toast.warning('Solo los administradores pueden exportar clientes.')
        return
      }
      if (!clientes.length) {
        toast.warning('No hay clientes para exportar')
        return
      }
      setIsExporting(true)
      if (isAdmin) {
        try {
          const { actividadService } = await import('@/lib/services/actividad')
          const sufijo = tipo ? ` (${tipo})` : ''
          await actividadService.registrarActividad(
            'Exportó clientes',
            `Descargó el listado de clientes${sufijo} en CSV`,
            'clientes',
            undefined
          )
        } catch (error) {
          console.warn('⚠️ Error registrando actividad de exportación CSV:', error)
        }
      }
      const resumen = await obtenerResumenPrestamos()
      const resumenFiltrado = tipo
        ? resumen.filter(({ prestamosVigentes, prestamosSaldados }) =>
            tipo === 'vigentes' ? prestamosVigentes.length > 0 : prestamosSaldados.length > 0
          )
        : resumen
      const headers = [
        'No. de Préstamo Cliente',
        'Nombre Completo',
        'Cédula',
        'Celular',
        'Dirección',
        'Garante',
        'Dirección Garante',
        'Teléfono Garante',
        'Fecha de Inicio',
        'Fin Producto',
        'Día Pagos',
        'Monto Cuota',
        'Cuotas Pagadas',
        'Cuotas Pendientes',
        'Monto Tomado',
        'Monto Adeudado',
        'Préstamos Vigentes',
        'Préstamos Saldados',
      ]
      const rows = resumenFiltrado.map(({ cliente, prestamosVigentes, prestamosSaldados, diasPagoVigentes, montosCuotaVigentes, cuotasPagadasVigentes, cuotasPendientesVigentes, montoTomadoTotal, montoAdeudadoTotal }) => [
        prestamosVigentes.length ? prestamosVigentes.join(' | ') : (cliente.numero_prestamo_cliente || ''),
        cliente.nombre_completo || '',
        cliente.cedula || '',
        cliente.celular || '',
        cliente.direccion || '',
        cliente.nombre_garante || '',
        (cliente as any).direccion_garante || '',
        (cliente as any).telefono_garante || '',
        cliente.fecha_compra || '',
        cliente.fecha_finalizacion_prestamo || '',
        diasPagoVigentes.length ? diasPagoVigentes.join(' | ') : (cliente.dia_pagos ? `Día ${cliente.dia_pagos}` : ''),
        montosCuotaVigentes.length ? montosCuotaVigentes.join(' | ') : '',
        cuotasPagadasVigentes.length ? cuotasPagadasVigentes.join(' | ') : '',
        cuotasPendientesVigentes.length ? cuotasPendientesVigentes.join(' | ') : '',
        montoTomadoTotal,
        montoAdeudadoTotal,
        prestamosVigentes.join(' | '),
        prestamosSaldados.join(' | '),
      ])
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const suffix = tipo ? `-${tipo}` : ''
      link.setAttribute('download', `clientes${suffix}-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Error exportando clientes:', error)
      toast.error(error.message || 'No se pudo exportar')
    } finally {
      setIsExporting(false)
    }
  }

  async function imprimirClientes() {
    try {
      if (!isAdmin) {
        toast.warning('Solo los administradores pueden imprimir clientes.')
        return
      }
      if (!clientes.length) {
        toast.warning('No hay clientes para imprimir')
        return
      }
      setIsPrinting(true)
      if (isAdmin) {
        try {
          const { actividadService } = await import('@/lib/services/actividad')
          await actividadService.registrarActividad(
            'Imprimió clientes',
            'Imprimió el listado de clientes',
            'clientes',
            undefined
          )
        } catch (error) {
          console.warn('⚠️ Error registrando actividad de impresión:', error)
        }
      }
      const resumen = await obtenerResumenPrestamos()
      const ventana = window.open('', '_blank')
      if (!ventana) return
      const filas = resumen
        .map(({ cliente, prestamosVigentes, prestamosSaldados, diasPagoVigentes, montosCuotaVigentes, cuotasPagadasVigentes, cuotasPendientesVigentes, montoTomadoTotal, montoAdeudadoTotal }) => {
          return `
            <tr>
              <td>${prestamosVigentes.length ? prestamosVigentes.join(' | ') : (cliente.numero_prestamo_cliente || '')}</td>
              <td>${cliente.nombre_completo || ''}</td>
              <td>${cliente.cedula || ''}</td>
              <td>${cliente.celular || ''}</td>
              <td>${cliente.direccion || ''}</td>
              <td>${cliente.nombre_garante || ''}</td>
              <td>${(cliente as any).direccion_garante || ''}</td>
              <td>${(cliente as any).telefono_garante || ''}</td>
              <td>${cliente.fecha_compra || ''}</td>
              <td>${cliente.fecha_finalizacion_prestamo || ''}</td>
              <td>${diasPagoVigentes.length ? diasPagoVigentes.join(' | ') : (cliente.dia_pagos ? `Día ${cliente.dia_pagos}` : '')}</td>
              <td>${montosCuotaVigentes.length ? montosCuotaVigentes.join(' | ') : ''}</td>
              <td>${cuotasPagadasVigentes.length ? cuotasPagadasVigentes.join(' | ') : ''}</td>
              <td>${cuotasPendientesVigentes.length ? cuotasPendientesVigentes.join(' | ') : ''}</td>
              <td>${montoTomadoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              <td>${montoAdeudadoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
              <td>${prestamosVigentes.join(' | ')}</td>
              <td>${prestamosSaldados.join(' | ')}</td>
            </tr>
          `
        })
        .join('')
      ventana.document.write(`
        <html>
          <head>
            <title>Listado de Clientes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #ddd; padding: 6px; font-size: 11px; }
              th { background: #f3f4f6; text-align: left; }
            </style>
          </head>
          <body>
            <h2>Listado de Clientes</h2>
            <table>
              <thead>
                <tr>
                  <th>No. de Préstamo</th>
                  <th>Nombre Completo</th>
                  <th>Cédula</th>
                  <th>Celular</th>
                  <th>Dirección</th>
                  <th>Garante</th>
                  <th>Dirección Garante</th>
                  <th>Teléfono Garante</th>
                  <th>Fecha Inicio</th>
                  <th>Fin Producto</th>
                  <th>Día Pagos</th>
                  <th>Monto Cuota</th>
                  <th>Cuotas Pagadas</th>
                  <th>Cuotas Pendientes</th>
                  <th>Monto Tomado</th>
                  <th>Monto Adeudado</th>
                  <th>Préstamos Vigentes</th>
                  <th>Préstamos Saldados</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </body>
        </html>
      `)
      ventana.document.close()
      ventana.focus()
      ventana.print()
    } catch (error: any) {
      console.error('Error imprimiendo clientes:', error)
      toast.error(error.message || 'No se pudo imprimir')
    } finally {
      setIsPrinting(false)
    }
  }

  async function exportarClientesPDF() {
    try {
      if (!isAdmin) {
        toast.warning('Solo los administradores pueden exportar clientes.')
        return
      }
      if (!clientes.length) {
        toast.warning('No hay clientes para exportar')
        return
      }
      setIsExporting(true)
      if (isAdmin) {
        try {
          const { actividadService } = await import('@/lib/services/actividad')
          await actividadService.registrarActividad(
            'Exportó clientes',
            'Descargó el listado de clientes en PDF',
            'clientes',
            undefined
          )
        } catch (error) {
          console.warn('⚠️ Error registrando actividad de exportación PDF:', error)
        }
      }
      const resumen = await obtenerResumenPrestamos()
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(12)
      doc.text('Listado de Clientes', 14, 12)
      const body = resumen.map(({ cliente, prestamosVigentes, prestamosSaldados, diasPagoVigentes, montosCuotaVigentes, cuotasPagadasVigentes, cuotasPendientesVigentes, montoTomadoTotal, montoAdeudadoTotal }) => [
        prestamosVigentes.length ? prestamosVigentes.join(' | ') : (cliente.numero_prestamo_cliente || ''),
        cliente.nombre_completo || '',
        cliente.cedula || '',
        cliente.celular || '',
        cliente.direccion || '',
        cliente.nombre_garante || '',
        (cliente as any).direccion_garante || '',
        (cliente as any).telefono_garante || '',
        cliente.fecha_compra || '',
        cliente.fecha_finalizacion_prestamo || '',
        diasPagoVigentes.length ? diasPagoVigentes.join(' | ') : (cliente.dia_pagos ? `Día ${cliente.dia_pagos}` : ''),
        montosCuotaVigentes.length ? montosCuotaVigentes.join(' | ') : '',
        cuotasPagadasVigentes.length ? cuotasPagadasVigentes.join(' | ') : '',
        cuotasPendientesVigentes.length ? cuotasPendientesVigentes.join(' | ') : '',
        montoTomadoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
        montoAdeudadoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
        prestamosVigentes.join(' | '),
        prestamosSaldados.join(' | '),
      ])
      autoTable(doc, {
        head: [[
          'No. Préstamo',
          'Nombre Completo',
          'Cédula',
          'Celular',
          'Dirección',
          'Garante',
          'Dirección Garante',
          'Teléfono Garante',
          'Fecha Inicio',
          'Fin Producto',
          'Día Pagos',
          'Monto Cuota',
          'Cuotas Pagadas',
          'Cuotas Pendientes',
          'Monto Tomado',
          'Monto Adeudado',
          'Vigentes',
          'Saldados',
        ]],
        body,
        startY: 18,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [241, 245, 249] },
      })
      doc.save(`clientes-${Date.now()}.pdf`)
    } catch (error: any) {
      console.error('Error exportando PDF:', error)
      toast.error(error.message || 'No se pudo exportar PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={filtroLista}
                onChange={(e) => setFiltroLista(e.target.value)}
                placeholder="Filtrar por nombre, cédula, celular…"
                className="pl-9 pr-8"
              />
              {filtroLista.trim() && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Limpiar filtro"
                  onClick={() => {
                    setFiltroLista('')
                    router.replace('/clientes', { scroll: false })
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => router.push('/clientes/importar')}
            >
              <FileUp className="w-5 h-5 mr-2 inline" />
              Importar CSV
            </Button>
          )}
          {/* Plan Plata: solo exportar en PDF; Oro/Infinito: CSV y PDF */}
          {planType !== 'PLATA' && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportarClientesCSV()}
                disabled={isExporting || !isAdmin}
              >
                <Download className="w-5 h-5 mr-2 inline" />
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportarClientesCSV('vigentes')}
                disabled={isExporting || !isAdmin}
              >
                <Download className="w-5 h-5 mr-2 inline" />
                Exportar Vigentes
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportarClientesCSV('saldados')}
                disabled={isExporting || !isAdmin}
              >
                <Download className="w-5 h-5 mr-2 inline" />
                Exportar Saldados
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={exportarClientesPDF}
            disabled={isExporting || !isAdmin}
          >
            <Download className="w-5 h-5 mr-2 inline" />
            PDF
          </Button>
          <Button
            variant="secondary"
            onClick={imprimirClientes}
            disabled={isPrinting || !isAdmin}
          >
            <Printer className="w-5 h-5 mr-2 inline" />
            {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
          </Button>
          {!isCobrador && (
            <Button onClick={handleCreate}>
              <Plus className="w-5 h-5 mr-2 inline" />
              Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      {(companiaLoading || loading) ? (
        <div className="animate-pulse space-y-2">
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
              {['w-24','w-40','w-20','w-24','w-20','w-20','w-20','w-32','w-28','w-16'].map((w, i) => (
                <div key={i} className={`h-3 ${w} bg-gray-200 rounded`} />
              ))}
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                <div className="w-16 h-4 bg-gray-100 rounded" />
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3.5 w-36 bg-gray-200 rounded" />
                    <div className="h-2.5 w-24 bg-gray-100 rounded-full" />
                  </div>
                </div>
                <div className="w-24 h-3 bg-gray-100 rounded" />
                <div className="w-24 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="w-16 h-3 bg-gray-100 rounded" />
                <div className="w-28 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-100" />
                  <div className="w-7 h-7 rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. de Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Día Pagos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientesVisibles.map((cliente) => {
                  const formatDate = (dateStr?: string) => {
                    if (!dateStr) return 'N/A'
                    const date = new Date(dateStr)
                    const day = String(date.getDate()).padStart(2, '0')
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const year = date.getFullYear()
                    return `${day}/${month}/${year}`
                  }
                  
                  return (
                    <tr key={cliente.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {cliente.numero_prestamo_cliente || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div
                          className="relative flex items-center gap-3"
                          ref={clientePopoverId === cliente.id ? popoverRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (clientePopoverId === cliente.id) {
                                setClientePopoverId(null)
                                setMostrarCobroRapidoId(null)
                                setMontoCobroRapido('')
                                setMontoSugeridoCobroRapido(null)
                                setSaldoPendienteCobroRapido(null)
                              } else {
                                setClientePopoverId(cliente.id)
                                setMostrarCobroRapidoId(null)
                                setMontoCobroRapido('')
                                setMontoSugeridoCobroRapido(null)
                                setSaldoPendienteCobroRapido(null)
                              }
                            }}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
                            title="Acciones rápidas y expediente"
                          >
                            <AvatarCliente
                              nombreCompleto={cliente.nombre_completo ?? ''}
                              fotoUrl={cliente.foto_url}
                              size="md"
                            />
                          </button>
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <div className="min-w-0">
                              <span className="truncate block">{cliente.nombre_completo}</span>
                              {(() => {
                                const sucursalId = (cliente as any).sucursal_id as string | undefined
                                const rutaId = rutaClienteByClienteId[cliente.id] || undefined
                                const nombreSucursal = sucursalId ? (sucursalesById[sucursalId]?.nombre || 'Sucursal') : 'Sin sucursal'
                                const nombreRuta = rutaId ? (rutasById[rutaId]?.nombre || rutaId.slice(0, 6)) : null
                                const colorClass = sucursalId
                                  ? badgePalette[colorIndexFromId(sucursalId)]
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                                return (
                                  <span
                                    className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}
                                    title={nombreRuta ? `${nombreSucursal} | ${nombreRuta}` : nombreSucursal}
                                  >
                                    {nombreRuta ? `${nombreSucursal} | ${nombreRuta}` : nombreSucursal}
                                  </span>
                                )
                              })()}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (clientePopoverId === cliente.id) {
                                  setClientePopoverId(null)
                                  setMostrarCobroRapidoId(null)
                                  setMontoCobroRapido('')
                                  setMontoSugeridoCobroRapido(null)
                                  setSaldoPendienteCobroRapido(null)
                                } else {
                                  setClientePopoverId(cliente.id)
                                  setMostrarCobroRapidoId(null)
                                  setMontoCobroRapido('')
                                  setMontoSugeridoCobroRapido(null)
                                  setSaldoPendienteCobroRapido(null)
                                }
                              }}
                              className="shrink-0 p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              title="Acciones rápidas (cobrar, préstamo, editar)"
                              aria-label="Acciones rápidas"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                            {clientePopoverId === cliente.id && (
                              <div className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_18px_40px_-14px_rgba(15,23,42,0.35)]">
                            <div className="px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Accesos rápidos</p>
                              <p className="text-xs text-slate-400 truncate">{cliente.nombre_completo}</p>
                              <button
                                type="button"
                                className="mt-2 w-full min-w-0 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors text-center leading-snug"
                                onClick={() => {
                                  setClientePopoverId(null)
                                  setMostrarCobroRapidoId(null)
                                  setMontoCobroRapido('')
                                  setMontoSugeridoCobroRapido(null)
                                  setSaldoPendienteCobroRapido(null)
                                  router.push(`/clientes/${cliente.id}`)
                                }}
                              >
                                <Folder className="w-4 h-4" />
                                Ver expediente (carpeta)
                              </button>
                            </div>
                            <div className="p-3 space-y-3">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                className="w-full min-w-0 text-xs font-semibold px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-center leading-snug"
                                onClick={() => handleAbrirCobroRapido(cliente)}
                              >
                                Cobrar
                              </button>
                              <button
                                type="button"
                                className="w-full min-w-0 text-xs font-semibold px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors text-center leading-snug"
                                onClick={() => {
                                  setClientePopoverId(null)
                                  setMostrarCobroRapidoId(null)
                                  setMontoCobroRapido('')
                                  setMontoSugeridoCobroRapido(null)
                                  setSaldoPendienteCobroRapido(null)
                                  router.push(`/ventas/nuevo?cliente_id=${cliente.id}`)
                                }}
                              >
                                Nuevo préstamo
                              </button>
                              <button
                                type="button"
                                className="w-full min-w-0 text-xs font-semibold px-3 py-2.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors text-center leading-snug"
                                onClick={() => {
                                  setClientePopoverId(null)
                                  setMostrarCobroRapidoId(null)
                                  setMontoCobroRapido('')
                                  setMontoSugeridoCobroRapido(null)
                                  setSaldoPendienteCobroRapido(null)
                                  handleEdit(cliente)
                                }}
                              >
                                Ver / editar
                              </button>
                            </div>

                            {mostrarCobroRapidoId === cliente.id && (
                              <div className="pt-1 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                <div className="text-[11px] text-slate-600">
                                  {cargandoMontoCobroRapido
                                    ? 'Calculando monto sugerido...'
                                    : montoSugeridoCobroRapido != null
                                      ? `Monto sugerido: $${montoSugeridoCobroRapido.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : 'No se pudo calcular monto sugerido.'}
                                  {saldoPendienteCobroRapido != null && (
                                    <span className="block text-slate-500 mt-0.5">
                                      Saldo pendiente: ${saldoPendienteCobroRapido.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Monto"
                                    value={montoCobroRapido}
                                    onChange={(e) => setMontoCobroRapido(e.target.value)}
                                    className="h-9 text-sm bg-white border-slate-300"
                                  />
                                  <Button
                                    onClick={() => handleGuardarCobroRapido(cliente)}
                                    disabled={guardandoCobroRapido || cargandoMontoCobroRapido}
                                    className="h-9 px-3 text-xs bg-slate-900 hover:bg-slate-800"
                                  >
                                    {guardandoCobroRapido ? 'Guardando...' : 'Guardar'}
                                  </Button>
                                </div>
                              </div>
                            )}
                            </div>
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cliente.cedula}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cliente.celular || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(cliente.fecha_compra)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(cliente.fecha_finalizacion_prestamo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cliente.dia_pagos ? `Día ${cliente.dia_pagos}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {cliente.direccion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cliente.nombre_garante}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/clientes/${cliente.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Ver Expediente Digital"
                      >
                        <Folder className="w-5 h-5 inline" />
                      </button>
                      {!isCobrador && (
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                          title="Editar Cliente"
                        >
                          <Edit className="w-5 h-5 inline" />
                        </button>
                      )}
                      {isAdmin && !isCobrador && (
                        <button
                          onClick={() => handleDeleteClick(cliente)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-5 h-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            {clientes.length > 0 && clientesVisibles.length === 0 && (
              <div className="text-center py-8 text-amber-800 bg-amber-50 px-4 border-t border-amber-100">
                Ningún cliente coincide con «{filtroLista}». Prueba otro nombre, cédula o teléfono.
              </div>
            )}
            {clientes.length === 0 && (
              <div className="text-center py-8 text-gray-500 px-4">
                Aún no tienes clientes en tu cartera. Agrega tu primer cliente con el botón de arriba; así podrás emitir financiamientos y hacer crecer tu negocio.
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <ClienteForm
          cliente={editingCliente}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Eliminar Cliente"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold mb-2">
              Esta acción no se puede deshacer
            </p>
            <p className="text-sm text-red-700">
              El cliente, todos sus préstamos y todos los pagos asociados serán eliminados permanentemente del sistema.
            </p>
          </div>

          {clienteToDelete && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Cliente a eliminar:</strong>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Nombre:</strong> {clienteToDelete.nombre_completo}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Cédula:</strong> {clienteToDelete.cedula}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Celular:</strong> {clienteToDelete.celular || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Dirección:</strong> {clienteToDelete.direccion}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña de Administrador <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Ingresa tu contraseña para confirmar"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Por seguridad, debes ingresar tu contraseña de administrador para confirmar la eliminación.
            </p>
          </div>

          <div className="btn-actions">
            <Button 
              variant="secondary" 
              onClick={handleCloseDeleteModal}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              disabled={deleting || !adminPassword.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


