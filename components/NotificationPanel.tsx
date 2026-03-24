'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  ChevronRight,
  Bell,
  Banknote,
} from 'lucide-react'

export type NotificationItem = {
  id: string
  type: 'aprobacion' | 'mora' | 'mensaje' | 'pagos_verificar'
  title: string
  description: string
  href: string
  count: number
  icon: ReactNode
  color: string
}

type NotificationPanelProps = {
  aprobaciones: number
  mora: number
  mensajes?: number
  pagosVerificar?: number
  isAdmin: boolean
  /** Admin o cobrador: ven “Pagos por verificar” */
  puedeVerPagosVerificar?: boolean
  onClose: () => void
  onRefresh?: () => void
}

export function NotificationPanel({
  aprobaciones,
  mora,
  mensajes = 0,
  pagosVerificar = 0,
  isAdmin,
  puedeVerPagosVerificar = false,
  onClose,
}: NotificationPanelProps) {
  const items: NotificationItem[] = [
    {
      id: 'aprobacion',
      type: 'aprobacion',
      title: 'Aprobaciones',
      description: aprobaciones > 0
        ? `${aprobaciones} solicitud${aprobaciones !== 1 ? 'es' : ''} pendiente${aprobaciones !== 1 ? 's' : ''} de aprobación`
        : 'Sin solicitudes pendientes',
      href: '/admin/aprobaciones',
      count: aprobaciones,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-fuchsia-400 bg-fuchsia-500/20',
    },
    {
      id: 'pagos-verificar',
      type: 'pagos_verificar',
      title: 'Pagos por verificar',
      description:
        pagosVerificar > 0
          ? `${pagosVerificar} comprobante${pagosVerificar !== 1 ? 's' : ''} pendiente${pagosVerificar !== 1 ? 's' : ''} de revisión`
          : 'Sin comprobantes pendientes',
      href: '/admin/pagos-verificar',
      count: pagosVerificar,
      icon: <Banknote className="w-5 h-5" />,
      color: 'text-lime-400 bg-lime-500/20',
    },
    {
      id: 'mora',
      type: 'mora',
      title: 'Mora / Atraso',
      description: mora > 0
        ? `${mora} cliente${mora !== 1 ? 's' : ''} en mora o atraso`
        : 'Ningún cliente en mora',
      href: '/admin/mora',
      count: mora,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-orange-400 bg-orange-500/20',
    },
    {
      id: 'mensaje',
      type: 'mensaje',
      title: 'Mensajes',
      description: mensajes > 0
        ? `${mensajes} mensaje${mensajes !== 1 ? 's' : ''} sin leer`
        : 'Sin mensajes nuevos',
      href: '/dashboard',
      count: mensajes,
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'text-cyan-400 bg-cyan-500/20',
    },
  ]

  const visibleItems = items.filter((item) => {
    if (item.type === 'aprobacion') return isAdmin
    if (item.type === 'pagos_verificar') return false
    return true
  })

  // Mismo total que las filas visibles (cobrador no suma aprobaciones ocultas)
  const totalCount = visibleItems.reduce((sum, item) => sum + item.count, 0)

  return (
    <div
      className="absolute right-0 top-full mt-1 w-[min(320px,90vw)] py-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-[70]"
      style={{ backgroundColor: '#1e293b' }}
      role="dialog"
      aria-label="Notificaciones del sistema"
    >
      <div className="px-4 py-2 border-b border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">Notificaciones</span>
          {totalCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </div>
      </div>
      <div className="py-1 max-h-[70vh] overflow-y-auto">
        {visibleItems.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500 text-center">
            No hay notificaciones disponibles.
          </p>
        ) : (
          <ul className="py-1">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors group"
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      {item.title}
                      {item.count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="px-4 py-2 border-t border-slate-600">
        <Link
          href={isAdmin ? '/admin/mora' : '/dashboard'}
          onClick={onClose}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          Ver todo
        </Link>
      </div>
    </div>
  )
}
