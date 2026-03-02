# Scripts adicionales (después del rebuild)

Después de ejecutar los pasos 00 → 11 del rebuild, ejecuta estos scripts según lo que necesites.

## 1. Storage / Imágenes (documentos de clientes)

Para que funcionen las fotos de cédula (frontal/trasera) y contratos:

1. **Crear bucket manualmente** en Supabase: Storage → Create bucket → `documentos-dealers` → Public: Yes
2. **Ejecutar**: `supabase/configurar-storage-documentos.sql`  
   O la versión simple: `supabase/CONFIGURAR_STORAGE_SIMPLE.sql`

Las columnas `url_id_frontal`, `url_id_trasera`, `url_contrato` ya están en la tabla `clientes` (paso 05).

---

## 2. Backups en la nube

La tabla `tenant_backups` y `configuracion_sistema` ya están en el paso 09.

Para funciones extra de backup (opcional):

- `supabase/configurar-backups-simple.sql` — añade `obtener_info_backup()` y `actualizar_ultimo_backup()`

---

## 3. Importación de clientes (CSV)

No requiere script SQL. La importación usa:

- `lib/services/importacion.ts`
- `components/ImportacionClientes.tsx`
- Ruta: `/clientes/importar`

Solo necesitas que las tablas `clientes`, `ventas`, `motores` existan (ya creadas en el rebuild).

---

## Resumen de orden

| Orden | Script | Descripción |
|-------|--------|-------------|
| 1–12 | 00 → 11 | Rebuild completo (UUID) |
| 13 | `configurar-storage-documentos.sql` | Bucket para imágenes/documentos |
| 14 | `configurar-backups-simple.sql` | (Opcional) Funciones de backup |
