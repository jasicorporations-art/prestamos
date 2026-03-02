# ✅ Verificar que Stripe Está Funcionando Correctamente

## 🔍 Paso 1: Verificar Configuración

Abre en tu navegador:
```
https://sisi-seven.vercel.app/api/test-stripe
```

**Resultado esperado**: Deberías ver un JSON con `"success": true` y todas las verificaciones en verde.

Si hay algún error, revisa:
- Que todas las variables estén configuradas en Vercel
- Que los formatos de las claves sean correctos (`sk_`, `pk_`, `whsec_`)

## 🧪 Paso 2: Probar Checkout (Modo Test)

### 2.1 Ir a la Página de Precios

1. Ve a: `https://sisi-seven.vercel.app/precios`
2. Deberías ver los 3 planes (BRONCE, PLATA, ORO)
3. El plan PLATA debería tener el badge "Más Popular"

### 2.2 Probar Suscripción

1. **Haz clic en "Suscribirme"** en cualquier plan
2. **Deberías ser redirigido a Stripe Checkout**
3. **Usa tarjeta de prueba**:
   - Número: `4242 4242 4242 4242`
   - Fecha: `12/25` (cualquier fecha futura)
   - CVC: `123` (cualquier 3 dígitos)
   - ZIP: `12345` (cualquier código postal)
4. **Completa el pago**
5. **Deberías ser redirigido** a `/precios?success=true`
6. **Deberías ver un mensaje verde**: "¡Pago exitoso! Tu suscripción ha sido activada"

### 2.3 Verificar Suscripción Activada

1. **Recarga la página** del dashboard (`/`)
2. **Deberías ver**:
   - Tu plan actual (ej: "Plan Actual: Plan Plata")
   - Barras de progreso para clientes y préstamos
   - Límites de tu plan

## 🔔 Paso 3: Verificar Webhook en Stripe

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Haz clic en tu webhook** (el que apunta a `https://sisi-seven.vercel.app/api/webhooks/stripe`)
3. **Ve a "Recent events"** (Eventos recientes)
4. **Deberías ver eventos** como:
   - `checkout.session.completed` ✅
   - `customer.subscription.created` ✅
5. **Haz clic en un evento** para ver los detalles
6. **Verifica que el estado sea "Succeeded"** (Exitoso)
7. **Revisa los logs** en la parte inferior para ver si hubo errores

## 👤 Paso 4: Verificar Usuario Actualizado

1. **Ve a [Supabase Dashboard](https://app.supabase.com/)**
2. **Ve a Authentication > Users**
3. **Busca tu usuario** (por email)
4. **Haz clic en el usuario**
5. **Ve a "User Metadata"**
6. **Deberías ver**:
   ```json
   {
     "planType": "PLATA" (o el plan que elegiste),
     "isActive": true,
     "stripeCustomerId": "cus_...",
     "subscriptionId": "sub_..."
   }
   ```

## 🚫 Paso 5: Probar Bloqueo de Acceso (Opcional)

Para probar que el bloqueo funciona cuando la suscripción está inactiva:

1. **Ve a Supabase Dashboard > Authentication > Users**
2. **Selecciona tu usuario**
3. **En "User Metadata"**, cambia `isActive` a `false`
4. **Guarda los cambios**
5. **Cierra sesión y vuelve a iniciar sesión** en tu app
6. **Intenta acceder al dashboard** (`/`)
7. **Deberías ser redirigido** a `/precios?subscription_inactive=true`
8. **Deberías ver un mensaje rojo**: "Suscripción Inactiva"

## 📊 Paso 6: Verificar Límites de Plan

1. **Ve al Dashboard** (`/`)
2. **Verifica que veas**:
   - Plan actual
   - Barras de progreso
   - Límites de clientes y préstamos
3. **Intenta crear un cliente** o préstamo
4. **Si alcanzas el límite**, deberías ver un mensaje de error

## 🔄 Paso 7: Probar Pago Fallido (Opcional - Requiere Stripe CLI)

Para probar que el webhook maneja pagos fallidos:

1. **Instala Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Ejecuta**:
   ```bash
   stripe listen --forward-to https://sisi-seven.vercel.app/api/webhooks/stripe
   ```
3. **En otra terminal**, dispara un evento de pago fallido:
   ```bash
   stripe trigger invoice.payment_failed
   ```
4. **Verifica en Supabase** que `isActive` se haya cambiado a `false`

## ✅ Checklist de Verificación

- [ ] Endpoint `/api/test-stripe` muestra `success: true`
- [ ] Página `/precios` muestra los 3 planes
- [ ] Botón "Suscribirme" redirige a Stripe Checkout
- [ ] Pago con tarjeta de prueba funciona
- [ ] Redirección después del pago muestra mensaje de éxito
- [ ] Dashboard muestra plan actual y barras de progreso
- [ ] Webhook en Stripe Dashboard muestra eventos exitosos
- [ ] Usuario en Supabase tiene `isActive: true` y `planType` correcto
- [ ] Bloqueo de acceso funciona cuando `isActive: false`
- [ ] Límites de plan funcionan correctamente

## 🐛 Solución de Problemas

### El endpoint `/api/test-stripe` muestra errores

- **Verifica** que todas las variables estén en Vercel
- **Revisa** que los formatos sean correctos
- **Redesplega** la aplicación

### No puedo hacer checkout

- **Verifica** que `STRIPE_SECRET_KEY` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` estén configuradas
- **Revisa** la consola del navegador para errores
- **Verifica** que estés usando claves de TEST (no LIVE) para pruebas

### El webhook no recibe eventos

- **Verifica** que la URL del webhook sea correcta
- **Revisa** que el webhook esté activo en Stripe Dashboard
- **Verifica** que `STRIPE_WEBHOOK_SECRET` coincida con el secreto del webhook
- **Revisa** los logs de Vercel para ver errores

### La suscripción no se activa después del pago

- **Verifica** en Stripe Dashboard que el evento `checkout.session.completed` llegó
- **Revisa** los logs del webhook en Vercel
- **Verifica** que Supabase tenga permisos de admin para actualizar usuarios
- **Revisa** que el `userId` en metadata sea correcto

### No puedo acceder al dashboard después del pago

- **Cierra sesión y vuelve a iniciar sesión** (para refrescar el token)
- **Verifica** en Supabase que `isActive: true`
- **Revisa** la consola del navegador para errores

## 📝 Notas Finales

- ✅ **Todo está funcionando** si puedes completar el checkout y ver tu plan en el dashboard
- ✅ **El webhook está funcionando** si ves eventos exitosos en Stripe Dashboard
- ✅ **La protección está funcionando** si no puedes acceder cuando `isActive: false`

¡Si todos los pasos funcionan, tu integración de Stripe está completamente operativa! 🎉

