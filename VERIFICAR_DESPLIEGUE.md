# ✅ Verificar el Despliegue en Vercel

## 🔍 Pasos para Verificar

### 1. Ve a la Pestaña "Deployments"
1. En Vercel Dashboard, haz clic en tu proyecto
2. Ve a la pestaña **"Deployments"** (arriba)
3. Deberías ver un deployment en proceso o completado

### 2. Ver el Estado del Deployment
- **Building**: Está construyendo (espera)
- **Ready**: ✅ Listo y funcionando
- **Error**: ❌ Hay un error (haz clic para ver los logs)

### 3. Si hay un Error (incl. "DeploymentError: An error occurred with your deployment")
El mensaje es genérico. Para ver el **error real**:

**Opción A – Desde la consola (recomendado)**  
Ejecuta en la carpeta del proyecto:
```bat
deploy-vercel-debug.bat
```
O manualmente: `vercel --prod --debug`  
Al final de la salida suele aparecer el motivo del fallo.

**Opción B – Desde Vercel Dashboard**  
1. Entra en **vercel.com** → tu proyecto → **Deployments**  
2. Clic en el deployment **fallido** (icono rojo)  
3. Revisa **"Building"**, **"Logs"** o **"Runtime Logs"** y busca la línea en rojo  
4. Prueba **Redeploy** → **Clear cache and redeploy**

**Causas habituales:**  
- Variables de entorno faltantes (Settings → Environment Variables)  
- Límites de memoria/tiempo en build → **Clear cache and redeploy**  
- Node: en Settings → General, usa **Node.js 18.x** o **20.x**

### 4. Ver la Aplicación
Si el deployment está "Ready":
1. Haz clic en el deployment
2. Verás una URL tipo: `tu-proyecto.vercel.app`
3. Haz clic en la URL o el botón **"Visit"**
4. Deberías ver tu aplicación funcionando

### 5. Probar la Funcionalidad de Clientes
1. Ve a la URL de producción
2. Inicia sesión
3. Ve a `/clientes`
4. Prueba crear un cliente y subir documentos desde el móvil

## 🔄 Despliegues Automáticos

Ahora, cada vez que hagas cambios y hagas:
```bash
git add .
git commit -m "Descripción"
git push
```

Vercel desplegará automáticamente una nueva versión.

## 📝 Notas

- El primer despliegue puede tardar 2-5 minutos
- Si hay errores, Vercel te mostrará los logs detallados
- Puedes hacer redeploy manual desde el dashboard si es necesario









