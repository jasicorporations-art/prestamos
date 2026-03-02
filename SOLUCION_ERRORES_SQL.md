# 🔧 Solución de Errores al Ejecutar Scripts SQL

## ⚠️ Problemas Comunes

Si estás teniendo errores al ejecutar los scripts SQL en Supabase, sigue estos pasos:

## 📋 Script 1: Agregar Cantidad a Motores

### Si el error es: "column already exists"
La columna ya existe. Ejecuta solo las partes que faltan:

```sql
-- Verificar si la columna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'motores' AND column_name = 'cantidad';

-- Si existe pero no tiene el constraint, ejecuta:
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);
```

### Si el error es: "constraint already exists"
El constraint ya existe. Ejecuta:

```sql
-- Eliminar y recrear el constraint
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);
```

### Solución Completa (Versión Simple)
Usa el archivo: `supabase/agregar-cantidad-motores-simple.sql`

Este script es más seguro y maneja mejor los casos donde la columna ya existe.

---

## 📋 Script 2: Agregar Número de Préstamo a Clientes

### Si el error es: "duplicate key value violates unique constraint"
Hay números duplicados. Ejecuta este script de limpieza primero:

```sql
-- Limpiar números duplicados
UPDATE clientes 
SET numero_prestamo_cliente = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY numero_prestamo_cliente 
             ORDER BY created_at
           ) as rn
    FROM clientes
    WHERE numero_prestamo_cliente IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Luego ejecuta el script completo nuevamente
```

### Si el error es: "column already exists"
La columna ya existe. Ejecuta solo las partes que faltan:

```sql
-- Verificar si la columna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' AND column_name = 'numero_prestamo_cliente';

-- Si existe pero no tiene el constraint UNIQUE, ejecuta:
ALTER TABLE clientes 
DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;

ALTER TABLE clientes 
ADD CONSTRAINT clientes_numero_prestamo_cliente_key 
UNIQUE (numero_prestamo_cliente);

CREATE INDEX IF NOT EXISTS idx_clientes_numero_prestamo ON clientes(numero_prestamo_cliente);
```

### Solución Completa (Versión Simple)
Usa el archivo: `supabase/agregar-numero-prestamo-cliente-simple.sql`

Este script es más seguro y maneja mejor los casos donde la columna ya existe.

---

## 🚀 Pasos Recomendados

### Opción 1: Usar las Versiones Simplificadas (RECOMENDADO)

1. **Para cantidad de motores:**
   - Abre `supabase/agregar-cantidad-motores-simple.sql`
   - Copia todo el contenido
   - Pega en Supabase SQL Editor
   - Ejecuta (Run)

2. **Para número de préstamo de clientes:**
   - Abre `supabase/agregar-numero-prestamo-cliente-simple.sql`
   - Copia todo el contenido
   - Pega en Supabase SQL Editor
   - Ejecuta (Run)

### Opción 2: Verificar Estado Actual

Antes de ejecutar, verifica qué ya existe:

```sql
-- Verificar columnas de motores
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'motores'
ORDER BY ordinal_position;

-- Verificar columnas de clientes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clientes'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('motores', 'clientes');
```

### Opción 3: Limpiar y Empezar de Nuevo

Si quieres empezar limpio (⚠️ CUIDADO: Esto eliminará datos):

```sql
-- SOLO si quieres eliminar las columnas y empezar de nuevo
-- ⚠️ ADVERTENCIA: Esto eliminará los datos en esas columnas

-- Para motores:
ALTER TABLE motores DROP COLUMN IF EXISTS cantidad;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

-- Para clientes:
ALTER TABLE clientes DROP COLUMN IF EXISTS numero_prestamo_cliente;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;
```

Luego ejecuta los scripts simplificados.

---

## ✅ Verificación Final

Después de ejecutar los scripts, verifica que todo esté correcto:

```sql
-- Verificar cantidad en motores
SELECT COUNT(*) as total_motores,
       COUNT(cantidad) as motores_con_cantidad,
       MIN(cantidad) as cantidad_minima,
       MAX(cantidad) as cantidad_maxima
FROM motores;

-- Verificar número de préstamo en clientes
SELECT COUNT(*) as total_clientes,
       COUNT(numero_prestamo_cliente) as clientes_con_numero,
       COUNT(DISTINCT numero_prestamo_cliente) as numeros_unicos
FROM clientes;

-- Verificar que no hay duplicados en clientes
SELECT numero_prestamo_cliente, COUNT(*) as cantidad
FROM clientes
WHERE numero_prestamo_cliente IS NOT NULL
GROUP BY numero_prestamo_cliente
HAVING COUNT(*) > 1;
```

Si la última consulta devuelve 0 filas, ¡todo está correcto! ✅

---

## 📞 Si Aún Tienes Problemas

1. **Copia el mensaje de error completo** de Supabase
2. **Verifica qué columnas y constraints ya existen** usando las consultas de verificación
3. **Ejecuta los scripts simplificados** en lugar de los originales
4. Si el problema persiste, ejecuta los scripts paso por paso, verificando cada uno



