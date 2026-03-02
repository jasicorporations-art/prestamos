# 🚀 Configuración de Scripts - Desarrollo y Producción

## ✅ Cambios Realizados

He actualizado ambos scripts (desarrollo y producción) para que funcionen de manera consistente y efectiva.

## 📋 Scripts Disponibles

### 1. `iniciar-servidor.bat` (Desarrollo)
**Uso:** Para desarrollo y pruebas rápidas

**Características:**
- ✅ Limpia automáticamente el caché de Next.js antes de iniciar
- ✅ Verifica y libera el puerto 3000 si está ocupado
- ✅ Instala dependencias si faltan
- ✅ Inicia el servidor de desarrollo con hot-reload

**Cómo usar:**
```batch
.\iniciar-servidor.bat
```

**Cuándo usar:**
- Cuando estás desarrollando o probando cambios
- Cuando necesitas recarga automática al cambiar código
- Para desarrollo rápido e iterativo

### 2. `compilar-y-ejecutar.bat` (Producción)
**Uso:** Para compilar y ejecutar en modo producción

**Características:**
- ✅ Limpia automáticamente el caché de Next.js antes de compilar
- ✅ Verifica y libera el puerto 3000 si está ocupado
- ✅ Compila la aplicación para producción (optimizada)
- ✅ Inicia el servidor de producción

**Cómo usar:**
```batch
.\compilar-y-ejecutar.bat
```

**Cuándo usar:**
- Cuando quieres probar la aplicación como estará en producción
- Para verificar que todo funciona correctamente después de compilar
- Antes de distribuir la aplicación

### 3. `limpiar-cache.bat` (Nuevo)
**Uso:** Limpieza completa de caché (opcional)

**Características:**
- ✅ Limpia el caché de Next.js (.next)
- ✅ Limpia el caché de npm
- ✅ Verifica que las dependencias estén instaladas

**Cómo usar:**
```batch
.\limpiar-cache.bat
```

**Cuándo usar:**
- Si tienes problemas persistentes con módulos
- Si quieres una limpieza completa antes de compilar
- Si sospechas que hay archivos en caché causando problemas

## 🔧 Mejoras Aplicadas

### 1. Limpieza Automática de Caché
Ambos scripts ahora limpian automáticamente el caché de Next.js antes de ejecutar:
- Elimina el directorio `.next` si existe
- Asegura una ejecución limpia sin archivos en caché antiguos

### 2. Gestión del Puerto 3000
Ambos scripts verifican y liberan el puerto 3000:
- Detectan procesos que usan el puerto
- Los detienen automáticamente
- Esperan a que el puerto esté libre antes de iniciar

### 3. Configuración Consistente
Ambos scripts tienen la misma configuración:
- Misma lógica de limpieza
- Misma gestión de puertos
- Misma verificación de dependencias

## 🚀 Flujo de Trabajo Recomendado

### Para Desarrollo Diario:
1. Ejecuta `.\iniciar-servidor.bat`
2. Desarrolla y prueba cambios
3. El servidor se recarga automáticamente

### Para Verificar Producción:
1. Ejecuta `.\compilar-y-ejecutar.bat`
2. Espera a que compile (puede tardar varios minutos)
3. Prueba la aplicación en modo producción

### Si Tienes Problemas:
1. Ejecuta `.\limpiar-cache.bat` primero
2. Luego ejecuta el script que necesites (desarrollo o producción)

## 📝 Notas Importantes

### Diferencias entre Desarrollo y Producción:

**Desarrollo (`iniciar-servidor.bat`):**
- ✅ Más rápido al iniciar
- ✅ Recarga automática al cambiar código
- ✅ Mejor para desarrollo
- ⚠️ No optimizado para producción

**Producción (`compilar-y-ejecutar.bat`):**
- ✅ Optimizado y minificado
- ✅ Mejor rendimiento
- ✅ Como estará en producción real
- ⚠️ Más lento al iniciar (compila primero)

### Problemas Comunes y Soluciones:

**Error: "Module not found"**
- Solución: Ejecuta `.\limpiar-cache.bat` y luego reinicia

**Error: "Port 3000 already in use"**
- Solución: Los scripts ahora lo manejan automáticamente
- Si persiste: Ejecuta `.\detener-puerto-3000.bat`

**Error: "date-fns not found"**
- Solución: El código ya no usa `date-fns`, pero si aparece el error:
  1. Ejecuta `.\limpiar-cache.bat`
  2. Ejecuta `.\compilar-y-ejecutar.bat` nuevamente

## ✅ Verificación

Después de ejecutar cualquier script, deberías ver:
- ✅ Sin errores de módulos faltantes
- ✅ El servidor inicia correctamente
- ✅ Puedes acceder a `http://localhost:3000`
- ✅ Todas las funcionalidades funcionan

## 🎯 Resultado

Ahora tienes:
- ✅ Scripts consistentes y confiables
- ✅ Limpieza automática de caché
- ✅ Gestión automática de puertos
- ✅ Configuración optimizada para desarrollo y producción

---

**Usa `.\iniciar-servidor.bat` para desarrollo y `.\compilar-y-ejecutar.bat` para producción. Ambos funcionan de manera efectiva.** ✅



