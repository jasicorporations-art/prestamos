import {
  GLOBAL_SEARCH_REGISTRY,
  type GlobalSearchRegistryEntry,
} from '@/lib/config/globalSearchRegistry'
import type { PlanType } from '@/lib/config/planes'

const ACCENT_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
  ñ: 'n',
  Á: 'a',
  É: 'e',
  Í: 'i',
  Ó: 'o',
  Ú: 'u',
  Ñ: 'n',
}

export function normalizeSearchText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .split('')
    .map((c) => ACCENT_MAP[c] ?? c)
    .join('')
    .replace(/\s+/g, ' ')
}

function entryVisible(
  e: GlobalSearchRegistryEntry,
  ctx: {
    isAdmin: boolean
    isSuperAdmin: boolean
    isCobrador: boolean
    planType: PlanType | null
  }
): boolean {
  if (e.hideOnBroncePlan && ctx.planType === 'BRONCE') return false
  if (e.access === 'admin' && !ctx.isAdmin && !ctx.isSuperAdmin) return false
  if (e.superAdminOnly && !ctx.isSuperAdmin) return false
  if (e.access === 'cobrador' && !ctx.isCobrador) return false
  if (ctx.isCobrador && e.hideForCobrador) return false
  return true
}

export type ScoredSearchHit = {
  entry: GlobalSearchRegistryEntry
  score: number
}

function scoreAgainstKeyword(queryNorm: string, keywordRaw: string): number {
  const kw = normalizeSearchText(keywordRaw)
  if (!queryNorm || !kw) return 0
  if (queryNorm === kw) return 100
  if (kw === queryNorm) return 100
  if (kw.startsWith(queryNorm) && queryNorm.length >= 2) return 88
  if (queryNorm.startsWith(kw) && kw.length >= 3) return 86
  if (queryNorm.includes(kw) && kw.length >= 4) return 72
  if (kw.includes(queryNorm) && queryNorm.length >= 3) return 68
  return 0
}

function scoreEntry(queryNorm: string, entry: GlobalSearchRegistryEntry): number {
  let max = 0
  const titleN = normalizeSearchText(entry.title)
  const descN = entry.description ? normalizeSearchText(entry.description) : ''

  for (const k of entry.keywords) {
    max = Math.max(max, scoreAgainstKeyword(queryNorm, k))
  }
  if (titleN.includes(queryNorm) && queryNorm.length >= 2) {
    max = Math.max(max, titleN === queryNorm ? 95 : 58)
  }
  if (descN && queryNorm.length >= 4 && descN.includes(queryNorm)) {
    max = Math.max(max, 42)
  }
  return max
}

export function rankGlobalSearch(
  query: string,
  ctx: {
    isAdmin: boolean
    isSuperAdmin: boolean
    isCobrador: boolean
    planType: PlanType | null
  }
): ScoredSearchHit[] {
  const q = normalizeSearchText(query)
  if (!q) return []

  const hits: ScoredSearchHit[] = []
  for (const entry of GLOBAL_SEARCH_REGISTRY) {
    if (!entryVisible(entry, ctx)) continue
    const score = scoreEntry(q, entry)
    if (score > 0) hits.push({ entry, score })
  }
  hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))

  // Unificar por href: quedarse con el mejor score por URL
  const byHref = new Map<string, ScoredSearchHit>()
  for (const h of hits) {
    const prev = byHref.get(h.entry.href)
    if (!prev || h.score > prev.score) byHref.set(h.entry.href, h)
  }
  return [...byHref.values()].sort((a, b) => b.score - a.score)
}

export type GlobalSearchDecision =
  | { kind: 'navigate'; href: string }
  | { kind: 'results'; query: string }

/**
 * Si hay una coincidencia clara → navegar; si no → página de resultados / sugerencias.
 */
export function resolveGlobalSearch(
  query: string,
  ctx: {
    isAdmin: boolean
    isSuperAdmin: boolean
    isCobrador: boolean
    planType: PlanType | null
  }
): GlobalSearchDecision {
  const q = query.trim()
  if (!q) return { kind: 'results', query: '' }

  const ranked = rankGlobalSearch(q, ctx)
  if (ranked.length === 0) return { kind: 'results', query: q }

  const best = ranked[0]
  const second = ranked[1]

  if (best.score >= 92) {
    return { kind: 'navigate', href: best.entry.href }
  }
  if (best.score >= 78 && (!second || best.score - second.score >= 22)) {
    return { kind: 'navigate', href: best.entry.href }
  }
  // Varias coincidencias o término ambiguo (ej. nombre propio)
  return { kind: 'results', query: q }
}

export function getSuggestionList(
  query: string,
  ctx: Parameters<typeof rankGlobalSearch>[1],
  limit = 12
): ScoredSearchHit[] {
  return rankGlobalSearch(query, ctx).slice(0, limit)
}

/** Todas las secciones buscables (para exploración cuando no hay término). */
export function getAllSearchableDestinations(
  ctx: Parameters<typeof rankGlobalSearch>[1]
): GlobalSearchRegistryEntry[] {
  return GLOBAL_SEARCH_REGISTRY.filter((e) => entryVisible(e, ctx)).sort((a, b) =>
    a.title.localeCompare(b.title, 'es')
  )
}
