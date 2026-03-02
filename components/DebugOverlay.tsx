'use client'

import { useEffect, useState } from 'react'

type DebugEntry = {
  id: string
  message: string
  source?: string
  time: string
}

export function DebugOverlay() {
  const [enabled, setEnabled] = useState(false)
  const [entries, setEntries] = useState<DebugEntry[]>([])

  useEffect(() => {
    const updateEnabled = () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      setEnabled(params.get('debug') === '1')
    }

    updateEnabled()
    window.addEventListener('popstate', updateEnabled)
    return () => window.removeEventListener('popstate', updateEnabled)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const pushEntry = (message: string, source?: string) => {
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          message,
          source,
          time: new Date().toLocaleTimeString('es-DO'),
        },
        ...prev,
      ].slice(0, 10))
    }

    const onError = (event: ErrorEvent) => {
      const message = event.message || 'Error desconocido'
      pushEntry(message, event.filename)
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const message =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message || 'Promise rechazado'
      pushEntry(message)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[92vw] max-w-md rounded-lg border border-red-200 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-red-700">Debug (solo soporte)</p>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={() => setEnabled(false)}
        >
          Ocultar
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-500">Sin errores capturados todavía.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded border border-red-100 bg-red-50 p-2 text-xs text-red-800">
              <div className="font-semibold">{entry.time}</div>
              <div>{entry.message}</div>
              {entry.source && <div className="text-[10px] text-red-600">{entry.source}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
