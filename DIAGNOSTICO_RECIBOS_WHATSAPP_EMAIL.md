# Diagnóstico: Recibos no llegan por WhatsApp ni por correo

## Tu caso: Estado "Undelivered" en Twilio

Los logs muestran:
- **FROM:** `whatsapp:+15558584209`
- **TO:** clientes reales (`+13477517058`, `+13025472070`)
- **STATUS:** Undelivered

---

## WhatsApp — Por qué sale "Undelivered"

### Causa: El número +1 555 858 4209 NO es válido para WhatsApp

Los números **555** en Norteamérica están reservados (TV/cine) y **no tienen línea real**. Twilio procesa la petición, pero el mensaje nunca llega porque ese número no puede enviar WhatsApp.

### Qué hacer

1. **Configurar un número REAL en Supabase Edge Functions**
   - Ve a: [Supabase Dashboard](https://supabase.com/dashboard) → Tu proyecto → **Settings** → **Edge Functions** → **Secrets**
   - Agrega o edita: `TWILIO_NUMBER` = tu número real de WhatsApp Business (ej: `+18095551234`)
   - Formato E.164, sin espacios. Ejemplos válidos: `+18095551234`, `+18295551234`

2. **Dónde conseguir el número**
   - **Sandbox (pruebas):** [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
     - Twilio te da un número real (no 555) para el Sandbox
     - Cada cliente debe enviar `join [código]` a ese número antes de poder recibir
   - **Producción:** [Twilio → Messaging → Senders → WhatsApp](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
     - Solicita un Sender oficial de WhatsApp Business
     - Meta verificará tu negocio y te asignará un número que sí entregue mensajes

3. **Redesplegar la función**
   ```bash
   supabase functions deploy send-whatsapp2 --no-verify-jwt
   ```

---

## Correo — Por qué no llega el email

Posibles causas:

1. **Variables en Vercel**
   - `RESEND_API_KEY` (empieza por `re_`)
   - `RESEND_FROM_EMAIL` = ejemplo: `JASICORPORATIONS <noreply@jasicorporations.com>`
   - Si usas tu dominio, debe estar **verificado** en [resend.com/domains](https://resend.com/domains)
   - Para pruebas: `onboarding@resend.dev`

2. **Cliente sin email válido**
   - El cliente debe tener campo `email` en la tabla `clientes` y con formato correcto (ej: `cliente@gmail.com`)

3. **Carpeta spam**
   - Revisar bandeja de spam o correo no deseado del cliente
   - Si el dominio no está verificado, los correos suelen ir a spam

4. **Comprobar en Resend**
   - Ve a [resend.com/emails](https://resend.com/emails)
   - Revisa estado del envío: delivered, bounced, etc.
   - Si aparece "delivered" y no llega: probablemente esté en spam o filtros del cliente

---

## Checklist rápido

| Requisito                      | Dónde verificar                    |
|-------------------------------|------------------------------------|
| `TWILIO_NUMBER` con número real (no 555) | Supabase Edge Functions Secrets |
| `TWILIO_SID` y `TWILIO_TOKEN` | Supabase Edge Functions Secrets    |
| `RESEND_API_KEY`              | Vercel → Environment Variables     |
| `RESEND_FROM_EMAIL` con dominio verificado | Resend + Vercel              |
| Cliente con `email` y `celular` válidos  | Base de datos (clientes)   |
