# 🚀 Iniciar el Servidor - Comando Correcto

## ❌ Error que Tuviste

El comando se cortó. En lugar de modificar el PATH, usaremos la ruta completa.

## ✅ Solución: Usar la Ruta Completa

### Opción 1: Usar npm.cmd Directamente (Más Fácil)

En PowerShell, ejecuta esto (copia TODO):

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

### Opción 2: Agregar al PATH Correctamente

Si quieres agregar al PATH, usa comillas:

```powershell
$env:PATH += ';C:\Program Files\nodejs'
npm.cmd run dev
```

## 📋 Pasos Completos

1. **Abre PowerShell**

2. **Navega a la carpeta del proyecto:**
   ```powershell
   cd C:\Users\Owner\.cursor
   ```

3. **Inicia el servidor (usa UNA de estas opciones):**

   **Opción A - Ruta completa (recomendado):**
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```

   **Opción B - Agregar al PATH con comillas:**
   ```powershell
   $env:PATH += ';C:\Program Files\nodejs'
   npm.cmd run dev
   ```

4. **Espera a que inicie:**
   - Verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`

5. **NO cierres la ventana de PowerShell**

6. **Abre en el navegador:**
   ```
   http://localhost:3000
   ```

## 🎯 Comando Todo-en-Uno

Copia y pega esto completo en PowerShell:

```powershell
cd C:\Users\Owner\.cursor
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Luego espera a ver "Ready" y abre `http://localhost:3000`

---

**Prueba con el comando de ruta completa. Es más confiable.** 🚀

