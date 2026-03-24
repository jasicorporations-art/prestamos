# Errores de Twilio WhatsApp – Qué significa y cómo solucionarlos

En **Twilio Console → Monitor → Logs** (o Messaging → Logs) ves mensajes fallidos con **Message SID** (ej. `MMa96895cfaf67f3d088ed46ff14f3f6c0`) y **Error Code**. El SID indica que Twilio creó el mensaje pero no pudo entregarlo.

## Cómo ver el código de error exacto

1. Entra a [Twilio Console](https://console.twilio.com) → **Monitor** → **Logs** → **Messaging**.
2. Haz clic en el **Message SID** del mensaje fallido.
3. En el detalle verás **Error Code** (número) y **Error Message** (texto).

## Códigos de error más frecuentes

| Código | Significado | Qué hacer |
|--------|-------------|-----------|
| **63016** | "Failed to send freeform message because you are outside the allowed window. Please use a Message Template." | Los mensajes iniciados por el negocio (fuera de la ventana 24h) **deben** usar una plantilla aprobada. La app ya usa Content Template (Content SID). Revisa que en **Edge Function Secrets** tengas `TWILIO_CONTENT_SID_RECIBO` con el Content SID de tu plantilla aprobada en Twilio Content Template Builder, y que **no** se esté enviando `Body` en lugar de `ContentSid`+`ContentVariables`. |
| **63007** | "Twilio could not find a Channel with the specified 'From' address" | El número **From** (WhatsApp Business) no está vinculado o no es válido. Revisa: (1) En Twilio → Messaging → Try it out → Send a WhatsApp message, que tu número esté activo. (2) Variables de entorno: `TWILIO_NUMBER` debe ser el número de WhatsApp Business (ej. `+18095551234`). (3) Si usas Messaging Service (`TWILIO_MESSAGING_SERVICE_SID`), el número debe estar en el pool del servicio. |
| **21603** | "A 'From' or 'MessagingServiceSid' parameter is required" | Falta configurar `TWILIO_NUMBER` o `TWILIO_MESSAGING_SERVICE_SID` en los **Secrets** de la Edge Function `send-whatsapp2` (Supabase → Edge Functions → send-whatsapp2 → Secrets). |
| **21211** | "Invalid 'To' Phone Number" | El número del cliente está mal formado. Debe ser E.164 (ej. `+18095551234`). En la ficha del cliente, celular con código de país sin espacios ni guiones. |
| **63003** | "Unverified phone number" | En sandbox de Twilio, el número del **destinatario** debe estar verificado en "Join sandbox" (el cliente debe enviar el código que muestra Twilio). En producción, no aplica. |

## Checklist de configuración

- **Supabase Edge Function `send-whatsapp2` – Secrets:**
  - `TWILIO_SID` o `TWILIO_ACCOUNT_SID` (empieza con `AC...`)
  - `TWILIO_TOKEN` o `TWILIO_AUTH_TOKEN`
  - `TWILIO_NUMBER`: número de WhatsApp Business (ej. `+18095551234`)
  - `TWILIO_MESSAGING_SERVICE_SID`: SID del Messaging Service (empieza con `MG...`) – **obligatorio para recibos**
  - `TWILIO_CONTENT_SID_RECIBO`: Content SID de la plantilla de recibo (empieza con `HX...`), creada y **aprobada** en Twilio Content Template Builder

- **Twilio:**
  - WhatsApp Sandbox activado o número WhatsApp Business aprobado.
  - Plantilla de recibo aprobada en Content Template Builder y mismo Content SID que `TWILIO_CONTENT_SID_RECIBO`.
  - Messaging Service creado y número WhatsApp asignado al servicio.

Cuando tengas el **Error Code** exacto del mensaje fallido, búscalo en [Twilio Error Dictionary](https://www.twilio.com/docs/api/errors) para el mensaje oficial y más detalles.
