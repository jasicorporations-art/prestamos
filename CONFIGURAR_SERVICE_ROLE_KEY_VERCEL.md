# 🔑 Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel

## ✅ Clave Correcta Obtenida

Has obtenido la clave `service_role` correcta:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1NDg1MywiZXhwIjoyMDgyNDMwODUzfQ.CQzazZJdvXwyIgGo6K92tE3YPCi-GU3frX9FNoEK1Fs
```

## 📋 Pasos para Configurar en Vercel

### Paso 1: Ir a Vercel Dashboard

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Inicia sesión** con tu cuenta
3. **Selecciona tu proyecto** (ej: `sisi` o `nextjs-boilerplate-niyfuhxp3`)

### Paso 2: Ir a Settings > Environment Variables

1. **Haz clic en "Settings"** (Configuración) en el menú superior
2. **Haz clic en "Environment Variables"** (Variables de Entorno) en el menú lateral

### Paso 3: Agregar la Variable

1. **Haz clic en "Add New"** (Agregar Nueva) o el botón "+"
2. **Completa el formulario:**
   - **Name (Nombre)**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value (Valor)**: Pega la clave completa:
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1NDg1MywiZXhwIjoyMDgyNDMwODUzfQ.CQzazZJdvXwyIgGo6K92tE3YPCi-GU3frX9FNoEK1Fs
     ```
   - **Environments (Ambientes)**: Marca todas las casillas:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. **Haz clic en "Save"** (Guardar)

### Paso 4: Verificar que se Agregó

1. **Verifica en la lista** que aparece `SUPABASE_SERVICE_ROLE_KEY`
2. **Confirma que esté marcada** para todos los ambientes

### Paso 5: Redesplegar la Aplicación

1. **Ve a "Deployments"** (Despliegues) en el menú lateral
2. **Encuentra el último deployment**
3. **Haz clic en los 3 puntos** (⋯) del deployment
4. **Selecciona "Redeploy"** (Redesplegar)
5. **Confirma el redespliegue**

O simplemente haz un push a tu repositorio para activar un nuevo deployment automático.

## ✅ Verificar que Funciona

### 1. Verificar en los Logs de Build

Después de redesplegar, el mensaje de advertencia debería desaparecer:
```
⚠️ SUPABASE_SERVICE_ROLE_KEY no está configurada. Las funciones de admin no funcionarán.
```

Si ya no aparece este mensaje, significa que está configurada correctamente.

### 2. Probar los Webhooks de Stripe

1. **Ve a tu aplicación**: `https://sisi-seven.vercel.app/precios`
2. **Haz clic en "Suscribirme"** en cualquier plan
3. **Completa el pago** (usa tarjeta de prueba: `4242 4242 4242 4242`)
4. **Después del pago**, tu suscripción debería activarse automáticamente
5. **Verifica en el Dashboard** que tu plan se haya actualizado

### 3. Verificar en Stripe Dashboard

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Haz clic en tu webhook**
3. **Ve a "Recent events"** (Eventos recientes)
4. **Verifica que los eventos** `checkout.session.completed` tengan estado "Succeeded"

## 🎯 Resumen

1. ✅ Clave `service_role` obtenida correctamente
2. ✅ Agregar variable `SUPABASE_SERVICE_ROLE_KEY` en Vercel
3. ✅ Marcar para todos los ambientes (Production, Preview, Development)
4. ✅ Redesplegar la aplicación
5. ✅ Verificar que el mensaje de advertencia desaparezca

¡Listo! Los webhooks de Stripe ahora podrán actualizar las suscripciones correctamente. 🚀

