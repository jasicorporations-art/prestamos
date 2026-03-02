# 🔧 Solución Final: ERR_CONNECTION_REFUSED

## ❌ Problema

Después de ejecutar `iniciar-servidor.bat`, sigues viendo:
```
ERR_CONNECTION_REFUSED
localhost refused to connect
```

## 🔍 Diagnóstico

He creado un script de diagnóstico. **Ejecuta esto primero:**

1. **Doble clic** en `diagnostico.bat`
2. **Lee todos los mensajes** que aparecen
3. **Copia cualquier error** que veas (especialmente en rojo)

## ✅ Soluciones Según el Problema

### Problema 1: Dependencias No Instaladas

**Síntoma:** El script dice "Dependencias NO instaladas"

**Solución:**
1. El script `diagnostico.bat` las instalará automáticamente
2. O ejecuta manualmente:
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" install
   ```
3. Espera 5-10 minutos
4. Luego ejecuta `iniciar-servidor.bat` nuevamente

### Problema 2: Node.js No Encontrado

**Síntoma:** El script dice "Node.js NO encontrado"

**Solución:**
1. Instala Node.js desde https://nodejs.org/
2. Reinicia la computadora
3. Ejecuta `diagnostico.bat` nuevamente

### Problema 3: Error al Iniciar el Servidor

**Síntoma:** El servidor no inicia o muestra errores

**Solución:**
1. **Abre PowerShell** en la carpeta del proyecto
2. **Ejecuta:**
   ```powershell
   cd C:\Users\Owner\.cursor
   $env:PATH += ';C:\Program Files\nodejs'
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
3. **Lee los mensajes** que aparecen
4. **Copia cualquier error** y compártelo

### Problema 4: Puerto 3000 Ocupado

**Síntoma:** El script dice "Puerto 3000 está en uso"

**Solución:**
1. Cierra otras ventanas de PowerShell/CMD
2. Cierra otras aplicaciones que puedan usar el puerto 3000
3. O cambia el puerto en `package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```
4. Luego usa: `http://localhost:3001`

## 🚀 Pasos Recomendados

### Paso 1: Ejecutar Diagnóstico

1. **Doble clic** en `diagnostico.bat`
2. **Lee todos los mensajes**
3. **Anota cualquier error**

### Paso 2: Si el Diagnóstico Pasa

Si el diagnóstico muestra todo ✅ (verde):

1. **Espera** a que el servidor termine de iniciar
2. **Busca** en la ventana el mensaje: `✓ Ready in X seconds`
3. **Solo entonces** abre `http://localhost:3000`

### Paso 3: Si Hay Errores

1. **Copia el error completo** que aparece
2. **Compártelo** para que pueda ayudarte a solucionarlo

## 📋 Verificación Manual

Si quieres verificar manualmente:

1. **Abre PowerShell** en la carpeta del proyecto
2. **Ejecuta:**
   ```powershell
   cd C:\Users\Owner\.cursor
   $env:PATH += ';C:\Program Files\nodejs'
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
3. **Espera** a ver estos mensajes:
   ```
   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000
   
   ✓ Ready in X seconds
   ```
4. **Solo cuando veas "Ready"**, abre el navegador

## ⚠️ Importante

- **NO cierres la ventana** donde está corriendo el servidor
- **Espera** a ver "Ready" antes de abrir el navegador
- El servidor puede tardar **30-60 segundos** en iniciar la primera vez

---

**Ejecuta `diagnostico.bat` y comparte qué mensajes ves, especialmente si hay errores.** 🔍



