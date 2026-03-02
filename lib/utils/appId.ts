// Tablas que no tienen columna app_id (esquema UUID usa empresa_id para multi-tenant)
const APP_ID_EXCLUDED_TABLES = new Set([
  'empresas', 'perfiles', 'cajas', 'actividad_logs', 'tenant_backups', 'rutas', 'solicitudes_cambio', 'sucursales',
  'clientes', 'ventas', 'motores', 'pagos', 'cuotas_detalladas',
])

export function getAppId(): string | null {
  const appId = process.env.NEXT_PUBLIC_APP_ID
  if (!appId || !appId.trim()) {
    return null
  }
  return appId.trim()
}

export function shouldApplyAppId(tableName?: string): boolean {
  if (!tableName) {
    return true
  }
  return !APP_ID_EXCLUDED_TABLES.has(tableName)
}

export function withAppIdFilter<T>(query: T, tableName?: string): T {
  const appId = getAppId()
  if (!appId || !shouldApplyAppId(tableName)) {
    return query
  }
  // Incluir app_id = X O app_id IS NULL (datos legacy sin app_id)
  return (query as any).or(`app_id.eq.${appId},app_id.is.null`)
}

export function withAppIdData<T extends Record<string, any> | Array<Record<string, any>>>(
  data: T,
  tableName?: string
): T {
  const appId = getAppId()
  if (!appId || !shouldApplyAppId(tableName)) {
    return data
  }
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...item, app_id: appId })) as T
  }
  return { ...data, app_id: appId }
}
