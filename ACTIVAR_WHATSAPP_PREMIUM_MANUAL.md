# Activar WhatsApp Premium manualmente (si pagaste pero la app sigue pidiendo comprar)

Si compraste WhatsApp Premium ($30) una o más veces y la app sigue mostrando "Activar WhatsApp Premium", suele ser porque **el webhook de Stripe no llegó a actualizar tu perfil** en la base de datos (por ejemplo: webhook no configurado, fallo puntual, o perfil identificado por email y no por user_id).

## Solución inmediata: activar tu perfil en Supabase

1. Entra en **Supabase** → tu proyecto → **SQL Editor**.
2. Localiza tu usuario. Puedes buscar por email o por `user_id` de Auth:
   - Si conoces tu **email** (el que usas para iniciar sesión):
   ```sql
   -- Ver tu perfil (cambia 'tu@email.com' por tu email)
   SELECT id, user_id, email, nombre_completo, has_whatsapp_premium, premium_until, empresa_id
   FROM perfiles
   WHERE email = 'tu@email.com';
   ```
   - Si no hay fila con ese email, busca por `user_id` desde Authentication → Users (copia el UUID del usuario):
   ```sql
   SELECT id, user_id, email, nombre_completo, has_whatsapp_premium, premium_until, empresa_id
   FROM perfiles
   WHERE user_id = 'uuid-del-usuario-aqui';
   ```
3. Activa WhatsApp Premium para ese perfil:
   ```sql
   -- Por email (cambia 'tu@email.com')
   UPDATE perfiles
   SET has_whatsapp_premium = true, premium_until = NULL
   WHERE email = 'tu@email.com';

   -- O por user_id (cambia el UUID)
   UPDATE perfiles
   SET has_whatsapp_premium = true, premium_until = NULL
   WHERE user_id = 'uuid-del-usuario-aqui';
   ```
   - `premium_until = NULL` significa **sin fecha de vencimiento** (vitalicio hasta que lo cambies). Si prefieres 30 días desde hoy, usa:
   ```sql
   UPDATE perfiles
   SET has_whatsapp_premium = true, premium_until = (CURRENT_DATE + INTERVAL '30 days')::date
   WHERE email = 'tu@email.com';
   ```
4. Recarga la página de **Recordatorios** en la app; debería mostrarte ya el módulo activo.

## Cambios hechos en la app para evitar que vuelva a pasar

- **Antes de crear el pago**: Si ya tienes WhatsApp Premium activo (tú o tu empresa), el botón "Activar WhatsApp Premium" ya no crea otra sesión de pago; la API devuelve un mensaje y la página se actualiza para mostrarte Recordatorios.
- **Webhook de Stripe**: Además de actualizar por `user_id`, ahora también actualiza por `email` del comprador, para que aunque el perfil no tenga `user_id` sincronizado, se active igual.

Si quieres revisar reembolsos o las dos compras de $30, hazlo desde el **Dashboard de Stripe** (Payments); la activación en la app la puedes dejar fija con el SQL de arriba.
