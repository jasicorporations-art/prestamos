# 🆘 Solución de Problemas Comunes

## ❌ Error: "npm no se reconoce como comando"

### Problema
Node.js no está instalado o no está en el PATH del sistema.

### Solución
1. **Instalar Node.js:**
   - Descargar desde: https://nodejs.org/ (versión LTS)
   - Instalar siguiendo el asistente
   - ✅ Asegurarse de marcar "Add to PATH"

2. **Después de instalar:**
   - Cerrar y reabrir PowerShell/CMD
   - Verificar con: `node --version` y `npm --version`

3. **Si aún no funciona:**
   - Reiniciar la computadora
   - Verificar variables de entorno (PATH debe incluir Node.js)

---

## ❌ Error: "Cannot find module" o errores de dependencias

### Problema
Las dependencias no están instaladas o hay un problema con node_modules.

### Solución
```powershell
# Eliminar node_modules y package-lock.json si existen
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstalar dependencias
npm install
```

---

## ❌ Error: "Supabase credentials not found"

### Problema
Faltan las variables de entorno de Supabase.

### Solución
1. Crear archivo `.env.local` en la raíz del proyecto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
   ```

2. Obtener credenciales desde Supabase:
   - Settings > API
   - Copiar Project URL y anon public key

3. Reiniciar el servidor después de crear `.env.local`

---

## ❌ Error al ejecutar `npm run dev`

### Problema
Puede ser varios problemas: dependencias faltantes, puerto ocupado, etc.

### Solución
1. **Verificar que las dependencias están instaladas:**
   ```powershell
   npm install
   ```

2. **Verificar que el puerto 3000 está libre:**
   - Si está ocupado, cambiar en `package.json`:
     ```json
     "dev": "next dev -p 3001"
     ```

3. **Limpiar caché de Next.js:**
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev
   ```

---

## ❌ Error: "Module not found" en tiempo de ejecución

### Problema
Falta alguna dependencia o hay un problema de importación.

### Solución
1. Verificar que todas las dependencias están en `package.json`
2. Reinstalar:
   ```powershell
   npm install
   ```
3. Verificar que los imports en el código son correctos

---

## ❌ Error al crear tablas en Supabase

### Problema
Error de sintaxis SQL o permisos.

### Solución
1. Verificar que estás en el SQL Editor correcto
2. Copiar el contenido completo de `supabase/schema.sql`
3. Ejecutar sección por sección si hay errores
4. Verificar que el proyecto de Supabase está completamente configurado

---

## ❌ La aplicación no carga o muestra errores

### Problema
Puede ser problema de configuración o variables de entorno.

### Solución
1. **Verificar variables de entorno:**
   - Asegurarse de que `.env.local` existe
   - Verificar que las variables tienen el prefijo `NEXT_PUBLIC_`

2. **Verificar la consola del navegador:**
   - Abrir DevTools (F12)
   - Ver la pestaña Console para errores específicos

3. **Verificar la consola de PowerShell:**
   - Ver si hay errores al ejecutar `npm run dev`

---

## ❌ PWA no se instala

### Problema
Faltan iconos o hay problema con el manifest.

### Solución
1. Crear los iconos requeridos:
   - `public/icon-192x192.png`
   - `public/icon-512x512.png`
   - Ver `public/ICONOS_INSTRUCCIONES.md`

2. Verificar que `public/manifest.json` existe

3. Verificar que el service worker está registrado (ver consola del navegador)

---

## 📞 ¿Necesitas más ayuda?

1. Verificar los logs de error en:
   - Consola del navegador (F12)
   - Terminal donde ejecutas `npm run dev`

2. Verificar la documentación:
   - `README.md` - Documentación completa
   - `INICIO_RAPIDO.md` - Guía paso a paso

3. Verificar que cumpliste todos los requisitos:
   - ✅ Node.js instalado (v18+)
   - ✅ Supabase configurado
   - ✅ Variables de entorno configuradas
   - ✅ Dependencias instaladas (`npm install`)

---

## 🔍 Comandos Útiles para Diagnóstico

```powershell
# Verificar versiones
node --version
npm --version

# Verificar que estás en el directorio correcto
pwd
ls package.json

# Limpiar e instalar desde cero
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install

# Verificar variables de entorno (si existen)
Get-Content .env.local
```



