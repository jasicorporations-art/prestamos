# 💳 Configuración de Stripe - Guía Completa

## ✅ Integración Implementada

Se ha implementado la integración completa de Stripe Checkout con webhooks para gestionar suscripciones.

## 📋 Archivos Creados

1. **`lib/stripe.ts`** - Cliente de Stripe (server-side)
2. **`lib/stripe-client.ts`** - Cliente de Stripe (client-side)
3. **`app/api/create-checkout-session/route.ts`** - API para crear sesión de checkout
4. **`app/api/webhooks/stripe/route.ts`** - Webhook para escuchar eventos de Stripe

## 🔧 Configuración Requerida

### Paso 1: Obtener Claves de Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Ve a **Developers > API keys**
3. Copia:
   - **Publishable key** (empieza con `pk_`)
   - **Secret key** (empieza con `sk_`)

### Paso 2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel y agrega estas variables:

**Variables de Entorno**:
```
STRIPE_SECRET_KEY=sk_live_... (o sk_test_... para pruebas)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (o pk_test_... para pruebas)
STRIPE_WEBHOOK_SECRET=whsec_... (obtener del webhook)
NEXT_PUBLIC_APP_URL=https://sisi-seven.vercel.app
```

### Paso 3: Configurar Webhook en Stripe

1. Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Haz clic en **"Add endpoint"**
3. **Endpoint URL**: `https://sisi-seven.vercel.app/api/webhooks/stripe`
4. **Events to send**: Selecciona estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia el **Signing secret** (empieza con `whsec_`)
6. Agrégala como `STRIPE_WEBHOOK_SECRET` en Vercel

## 🎯 Cómo Funciona

### Flujo de Suscripción

1. **Usuario hace clic en "Suscribirme"** en `/precios`
2. **Se crea sesión de checkout** en `/api/create-checkout-session`
3. **Usuario es redirigido a Stripe** para pagar
4. **Stripe procesa el pago** y redirige de vuelta
5. **Webhook recibe evento** `checkout.session.completed`
6. **Sistema actualiza usuario**:
   - `planType`: Plan seleccionado
   - `isActive`: `true`
   - `stripeCustomerId`: ID del customer en Stripe
   - `subscriptionId`: ID de la suscripción

### Flujo de Pago Fallido

1. **Stripe intenta cobrar** la suscripción mensual
2. **Si falla**, envía evento `invoice.payment_failed`
3. **Webhook recibe evento** y actualiza:
   - `isActive`: `false`
4. **Usuario es bloqueado** del panel de gestión
5. **Usuario ve mensaje** en `/precios` para renovar

### Flujo de Actualización de Suscripción

1. **Stripe actualiza suscripción** (cancelación, cambio de plan, etc.)
2. **Webhook recibe evento** `customer.subscription.updated`
3. **Sistema actualiza** `isActive` según el estado

## 🔒 Protección de Rutas

El `AuthGuard` ahora verifica:
1. ✅ Usuario autenticado
2. ✅ Suscripción activa (`isActive === true`)

Si la suscripción no está activa:
- Usuario es redirigido a `/precios`
- Ve mensaje: "Suscripción Inactiva"
- No puede acceder al panel de gestión

## 📝 Eventos de Webhook Manejados

| Evento | Acción |
|--------|--------|
| `checkout.session.completed` | Activa suscripción, actualiza plan |
| `customer.subscription.updated` | Actualiza estado de suscripción |
| `customer.subscription.deleted` | Desactiva suscripción |
| `invoice.payment_succeeded` | Confirma pago (logging) |
| `invoice.payment_failed` | Desactiva suscripción |

## 🧪 Probar en Modo Test

1. Usa claves de **test** de Stripe
2. Usa tarjeta de prueba: `4242 4242 4242 4242`
3. Cualquier fecha futura para expiración
4. Cualquier CVC

## ⚠️ Notas Importantes

- **Permisos de Admin**: El webhook necesita permisos de admin de Supabase para actualizar usuarios
- **Seguridad**: El webhook verifica la firma de Stripe para asegurar que viene de Stripe
- **Customer ID**: Se guarda en `user_metadata.stripeCustomerId` para relacionar con Stripe
- **Subscription ID**: Se guarda en `user_metadata.subscriptionId` para referencia

## 🚀 Próximos Pasos

1. Configurar variables de entorno en Vercel
2. Configurar webhook en Stripe Dashboard
3. Probar con tarjeta de prueba
4. Verificar que los usuarios se actualicen correctamente

