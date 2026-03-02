# 🔧 Solución: Error al Compilar

## ❌ Error

```
"next" no se reconoce como un comando interno o externo
```

## 🔍 Causa

Este error significa que:
- Las dependencias no están instaladas (falta la carpeta `node_modules`)
- O Node.js no está en el PATH correctamente

## ✅ Solución

He actualizado los scripts para que **instalen las dependencias automáticamente** si no existen.

### Opción 1: Usar el Script Actualizado

1. **Ejecuta nuevamente** `compilar-y-ejecutar.bat`
2. Ahora **instalará las dependencias automáticamente** si faltan
3. Luego compilará y ejecutará

### Opción 2: Instalar Dependencias Manualmente Primero

Si prefieres instalar primero:

1. **Abre PowerShell** en la carpeta del proyecto

2. **Ejecuta:**
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" install
   ```

3. **Espera a que termine** (puede tardar 5-10 minutos)

4. **Luego ejecuta** `compilar-y-ejecutar.bat`

### Opción 3: Usar el Script de Desarrollo (Más Rápido)

Para desarrollo, es mejor usar `iniciar-servidor.bat`:

1. **Doble clic** en `iniciar-servidor.bat`
2. Si faltan dependencias, las instalará automáticamente
3. Inicia el servidor de desarrollo (más rápido que compilar)

## 📋 Diferencias

| Script | Uso | Velocidad |
|--------|-----|-----------|
| `iniciar-servidor.bat` | Desarrollo | ⚡ Rápido (no compila) |
| `compilar-y-ejecutar.bat` | Producción | 🐌 Lento (compila primero) |

**Para desarrollo diario, usa `iniciar-servidor.bat`** - es más rápido.

## ✅ Verificación

Después de instalar dependencias, deberías tener:
- ✅ Carpeta `node_modules` (muy grande, varios GB)
- ✅ Archivo `package-lock.json`

## 🚀 Recomendación

**Para uso diario:**
- Usa `iniciar-servidor.bat` (más rápido, no necesita compilar)
- Solo usa `compilar-y-ejecutar.bat` si necesitas la versión optimizada

---

**Prueba ejecutar `iniciar-servidor.bat` - es más rápido y ahora instala dependencias automáticamente.** 🚀



