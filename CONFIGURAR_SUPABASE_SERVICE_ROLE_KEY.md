# 🔑 Configurar SUPABASE_SERVICE_ROLE_KEY

## 📖 ¿Qué es esta clave?

La `SUPABASE_SERVICE_ROLE_KEY` es una **clave privada de administrador** que permite realizar operaciones especiales en Supabase desde el servidor, como:

- ✅ Actualizar metadata de usuarios (planes de suscripción)
- ✅ Procesar webhooks de Stripe
- ✅ Operaciones administrativas que requieren permisos elevados

## ⚠️ Importante

- 🔒 **Es una clave PRIVADA** - nunca la compartas ni la expongas en el cliente
- 🚫 **NO es la misma** que `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ **Solo se usa en el servidor** (rutas API, webhooks)
- ⚠️ **Sin esta clave**, los webhooks de Stripe no podrán actualizar las suscripciones de los usuarios

## 📋 Cómo Obtener la Clave

### Paso 1: Ir a Supabase Dashboard

1. **Abre tu proyecto en Supabase:**
   - Ve a: https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc
   - O inicia sesión en [supabase.com](https://supabase.com) y selecciona tu proyecto

### Paso 2: Ir a Settings > API

1. **En el menú lateral izquierdo**, haz clic en **⚙️ Settings** (Configuración)
2. **Haz clic en "API"** en el submenú
3. O ve directamente a: https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/settings/api

### Paso 3: Copiar la Service Role Key

1. **Busca la sección "API Keys"**
2. **Verás dos claves:**
   - **anon public** ← Esta ya la tienes configurada (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** ← Esta es la que necesitas ahora
3. **Haz clic en el icono de copiar** (📋) al lado de "service_role"
4. ⚠️ **IMPORTANTE:** Esta clave es muy larga y privada. Cópiala completa.

## 🔧 Configurar en Vercel

### Paso 1: Ir a Vercel Dashboard

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Selecciona tu proyecto** (ej: `sisi` o `nextjs-boilerplate-niyfuhxp3`)

### Paso 2: Agregar Variable de Entorno

1. **Ve a Settings** (Configuración)
2. **Haz clic en "Environment Variables"** (Variables de Entorno)
3. **Haz clic en "Add New"** (Agregar Nueva)

### Paso 3: Configurar la Variable

- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Pega la clave `service_role` que copiaste de Supabase
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Haz clic en "Save"** (Guardar)

### Paso 4: Redesplegar

1. **Ve a "Deployments"** en tu proyecto
2. **Haz clic en los 3 puntos** (⋯) del último deployment
3. **Selecciona "Redeploy"**
4. **O simplemente haz un push** a tu repositorio para activar un nuevo deployment

## ✅ Verificar que Funciona

### 1. Verificar en el Build

Después de redesplegar, el mensaje de advertencia debería desaparecer:

```
⚠️ SUPABASE_SERVICE_ROLE_KEY no está configurada. Las funciones de admin no funcionarán.
```

Si ya no aparece este mensaje, significa que está configurada correctamente.

### 2. Probar Webhook de Stripe

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

## 🆘 Solución de Problemas

### El mensaje sigue apareciendo después de configurar

- **Causa**: El deployment no se ha actualizado o la variable no se guardó correctamente
- **Solución**: 
  1. Verifica que la variable esté en Vercel Settings > Environment Variables
  2. Asegúrate de que esté marcada para todos los ambientes (Production, Preview, Development)
  3. Redesplega la aplicación

### El webhook no actualiza las suscripciones

- **Causa**: La `SUPABASE_SERVICE_ROLE_KEY` no está configurada o es incorrecta
- **Solución**:
  1. Verifica que la clave esté correctamente copiada (es muy larga)
  2. Verifica que no tenga espacios al inicio o final
  3. Revisa los logs de Vercel para ver errores específicos

### Error: "SUPABASE_SERVICE_ROLE_KEY no está configurada"

- **Causa**: La variable no está disponible en el entorno de ejecución
- **Solución**:
  1. Verifica que la variable esté en Vercel
  2. Asegúrate de que el deployment sea reciente (después de agregar la variable)
  3. Si estás en desarrollo local, agrega la variable a `.env.local`:
     ```env
     SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_aqui
     ```

## 📝 Notas Importantes

- ⚠️ **NUNCA** agregues esta clave a archivos que se suban a Git
- ✅ El archivo `.env.local` está en `.gitignore` - es seguro usarlo localmente
- ✅ En Vercel, las variables están encriptadas y seguras
- 🔒 Esta clave tiene **permisos completos** en tu base de datos - trátala con cuidado

## 🎯 Resumen Rápido

1. ✅ Ir a Supabase Dashboard > Settings > API
2. ✅ Copiar la clave "service_role"
3. ✅ Agregar variable `SUPABASE_SERVICE_ROLE_KEY` en Vercel
4. ✅ Redesplegar la aplicación
5. ✅ Verificar que el mensaje de advertencia desaparezca

¡Listo! Los webhooks de Stripe ahora podrán actualizar las suscripciones correctamente. 🚀

