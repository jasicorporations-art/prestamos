'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { clientesService } from '@/lib/services/clientes'
import type { Cliente } from '@/types'
import { executeWithOfflineFallback, isOnline } from '@/lib/utils/offlineHelper'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { subscriptionService } from '@/lib/services/subscription'
import { DocumentScanner } from '@/components/DocumentScanner'
import { DocumentUploader } from '@/components/DocumentUploader'
import { documentosService } from '@/lib/services/documentos'

const clienteSchema = z.object({
  nombre_completo: z.string().min(1, 'El nombre completo es requerido'),
  cedula: z.string().min(1, 'La cédula es requerida'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  nombre_garante: z.string().min(1, 'El nombre del garante es requerido'),
  direccion_garante: z.string().optional(),
  telefono_garante: z.string().optional(),
  celular: z.string().optional(),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().email('Email del cliente inválido').optional()
  ),
  email_garante: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().email('Email del garante inválido').optional()
  ),
  fecha_compra: z.string().optional(),
})

type ClienteFormData = z.infer<typeof clienteSchema>

interface ClienteFormProps {
  cliente?: Cliente | null
  onSuccess: () => void
  onCancel: () => void
}

export function ClienteForm({ cliente, onSuccess, onCancel }: ClienteFormProps) {
  const [numeroPrestamoGenerado, setNumeroPrestamoGenerado] = useState<string>('')
  const [generandoNumero, setGenerandoNumero] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitData, setLimitData] = useState<{
    planType: string | null
    currentUsage: number
    limit: number | 'ilimitado'
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
      defaultValues: cliente
        ? {
            nombre_completo: cliente.nombre_completo,
            cedula: cliente.cedula,
            direccion: cliente.direccion,
            nombre_garante: cliente.nombre_garante,
            direccion_garante: (cliente as any).direccion_garante || '',
            telefono_garante: (cliente as any).telefono_garante || '',
            celular: cliente.celular || '',
            email: cliente.email || '',
            email_garante: (cliente as any).email_garante || '',
            fecha_compra: cliente.fecha_compra ? cliente.fecha_compra.split('T')[0] : '',
          }
        : {
            // Establecer fecha de inicio automáticamente a la fecha actual
            fecha_compra: new Date().toISOString().split('T')[0],
          },
  })

  const generarNumeroPrestamoCliente = useCallback(async () => {
    try {
      setGenerandoNumero(true)
      const numero = await clientesService.getSiguienteNumeroPrestamoCliente()
      setNumeroPrestamoGenerado(numero)
    } catch (error) {
      console.error('Error generando número de préstamo de cliente:', error)
      // Respaldo: CLI-timestamp-random
      const ts = Date.now().toString().slice(-8)
      const r = Math.floor(Math.random() * 90 + 10)
      const appId = process.env.NEXT_PUBLIC_APP_ID?.toUpperCase()
      const numeroRespaldo = appId ? `CLI-${appId}-${ts}-${r}` : `CLI-${ts}-${r}`
      setNumeroPrestamoGenerado(numeroRespaldo)
    } finally {
      setGenerandoNumero(false)
    }
  }, [])

  // Generar número de préstamo automáticamente solo al crear (no al editar)
  useEffect(() => {
    if (!cliente) {
      generarNumeroPrestamoCliente()
    } else {
      setNumeroPrestamoGenerado(cliente.numero_prestamo_cliente || '')
    }
  }, [cliente, generarNumeroPrestamoCliente])

  async function onSubmit(data: ClienteFormData) {
    try {
      // Validar límites de suscripción antes de crear (solo para nuevos clientes)
      if (!cliente) {
        const validation = await subscriptionService.canCreateCliente()
        
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
            currentUsage: validation.usage.clientes || 0,
            limit: validation.limits.clientes,
          })
          setShowLimitModal(true)
          return
        }
      }

      // Preparar los datos para enviar, filtrando campos vacíos
      const datosParaEnviar: any = {
        nombre_completo: data.nombre_completo,
        cedula: data.cedula,
        direccion: data.direccion,
        nombre_garante: data.nombre_garante,
      }
      
      // Agregar número de préstamo solo al crear (no al editar)
      if (!cliente && numeroPrestamoGenerado) {
        datosParaEnviar.numero_prestamo_cliente = numeroPrestamoGenerado
      }
      
      // Agregar campos opcionales solo si tienen valor
      if (data.celular && data.celular.trim() !== '') {
        datosParaEnviar.celular = data.celular.trim()
      }

      if (data.email && data.email.trim() !== '') {
        datosParaEnviar.email = data.email.trim()
      }
      
      if (data.direccion_garante && data.direccion_garante.trim() !== '') {
        datosParaEnviar.direccion_garante = data.direccion_garante.trim()
      }
      
      if (data.telefono_garante && data.telefono_garante.trim() !== '') {
        datosParaEnviar.telefono_garante = data.telefono_garante.trim()
      }

      if (data.email_garante && data.email_garante.trim() !== '') {
        datosParaEnviar.email_garante = data.email_garante.trim()
      }
      
      if (data.fecha_compra && data.fecha_compra.trim() !== '') {
        // Convertir a formato DATE (YYYY-MM-DD) para PostgreSQL
        const fecha = new Date(data.fecha_compra)
        datosParaEnviar.fecha_compra = fecha.toISOString().split('T')[0]
      }
      
      if (cliente) {
        await executeWithOfflineFallback(
          () => clientesService.update(cliente.id, datosParaEnviar),
          {
            type: 'update',
            entity: 'cliente',
            data: { id: cliente.id, ...datosParaEnviar },
          }
        )
      } else {
        // Para creación, regenerar el número justo antes de crear para evitar conflictos
        // Esto asegura que el número sea único incluso si hay concurrencia
        const numeroFinal = await clientesService.getSiguienteNumeroPrestamoCliente()
        
        // Actualizar el estado local
        setNumeroPrestamoGenerado(numeroFinal)
        datosParaEnviar.numero_prestamo_cliente = numeroFinal
        
        // Intentar crear el cliente con reintentos automáticos si hay duplicados
        let intentos = 0
        const maxIntentos = 5
        let exito = false
        let ultimoError: any = null
        
        while (intentos < maxIntentos && !exito) {
          try {
            await executeWithOfflineFallback(
              () => clientesService.create(datosParaEnviar),
              {
                type: 'create',
                entity: 'cliente',
                data: datosParaEnviar,
              }
            )
            exito = true
          } catch (createError: any) {
            ultimoError = createError
            const errorMessage = createError?.message || ''
            const errorCode = createError?.code || createError?.error?.code
            
            // Si el error es por número de préstamo duplicado, regenerar y reintentar
            if (errorMessage.includes('numero_prestamo_cliente') || 
                (errorMessage.includes('duplicate key') && 
                 (errorMessage.includes('numero_prestamo_cliente') || errorMessage.includes('clientes_numero_prestamo_cliente_key'))) ||
                (errorCode === '23505' && !errorMessage.includes('cedula'))) {
              console.warn(`Número de préstamo de cliente duplicado (intento ${intentos + 1}/${maxIntentos}), regenerando...`)
              
              // Regenerar número de préstamo
              const nuevoNumero = await clientesService.getSiguienteNumeroPrestamoCliente()
              datosParaEnviar.numero_prestamo_cliente = nuevoNumero
              setNumeroPrestamoGenerado(nuevoNumero)
              
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
          throw ultimoError || new Error('No se pudo crear el cliente después de múltiples intentos')
        }
      }
      // Si llegamos aquí, la operación fue exitosa (online o guardada offline)
      if (isOnline()) {
        // Mensaje normal si está online
      } else {
        alert('📴 Sin conexión. El cliente se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error guardando cliente:', error)
      
      // Si el error es de guardado offline, ya se mostró el mensaje
      if (error?.message?.includes('offline') || error?.message?.includes('Sin conexión')) {
        onSuccess() // Cerrar el formulario aunque se guardó offline
        return
      }
      
      // Mostrar mensaje de error más específico
      let mensajeError = 'Error al guardar el cliente'
      
      if (error?.message) {
        // Verificar si el error es por columnas faltantes
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          const detalle = error.message.replace(/\n/g, ' ').trim()
          mensajeError = `Error: Falta alguna columna en la tabla clientes.\n\nDetalle: ${detalle}\n\nEjecuta UNA SOLA VEZ en Supabase (SQL Editor) este script:\nsupabase/agregar-todos-campos-clientes.sql\n\n(Una sola ejecución por proyecto; el aislamiento por empresa no afecta las columnas.)`
        } else if (error.message.includes('null value') && error.message.includes('empresa_id')) {
          mensajeError = `Error: No se pudo obtener la empresa. Cierra sesión, vuelve a entrar e intenta de nuevo. Si sigue el error, verifica que tu usuario tenga una empresa asignada (Admin > Usuarios o al registrarte con "Nombre de empresa").`
        } else if (error.message.includes('null value') || error.message.includes('NOT NULL')) {
          mensajeError = `Error: Faltan campos requeridos. ${error.message}`
        } else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          if (error.message.includes('numero_prestamo_cliente') || error.message.includes('clientes_numero_prestamo_cliente_key')) {
            mensajeError = `Error: El número de préstamo del cliente ya existe. El sistema intentó regenerarlo automáticamente pero no pudo. Por favor, recargue la página e intente crear el cliente nuevamente.`
          } else if (error.code === '23505' && !error.message.includes('cedula')) {
            mensajeError = `Error: El número de préstamo del cliente ya existe. El sistema intentará regenerarlo automáticamente. Por favor, intenta nuevamente.`
          } else if (error.message.includes('cedula') || 
                     (error.message.includes('duplicate key') && error.message.includes('cedula'))) {
            if (error.message.includes('compañía') || error.message.includes('compania')) {
              mensajeError = `Error: Ya existe un cliente con esta cédula en su compañía.`
            } else {
              mensajeError = `Error: Ya existe un cliente con esta cédula.`
            }
          } else {
            mensajeError = `Error: Ya existe un cliente con estos datos. ${error.message}`
          }
        } else {
          mensajeError = `Error: ${error.message}`
        }
      } else if (error?.code) {
        mensajeError = `Error ${error.code}: ${error.message || 'Error desconocido'}`
      }
      
      alert(mensajeError)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de Préstamo del Cliente
        </label>
        <Input
          value={numeroPrestamoGenerado}
          readOnly
          className="bg-gray-50"
          placeholder={generandoNumero ? 'Generando...' : 'CLI-0001'}
          disabled
        />
        {!cliente && numeroPrestamoGenerado && (
          <p className="text-xs text-gray-500 mt-1">
            ✓ Número generado automáticamente
          </p>
        )}
      </div>

      {/* Sección de Escáner de Documentos */}
      <DocumentScanner
        onOCRResult={(data) => {
          // Autocompletar con datos de OCR (solo si los campos están vacíos o si el usuario no ha modificado)
          if (data.nombre && !cliente) {
            setValue('nombre_completo', data.nombre)
          }
          // Para cédula, solo autocompletar si no hay datos de código de barras (prioridad)
          if (data.cedula && !cliente) {
            setValue('cedula', data.cedula)
          }
        }}
        onBarcodeResult={(data) => {
          // Los datos de código de barras tienen prioridad sobre OCR
          if (data.numero_licencia && !cliente) {
            // Si el código de barras tiene un número de identificación, usarlo para cédula
            setValue('cedula', data.numero_licencia)
          }
          // Aquí podrías agregar más campos si los necesitas (fecha_vencimiento, etc.)
        }}
      />

      {/* Sección de Subida de Documentos - Solo visible al editar cliente existente */}
      {cliente?.id && (
        <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-500 space-y-4">
          <h3 className="text-sm font-semibold text-blue-900">Expediente Digital</h3>
          
          <DocumentUploader
            clienteId={cliente.id}
            tipoDocumento="identificacion_frontal"
            label="Identificación Frontal"
            urlActual={cliente.url_id_frontal ? documentosService.getPublicUrl(cliente.url_id_frontal) : undefined}
            onUploadComplete={async (filePath) => {
              // Actualizar en base de datos
              try {
                await clientesService.update(cliente.id, { url_id_frontal: filePath })
                // NO llamar onSuccess() aquí porque cerraría el modal
                // El documento ya se muestra en el preview
              } catch (error: any) {
                console.error('Error actualizando URL de documento:', error)
                const errorMessage = error?.message || 'Error desconocido'
                // Verificar si el error es porque la columna no existe
                if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
                  alert('Error: Las columnas de documentos no existen en la base de datos.\n\nPor favor ejecuta el script SQL en Supabase:\nsupabase/agregar-campos-documentos-clientes.sql')
                } else {
                  alert(`Documento subido pero hubo un error al guardar la referencia: ${errorMessage}\n\nPor favor, recarga la página.`)
                }
              }
            }}
            onError={(error) => alert(error)}
          />

          <DocumentUploader
            clienteId={cliente.id}
            tipoDocumento="identificacion_trasera"
            label="Identificación Trasera"
            urlActual={cliente.url_id_trasera ? documentosService.getPublicUrl(cliente.url_id_trasera) : undefined}
            onUploadComplete={async (filePath) => {
              try {
                await clientesService.update(cliente.id, { url_id_trasera: filePath })
                // NO llamar onSuccess() aquí porque cerraría el modal
              } catch (error: any) {
                console.error('Error actualizando URL de documento:', error)
                const errorMessage = error?.message || 'Error desconocido'
                if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
                  alert('Error: Las columnas de documentos no existen en la base de datos.\n\nPor favor ejecuta el script SQL en Supabase:\nsupabase/agregar-campos-documentos-clientes.sql')
                } else {
                  alert(`Documento subido pero hubo un error al guardar la referencia: ${errorMessage}\n\nPor favor, recarga la página.`)
                }
              }
            }}
            onError={(error) => alert(error)}
          />

          <DocumentUploader
            clienteId={cliente.id}
            tipoDocumento="contrato_firmado"
            label="Contrato Firmado"
            urlActual={cliente.url_contrato ? documentosService.getPublicUrl(cliente.url_contrato) : undefined}
            onUploadComplete={async (filePath) => {
              try {
                await clientesService.update(cliente.id, { url_contrato: filePath })
                // NO llamar onSuccess() aquí porque cerraría el modal
              } catch (error: any) {
                console.error('Error actualizando URL de documento:', error)
                const errorMessage = error?.message || 'Error desconocido'
                if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
                  alert('Error: Las columnas de documentos no existen en la base de datos.\n\nPor favor ejecuta el script SQL en Supabase:\nsupabase/agregar-campos-documentos-clientes.sql')
                } else {
                  alert(`Documento subido pero hubo un error al guardar la referencia: ${errorMessage}\n\nPor favor, recarga la página.`)
                }
              }
            }}
            onError={(error) => alert(error)}
          />
        </div>
      )}

      <Input
        label="Nombre Completo"
        {...register('nombre_completo')}
        error={errors.nombre_completo?.message}
      />

      <Input
        label="Cédula"
        {...register('cedula')}
        error={errors.cedula?.message}
      />

      <Input
        label="Dirección"
        {...register('direccion')}
        error={errors.direccion?.message}
      />

      <Input
        label="Nombre del Garante"
        {...register('nombre_garante')}
        error={errors.nombre_garante?.message}
      />

      <Input
        label="Email del Cliente"
        type="email"
        placeholder="cliente@correo.com"
        {...register('email')}
        error={errors.email?.message}
      />

      <Input
        label="Email del Garante"
        type="email"
        placeholder="garante@correo.com"
        {...register('email_garante')}
        error={errors.email_garante?.message}
      />

      <Input
        label="Dirección del Garante"
        {...register('direccion_garante')}
        error={errors.direccion_garante?.message}
      />

      <Input
        label="Teléfono del Garante"
        type="tel"
        placeholder="(809) 555-1234"
        {...register('telefono_garante')}
        error={errors.telefono_garante?.message}
      />

      <Input
        label="Celular del Cliente"
        type="tel"
        placeholder="(809) 555-1234"
        {...register('celular')}
        error={errors.celular?.message}
      />

      <Input
        label="Fecha de Inicio"
        type="date"
        {...register('fecha_compra')}
        error={errors.fecha_compra?.message}
      />

      <div className="btn-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : cliente ? 'Actualizar' : 'Crear'}
        </Button>
      </div>

      {/* Modal de límite alcanzado */}
      {limitData && (
        <LimitReachedModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          planType={limitData.planType as any}
          resourceType="clientes"
          currentUsage={limitData.currentUsage}
          limit={limitData.limit}
        />
      )}
    </form>
  )
}


