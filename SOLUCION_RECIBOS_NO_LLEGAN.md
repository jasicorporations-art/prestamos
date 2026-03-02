# Solución: Recibos no llegan por WhatsApp ni por Correo

## Diagnóstico

Tu app **sí está enviando** los mensajes (la API responde correctamente), pero:

- **WhatsApp**: Estado **"Undelivered"** en Twilio
- **Correo**: No llega al buzón del cliente

---

## 1. WhatsApp — Mensajes "Undelivered"

### Causa principal

El número **+1 555 858 4209** que ves como "FROM" en Twilio **no funciona para enviar WhatsApp reales**:

- Los números **555** en Norteamérica están reservados (ficción/TV) y **no tienen línea telefónica real**
- Twilio acepta la petición, pero el mensaje queda **Undelivered** porque no hay número real asociado
- **TWILIO_NUMBER** en Supabase Edge Functions está usando este número por defecto o está mal configurado

**Debes configurar `TWILIO_NUMBER` con un número REAL de WhatsApp Business** (formato E.164, ej: `+18095551234`).

### Pasos para solucionar

#### Opción A: Usar el Sandbox (solo pruebas)

1. Ve a [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Anota el código de unión (ej: `join abc-def`)
3. **Cada cliente** que debe recibir recibos debe:
   - Guardar el número +1 555 858 4209 en su teléfono
   - Enviarle por WhatsApp el mensaje exacto: `join abc-def` (usa el código que te muestra Twilio)
   - Esperar la confirmación de Twilio
4. Después de eso, ese número puede recibir mensajes del sandbox

#### Opción B: Producción con número oficial (recomendado)

Para que los clientes reciban sin unirse:

1. Entra en [Twilio Console → Messaging → Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Solicita un **WhatsApp Sender** (número oficial de WhatsApp Business)
3. Completa la verificación de negocio
4. Cuando Twilio te asigne el número, configúralo:
   - **En Supabase** (Dashboard → Settings → Edge Functions → Secrets):
     - `TWILIO_NUMBER` = tu número oficial (ej: `+18095551234`)
   - Los secretos `TWILIO_SID` y `TWILIO_TOKEN` ya deben estar configurados
5. Redespliega la Edge Function:
   ```bash
   supabase functions deploy send-whatsapp2 --no-verify-jwt
   ```

### Verificar en Twilio

- En **Messaging → Logs** revisa si hay más detalle del error (ej: "Recipient not opted in")
- El número del cliente debe estar en formato E.164 (ej: `+13477517058` para Estados Unidos)

---

## 2. Correo — No llega al cliente

### Posibles causas

1. **Variables de entorno**
   - En Vercel (Project → Settings → Environment Variables):
     - `RESEND_API_KEY` = tu clave (empieza por `re_`)
     - `RESEND_FROM_EMAIL` = `JASICORPORATIONS <noreply@jasicorporations.com>` o un correo verificado
2. **Dominio en Resend**
   - Si usas `noreply@jasicorporations.com`, el dominio `jasicorporations.com` debe estar verificado en [resend.com/domains](https://resend.com/domains)
   - Para pruebas puedes usar `onboarding@resend.dev` (limitado a unos 100 correos/día)
3. **Cliente sin email válido**
   - El cliente debe tener un campo `email` correcto y con formato válido en la base de datos
4. **Spam o bloqueos**
   - Revisar carpeta spam o correo no deseado
   - Si el dominio no está bien configurado, los correos suelen ir a spam

### Verificar en Resend

1. Ve a [resend.com/emails](https://resend.com/emails)
2. Busca los correos enviados y el estado (delivered, bounced, etc.)
3. Si el estado es `delivered` pero el cliente no lo ve, revisar spam o filtros del correo

### Checklist rápido

- [ ] `RESEND_API_KEY` configurada en Vercel
- [ ] `RESEND_FROM_EMAIL` configurada (dominio verificado o `onboarding@resend.dev` para pruebas)
- [ ] El cliente tiene un `email` válido en la tabla `clientes`
- [ ] Revisar carpeta spam del cliente
- [ ] Revisar logs en [resend.com/emails](https://resend.com/emails)

---

## Resumen rápido

| Problema           | Causa probable                         | Solución principal                                      |
|--------------------|----------------------------------------|---------------------------------------------------------|
| WhatsApp Undelivered | Número Sandbox, destinatarios sin opt-in | Tener número oficial o hacer que clientes envíen `join [código]` |
| Correo no llega    | Sin `RESEND_API_KEY`, dominio sin verificar, o cliente sin email | Configurar Vercel, verificar dominio y chequear datos del cliente |

---

## Cómo saber si la API está respondiendo bien

- Si ves el mensaje tipo *"✅ Pago registrado. Recibo enviado por WhatsApp"*, la lógica del frontend y la llamada a la API funcionan. El fallo está en:
  - Twilio (WhatsApp) por sandbox o número no válido
  - Resend (correo) por configuración o email del cliente
