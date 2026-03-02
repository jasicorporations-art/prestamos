# Configuración WhatsApp con Twilio (Producción)

## 1. Variables de entorno necesarias

### En Vercel (proyecto Next.js)
- `CRON_SECRET` - Token para autorizar el cron
- `NEXT_PUBLIC_APP_URL` - URL de tu PWA (ej: https://prestamos.jasicorporations.com)
- `TWILIO_SID` - Account SID (para webhook de mensajes entrantes)
- `TWILIO_TOKEN` - Auth Token (para webhook de mensajes entrantes)
- `TWILIO_NUMBER` - **Número oficial de WhatsApp** (ej: `+18095551234`) - NO usar Sandbox

### En Supabase Edge Functions
Ve a **Supabase Dashboard → Project Settings → Edge Functions → Secrets** y agrega:

- `TWILIO_SID` - Account SID de tu cuenta Twilio
- `TWILIO_TOKEN` - Auth Token de Twilio
- `TWILIO_NUMBER` - **Número oficial de WhatsApp** (ej: `+18095551234`) - Formato E.164, sin prefijo `whatsapp:`
- **`TWILIO_MESSAGING_SERVICE_SID`** - SID del **Messaging Service** en Twilio (empieza con `MG...`). Obligatorio para enviar recibos por plantilla. Crear en [Twilio → Messaging → Services](https://console.twilio.com/us1/develop/sms/services).
- **`TWILIO_CONTENT_SID_RECIBO`** - Content SID de la plantilla de recibo en Twilio (empieza con `HX...`). Obligatorio para recibos. Ver `CONFIGURAR_RECIBOS_WHATSAPP_TEMPLATE.md`.

## 2. Desplegar la Edge Function

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref TU_PROJECT_REF

# Desplegar las funciones
supabase functions deploy send-whatsapp --no-verify-jwt
supabase functions deploy send-whatsapp2 --no-verify-jwt
```

La app usa `send-whatsapp2` para recibos y recordatorios. O desde **Supabase Dashboard → Edge Functions** crear manualmente.

## 3. Configurar Twilio WhatsApp (Producción)

1. Entra a [Twilio Console](https://console.twilio.com)
2. **Usa tu número oficial de WhatsApp Business** (no el Sandbox)
3. En **Messaging → Senders → WhatsApp Senders**, selecciona tu número
4. Configura el webhook de mensajes entrantes:
   - **When a message comes in**: `https://tu-dominio.com/api/whatsapp/incoming`
   - Método: POST

## 4. Cron Job (8:00 AM diario)

El archivo `vercel.json` ya incluye:

```json
"crons": [
  {
    "path": "/api/recordatorios-whatsapp",
    "schedule": "0 8 * * *"
  }
]
```

- **Schedule**: `0 12 * * *` = 12:00 UTC = 8:00 AM en República Dominicana (UTC-4)
- **Vercel** ejecuta el cron automáticamente en planes Pro/Enterprise

## 5. Probar manualmente

```bash
curl -X POST https://tu-dominio.com/api/recordatorios-whatsapp \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

## 6. Webhook en base de datos (opcional)

Si quieres enviar WhatsApp cada vez que se cree un pago o falten 3 días para un vencimiento:

1. **Supabase Dashboard → Database → Webhooks**
2. Crear webhook en tabla `cuotas_detalladas` o `pagos`
3. URL: `https://TU_PROJECT_REF.supabase.co/functions/v1/send-whatsapp`
4. Método: POST
5. Payload: pasar `telefono_cliente`, `nombre_cliente`, `monto_cuota` desde el trigger

Nota: El webhook requiere que la función reciba los datos en el formato esperado. Puedes crear una función que consulte el cliente y cuota desde el trigger.

## 7. Webhook de mensajes entrantes

Cuando un cliente escribe por WhatsApp, el sistema responde automáticamente:

> "Gracias por contactar a nombre de [Empresa del cliente]. Este es un servicio automático de recibos."

La ruta `/api/whatsapp/incoming` busca al cliente por teléfono y usa el nombre de su empresa.

## 8. Mensajes enviados

**Recordatorio:**
```
Hola [Nombre], te recordamos que tu cuota de $[Monto] en Jasi Corporations vence pronto. Evita cargos por mora.
Paga aquí: [URL]/caja
```

**Respuesta automática (incoming):**
```
Gracias por contactar a nombre de [Empresa]. Este es un servicio automático de recibos.
```
