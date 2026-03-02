'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { Droplet, Flame, Gamepad2, Monitor, Package, Snowflake, Speaker, Wind } from 'lucide-react'
import { motoresService } from '@/lib/services/motores'
import type { Motor } from '@/types'
import { executeWithOfflineFallback, isOnline } from '@/lib/utils/offlineHelper'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { subscriptionService } from '@/lib/services/subscription'

const motorSchema = z.object({
  marca: z.string().optional(), // Campo oculto pero necesario para la base de datos
  matricula: z.string().optional(), // Campo oculto pero necesario para la base de datos
  numero_chasis: z.string().min(1, 'El número de préstamo es requerido'),
  precio_venta: z.number().min(0.01, 'El valor del préstamo debe ser mayor a 0'),
  estado: z.enum(['Nuevo', 'Reacondicionado', 'Usado', 'Disponible', 'Vendido']),
  categoria: z.string().optional(),
  cantidad: z.number().min(0, 'La cantidad debe ser mayor o igual a 0').int('La cantidad debe ser un número entero'),
})

type MotorFormData = z.infer<typeof motorSchema>

interface MotorFormProps {
  motor?: Motor | null
  onSuccess: () => void
  onCancel: () => void
}

export function MotorForm({ motor, onSuccess, onCancel }: MotorFormProps) {
  const [numeroProductoGenerado, setNumeroProductoGenerado] = useState<string>('')
  const [generandoNumero, setGenerandoNumero] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  // Variables de estado ya no necesarias pero mantenidas para compatibilidad
  const [color] = useState<string>(motor?.color || '')
  const [modelo] = useState<string>('')
  const [garantiaMeses] = useState<string>(motor?.año?.toString() || '')
  const [numeroSerie] = useState<string>(motor?.numero_chasis_real || '')
  const [tipoArticulo] = useState<string>(motor?.tipo_articulo || 'Préstamo')
  const [capacidad] = useState<string>(motor?.capacidad || '')
  const [limitData, setLimitData] = useState<{
    planType: string | null
    currentUsage: number
    limit: number | 'ilimitado'
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MotorFormData>({
    resolver: zodResolver(motorSchema),
    defaultValues: motor
      ? {
          marca: motor.marca || 'Producto',
          matricula: motor.matricula || '',
          numero_chasis: motor.numero_chasis,
          precio_venta: motor.precio_venta || 0,
          estado: motor.estado === 'Disponible' ? 'Nuevo' : motor.estado,
          categoria: motor.categoria || 'Préstamo',
          cantidad: motor.cantidad || 999999,
        }
      : {
          estado: 'Nuevo',
          categoria: 'Préstamo',
          cantidad: 999999,
          matricula: '', // Se generará automáticamente basada en numero_chasis
          precio_venta: 0,
          marca: 'Producto', // Valor por defecto
        },
  })

  const generarNumeroProducto = useCallback(async () => {
    try {
      setGenerandoNumero(true)
      const numero = await motoresService.getSiguienteNumeroPrestamo()
      setNumeroProductoGenerado(numero)
      setValue('numero_chasis', numero)
    } catch (error) {
      console.error('Error generando número de producto:', error)
      // Si hay error, usar un número basado en timestamp como respaldo
      const numeroRespaldo = `PREST-${Date.now().toString().slice(-6)}`
      setNumeroProductoGenerado(numeroRespaldo)
      setValue('numero_chasis', numeroRespaldo)
    } finally {
      setGenerandoNumero(false)
    }
  }, [setValue])

  // Generar número de producto automáticamente solo al crear (no al editar)
  useEffect(() => {
    if (!motor) {
      generarNumeroProducto()
    } else {
      setNumeroProductoGenerado(motor.numero_chasis)
    }
  }, [motor, generarNumeroProducto])

  // Variables ya no necesarias pero mantenidas para evitar errores de compilación
  const categoriaSeleccionada = watch('categoria') || 'Préstamo'
  const sugerenciasArticulos: string[] = []
  const unidadCapacidad = 'Unidades'

  async function onSubmit(data: MotorFormData) {
    // Valores por defecto para campos que ya no se muestran
    const estadoDb = 'Disponible' // Siempre disponible para préstamos

    try {
      if (motor) {
        // Para edición, usar los datos tal cual
        let matricula = data.matricula
        if (!matricula || matricula.trim() === '') {
          matricula = `MAT-${data.numero_chasis}`
        }
        
        const motorData: Omit<Motor, 'id' | 'created_at' | 'updated_at'> = {
          marca: data.marca || 'Préstamo',
          matricula: matricula,
          numero_chasis: data.numero_chasis,
          precio_venta: data.precio_venta,
          estado: estadoDb,
          categoria: data.categoria || 'Préstamo',
          tipo_articulo: 'Préstamo',
          capacidad: undefined,
          cantidad: data.cantidad,
          modelo: undefined,
          color: undefined,
          año: undefined,
          numero_chasis_real: undefined,
        }
        
        await motoresService.update(motor.id, motorData)
      } else {
        // Validar límites de suscripción antes de crear nuevo producto
        const validation = await subscriptionService.canCreatePrestamo()
        
        if (!validation.allowed) {
          // Si no hay límites/uso, es un error de validación y no un límite real
          if (!validation.usage || !validation.limits) {
            alert(validation.message || 'No se pudo validar tu plan. Por favor, intenta nuevamente.')
            return
          }

          // Obtener información del plan actual para el modal
          const planType = await subscriptionService.getCurrentPlan()
          setLimitData({
            planType: planType || 'INICIAL',
            currentUsage: validation.usage.prestamos || 0,
            limit: validation.limits.prestamos,
          })
          setShowLimitModal(true)
          return
        }
        // Para creación, regenerar el número justo antes de crear para evitar conflictos
        // Esto asegura que el número sea único incluso si hay concurrencia
        const numeroFinal = await motoresService.getSiguienteNumeroPrestamo()
        const matriculaFinal = `MAT-${numeroFinal}`
        
        // Actualizar el estado local
        setNumeroProductoGenerado(numeroFinal)
        setValue('numero_chasis', numeroFinal)
        
        const motorData: Omit<Motor, 'id' | 'created_at' | 'updated_at'> = {
          marca: data.marca || 'Préstamo',
          matricula: matriculaFinal,
          numero_chasis: numeroFinal,
          precio_venta: data.precio_venta,
          estado: estadoDb,
          categoria: data.categoria || 'Préstamo',
          tipo_articulo: 'Préstamo',
          capacidad: undefined,
          cantidad: data.cantidad,
          modelo: undefined,
          color: undefined,
          año: undefined,
          numero_chasis_real: undefined,
        }
        
        // Intentar crear el producto con reintentos automáticos si hay duplicados
        let intentos = 0
        const maxIntentos = 5
        let exito = false
        let ultimoError: any = null
        
        while (intentos < maxIntentos && !exito) {
          try {
            await executeWithOfflineFallback(
              () => motoresService.create(motorData),
              {
                type: 'create',
                entity: 'motor',
                data: motorData,
              }
            )
            exito = true
          } catch (createError: any) {
            ultimoError = createError
            const errorMessage = createError?.message || ''
            
            // Si el error es por número de producto duplicado, regenerar y reintentar
            if (errorMessage.includes('numero_chasis') || 
                (errorMessage.includes('duplicate key') && 
                 (errorMessage.includes('numero_chasis') || errorMessage.includes('motores_numero_chasis_key')))) {
              console.warn(`Número de producto duplicado (intento ${intentos + 1}/${maxIntentos}), regenerando...`)
              
              // Regenerar número de producto
              const nuevoNumero = await motoresService.getSiguienteNumeroPrestamo()
              motorData.numero_chasis = nuevoNumero
              motorData.matricula = `MAT-${nuevoNumero}`
              motorData.numero_chasis_real = undefined
              setNumeroProductoGenerado(nuevoNumero)
              setValue('numero_chasis', nuevoNumero)
              
              intentos++
              // Continuar el loop para reintentar
            } else {
              // Si es otro tipo de error, lanzarlo inmediatamente
              throw createError
            }
          }
        }
        
        // Si después de todos los intentos no se pudo crear, lanzar el último error
        if (!exito) {
          throw ultimoError || new Error('No se pudo crear el producto después de múltiples intentos')
        }
      }
      // Si llegamos aquí, la operación fue exitosa (online o guardada offline)
      if (isOnline()) {
        // Mensaje normal si está online
      } else {
        alert('📴 Sin conexión. El producto se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error guardando producto:', error)
      
      // Si el error es de guardado offline, ya se mostró el mensaje
      if (error?.message?.includes('offline') || error?.message?.includes('Sin conexión')) {
        onSuccess() // Cerrar el formulario aunque se guardó offline
        return
      }
      
      const errorMessage = error?.message || 'Error desconocido'
      
      // Mostrar error más específico
      if (errorMessage.includes('cantidad') || errorMessage.includes('column')) {
        alert('Error: La columna "cantidad" no existe en la base de datos.\n\nPor favor ejecuta el script SQL en Supabase:\nsupabase/agregar-cantidad-motores.sql')
      } else if ((errorMessage.includes('numero_chasis') || errorMessage.includes('motores_numero_chasis_key')) && errorMessage.includes('duplicate key')) {
        alert('Error: El número de producto ya existe. El sistema intentó regenerarlo automáticamente pero no pudo. Por favor, recargue la página e intente crear el producto nuevamente.')
      } else if (errorMessage.includes('matricula') || (errorMessage.includes('duplicate key') && errorMessage.includes('matricula'))) {
        // Si aún hay error de matrícula duplicada, generar una con timestamp
        try {
          const matriculaUnica = `MAT-${data.numero_chasis}-${Date.now()}`
          const motorData: Omit<Motor, 'id' | 'created_at' | 'updated_at'> = {
            marca: data.marca || 'Préstamo',
            matricula: matriculaUnica,
            numero_chasis: data.numero_chasis,
            precio_venta: data.precio_venta,
            estado: estadoDb,
            categoria: data.categoria || 'Préstamo',
            tipo_articulo: 'Préstamo',
            capacidad: undefined,
            cantidad: data.cantidad,
            modelo: undefined,
            color: undefined,
            año: undefined,
            numero_chasis_real: undefined,
          }
          
          if (motor) {
            await executeWithOfflineFallback(
              () => motoresService.update(motor.id, motorData),
              {
                type: 'update',
                entity: 'motor',
                data: { id: motor.id, ...motorData },
              }
            )
          } else {
            await executeWithOfflineFallback(
              () => motoresService.create(motorData),
              {
                type: 'create',
                entity: 'motor',
                data: motorData,
              }
            )
          }
          onSuccess()
        } catch (retryError: any) {
          alert(`Error al guardar el producto: ${retryError?.message || errorMessage}`)
        }
      } else {
        alert(`Error al guardar el producto: ${errorMessage}`)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Campos ocultos para mantener compatibilidad con la base de datos */}
      <input type="hidden" {...register('marca')} value="Préstamo" />
      <input type="hidden" {...register('matricula')} />
      <input type="hidden" {...register('categoria')} value="Préstamo" />
      <input type="hidden" {...register('estado')} value="Nuevo" />

      <Input
        label="Valor de Préstamo"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Ej: 100000"
        {...register('precio_venta', { valueAsNumber: true })}
        error={errors.precio_venta?.message}
      />

      <Controller
        name="numero_chasis"
        control={control}
        render={({ field }) => (
          <div>
            <Input
              label="No. de Préstamo"
              {...field}
              error={errors.numero_chasis?.message}
              readOnly
              className="bg-gray-50"
              placeholder={generandoNumero ? 'Generando...' : 'PREST-001'}
            />
            {!motor && numeroProductoGenerado && (
              <p className="text-xs text-gray-500 mt-1">
                ✓ No. de préstamo generado automáticamente
              </p>
            )}
          </div>
        )}
      />

      {/* Stock infinito - campo oculto con valor muy alto */}
      <input
        type="hidden"
        {...register('cantidad', { valueAsNumber: true, value: 999999 })}
      />
      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stock Disponible
        </label>
        <p className="text-lg font-semibold text-gray-900">∞ Infinito</p>
        <p className="text-xs text-gray-500 mt-1">El stock disponible es ilimitado para préstamos</p>
      </div>

      {/* Resumen de Información Ingresada */}
      <div className="bg-green-50 p-4 rounded-md border-l-4 border-green-500 mt-4">
        <p className="text-sm font-semibold text-green-900 mb-3">📋 Resumen de Información Ingresada</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-600 font-medium">Valor de Préstamo:</span>
            <p className="text-gray-900 font-semibold">
              ${watch('precio_venta') ? Number(watch('precio_venta')).toLocaleString('es-DO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) : '$0.00'}
            </p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">No. de Préstamo:</span>
            <p className="text-gray-900 font-semibold">{numeroProductoGenerado || watch('numero_chasis') || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Stock Disponible:</span>
            <p className="text-gray-900 font-semibold">∞ Infinito</p>
          </div>
        </div>
      </div>

      <div className="btn-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : motor ? 'Actualizar' : 'Crear'}
        </Button>
      </div>

      {/* Modal de límite alcanzado */}
      {limitData && (
        <LimitReachedModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          planType={limitData.planType as any}
          resourceType="prestamos"
          currentUsage={limitData.currentUsage}
          limit={limitData.limit}
        />
      )}
    </form>
  )
}


