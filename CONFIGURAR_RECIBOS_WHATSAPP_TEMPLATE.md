# Configurar Recibos WhatsApp con Plantilla (evitar Undelivered)

## Problema
Los mensajes de recibo aparecen como **Undelivered** porque WhatsApp exige **plantillas aprobadas** para enviar fuera de la ventana de 24 horas. Los mensajes libres solo funcionan si el cliente te escribió recientemente.

## Solución: Content Template

### 1. Crear Messaging Service en Twilio y añadir tu número WhatsApp

1. Ve a [Twilio Console → Messaging → Services](https://console.twilio.com/us1/develop/sms/services)
2. Clic en **Create Messaging Service** (o abre el que ya tengas)
3. Nombre: `Jasi WhatsApp` (o similar)
4. **Importante:** En la sección **Senders**, añade tu **número de WhatsApp de Twilio** (ej. `+1 5558584209`). Si no añades ningún sender, el recibo no tendrá remitente y puede fallar o no mostrarse tu número.
5. Copia el **SID** del servicio (empieza con `MG...`) y configúralo en Supabase como `TWILIO_MESSAGING_SERVICE_SID`.

**Por qué no aparece mi número de Twilio:** Para recibos usamos solo el Messaging Service (no enviamos "From" en la API). El número que ve el cliente es el que está en **Messaging → Services → tu servicio → Senders**. Si ahí no está +1 5558584209, añádelo.

### 2. Content Template para Recibo

Crea la plantilla en [Twilio Content Templates](https://console.twilio.com/us1/develop/sms/content-editor). Debe tener **7 variables** `{{1}}` a `{{7}}` en este orden. Dos opciones de texto:

**Opción A (recomendada):**
```
Notificación automatica del sistema de recibo: ¡Hola {{1}}! Confirmamos tu pago de {{2}} realizado el {{3}}. Cuota #{{4}} pagada. Te quedan {{5}} cuotas por pagar. Tu balance restante es {{6}}. Gracias por tu puntualidad. Atentamente: {{7}}. Seguiremos contando con usted, no dude en ponerse en contacto ante cualquier duda.
```
*(Quita el emoji ✅ del texto en Twilio si no está aprobado en tu plantilla.)*

**Opción B:**
```
¡Hola {{1}}! Confirmamos tu pago monto de cuota ({{2}}) realizado el {{3}}. numero de Cuota (#{{4}}) pagada. Te quedan cuotas restantes ({{5}}) cuotas por pagar. Tu balance restante es {{6}}. Gracias por tu puntualidad. -nombre de la empresa ({{7}})
```

Variables del template (7 en total):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Gisleydi ahianna rijo de la cruz |
| {{2}} | Monto de cuota pagada | RD$916.92 |
| {{3}} | Fecha de pago | 20/02/2026 |
| {{4}} | Número de cuota | 9 |
| {{5}} | Cuotas restantes | 118 |
| {{6}} | Balance restante | RD$108,196.14 |
| {{7}} | Nombre de la empresa | Préstamos hipotecarios |

Copia el Content SID (HX...) de la plantilla creada y configúralo en el paso 3. La plantilla anterior (6 variables) ya no es compatible.

Copia el Content SID (HX...) de la plantilla creada y configúralo en el paso 3. La plantilla anterior (6 variables) ya no es compatible.

### 3. Configurar Supabase Edge Functions Secrets

#### Cómo crear el secret TWILIO_CONTENT_SID_RECIBO

**Paso A – Obtener el valor (Content SID) en Twilio**

1. Entra en **[Twilio Content Templates](https://console.twilio.com/us1/develop/sms/content-editor)**.
2. Crea una plantilla nueva (o abre la que creaste en el paso 2 de esta guía).
3. El texto debe tener **7 variables** `{{1}}` … `{{7}}` como en el paso 2.
4. Guarda la plantilla. En la lista o en el detalle verás el **Content SID**: es un valor que empieza por **`HX`** (por ejemplo `HXa1b2c3d4e5f6...`). **Copia ese valor**; es lo que usarás como valor del secret.

**Paso B – Crear el secret en Supabase**

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto.
2. Ve a **Project Settings** (engranaje) → **Edge Functions** → pestaña **Secrets** (o **Edge Functions** en el menú lateral → **Secrets**).
3. Clic en **Add new secret** / **New secret**.
4. **Name:** escribe exactamente: `TWILIO_CONTENT_SID_RECIBO`
5. **Value:** pega el Content SID que copiaste (el que empieza por `HX...`), sin espacios.
6. Guarda.

Listo. La Edge Function `send-whatsapp2` usará ese secret para enviar recibos con la plantilla.

---

**Resumen de secrets para recibos:**

| Secret | Valor | Dónde se obtiene |
|--------|-------|------------------|
| `TWILIO_MESSAGING_SERVICE_SID` | SID tipo `MG...` | Twilio → Messaging → Services → tu servicio |
| `TWILIO_CONTENT_SID_RECIBO` | SID tipo `HX...` | Twilio → Content Templates → tu plantilla de recibo |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_NUMBER` | Credenciales Twilio | Twilio Console → Account / Phone Numbers |

Si el recibo no se envía y ves un error tipo *"se requiere twilio_messaging_service_sid en edge functions secrets"*, significa que falta el secret **TWILIO_MESSAGING_SERVICE_SID** (nombre exacto en mayúsculas). Añádelo con el valor del SID que empieza por `MG...`.

### 4. Redesplegar la función

```bash
supabase functions deploy send-whatsapp2 --no-verify-jwt
```

### 5. Probar

Registra un pago y verifica que el recibo llegue por WhatsApp al cliente.

---

## Mensaje muestra "Failed" en Twilio (From/To correctos pero no llega)

**Paso 1 – Ver el código de error**

1. En [Twilio Monitor → Logs → Messaging](https://console.twilio.com/us1/monitor/logs/sms), haz clic en el mensaje **Failed**.
2. En el detalle verás **Error Code** (número) y a veces **Error Message**. Anota ese código.

**Paso 2 – Causas frecuentes y qué hacer**

| Código | Significado | Qué hacer |
|--------|-------------|-----------|
| **63016** | Fuera de ventana 24h o plantilla no usada correctamente | Confirmar que envías con Content Template (ContentSid + ContentVariables), no con Body. Verificar que la plantilla esté **aprobada** en Twilio y que el Content SID en Supabase sea el correcto (HX...). |
| **63017** | El usuario bloqueó al negocio o no tiene WhatsApp | El cliente debe tener WhatsApp activo y no haber bloqueado tu número. Probar con otro número de prueba. |
| **63018** | Límite de tasa (rate limit) | Esperar y reintentar más tarde; revisar límites del sender en Twilio. |
| **131047** | El número de destino no está registrado en WhatsApp | Verificar que +1 3477517058 sea un número real con WhatsApp. Probar con un número que sepas que tiene WhatsApp. |
| **21608** | Variables de la plantilla inválidas | La plantilla debe tener **exactamente 7 variables** {{1}}…{{7}} y el contenido que envías debe coincidir (sin caracteres no permitidos). Revisar Content Variables en la Edge Function. |

**Sandbox de Twilio:** Si tu número **+1 5558584209** es el del **Sandbox** de WhatsApp (pruebas), el destinatario **+1 3477517058** debe haber “entrado” al sandbox antes: enviar el **código de unión** que muestra Twilio (ej. "join xxx-xxx") a ese número desde el WhatsApp del cliente. Si no ha hecho eso, los mensajes fallan. Para producción usa un **número oficial de WhatsApp Business** (no sandbox).

---

## Si la app dice "Recibo enviado" pero no llega al WhatsApp

Twilio **acepta** el mensaje (devuelve 200 + SID) y luego intenta entregarlo. El estado real se ve en Twilio:

1. Entra en **[Twilio Console → Monitor → Logs → Messaging](https://console.twilio.com/us1/monitor/logs/sms)** (o **Messaging → Try it out → Logs**).
2. Localiza el mensaje por fecha/hora o por el número **To** (ej. whatsapp:+13477517058).
3. Haz clic en ese mensaje y revisa:
   - **Status**: `accepted` = Twilio lo tomó; `sent` = enviado a WhatsApp; `delivered` = llegó al dispositivo; `failed` o `undelivered` = no llegó.
   - **Error Code** (si está fallido): ej. **63016** = número no está en WhatsApp; **63017** = usuario bloqueó; **63018** = fuera de ventana 24h / plantilla; **63019** = número inválido.

**Causas frecuentes cuando no llega:**

| Causa | Qué hacer |
|------|-----------|
| Número sin WhatsApp o incorrecto | Verificar que el celular del cliente tenga WhatsApp y que el número en la ficha sea correcto (con código de país, ej. +1 347...). |
| Sandbox de Twilio | Si usas el Sandbox de WhatsApp, el cliente debe haber enviado el código de unión al número del sandbox. En producción (tu número oficial) no aplica. |
| Plantilla rechazada | En el log de Twilio verás error 21608 u otro. Revisa que la plantilla tenga exactamente 7 variables y esté **aprobada** para el país del destinatario. |
| Número en formato incorrecto | El sistema envía el número en E.164 (ej. +13477517058, sin espacio). Si en tu base el número tenía espacios o sin código de país, puede fallar: corrige el número del cliente. |

---

## Notas

- Los **recibos** usan siempre Content Template (ContentSid) para evitar el Error 63018 fuera de la ventana 24h.
- **Recordatorios** y **amortización** siguen usando mensaje libre (Body); si fallan con 63018, habrá que crear plantillas para ellos.
- `TWILIO_MESSAGING_SERVICE_SID` es obligatorio para recibos.
