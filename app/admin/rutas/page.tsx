'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Plus, Route, ChevronDown, ShieldAlert, Edit } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { rutasService } from '@/lib/services/rutas'
import { perfilesService } from '@/lib/services/perfiles'
import { ventasService } from '@/lib/services/ventas'
import { supabase } from '@/lib/supabase'
import type { Ruta, Venta } from '@/types'
import type { Sucursal } from '@/types'

export default function RutasAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nombreRuta, setNombreRuta] = useState('')
  const [descripcionRuta, setDescripcionRuta] = useState('')
  const [ventasActivas, setVentasActivas] = useState<Venta[]>([])
  const [rutaExpandida, setRutaExpandida] = useState<string | null>(null)
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null)
  const [editNombreRuta, setEditNombreRuta] = useState('')
  const [editDescripcionRuta, setEditDescripcionRuta] = useState('')

  const loadRutas = useCallback(async () => {
    if (!sucursalId) return
    try {
      const data = await rutasService.getRutasBySucursal(sucursalId)
      setRutas(data)
    } catch (e) {
      console.error('Error cargando rutas:', e)
      setRutas([])
    }
  }, [sucursalId])

  const loadVentasActivas = useCallback(async () => {
    if (!sucursalId) return
    try {
      const todas = await ventasService.getAll()
      const activas = todas.filter(
        (v: any) =>
          (v.status === 'active' || !v.status) &&
          (v.saldo_pendiente ?? 0) > 0 &&
          v.sucursal_id === sucursalId
      )
      setVentasActivas(activas)
    } catch (e) {
      console.error('Error cargando ventas:', e)
      setVentasActivas([])
    }
  }, [sucursalId])

  const loadSucursales = useCallback(async () => {
    try {
      const data = await perfilesService.getSucursales()
      setSucursales(data)
      if (data.length > 0 && !sucursalId) {
        const actual = await perfilesService.getSucursalActual()
        setSucursalId(actual || data[0].id)
      }
    } catch (e) {
      console.error('Error cargando sucursales:', e)
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => {
    perfilesService.esAdmin().then(setIsAdmin)
  }, [])

  useEffect(() => {
    if (isAdmin) loadSucursales()
  }, [isAdmin, loadSucursales])

  useEffect(() => {
    if (isAdmin && sucursalId) {
      loadRutas()
      loadVentasActivas()
    }
  }, [isAdmin, sucursalId, loadRutas, loadVentasActivas])

  async function asignarVentaARuta(ventaId: string, rutaId: string, orden: number) {
    try {
      await ventasService.update(ventaId, { ruta_id: rutaId, orden_visita: orden })
      loadVentasActivas()
      loadRutas()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  async function quitarVentaDeRuta(ventaId: string) {
    try {
      await ventasService.update(ventaId, { ruta_id: null, orden_visita: 0 })
      loadVentasActivas()
      loadRutas()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  async function handleCrearRuta() {
    if (!nombreRuta.trim() || !sucursalId) {
      alert('Ingresa el nombre de la ruta y selecciona sucursal')
      return
    }
    const sucursal = sucursales.find((s) => s.id === sucursalId)
    try {
      const payload: Record<string, unknown> = {
        sucursal_id: sucursalId,
        nombre: nombreRuta.trim(),
        descripcion: descripcionRuta.trim() || null,
        activa: true,
      }
      if (sucursal?.empresa_id) payload.empresa_id = sucursal.empresa_id
      const { error } = await (supabase as any).from('rutas').insert(payload)
      if (error) throw error
      setNombreRuta('')
      setDescripcionRuta('')
      setIsModalOpen(false)
      loadRutas()
    } catch (e: any) {
      alert(`Error: ${e.message || 'No se pudo crear la ruta'}`)
    }
  }

  function handleEditRuta(ruta: Ruta) {
    setEditingRuta(ruta)
    setEditNombreRuta(ruta.nombre || '')
    setEditDescripcionRuta(ruta.descripcion || '')
  }

  async function handleGuardarEdicionRuta() {
    if (!editingRuta) return
    if (!editNombreRuta.trim()) {
      alert('El nombre de la ruta es requerido')
      return
    }
    try {
      const { error } = await (supabase as any)
        .from('rutas')
        .update({
          nombre: editNombreRuta.trim(),
          descripcion: editDescripcionRuta.trim() || null,
        })
        .eq('id', editingRuta.id)
      if (error) throw error
      setEditingRuta(null)
      loadRutas()
    } catch (e: any) {
      alert(`Error: ${e.message || 'No se pudo actualizar la ruta'}`)
    }
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-10 h-10 flex-shrink-0 text-amber-600" />
          <div>
            <h2 className="text-lg font-semibold text-amber-900">Acceso restringido</h2>
            <p className="text-amber-800 mt-1">
              Solo los administradores pueden gestionar rutas. Usa &quot;Mi Ruta de Hoy&quot; para ver tu ruta de cobro asignada.
            </p>
            <Link href="/ruta" className="inline-block mt-4">
              <Button variant="secondary">Ver Mi Ruta de Hoy</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rutas de Cobro</h1>
          <p className="text-gray-600">
            Gestiona las rutas por sucursal para organizar la cobranza
          </p>
        </div>
        <Link href="/admin">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2 inline" />
            Volver
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div className="pt-6">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Nueva Ruta
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : rutas.length === 0 ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
          <p className="text-amber-800 font-medium">No hay rutas creadas</p>
          <p className="text-amber-700 text-sm mt-2">
            Crea una ruta para asignar préstamos y que aparezcan en &quot;Mi Ruta de Hoy&quot;.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4">
            Crear primera ruta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rutas.map((r) => {
            const ventasEnRuta = ventasActivas.filter((v: any) => v.ruta_id === r.id).sort((a: any, b: any) => (a.orden_visita ?? 0) - (b.orden_visita ?? 0))
            const ventasSinRuta = ventasActivas.filter((v: any) => !v.ruta_id)
            const expanded = rutaExpandida === r.id
            return (
              <div key={r.id} className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setRutaExpandida(expanded ? null : r.id)}
                    className="flex-1 p-4 flex items-center gap-3 text-left hover:bg-gray-50"
                  >
                    <Route className="w-5 h-5 text-sky-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{r.nombre}</p>
                    {r.descripcion && (
                      <p className="text-sm text-gray-600">{r.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {ventasEnRuta.length} préstamo(s) en ruta
                    </p>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleEditRuta(r) }}
                  className="mr-2"
                  title="Editar nombre de la ruta"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                </div>
                {expanded && (
                  <div className="border-t p-4 bg-gray-50 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Préstamos en esta ruta:</p>
                    {ventasEnRuta.map((v: any, idx: number) => (
                      <div key={v.id} className="flex items-center justify-between bg-white p-2 rounded">
                        <span className="text-sm">#{idx + 1} {v.cliente?.nombre_completo} - ${(v.saldo_pendiente ?? 0).toLocaleString('es-DO')}</span>
                        <Button variant="secondary" size="sm" onClick={() => quitarVentaDeRuta(v.id)}>
                          Quitar
                        </Button>
                      </div>
                    ))}
                    {ventasSinRuta.length > 0 && (
                      <>
                        <p className="text-sm font-medium text-gray-700 mt-3">Agregar préstamo:</p>
                        <select
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          onChange={(e) => {
                            const ventaId = e.target.value
                            if (!ventaId) return
                            asignarVentaARuta(ventaId, r.id, ventasEnRuta.length + 1)
                            e.target.value = ''
                          }}
                        >
                          <option value="">Seleccionar préstamo...</option>
                          {ventasSinRuta.map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {v.cliente?.nombre_completo} - ${(v.saldo_pendiente ?? 0).toLocaleString('es-DO')}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Ruta"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={nombreRuta}
            onChange={(e) => setNombreRuta(e.target.value)}
            placeholder="Ej: Ruta Norte"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              value={descripcionRuta}
              onChange={(e) => setDescripcionRuta(e.target.value)}
              placeholder="Zona norte de la ciudad"
            />
          </div>
          <div className="btn-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearRuta}>
              Crear Ruta
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editingRuta}
        onClose={() => setEditingRuta(null)}
        title="Editar Ruta"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={editNombreRuta}
            onChange={(e) => setEditNombreRuta(e.target.value)}
            placeholder="Ej: Ruta Centro, Cobranza Norte"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              value={editDescripcionRuta}
              onChange={(e) => setEditDescripcionRuta(e.target.value)}
              placeholder="Descripción de la ruta"
            />
          </div>
          <div className="btn-actions">
            <Button variant="secondary" onClick={() => setEditingRuta(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarEdicionRuta}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
