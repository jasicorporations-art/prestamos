'use client'

import { useState, useCallback } from 'react'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/Button'
import {
  parseCSVFile,
  downloadTemplateCSV,
  importacionService,
  type ImportRow,
} from '@/lib/services/importacion'

type Step = 'upload' | 'preview' | 'result'

interface ImportacionClientesProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function ImportacionClientes({ onSuccess, onCancel }: ImportacionClientesProps) {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: { row: number; message: string }[]
  } | null>(null)

  const handleFile = useCallback((file: File) => {
    setUploadError(null)
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setUploadError('Por favor selecciona un archivo CSV')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      const parsed = parseCSVFile(text)
      if (parsed.length === 0) {
        setUploadError('No se detectaron filas válidas. Verifica que el archivo tenga encabezados correctos.')
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

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
    if (invalidCount > 0) {
      return
    }
    setIsImporting(true)
    setImportResult(null)
    try {
      const result = await importacionService.importar(rows)
      setImportResult(result)
      setStep('result')
      if (result.success > 0 && onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setImportResult({
        success: 0,
        failed: rows.length,
        errors: [{ row: 0, message: err?.message || 'Error al importar' }],
      })
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = rows.filter((r) => r.isValid).length
  const invalidCount = rows.filter((r) => !r.isValid).length
  const canImport = validCount > 0 && invalidCount === 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb de pasos */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className={step === 'upload' ? 'font-semibold text-primary-600' : ''}>
          1. Subir archivo
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'preview' ? 'font-semibold text-primary-600' : ''}>
          2. Revisar datos
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
              ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
            `}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary-100">
                <Upload className="w-12 h-12 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Arrastra tu archivo CSV aquí
                </p>
                <p className="text-gray-500 mt-1">
                  o haz clic para seleccionar desde tu dispositivo
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  <FileSpreadsheet className="w-5 h-5" />
                  Seleccionar archivo CSV
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Download className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">¿No tienes la plantilla?</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Descarga la plantilla con los encabezados correctos y rellénala con tus datos.
              </p>
              <Button
                variant="secondary"
                onClick={downloadTemplateCSV}
                className="mt-2 bg-white border border-blue-200 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Descargar plantilla CSV
              </Button>
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
              <Users className="w-8 h-8 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">
                  {rows.length} registro(s) detectado(s)
                </p>
                <p className="text-sm text-gray-500">
                  {validCount} válido(s) · {invalidCount} con errores
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('upload')}>
                Cambiar archivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canImport || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2 inline" />
                    Importar {validCount} registro(s)
                  </>
                )}
              </Button>
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <p className="text-amber-800">
                Corrige las filas marcadas en rojo antes de importar. Nombre y teléfono del cliente son obligatorios.
              </p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cédula
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dirección
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Préstamo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={row.isValid ? '' : 'bg-red-50'}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.rowIndex}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {row.nombre_completo || (
                          <span className="text-red-600 italic">Falta</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.cedula || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.telefono || (
                          <span className="text-red-600 italic">Falta</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                        {row.direccion || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.hasLoanData
                          ? `${row.monto_principal || '-'} / ${row.cantidad_de_cuotas || '-'} cuotas`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 inline" />
                        ) : (
                          <span title={row.errors.join(', ')} className="inline-block">
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
                  <p className="text-2xl font-bold text-green-800">
                    {importResult.success}
                  </p>
                  <p className="text-green-700">Importados correctamente</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-3">
                <XCircle className="w-10 h-10 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-800">
                    {importResult.failed}
                  </p>
                  <p className="text-red-700">Con errores</p>
                </div>
              </div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-medium text-gray-900 mb-2">Detalle de errores:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {importResult.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={() => setStep('upload')} variant="secondary">
              Importar más
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cerrar
              </Button>
            )}
            {onSuccess && importResult.success > 0 && (
              <Button onClick={onSuccess}>
                Ir a clientes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
