# 🚀 Iniciar el Servidor Manualmente

## 📋 Pasos para Iniciar el Servidor

Si el servidor no está corriendo, sigue estos pasos:

### Paso 1: Abrir PowerShell

1. Abre PowerShell (o CMD)
2. Navega a la carpeta del proyecto:
   ```powershell
   cd C:\Users\Owner\.cursor
   ```

### Paso 2: Agregar Node.js al PATH

```powershell
$env:PATH += ";C:\Program Files\nodejs"
```

### Paso 3: Iniciar el Servidor

```powershell
npm.cmd run dev
```

### Paso 4: Esperar a que Inicie

Verás mensajes como:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000

✓ Ready in 5.2s
```

**IMPORTANTE:** NO cierres esta ventana de PowerShell. El servidor debe seguir corriendo.

### Paso 5: Abrir en el Navegador

Una vez que veas "Ready", abre:
```
http://localhost:3000
```

## ✅ Verificación

Cuando el servidor esté corriendo correctamente:

1. **En la terminal verás:**
   - `✓ Ready in X seconds`
   - `○ Local: http://localhost:3000`

2. **En el navegador:**
   - Deberías ver la aplicación funcionando
   - No deberías ver "ERR_CONNECTION_REFUSED"

## 🆘 Si Hay Errores

### Error: "npm no se reconoce"
- Verifica que Node.js está instalado: `node --version`
- Agrega Node.js al PATH: `$env:PATH += ";C:\Program Files\nodejs"`

### Error: "Cannot find module"
```powershell
npm.cmd install
```

### El puerto 3000 está ocupado
- Cierra otras aplicaciones que usen el puerto 3000
- O cambia el puerto en `package.json`:
  ```json
  "dev": "next dev -p 3001"
  ```

## 📝 Comandos Completos

Copia y pega esto en PowerShell:

```powershell
cd C:\Users\Owner\.cursor
$env:PATH += ";C:\Program Files\nodejs"
npm.cmd run dev
```

Luego espera a ver "Ready" y abre `http://localhost:3000`

---

**¿Puedes ejecutar estos comandos en PowerShell y decirme qué mensajes ves?** 🚀



