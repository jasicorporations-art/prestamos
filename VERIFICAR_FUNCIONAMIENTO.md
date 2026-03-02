# ✅ Verificar que Todo Funciona Correctamente

## 🔍 Paso 1: Verificar Configuración de Stripe

Abre en tu navegador:
```
https://sisi-seven.vercel.app/api/test-stripe
```

**Resultado esperado**: Deberías ver:
```json
{
  "success": true,
  "message": "✅ Todas las configuraciones de Stripe están correctas",
  ...
}
```

Si ves `"success": false`, revisa qué variables faltan.

## 🔍 Paso 2: Verificar Variables Configuradas

### Variables Requeridas:

1. ✅ `STRIPE_SECRET_KEY` - Clave secreta de Stripe
2. ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Clave pública de Stripe
3. ✅ `STRIPE_WEBHOOK_SECRET` - Secreto del webhook
4. ✅ `NEXT_PUBLIC_APP_URL` - URL de la aplicación
5. ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key de Supabase (para webhook)
6. ✅ `RESEND_API_KEY` - Clave de Resend (solo la clave, sin código)

## 🧪 Paso 3: Probar Checkout

1. **Ve a**: `https://sisi-seven.vercel.app/precios`
2. **Haz clic en "Suscribirme"** en cualquier plan
3. **Deberías ser redirigido a Stripe Checkout**
4. **Si hay error**, revisa la consola del navegador

## 🔔 Paso 4: Verificar Webhook

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Verifica que tu webhook esté activo**
3. **Haz una prueba de checkout** (con tarjeta de prueba)
4. **Revisa los eventos** en Stripe Dashboard
5. **Verifica que los eventos lleguen** y tengan estado "Succeeded"

## 📊 Paso 5: Verificar Logs de Vercel

Si hay errores, revisa los logs:

1. **Ve a Vercel Dashboard**
2. **Selecciona tu proyecto**
3. **Ve a "Deployments"**
4. **Haz clic en el último deployment**
5. **Ve a "Functions" → "View Function Logs"**
6. **Revisa errores** relacionados con Stripe o Supabase

## ✅ Checklist Final

- [ ] `/api/test-stripe` muestra `success: true`
- [ ] Todas las 6 variables están configuradas
- [ ] El checkout redirige a Stripe correctamente
- [ ] El webhook recibe eventos en Stripe Dashboard
- [ ] No hay errores en los logs de Vercel
- [ ] La aplicación se despliega sin errores

## 🐛 Si Algo No Funciona

### Error: "STRIPE_SECRET_KEY no está configurada"
- Verifica que la variable esté en Vercel
- Verifica que esté marcada para Production
- Redesplega después de agregar

### Error: "SUPABASE_SERVICE_ROLE_KEY no está configurada"
- Agrega la variable en Vercel
- Usa el service role key (no el anon key)
- Redesplega

### Error: "RESEND_API_KEY contiene código de ejemplo"
- Edita la variable en Vercel
- Elimina todo el código
- Deja solo la clave (ej: `re_...`)
- Redesplega

### Error en el webhook
- Verifica que `STRIPE_WEBHOOK_SECRET` coincida con el de Stripe
- Verifica que el webhook esté activo en Stripe Dashboard
- Revisa los logs de Vercel para ver el error específico

