# 📴 Sistema de Sincronización Offline

## ✅ Funcionalidad Implementada

La aplicación ahora **guarda automáticamente los formularios cuando no hay conexión a internet** y los **sincroniza automáticamente cuando regresa el internet**.

## 🎯 Cómo Funciona

### 1. **Detección de Conexión**
- La app detecta automáticamente si hay conexión a internet
- Muestra un indicador visual cuando está offline

### 2. **Guardado Offline**
Cuando no hay conexión y el usuario envía un formulario:
- ✅ El formulario se guarda automáticamente en `localStorage`
- ✅ Se muestra un mensaje: "Sin conexión. Los cambios se guardarán cuando regrese el internet"
- ✅ El formulario se cierra normalmente

### 3. **Sincronización Automática**
Cuando regresa el internet:
- ✅ La app detecta automáticamente la reconexión
- ✅ Sincroniza todas las operaciones guardadas offline
- ✅ Muestra un mensaje de éxito: "X operación(es) sincronizada(s) exitosamente"

## 📋 Formularios que Funcionan Offline

Todos los formularios principales soportan guardado offline:

1. **Emitir Préstamo** (`VentaForm`)
2. **Crear/Editar Cliente** (`ClienteForm`)
3. **Registrar Pago** (`PagoForm`)
4. **Crear/Editar Préstamo** (`MotorForm`)

## 🔔 Indicadores Visuales

### Cuando está Offline:
- 📴 Banner amarillo: "Modo offline - Los cambios se guardarán cuando regrese el internet"

### Cuando hay Operaciones Pendientes:
- 🔄 Banner azul: "X operación(es) pendiente(s) - Sincronizando..."

### Cuando se Sincroniza:
- ✅ Banner verde: "X operación(es) sincronizada(s) exitosamente"

## 🔧 Componentes Técnicos

### Archivos Creados:

1. **`lib/services/offlineSync.ts`**
   - Gestiona la cola de operaciones pendientes
   - Guarda/recupera operaciones de `localStorage`

2. **`lib/services/syncService.ts`**
   - Sincroniza operaciones pendientes con Supabase
   - Maneja errores y reintentos

3. **`lib/hooks/useOnlineStatus.ts`**
   - Hook para detectar estado de conexión
   - Dispara eventos cuando regresa el internet

4. **`lib/utils/offlineHelper.ts`**
   - Helper para ejecutar operaciones con fallback offline
   - Detecta errores de red automáticamente

5. **`components/OfflineSyncManager.tsx`**
   - Componente que muestra indicadores visuales
   - Maneja la sincronización automática

## 📝 Limitaciones

### ✅ Lo que SÍ funciona offline:
- Guardar formularios (crear clientes, préstamos, pagos, ventas)
- Ver indicadores de estado
- Sincronización automática al reconectar

### ❌ Lo que NO funciona offline:
- Ver datos de la base de datos (requiere conexión)
- Autenticación (requiere servidor)
- Operaciones en tiempo real

## 🧪 Cómo Probar

1. **Abrir la aplicación** en el navegador
2. **Desconectar el internet** (o usar DevTools → Network → Offline)
3. **Crear un cliente, préstamo o pago**
4. **Verás el mensaje**: "Sin conexión. Los cambios se guardarán cuando regrese el internet"
5. **Reconectar el internet**
6. **Verás automáticamente**: "X operación(es) sincronizada(s) exitosamente"

## 🔍 Ver Operaciones Pendientes

Puedes ver las operaciones pendientes en la consola del navegador:
```javascript
// En la consola (F12)
localStorage.getItem('offline_pending_operations')
```

## 🗑️ Limpiar Operaciones Pendientes

Si necesitas limpiar las operaciones pendientes (útil para debugging):
```javascript
// En la consola (F12)
localStorage.removeItem('offline_pending_operations')
```

## ⚙️ Configuración

### Máximo de Reintentos
Por defecto, cada operación se intenta sincronizar hasta **3 veces** antes de marcarse como fallida.

Puedes cambiar esto en `lib/services/offlineSync.ts`:
```typescript
const MAX_RETRIES = 3 // Cambiar este valor
```

## 🐛 Solución de Problemas

### Las operaciones no se sincronizan:
1. Verifica que hay conexión a internet
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que Supabase esté accesible

### Las operaciones se guardan pero no aparecen:
1. Las operaciones se sincronizan automáticamente cuando regresa el internet
2. Recarga la página después de sincronizar para ver los datos actualizados

### Quiero forzar una sincronización:
```javascript
// En la consola (F12)
import { syncService } from '@/lib/services/syncService'
await syncService.syncAll()
```

## 📊 Estadísticas

El sistema guarda:
- Tipo de operación (create, update, delete)
- Entidad (venta, cliente, pago, motor)
- Datos completos del formulario
- Timestamp de cuando se guardó
- Número de reintentos

## ✅ Resumen

**Sí, los formularios se guardan automáticamente cuando no hay internet y se sincronizan automáticamente cuando regresa el internet.** 

No necesitas hacer nada manualmente - todo es automático. 🎉



