# 📋 ¿Qué Scripts SQL Debes Ejecutar en Supabase?

## ✅ Respuesta Corta

**NO necesitas ejecutar todos los scripts.** Solo necesitas:

1. **OBLIGATORIO:** `schema.sql` (crea las tablas base)
2. **OPCIONALES:** Los scripts de "agregar" solo si necesitas esas funcionalidades

---

## 📊 Guía Completa de Scripts SQL

### 🔴 OBLIGATORIO (Debes ejecutarlo)

#### 1. `schema.sql` ⭐ **ESENCIAL**
**¿Qué hace?**
- Crea las 4 tablas principales: `motores`, `clientes`, `ventas`, `pagos`
- Crea los triggers para actualizar `updated_at` automáticamente
- Crea los índices básicos

**¿Cuándo ejecutarlo?**
- ✅ **SIEMPRE** al crear un nuevo proyecto de Supabase
- ✅ Solo una vez al inicio

**¿Cómo ejecutarlo?**
1. Abre `supabase/schema.sql`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Ejecuta (Run)

---

### 🟡 OPCIONALES (Solo si necesitas esas funcionalidades)

#### 2. `agregar-cantidad-motores.sql` o `agregar-cantidad-motores-simple.sql`
**¿Qué hace?**
- Agrega el campo `cantidad` a la tabla `motores`
- Permite gestionar múltiples unidades del mismo préstamo

**¿Cuándo ejecutarlo?**
- ✅ Si quieres usar la funcionalidad de "Préstamos Disponibles"
- ✅ Si quieres gestionar inventario de préstamos

**Recomendación:** Usa la versión `-simple.sql` (más segura)

---

#### 3. `agregar-numero-prestamo-cliente.sql` o `agregar-numero-prestamo-cliente-simple.sql`
**¿Qué hace?**
- Agrega el campo `numero_prestamo_cliente` a la tabla `clientes`
- Genera números únicos automáticamente (CLI-0001, CLI-0002, etc.)

**¿Cuándo ejecutarlo?**
- ✅ Si quieres que cada cliente tenga un número único de préstamo
- ✅ Si usas la funcionalidad de números automáticos para clientes

**Recomendación:** Usa la versión `-simple.sql` (más segura)

---

#### 4. `agregar-campos-clientes.sql`
**¿Qué hace?**
- Agrega campos adicionales a clientes:
  - `celular`
  - `fecha_compra`
  - `fecha_finalizacion_prestamo`
  - `dia_pagos`

**¿Cuándo ejecutarlo?**
- ✅ Si quieres guardar información adicional de los clientes
- ✅ Si usas recordatorios de pagos

---

#### 5. `agregar-plazo-ventas.sql`
**¿Qué hace?**
- Agrega campos de plazo de financiamiento a la tabla `ventas`:
  - `plazo_meses`
  - `porcentaje_interes`
  - `tipo_interes`

**¿Cuándo ejecutarlo?**
- ✅ Si quieres calcular intereses según el plazo
- ✅ Si usas la funcionalidad de financiamiento con intereses

---

### ⚠️ NO EJECUTAR (Solo documentación)

#### 6. `crear-usuario.sql`
**¿Qué es?**
- ❌ **NO es un script SQL ejecutable**
- ✅ Es solo documentación/instrucciones
- ✅ Lee el contenido para saber cómo crear usuarios manualmente

**¿Qué hacer?**
- No lo ejecutes en SQL Editor
- Léelo para entender cómo crear usuarios en Supabase Dashboard

---

### 🔧 SOLO SI HAY PROBLEMAS

#### 7. `fix-triggers.sql`
**¿Qué hace?**
- Corrige problemas con los triggers de `updated_at`

**¿Cuándo ejecutarlo?**
- ⚠️ Solo si tienes errores relacionados con triggers
- ⚠️ Solo si `schema.sql` falló al crear los triggers

---

## 🚀 Orden Recomendado de Ejecución

### Para un Proyecto Nuevo (Mínimo Necesario):

```
1. schema.sql                    ← OBLIGATORIO
```

### Para un Proyecto Completo (Con Todas las Funcionalidades):

```
1. schema.sql                                    ← OBLIGATORIO
2. agregar-cantidad-motores-simple.sql           ← Si necesitas cantidad
3. agregar-numero-prestamo-cliente-simple.sql    ← Si necesitas números de cliente
4. agregar-campos-clientes.sql                   ← Si necesitas campos adicionales
5. agregar-plazo-ventas.sql                      ← Si necesitas intereses
```

---

## ✅ Checklist Rápido

Marca lo que necesitas:

- [ ] **schema.sql** - ⭐ OBLIGATORIO (siempre)
- [ ] **agregar-cantidad-motores-simple.sql** - Si usas "Préstamos Disponibles"
- [ ] **agregar-numero-prestamo-cliente-simple.sql** - Si quieres números únicos de cliente
- [ ] **agregar-campos-clientes.sql** - Si quieres celular, fechas, etc.
- [ ] **agregar-plazo-ventas.sql** - Si quieres calcular intereses

---

## 💡 Consejos

1. **Empieza con lo mínimo:** Ejecuta solo `schema.sql` primero
2. **Prueba la aplicación:** Verifica que funciona básicamente
3. **Agrega funcionalidades:** Ejecuta los scripts opcionales según necesites
4. **Usa versiones `-simple.sql`:** Son más seguras y pueden ejecutarse múltiples veces
5. **No ejecutes todo junto:** Ejecuta un script a la vez y verifica que funciona

---

## ❓ ¿Cómo Saber Qué Necesitas?

### Si la aplicación te da error sobre:
- **"cantidad" no existe** → Ejecuta `agregar-cantidad-motores-simple.sql`
- **"numero_prestamo_cliente" no existe** → Ejecuta `agregar-numero-prestamo-cliente-simple.sql`
- **"celular" no existe** → Ejecuta `agregar-campos-clientes.sql`
- **"plazo_meses" no existe** → Ejecuta `agregar-plazo-ventas.sql`

### Si todo funciona bien:
- ✅ **No necesitas ejecutar nada más** después de `schema.sql`

---

## 🎯 Resumen

**Mínimo necesario:**
- ✅ `schema.sql` (1 script)

**Máximo recomendado:**
- ✅ `schema.sql`
- ✅ `agregar-cantidad-motores-simple.sql`
- ✅ `agregar-numero-prestamo-cliente-simple.sql`
- ✅ `agregar-campos-clientes.sql`
- ✅ `agregar-plazo-ventas.sql`

**Total: 5 scripts máximo** (1 obligatorio + 4 opcionales)

---

**¿Dudas?** Ejecuta primero solo `schema.sql` y prueba la aplicación. Luego agrega los scripts opcionales según necesites. 🚀



