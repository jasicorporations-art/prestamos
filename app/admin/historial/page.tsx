'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Activity, Calendar, User, MapPin } from 'lucide-react'
import { Button } from '@/components/Button'
import { actividadService } from '@/lib/services/actividad'
import { perfilesService } from '@/lib/services/perfiles'
import type { ActividadLog } from '@/types'

export default function HistorialActividadPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<ActividadLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [verificandoPermisos, setVerificandoPermisos] = useState(true)
  const [limit, setLimit] = useState(100)

  const verificarPermisos = useCallback(async () => {
    try {
      setVerificandoPermisos(true)
      const tieneAccesoAdmin = await perfilesService.esAdmin()
      setIsAdmin(tieneAccesoAdmin)
      if (!tieneAccesoAdmin) {
        router.replace('/dashboard')
        return
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      router.replace('/dashboard')
    } finally {
      setVerificandoPermisos(false)
    }
  }, [router])

  useEffect(() => {
    verificarPermisos()
  }, [verificarPermisos])

  const loadHistorial = useCallback(async () => {
    try {
      setLoading(true)
      const data = await actividadService.getHistorial(limit)
      setLogs(data || [])
    } catch (error: any) {
      console.error('Error cargando historial:', error)
      if (error?.message?.includes('table') || error?.message?.includes('does not exist')) {
        alert('La tabla de historial aún no existe. Ejecuta el script SQL de multiusuario-sucursales.sql en Supabase.')
      } else {
        alert(`Error al cargar el historial: ${error?.message || 'Error desconocido'}`)
      }
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    if (isAdmin) {
      loadHistorial()
    }
  }, [isAdmin, loadHistorial])

  function formatDateTime(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch {
      return dateStr
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Resetear horas para comparar solo fechas
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

      if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Hoy'
      } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Ayer'
      } else {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        const dayName = date.toLocaleDateString('es-DO', { weekday: 'long' })
        const monthName = date.toLocaleDateString('es-DO', { month: 'long' })
        return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`
      }
    } catch {
      return dateStr
    }
  }

  function formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  function getDateKey(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    } catch {
      return dateStr
    }
  }

  // Agrupar logs por fecha
  const logsPorFecha = logs.reduce((acc, log) => {
    const fechaKey = getDateKey(log.fecha_hora)
    if (!acc[fechaKey]) {
      acc[fechaKey] = []
    }
    acc[fechaKey].push(log)
    return acc
  }, {} as Record<string, ActividadLog[]>)

  // Ordenar fechas (más recientes primero)
  const fechasOrdenadas = Object.keys(logsPorFecha).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })

  // Solo Admin y super_admin pueden ver esta página; vendedores son redirigidos al dashboard
  if (verificandoPermisos || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">
            {verificandoPermisos ? 'Verificando permisos...' : 'Redirigiendo...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Historial de Actividad
          </h1>
          <p className="text-gray-600">
            Registro cronológico de todas las acciones realizadas en el sistema
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Mostrar últimos:
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={50}>50 registros</option>
            <option value={100}>100 registros</option>
            <option value={200}>200 registros</option>
            <option value={500}>500 registros</option>
          </select>
          <Button
            variant="secondary"
            onClick={() => loadHistorial()}
            className="text-sm px-3 py-1"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Lista de actividad */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando historial...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No hay registros de actividad</p>
          <p className="text-sm text-gray-400">
            Los registros de actividad aparecerán aquí cuando los usuarios realicen acciones en el sistema.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            (Crear clientes, emitir créditos, registrar pagos, etc.)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {fechasOrdenadas.map((fechaKey) => {
            const logsDelDia = logsPorFecha[fechaKey]
            const fechaFormateada = formatDate(logsDelDia[0].fecha_hora)
            
            return (
              <div key={fechaKey} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Encabezado de fecha */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 border-b border-primary-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-3 text-white" />
                      <h2 className="text-lg font-semibold text-white">{fechaFormateada}</h2>
                    </div>
                    <span className="text-sm text-primary-100 bg-primary-700 px-3 py-1 rounded-full">
                      {logsDelDia.length} {logsDelDia.length === 1 ? 'actividad' : 'actividades'}
                    </span>
                  </div>
                </div>

                {/* Tabla de actividades del día */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sucursal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Detalle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logsDelDia.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatTime(log.fecha_hora)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {log.usuario_nombre || 'Usuario desconocido'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              {log.sucursal_nombre || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {log.accion}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.detalle || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Información adicional */}
      {logs.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Mostrando {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
        </div>
      )}
    </div>
  )
}

