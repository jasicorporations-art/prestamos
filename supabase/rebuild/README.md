# Reconstrucción de Base de Datos - Paso a Paso (UUID)

> **Convención del proyecto**: Todos los scripts SQL deben usar `empresa_id UUID` (no VARCHAR). Ver `.cursor/rules/supabase-uuid-schema.mdc` para reglas completas.

## Objetivo
Borrar todas las tablas y recrearlas con **empresa_id como UUID** en todas las tablas. RLS correctamente configurado para:
- **super_admin**: Acceso TOTAL (empresa_id = NULL)
- **Admin**: Acceso a toda su empresa
- **Vendedor**: Acceso solo a su sucursal

## Orden de ejecución

### Fase 1: Borrar todo
1. **`00-DROP-ALL.sql`** — Ejecutar primero. Elimina tablas, triggers, funciones.

### Fase 2: Recrear (orden estricto)
2. `01-funcion-update-timestamp.sql` — Función `update_updated_at_column`
3. `02-empresas.sql` — Tabla empresas (id UUID)
4. `03-sucursales.sql` — Tabla sucursales (empresa_id UUID FK), trigger sucursal Principal
5. `04-motores.sql` — Tabla motores (empresa_id UUID FK)
6. `05-clientes.sql` — Tabla clientes (empresa_id, sucursal_id UUID FK)
7. `06-ventas.sql` — Tabla ventas (empresa_id, sucursal_id, motor_id, cliente_id UUID FK)
8. `07-pagos.sql` — Tabla pagos (empresa_id, venta_id UUID FK)
9. `08-perfiles.sql` — Tabla perfiles (empresa_id UUID FK, nullable para super_admin) + handle_new_user
10. `09-tablas-auxiliares.sql` — rutas, cajas, movimientos_caja, cuotas_detalladas, actividad_logs + triggers saldo/motor + unicidad cédula
11. **`10-funciones-rls.sql`** — get_user_empresa_id() RETURNS UUID, políticas RLS
12. `11-super-admin.sql` — Asignar rol super_admin (cambia emails)

## Esquema UUID
- **empresa_id**: UUID REFERENCES empresas(id) en todas las tablas
- **get_user_empresa_id()**: RETURNS UUID (no VARCHAR)
- **super_admin**: empresa_id = NULL en perfiles
- **Unicidad cédula**: (empresa_id, cedula) por empresa

## Triggers incluidos
- `tr_crear_sucursal_on_empresa`: crea sucursal "Principal" al insertar empresa
- `tr_actualizar_saldo_pago`: actualiza saldo_pendiente en ventas al insertar/actualizar/eliminar pagos
- `tr_vender_motor`: marca motor como "Vendido" al crear venta

## Scripts adicionales (backup, import, imágenes)

Después del rebuild, ver **`SCRIPTS-ADICIONALES.md`** para:

- **Storage/Imágenes**: `configurar-storage-documentos.sql` (bucket `documentos-dealers`)
- **Backups**: `tenant_backups` y `configuracion_sistema` ya en paso 09
- **Importación CSV**: No requiere SQL; usa `lib/services/importacion.ts`

## Importante
- **auth.users** NO se toca (es de Supabase)
- Después de cada paso, verifica en Supabase Dashboard que la tabla existe
- Si hay error de FK, revisa que ejecutaste los pasos en orden
