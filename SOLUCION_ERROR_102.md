# 🔧 Solución: Error -102 en localhost:3000

## ❌ Error

```
Error Code: -102
URL: http://localhost:3000/
```

## 🔍 Causa

Este error significa que:
- El servidor de Next.js **NO está corriendo**
- O el servidor se detuvo/crasheó
- O hay un problema de conexión

## ✅ Solución Paso a Paso

### Paso 1: Verificar que Estás en la Carpeta Correcta

```powershell
# Debe mostrar: C:\Users\Owner\.cursor
pwd

# Debe mostrar: True
Test-Path package.json
```

### Paso 2: Iniciar el Servidor Correctamente

1. **Abre una NUEVA ventana de PowerShell**

2. **Navega a la carpeta del proyecto:**
   ```powershell
   cd C:\Users\Owner\.cursor
   ```

3. **Agrega Node.js al PATH:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   ```

4. **Verifica que Node.js funciona:**
   ```powershell
   node --version
   npm.cmd --version
   ```
   Deben mostrar números de versión.

5. **Inicia el servidor:**
   ```powershell
   npm.cmd run dev
   ```

### Paso 3: Esperar a que Inicie Completamente

**NO cierres la ventana de PowerShell.** Debes ver mensajes como:

```
▲ Next.js 14.0.4
- Local:        http://localhost:3000

✓ Ready in 5.2s
```

**Espera hasta ver "Ready"** antes de intentar abrir el navegador.

### Paso 4: Abrir en el Navegador

Una vez que veas "Ready" en la terminal:

1. Abre tu navegador
2. Ve a: `http://localhost:3000`
3. Debería cargar sin errores

## 🆘 Si Sigue Sin Funcionar

### Verificar Errores en la Terminal

Después de ejecutar `npm.cmd run dev`, revisa si hay errores en rojo. Errores comunes:

- **"Cannot find module"** → Ejecuta: `npm.cmd install`
- **"Port 3000 is already in use"** → Cierra otras aplicaciones o cambia el puerto
- **"Supabase credentials not found"** → Verifica que `.env.local` existe y tiene las credenciales

### Limpiar y Reinstalar

Si hay problemas, intenta esto:

```powershell
# Limpiar
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstalar
npm.cmd install

# Iniciar
npm.cmd run dev
```

### Usar un Puerto Diferente

Si el puerto 3000 está ocupado:

1. Edita `package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```

2. Inicia el servidor:
   ```powershell
   npm.cmd run dev
   ```

3. Abre: `http://localhost:3001`

## ✅ Verificación Final

Cuando todo funcione:

1. **En la terminal:**
   - Verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`
   - NO debe haber errores en rojo

2. **En el navegador:**
   - Debe cargar la aplicación
   - Debe mostrar el Dashboard
   - NO debe mostrar error -102

---

**¿Puedes abrir PowerShell, ejecutar `npm.cmd run dev` y decirme qué mensajes ves? Especialmente si hay errores en rojo.** 🚀



