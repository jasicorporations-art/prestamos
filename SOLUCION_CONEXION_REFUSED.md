# 🔧 Solución: ERR_CONNECTION_REFUSED

## ❌ Error

```
This site can't be reached
localhost refused to connect.
ERR_CONNECTION_REFUSED
```

## 🔍 Causa

Este error significa que **el servidor de Next.js no está corriendo**.

## ✅ Solución

### Paso 1: Verificar que Estás en la Carpeta Correcta

Asegúrate de estar en la carpeta del proyecto (donde está `package.json`):

```powershell
# Verifica que estás en la carpeta correcta
pwd
# Debe mostrar: C:\Users\Owner\.cursor

# Verifica que package.json existe
Test-Path package.json
# Debe mostrar: True
```

### Paso 2: Iniciar el Servidor

1. **Abre PowerShell en la carpeta del proyecto**

2. **Agrega Node.js al PATH:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   ```

3. **Inicia el servidor:**
   ```powershell
   npm.cmd run dev
   ```

4. **Espera a que inicie:**
   - Verás mensajes como: "Compiling..."
   - Al final verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`

5. **NO cierres esta ventana de PowerShell** - el servidor debe seguir corriendo

### Paso 3: Abrir en el Navegador

Una vez que veas "Ready", abre:
```
http://localhost:3000
```

## 🆘 Si Sigue Sin Funcionar

### Verificar que el Puerto 3000 Está Libre

```powershell
# Verificar qué está usando el puerto 3000
netstat -ano | findstr :3000
```

Si hay algo usando el puerto, puedes:
1. Detener ese proceso
2. O cambiar el puerto en `package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```
   Y luego usar: `http://localhost:3001`

### Verificar que Node.js Funciona

```powershell
node --version
npm --version
```

Si no funcionan, Node.js no está en el PATH correctamente.

### Reinstalar Dependencias

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm.cmd install
npm.cmd run dev
```

## ✅ Verificación

Cuando el servidor esté corriendo correctamente, verás en la terminal:

```
  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Ready in X seconds
```

Y podrás abrir `http://localhost:3000` sin problemas.

---

**¿Puedes verificar que el servidor está corriendo? Debe haber una ventana de PowerShell con mensajes de Next.js.** 🚀



