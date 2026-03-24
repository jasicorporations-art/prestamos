'use client'

import { useEffect } from 'react'
import { Package, Settings, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import {
  ELECTRO_LINEAS_CONFIG,
  LINEA_PRODUCTO_OPTIONS,
  CATEGORIA_ELECTRO_OPTIONS,
  CONDICION_OPTIONS,
  PRODUCTOS_POR_CATEGORIA,
  type LineaProductoConfig,
  type ElectroFieldConfig,
} from '@/lib/config/electroFormConfig'
import type { LineaProductoElectro } from '@/types'

const SECTION_STYLE = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
const SECTION_TITLE_STYLE = 'flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3'

function InputWithUnit({
  name,
  label,
  type = 'text',
  placeholder,
  unit,
  register,
  error,
}: {
  name: string
  label: string
  type?: string
  placeholder?: string
  unit?: string
  register: any
  error?: string
}) {
  const input = (
    <input
      type={type}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${unit ? 'rounded-r-none' : 'rounded-r-md'}`}
      {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
    />
  )
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="flex">
        {input}
        {unit && (
          <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-sm text-gray-600 min-w-[4rem] justify-center">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function DynamicField({
  field,
  register,
  watch,
  setValue,
  errors,
}: {
  field: ElectroFieldConfig
  register: any
  watch: any
  setValue: any
  errors: any
}) {
  const name = `spec_${field.key}` as const
  const value = watch(name)
  const error = errors[name]?.message as string | undefined

  if (field.type === 'select') {
    return (
      <div className="w-full">
        <Select
          label={field.label}
          options={field.options ?? []}
          value={value ?? ''}
          onChange={(e) => setValue(name, e.target.value)}
          error={error}
        />
      </div>
    )
  }

  return (
    <InputWithUnit
      name={name}
      label={field.label}
      type={field.type}
      placeholder={field.placeholder}
      unit={field.unit}
      register={register}
      error={error}
    />
  )
}

export interface ElectroProductoFormProps {
  register: any
  watch: any
  setValue: any
  errors: any
}

export function ElectroProductoForm({ register, watch, setValue, errors }: ElectroProductoFormProps) {
  const categoria = watch('spec_categoria_electro') as string
  const lineaProducto = watch('spec_linea_producto') as LineaProductoElectro | ''
  const potenciaActual = watch('spec_potencia')
  const condicionActual = watch('spec_condicion')
  const voltajeActual = watch('spec_voltaje')
  const tecnologiaActual = watch('spec_tecnologia')
  const garantiaActual = watch('spec_tiempo_garantia')
  const resolucionActual = watch('spec_resolucion')
  const smartTvActual = watch('spec_smart_tv')
  const puertosActual = watch('spec_puertos')
  const tipoGasActual = watch('spec_tipo_gas')
  const esMuebles = categoria === 'muebles_hogar'
  const esOtros = categoria === 'otros'
  const productosSugeridos = PRODUCTOS_POR_CATEGORIA[categoria] ?? []
  const config: LineaProductoConfig | null = lineaProducto && lineaProducto in ELECTRO_LINEAS_CONFIG
    ? ELECTRO_LINEAS_CONFIG[lineaProducto as LineaProductoElectro]
    : null

  // Potencia por defecto para no obligar al usuario a completarla en línea pequeña.
  useEffect(() => {
    if (lineaProducto === 'linea_pequena' && (potenciaActual == null || potenciaActual === '')) {
      setValue('spec_potencia', 1200)
    }
  }, [lineaProducto, potenciaActual, setValue])

  // Condición por defecto para no obligar al usuario a seleccionarla.
  useEffect(() => {
    if (condicionActual == null || condicionActual === '') {
      setValue('spec_condicion', 'Nuevo')
    }
  }, [condicionActual, setValue])

  // Voltaje por defecto para agilizar la captura.
  useEffect(() => {
    if (voltajeActual == null || voltajeActual === '') {
      setValue('spec_voltaje', '110v')
    }
  }, [voltajeActual, setValue])

  // Tecnología por defecto para agilizar la captura (editable por el usuario).
  useEffect(() => {
    if (tecnologiaActual == null || tecnologiaActual === '') {
      setValue('spec_tecnologia', 'Inverter')
    }
  }, [tecnologiaActual, setValue])

  // Garantía por defecto.
  useEffect(() => {
    if (garantiaActual == null || garantiaActual === '') {
      setValue('spec_tiempo_garantia', '1 año')
    }
  }, [garantiaActual, setValue])

  // Resolución por defecto.
  useEffect(() => {
    if (resolucionActual == null || resolucionActual === '') {
      setValue('spec_resolucion', 'Full HD')
    }
  }, [resolucionActual, setValue])

  // Smart TV por defecto.
  useEffect(() => {
    if (smartTvActual == null || smartTvActual === '') {
      setValue('spec_smart_tv', 'Sí')
    }
  }, [smartTvActual, setValue])

  // Puertos por defecto.
  useEffect(() => {
    if (puertosActual == null || puertosActual === '') {
      setValue('spec_puertos', 'HDMI')
    }
  }, [puertosActual, setValue])

  // Tipo de gas por defecto.
  useEffect(() => {
    if (tipoGasActual == null || tipoGasActual === '') {
      setValue('spec_tipo_gas', 'R-410A')
    }
  }, [tipoGasActual, setValue])

  return (
    <div className="space-y-5">
      {/* Información General */}
      <section className={SECTION_STYLE}>
        <h3 className={SECTION_TITLE_STYLE}>
          <Package className="h-4 w-4 text-primary-600" aria-hidden />
          Información General
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Select
              label="Categoría"
              options={CATEGORIA_ELECTRO_OPTIONS}
              value={categoria ?? ''}
              onChange={(e) => {
                const next = e.target.value
                setValue('spec_categoria_electro', next)
                setValue('spec_linea_producto', next)
              }}
              error={errors.spec_categoria_electro?.message as string | undefined}
            />
          </div>
          {esOtros && (
            <Input
              label="Especifique categoría (Otros)"
              {...register('spec_otra_categoria')}
              placeholder="Ej: Decoración, Herramientas, etc."
              className="sm:col-span-2"
            />
          )}
          <div className="sm:col-span-2">
            <Select
              label="Línea de Producto"
              options={LINEA_PRODUCTO_OPTIONS}
              value={watch('spec_linea_producto') ?? ''}
              onChange={(e) => setValue('spec_linea_producto', e.target.value)}
              error={errors.spec_linea_producto?.message as string | undefined}
            />
            {config && (
              <p className="mt-1 text-xs text-gray-500">{config.subtitle}</p>
            )}
          </div>
          {!!productosSugeridos.length && (
            <div className="sm:col-span-2">
              <Select
                label="Producto sugerido (opcional)"
                options={productosSugeridos}
                value=""
                onChange={(e) => {
                  setValue('spec_tipo_equipo', e.target.value)
                }}
              />
            </div>
          )}
          <Input
            label="Producto"
            {...register('spec_tipo_equipo')}
            placeholder="Escriba el nombre específico del artículo"
            className="sm:col-span-2"
          />
          <Input label="Marca" {...register('spec_marca')} placeholder="Ej: Samsung, LG" />
          <Input label="Modelo / Descripción" {...register('spec_modelo')} placeholder="Ej: RT-1234 / 6 sillas, tamaño queen, etc." />
          <Input
            label={esMuebles ? 'Material / Color' : 'Número de Serie / Referencia'}
            {...register('spec_serial')}
            placeholder={esMuebles ? 'Ej: Madera caoba / Beige' : 'Ej: SN-12345'}
            className="sm:col-span-2"
          />
        </div>
      </section>

      {/* Detalles Técnicos (dinámicos por línea) */}
      <AnimatePresence mode="wait">
        {config && (categoria === 'linea_blanca' || categoria === 'linea_climatizacion') && (
          <motion.section
            key={config.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={SECTION_STYLE}
          >
            <h3 className={SECTION_TITLE_STYLE}>
              <Settings className="h-4 w-4 text-primary-600" aria-hidden />
              Detalles Técnicos — {config.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  errors={errors}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Estado y Garantía */}
      <section className={SECTION_STYLE}>
        <h3 className={SECTION_TITLE_STYLE}>
          <ShieldCheck className="h-4 w-4 text-primary-600" aria-hidden />
          Estado y Garantía
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Condición"
            options={CONDICION_OPTIONS}
            value={watch('spec_condicion') ?? ''}
            onChange={(e) => setValue('spec_condicion', e.target.value)}
            error={errors.spec_condicion?.message as string | undefined}
          />
          <Input
            label="Tiempo de Garantía"
            {...register('spec_tiempo_garantia')}
            placeholder="Ej: 1 año, 2 años"
          />
        </div>
      </section>
    </div>
  )
}
