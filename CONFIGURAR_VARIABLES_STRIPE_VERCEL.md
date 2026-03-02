# 🔧 Configurar Variables de Entorno de Stripe en Vercel

## 📋 Variables Necesarias

Necesitas configurar estas 4 variables de entorno en Vercel:

1. `STRIPE_SECRET_KEY` - Clave secreta de Stripe (server-side)
2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Clave pública de Stripe (client-side)
3. `STRIPE_WEBHOOK_SECRET` - Secreto del webhook de Stripe
4. `NEXT_PUBLIC_APP_URL` - URL de tu aplicación en producción

## 🚀 Paso a Paso

### Paso 1: Obtener Claves de Stripe

1. **Ve a [Stripe Dashboard](https://dashboard.stripe.com/)**
2. **Inicia sesión** con tu cuenta de Stripe
3. **Ve a Developers > API keys**
4. **Copia las claves**:
   - **Publishable key** (empieza con `pk_test_` o `pk_live_`)
   - **Secret key** (empieza con `sk_test_` o `sk_live_`)
   - ⚠️ **Para pruebas, usa las claves de TEST** (con `_test_`)
   - ⚠️ **Para producción, usa las claves de LIVE** (con `_live_`)

### Paso 2: Configurar Variables en Vercel

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Selecciona tu proyecto** `sisi` o `nextjs-boilerplate-niyfuhxp3`
3. **Ve a Settings** (Configuración)
4. **Haz clic en "Environment Variables"** (Variables de Entorno)
5. **Agrega cada variable**:

#### Variable 1: STRIPE_SECRET_KEY
- **Name**: `STRIPE_SECRET_KEY`
- **Value**: `sk_test_...` (o `sk_live_...` para producción)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Haz clic en "Save"**

#### Variable 2: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Name**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Value**: `pk_test_...` (o `pk_live_...` para producción)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Haz clic en "Save"**

#### Variable 3: NEXT_PUBLIC_APP_URL
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://sisi-seven.vercel.app`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Haz clic en "Save"**

#### Variable 4: STRIPE_WEBHOOK_SECRET
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: `whsec_...` (obtener del Paso 3)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Haz clic en "Save"**

### Paso 3: Configurar Webhook en Stripe

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Haz clic en "Add endpoint"** (Agregar endpoint)
3. **Endpoint URL**: 
   ```
   https://sisi-seven.vercel.app/api/webhooks/stripe
   ```
4. **Description**: `Webhook para suscripciones SaaS`
5. **Events to send**: Selecciona estos eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. **Haz clic en "Add endpoint"**
7. **Copia el "Signing secret"** (empieza con `whsec_`)
8. **Pega este valor** en la variable `STRIPE_WEBHOOK_SECRET` en Vercel

### Paso 4: Redesplegar la Aplicación

Después de agregar todas las variables:

1. **Ve a tu proyecto en Vercel**
2. **Haz clic en "Deployments"**
3. **Haz clic en los 3 puntos** (⋯) del último deployment
4. **Selecciona "Redeploy"**
5. **O simplemente haz un push** a tu repositorio para activar un nuevo deployment

## ✅ Verificar que Funciona

### 1. Verificar Variables Configuradas

En Vercel, ve a Settings > Environment Variables y verifica que todas las 4 variables estén presentes.

### 2. Probar Checkout (Modo Test)

1. **Ve a tu aplicación**: `https://sisi-seven.vercel.app/precios`
2. **Haz clic en "Suscribirme"** en cualquier plan
3. **Deberías ser redirigido a Stripe Checkout**
4. **Usa tarjeta de prueba**:
   - Número: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura (ej: `12/25`)
   - CVC: Cualquier 3 dígitos (ej: `123`)
   - ZIP: Cualquier código postal (ej: `12345`)
5. **Completa el pago**
6. **Deberías ser redirigido de vuelta** a `/precios?success=true`

### 3. Verificar Webhook

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Haz clic en tu webhook**
3. **Ve a "Recent events"** (Eventos recientes)
4. **Deberías ver eventos** como `checkout.session.completed`
5. **Haz clic en un evento** para ver los detalles
6. **Verifica que el estado sea "Succeeded"** (Exitoso)

### 4. Verificar Suscripción Activada

1. **Inicia sesión en tu aplicación**
2. **Ve al Dashboard** (`/`)
3. **Deberías ver tu plan actual** y barras de progreso
4. **Intenta crear un cliente o préstamo** para verificar que los límites funcionan

## 🔍 Solución de Problemas

### Error: "STRIPE_SECRET_KEY no está configurada"

- **Causa**: La variable no está configurada o el deployment no se ha actualizado
- **Solución**: 
  1. Verifica que la variable esté en Vercel
  2. Redesplega la aplicación

### Error: "Webhook Error: Invalid signature"

- **Causa**: El `STRIPE_WEBHOOK_SECRET` no coincide con el secreto del webhook
- **Solución**: 
  1. Ve a Stripe Dashboard > Webhooks
  2. Copia el "Signing secret" nuevamente
  3. Actualiza la variable en Vercel
  4. Redesplega

### El webhook no recibe eventos

- **Causa**: La URL del webhook puede estar incorrecta o el endpoint no está accesible
- **Solución**:
  1. Verifica que la URL sea: `https://sisi-seven.vercel.app/api/webhooks/stripe`
  2. Prueba accediendo a la URL manualmente (debería dar error, pero confirma que existe)
  3. Verifica que el webhook esté activo en Stripe Dashboard

### La suscripción no se activa después del pago

- **Causa**: El webhook no está procesando correctamente los eventos
- **Solución**:
  1. Ve a Stripe Dashboard > Webhooks > Tu webhook > Recent events
  2. Verifica que los eventos lleguen
  3. Revisa los logs de Vercel para ver errores
  4. Verifica que `supabase.auth.admin` tenga permisos para actualizar usuarios

## 📝 Notas Importantes

- ⚠️ **Nunca compartas tus claves secretas** (`sk_` o `whsec_`)
- ⚠️ **Usa claves de TEST** para desarrollo y pruebas
- ⚠️ **Usa claves de LIVE** solo cuando estés listo para producción
- ✅ **Las variables con `NEXT_PUBLIC_`** son accesibles en el cliente
- ✅ **Las variables sin `NEXT_PUBLIC_`** solo son accesibles en el servidor
- ✅ **Después de agregar variables**, siempre redesplega la aplicación

## 🎯 Resumen Rápido

1. ✅ Obtener claves de Stripe Dashboard
2. ✅ Agregar 4 variables en Vercel Settings > Environment Variables
3. ✅ Configurar webhook en Stripe Dashboard
4. ✅ Copiar webhook secret a Vercel
5. ✅ Redesplegar aplicación
6. ✅ Probar con tarjeta de prueba

¡Listo! Tu integración de Stripe debería estar funcionando. 🚀

