'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
}

const BORDERS = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleToast(e: Event) {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev.slice(-4), { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4500)
    }

    window.addEventListener('jasi:toast', handleToast)
    return () => window.removeEventListener('jasi:toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 380,
        width: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: '#fff',
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            borderLeft: `4px solid ${BORDERS[t.type]}`,
            pointerEvents: 'auto',
            animation: 'jasi-toast-in 0.25s ease',
          }}
        >
          {ICONS[t.type]}
          <p style={{ fontSize: 14, color: '#1f2937', flex: 1, lineHeight: 1.45, margin: 0 }}>
            {t.message}
          </p>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', flexShrink: 0 }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes jasi-toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
