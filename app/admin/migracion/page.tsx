'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Database,
  Loader2,
  Shield,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { perfilesService } from '@/lib/services/perfiles'
import { subscriptionService } from '@/lib/services/subscription'
import {
  parseMigracionCSV,
  downloadMigracionTemplate,
  migracionCarteraService,
  type MigracionRow,
} from '@/lib/services/migracionCartera'

type Step = 'upload' | 'preview' | 'result'

export default function MigracionCarteraPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<MigracionRow[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: { row: number; message: string }[]
  } | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const [admin, planType] = await Promise.all([
        perfilesService.esAdmin(),
        subscriptionService.getCurrentPlan(),
      ])
      setIsAdmin(admin)
      if (admin && planType === 'BRONCE') {
        router.push('/admin')
      }
    }
    checkAccess()
  }, [router])

  const handleFile = useCallback((file: File) => {
    setUploadError(null)
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setUploadError('Selecciona un archivo CSV')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      const parsed = parseMigracionCSV(text)
      if (parsed.length === 0) {
        setUploadError('No se detectaron filas válidas. Verifica los encabezados.')
        return
      }
      setRows(parsed)
      setStep('preview')
    }
    reader.onerror = () => setUploadError('Error al leer el archivo')
    reader.readAsText(file, 'UTF-8')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const handleImport = async () => {
    const invalidCount = rows.filter((r) => !r.isValid).length
    if (invalidCount > 0) return

    setIsImporting(true)
    setImportResult(null)
    try {
      const result = await migracionCarteraService.migrar(rows)
      setImportResult(result)
      setStep('result')
    } catch (err: any) {
      setImportResult({
        success: 0,
        failed: rows.length,
        errors: [{ row: 0, message: err?.message || 'Error al migrar' }],
      })
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }

  const validRows = rows.filter((r) => r.isValid)
  const invalidCount = rows.filter((r) => !r.isValid).length
  const canImport = validRows.length > 0 && invalidCount === 0
  const totalSaldo = validRows.reduce((sum, r) => sum + (r.saldoRestante ?? 0), 0)

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <p className="text-amber-800 font-medium">Solo administradores pueden acceder a la migración de cartera.</p>
          <Button className="mt-4" onClick={() => router.push('/admin')}>
            Volver al panel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Button variant="secondary" onClick={() => router.push('/admin')} className="mb-4">
          <ChevronRight className="w-5 h-5 mr-2 rotate-180 inline" />
          Volver al panel
        </Button>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Database className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Migración de Cartera Avanzada
            </h1>
            <p className="text-gray-600 mt-1">
              Importa préstamos activos con historial de pagos desde otro software
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span className={step === 'upload' ? 'font-semibold text-primary-600' : ''}>
            1. Subir archivo
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'preview' ? 'font-semibold text-primary-600' : ''}>
            2. Revisar y confirmar
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'result' ? 'font-semibold text-primary-600' : ''}>
            3. Resultado
          </span>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
              `}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary-100">
                  <Upload className="w-12 h-12 text-primary-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  Arrastra tu CSV de migración aquí
                </p>
                <p className="text-gray-500">o haz clic para seleccionar</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
                    <FileSpreadsheet className="w-5 h-5" />
                    Seleccionar CSV
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <Download className="w-8 h-8 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Plantilla de migración</p>
                <p className="text-sm text-blue-700 mt-1">
                  Descarga la plantilla con las columnas necesarias para reconstruir el historial de pagos.
                </p>
                <Button
                  variant="secondary"
                  onClick={downloadMigracionTemplate}
                  className="mt-2 bg-white border border-blue-200"
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  Descargar plantilla de migración
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <Shield className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">JasiCorp reconstruirá el calendario de pagos</p>
                <p className="text-sm text-amber-800 mt-1">
                  Automáticamente basado en las cuotas restantes para que tu cobranza no se detenga ni un solo día.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <p className="text-red-800">{uploadError}</p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-semibold text-gray-900">{rows.length} registro(s) detectado(s)</p>
                  <p className="text-sm text-gray-500">
                    {validRows.length} válido(s) · {invalidCount} con errores
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  Cambiar archivo
                </Button>
                <Button onClick={handleImport} disabled={!canImport || isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2 inline" />
                      Migrar {validRows.length} préstamo(s)
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100">
              <div className="flex items-center gap-3">
                <Calendar className="w-10 h-10 text-primary-600" />
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Vas a importar {validRows.length} cliente(s) con un saldo total de cartera de{' '}
                    <span className="text-primary-700">
                      ${totalSaldo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Las cuotas ya pagadas se marcarán como PAGADAS; las restantes quedarán PENDIENTES.
                  </p>
                </div>
              </div>
            </div>

            {invalidCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-amber-800">
                  Corrige las filas en rojo. Nombre y teléfono son obligatorios.
                </p>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuotas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row) => (
                      <tr key={row.rowIndex} className={row.isValid ? '' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.rowIndex}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{row.nombre_cliente || <span className="text-red-600 italic">Falta</span>}</div>
                          <div className="text-gray-500 text-xs">{row.telefono || <span className="text-red-600">Falta</span>}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          ${parseFloat(String(row.monto_total_prestado).replace(/[^0-9.-]/g, '') || '0').toLocaleString('es-DO')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.cuotas_ya_pagadas}/{row.total_cuotas_pactadas}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          ${(row.saldoRestante ?? 0).toLocaleString('es-DO')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 inline" />
                          ) : (
                            <span title={row.errors.join(', ')}>
                              <XCircle className="w-5 h-5 text-red-500 inline" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-800">{importResult.success}</p>
                    <p className="text-green-700">Migrados correctamente</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                  <XCircle className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-800">{importResult.failed}</p>
                    <p className="text-red-700">Con errores</p>
                  </div>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900 mb-2">Detalle de errores:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>Fila {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep('upload')} variant="secondary">
                Migrar más
              </Button>
              <Button onClick={() => router.push('/admin')}>
                Ir al panel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
