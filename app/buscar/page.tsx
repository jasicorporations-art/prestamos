'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, Users, ArrowRight, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { perfilesService } from '@/lib/services/perfiles'
import type { PlanType } from '@/lib/config/planes'
import {
  getSuggestionList,
  getAllSearchableDestinations,
  normalizeSearchText,
} from '@/lib/utils/globalSearch'

function BuscarContent() {
  const searchParams = useSearchParams()
  const rawQ = searchParams.get('q') ?? ''
  const q = rawQ.trim()

  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isCobrador, setIsCobrador] = useState(false)
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const metaPlan = (session?.user?.user_metadata?.planType as PlanType) || 'TRIAL'
        if (!cancelled) setPlanType(metaPlan)
        const rol = await perfilesService.getRolActual()
        const cob = (rol ?? '').toLowerCase() === 'cobrador'
        const superA = rol === 'super_admin'
        const admin =
          superA || (!cob && ((rol ?? '').toLowerCase() === 'admin' || metaPlan === 'TRIAL'))
        if (!cancelled) {
          setIsCobrador(cob)
          setIsSuperAdmin(superA)
          setIsAdmin(admin)
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false)
          setIsCobrador(false)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ctx = useMemo(
    () => ({ isAdmin, isSuperAdmin, isCobrador, planType }),
    [isAdmin, isSuperAdmin, isCobrador, planType]
  )

  const suggestions = useMemo(() => {
    if (!ready || !q) return []
    return getSuggestionList(q, ctx, 16)
  }, [ready, q, ctx])

  const allDestinations = useMemo(() => {
    if (!ready) return []
    return getAllSearchableDestinations(ctx)
  }, [ready, ctx])

  const qNorm = normalizeSearchText(q)
  const hasWeakMatch = suggestions.length > 0 && suggestions[0].score < 50
  const noMatch = ready && q.length > 0 && suggestions.length === 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
        <Search className="w-7 h-7 text-sky-600" aria-hidden />
        Búsqueda
      </h1>
      <p className="text-gray-600 mt-1 text-sm">
        Resultados y enlaces según tu consulta. Usa el buscador del menú superior para una nueva búsqueda.
      </p>

      {!ready ? (
        <p className="mt-8 text-gray-500">Cargando…</p>
      ) : !q ? (
        <div className="mt-8">
          <p className="text-gray-700 mb-4 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-gray-500" />
            Secciones disponibles según tu perfil:
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {allDestinations.map((d) => (
              <li key={d.id}>
                <Link
                  href={d.href}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{d.title}</span>
                  {d.description && (
                    <span className="text-xs text-gray-500 mt-0.5">{d.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-gray-700">
            Consulta: <strong className="text-gray-900">&quot;{q}&quot;</strong>
          </p>

          <div className="rounded-xl border-2 border-sky-100 bg-sky-50/80 p-4">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">¿Buscas una persona o cédula?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Filtra el listado de clientes por nombre, cédula o teléfono.
                </p>
                <Link
                  href={`/clientes?search=${encodeURIComponent(q)}`}
                  className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-sky-700 hover:text-sky-900"
                >
                  Buscar en clientes
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {noMatch && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm"
              role="status"
            >
              No hay una sección que coincida de forma clara con &quot;{q}&quot;. Prueba con otra palabra
              (por ejemplo: <strong>productos</strong>, <strong>cobros</strong>, <strong>factura</strong>) o
              usa el acceso directo a clientes arriba.
            </div>
          )}

          {hasWeakMatch && suggestions.length > 0 && (
            <p className="text-sm text-gray-600">
              Coincidencias aproximadas — elige la sección que necesitas:
            </p>
          )}

          {suggestions.length > 0 && (
            <ul className="space-y-2">
              {suggestions.map(({ entry, score }) => (
                <li key={entry.id}>
                  <Link
                    href={entry.href}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-sky-300 hover:bg-sky-50/30 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{entry.title}</span>
                      {entry.description && (
                        <span className="block text-xs text-gray-500 mt-0.5">{entry.description}</span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-sky-600 hidden sm:block flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!noMatch && !hasWeakMatch && suggestions.length > 0 && qNorm.length > 0 && (
            <p className="text-xs text-gray-500">
              Si ninguna opción es la adecuada, revisa la lista completa abajo o busca en clientes.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">Cargando búsqueda…</div>
      }
    >
      <BuscarContent />
    </Suspense>
  )
}
