/**
 * Registro central de destinos para el buscador global.
 * Para añadir una página nueva: agregar un objeto con href, title, keywords y access.
 */
export type GlobalSearchAccess = 'all' | 'admin' | 'cobrador'

export type GlobalSearchRegistryEntry = {
  /** Identificador estable (útil para tests o analytics) */
  id: string
  href: string
  title: string
  description?: string
  /** Palabras clave (minúsculas, sin acentos en el código; se normalizan al comparar) */
  keywords: string[]
  /**
   * all: cualquier usuario autenticado con shell
   * admin: admin o super_admin (cobrador no ve estas entradas en resultados)
   * cobrador: visible solo para cobrador (p. ej. no aplica hoy; reservado)
   */
  access: GlobalSearchAccess
  /** Ocultar si el plan es BRONCE (tesorería / migración) */
  hideOnBroncePlan?: boolean
  /** No sugerir a usuarios con rol cobrador (solo ven ruta, clientes, cobros) */
  hideForCobrador?: boolean
  /** Solo super_admin (p. ej. auditoría multi-tenant) */
  superAdminOnly?: boolean
}

const K = (words: string[]) => words

export const GLOBAL_SEARCH_REGISTRY: GlobalSearchRegistryEntry[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    title: 'Dashboard',
    description: 'Resumen e indicadores',
    keywords: K(['dashboard', 'inicio', 'resumen', 'panel', 'principal', 'home']),
    access: 'all',
  },
  {
    id: 'clientes',
    href: '/clientes',
    title: 'Clientes',
    description: 'Listado y expedientes de clientes',
    keywords: K([
      'cliente',
      'clientes',
      'contacto',
      'contactos',
      'persona',
      'cedula',
      'cédula',
      'telefono',
      'teléfono',
      'celular',
      'garante',
      'expediente',
    ]),
    access: 'all',
  },
  {
    id: 'motores',
    href: '/motores',
    title: 'Productos',
    description: 'Catálogo de productos / motores',
    keywords: K([
      'producto',
      'productos',
      'motor',
      'motores',
      'inventario',
      'catalogo',
      'catálogo',
      'articulo',
      'artículo',
      'sku',
      'equipo',
    ]),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'ventas',
    href: '/ventas',
    title: 'Emitir financiamiento',
    description: 'Nuevos financiamientos y cartera',
    keywords: K([
      'venta',
      'ventas',
      'financiamiento',
      'financiar',
      'prestamo',
      'préstamo',
      'credito',
      'crédito',
      'cartera',
      'contrato',
      'emitir',
    ]),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'factura',
    href: '/ventas',
    title: 'Facturación',
    description: 'Financiamientos y documentos por venta',
    keywords: K(['factura', 'facturas', 'facturacion', 'facturación', 'comprobante', 'ticket']),
    access: 'all',
  },
  {
    id: 'pagos',
    href: '/pagos',
    title: 'Cobros',
    description: 'Registrar pagos y recibos',
    keywords: K([
      'pago',
      'pagos',
      'cobro',
      'cobros',
      'recaudacion',
      'recaudación',
      'recibo',
      'abono',
      'cuota',
      'transaccion',
      'transacción',
    ]),
    access: 'all',
  },
  {
    id: 'ruta',
    href: '/ruta',
    title: 'Mi ruta de hoy',
    description: 'Ruta de cobranza del día',
    keywords: K(['ruta', 'rutas', 'cobranza', 'visita', 'terreno', 'hoy']),
    access: 'all',
  },
  {
    id: 'caja',
    href: '/caja',
    title: 'Caja',
    description: 'Movimientos y cierre de caja',
    keywords: K(['caja', 'cajas', 'arqueo', 'efectivo', 'cierre caja']),
    access: 'admin',
  },
  {
    id: 'whatsapp',
    href: '/dashboard/whatsapp-connections',
    title: 'Conexión WhatsApp',
    description: 'WhatsApp Business',
    keywords: K(['whatsapp', 'whats app', 'meta', 'mensaje', 'notificacion', 'notificación']),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'recordatorios',
    href: '/recordatorios',
    title: 'Recordatorios',
    description: 'Avisos y recordatorios de cobro',
    keywords: K(['recordatorio', 'recordatorios', 'aviso', 'avisos', 'recordar']),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'precios',
    href: '/precios',
    title: 'Precios y planes',
    description: 'Suscripción y planes',
    keywords: K(['precio', 'precios', 'plan', 'planes', 'suscripcion', 'suscripción', 'pagar sistema']),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'admin',
    href: '/admin',
    title: 'Panel administración',
    description: 'Resumen administrativo',
    keywords: K(['admin', 'administracion', 'administración', 'panel admin', 'estadisticas']),
    access: 'admin',
  },
  {
    id: 'aprobaciones',
    href: '/admin/aprobaciones',
    title: 'Aprobaciones',
    description: 'Solicitudes pendientes',
    keywords: K(['aprobacion', 'aprobaciones', 'pendiente', 'aprobar', 'solicitud']),
    access: 'admin',
  },
  {
    id: 'admin-rutas',
    href: '/admin/rutas',
    title: 'Rutas (admin)',
    description: 'Gestión de rutas de cobradores',
    keywords: K(['asignar ruta', 'rutas cobrador', 'gestion ruta']),
    access: 'admin',
  },
  {
    id: 'mapa-cobros',
    href: '/admin/mapa-cobros',
    title: 'Mapa de cobros',
    description: 'Ubicación de cobros en mapa',
    keywords: K(['mapa', 'mapa cobros', 'ubicacion', 'ubicación', 'gps']),
    access: 'admin',
  },
  {
    id: 'usuarios',
    href: '/admin/usuarios',
    title: 'Usuarios',
    description: 'Usuarios y roles del sistema',
    keywords: K(['usuario', 'usuarios', 'cobrador', 'personal', 'staff', 'empleado', 'rol']),
    access: 'admin',
  },
  {
    id: 'config-empresa',
    href: '/admin/configuracion-empresa',
    title: 'Configuración de empresa',
    description: 'Datos de la empresa',
    keywords: K(['empresa', 'configuracion empresa', 'datos empresa', 'logo empresa']),
    access: 'admin',
  },
  {
    id: 'sucursales',
    href: '/admin/sucursales',
    title: 'Sucursales',
    description: 'Sucursales y ubicaciones',
    keywords: K(['sucursal', 'sucursales', 'tienda', 'local']),
    access: 'admin',
  },
  {
    id: 'historial',
    href: '/admin/historial',
    title: 'Historial',
    description: 'Actividad del sistema',
    keywords: K(['historial', 'actividad', 'log', 'auditoria', 'auditoría']),
    access: 'admin',
  },
  {
    id: 'auditoria-global',
    href: '/super-admin/auditoria',
    title: 'Auditoría global',
    description: 'Movimientos BD de todas las empresas (triggers)',
    keywords: K([
      'auditoria global',
      'auditoría global',
      'super admin auditoria',
      'historial movimientos',
      'tenant',
      'multitenant',
    ]),
    access: 'admin',
    superAdminOnly: true,
  },
  {
    id: 'admin-cajas',
    href: '/admin/cajas',
    title: 'Cajas (administración)',
    description: 'Administración de cajas por sucursal',
    keywords: K(['cajas sucursal', 'admin caja']),
    access: 'admin',
  },
  {
    id: 'tesoreria',
    href: '/admin/tesoreria',
    title: 'Tesorería',
    description: 'Consolidado financiero',
    keywords: K(['tesoreria', 'tesorería', 'consolidado', 'flujo']),
    access: 'admin',
    hideOnBroncePlan: true,
  },
  {
    id: 'backup',
    href: '/admin/backup',
    title: 'Backup',
    description: 'Respaldo de datos',
    keywords: K(['backup', 'respaldo', 'exportar bd', 'restaurar']),
    access: 'admin',
  },
  {
    id: 'credito-local',
    href: '/admin/credito-local',
    title: 'Crédito local',
    description: 'Gestión de crédito local',
    keywords: K(['credito local', 'crédito local', 'judicial', 'legal local']),
    access: 'admin',
  },
  {
    id: 'mora',
    href: '/admin/mora',
    title: 'Gestión de mora',
    description: 'Clientes en mora',
    keywords: K(['mora', 'moroso', 'morosos', 'vencido', 'atraso', 'morosidad']),
    access: 'admin',
  },
  {
    id: 'amortizacion',
    href: '/ventas',
    title: 'Amortización / tablas de pago',
    description: 'Desde cada venta: ver amortización',
    keywords: K(['amortizacion', 'amortización', 'tabla pago', 'cronograma', 'cuotas plan']),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'proveedor',
    href: '/motores',
    title: 'Proveedores / stock',
    description: 'Productos y referencias',
    keywords: K(['proveedor', 'proveedores', 'stock', 'almacen', 'almacén']),
    access: 'all',
    hideForCobrador: true,
  },
  {
    id: 'academia',
    href: '/academia',
    title: 'Ayuda / Academia',
    description: 'Tutoriales y ayuda',
    keywords: K(['ayuda', 'academia', 'tutorial', 'como usar', 'manual']),
    access: 'all',
  },
]
