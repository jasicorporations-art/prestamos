/**
 * Service Worker profesional - JASICORPORATIONS PWA
 * Estrategia: Cache-First para activos estáticos (offline-first)
 * Eventos: install, fetch, push. Cache versionado para actualizaciones.
 */

const CACHE_VERSION = 'jasi-v5'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGE_CACHE = `${CACHE_VERSION}-pages`
const OFFLINE_URL = '/offline.html'

// Patrones para activos estáticos (Cache-First)
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/_next\/static\/media\//,
  /\/screenshots\//,
  /\/splash\//,
  /\.(woff2?|ttf|eot|otf)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  /\/manifest\.json$/,
  /\/favicon\.ico$/,
  /\/icon-\d+x\d+\.png$/,
  /\/apple-touch-icon\.png$/,
]

function isStaticAsset(url) {
  try {
    const path = new URL(url).pathname
    return STATIC_PATTERNS.some((re) => re.test(path))
  } catch {
    return false
  }
}

// Instalación: precache solo offline + manifest (no precachear rutas de auth)
self.addEventListener('install', (event) => {
  const staticPrecache = [OFFLINE_URL, '/manifest.json', '/splash/splash-1284x2778.png']
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(staticPrecache.map((url) => cache.add(url).catch(() => {})))
    )
  )
  self.skipWaiting()
})

// Activación: limpiar caches antiguos y tomar control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name.startsWith('jasi-') && name !== STATIC_CACHE && name !== PAGE_CACHE)
          .map((name) => {
            console.log('[SW] Eliminando cache obsoleto:', name)
            return caches.delete(name)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// URLs que NUNCA deben cachearse (auth, API, Supabase)
function isBypassUrl(url) {
  try {
    const u = url.toLowerCase()
    return (
      u.includes('supabase.co') ||
      u.includes('/api/') ||
      u.includes('auth.') ||
      u.includes('realtime') ||
      u.includes('tile.openstreetmap.org') ||
      u.includes('basemaps.cartocdn.com') ||
      u.includes('maps.wikimedia.org')
    )
  } catch {
    return false
  }
}

// Fetch: NO interceptar navegación ni document (evita login bloqueado en escritorio)
// Solo cache para activos estáticos (imágenes, fuentes, _next/static)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = event.request.url

  // NUNCA interceptar: auth, API, Supabase, navegación ni documentos
  if (isBypassUrl(url)) return
  if (event.request.mode === 'navigate' || event.request.destination === 'document') return

  // Solo activos estáticos (imágenes, fuentes, _next/static): Cache-First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // API y demás: solo red
  event.respondWith(fetch(event.request))
})

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    return new Response('', { status: 503 })
  }
}

// Push: listener preparado para notificaciones de solicitudes de préstamos
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = { title: 'JASICORPORATIONS', body: 'Tienes una nueva notificación' }
  try {
    payload = event.data.json()
  } catch {
    payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'JASICORPORATIONS', {
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: payload.tag || 'default',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false,
    })
  )
})

// Background Sync: sincronizar operaciones pendientes cuando regresa la conexión
const OFFLINE_OPS_DB = 'jasi-offline-ops'
const OFFLINE_OPS_STORE = 'pending_ops'

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_OPS_DB, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(OFFLINE_OPS_STORE)) {
        db.createObjectStore(OFFLINE_OPS_STORE, { keyPath: 'id' })
      }
    }
  })
}

async function getPendingOpsFromDB() {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_OPS_STORE, 'readonly')
    const req = tx.objectStore(OFFLINE_OPS_STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

async function removeOpsFromDB(ids) {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_OPS_STORE, 'readwrite')
    const store = tx.objectStore(OFFLINE_OPS_STORE)
    ids.forEach((id) => store.delete(id))
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-ops') {
    event.waitUntil(
      getPendingOpsFromDB()
        .then((ops) => {
          if (!ops || ops.length === 0) return
          return fetch(`${self.location.origin}/api/sync-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ operations: ops }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.syncedIds?.length) {
                return removeOpsFromDB(result.syncedIds)
              }
            })
        })
        .then(() => {
          console.log('[SW] Background Sync completado')
        })
        .catch((err) => {
          console.error('[SW] Error en Background Sync:', err)
        })
    )
  }
})

// Limpieza de datos sensibles al cerrar sesión (mensaje desde el cliente)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'clearSensitiveData') {
    event.waitUntil(
      Promise.all([
        caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
        openOfflineDB().then((db) => new Promise((res) => {
          const tx = db.transaction(OFFLINE_OPS_STORE, 'readwrite')
          tx.objectStore(OFFLINE_OPS_STORE).clear()
          tx.oncomplete = () => { db.close(); res() }
        })).catch(() => {}),
      ]).then(() => {
        console.log('[SW] Caches y datos sensibles limpiados por cierre de sesión')
      })
    )
  }
})

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then((c) => c?.focus())
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
