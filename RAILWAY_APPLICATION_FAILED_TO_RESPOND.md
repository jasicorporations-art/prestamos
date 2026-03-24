# "Application failed to respond" en Railway

## Cambio en el Dockerfile

Se actualizó el arranque para que Next.js use **explícitamente** el puerto que Railway asigna (`PORT`):

- Migraciones: si fallan, el contenedor sigue (no se cae).
- Next.js se inicia con `-p ${PORT:-3000}` para escuchar en el puerto correcto.

**Haz commit y push del Dockerfile** y espera un nuevo deploy en Railway.

---

## Después del deploy

1. **Deploy Logs** (baja hasta el final):
   - Deberías ver: `>>> Iniciando Next.js en puerto XXXX ...` (XXXX = el puerto de Railway).
   - Luego: `▲ Next.js` y `✓ Ready`.
   - Si aparece un **error** en rojo después de "Iniciando Next.js", copia ese mensaje.

2. **Estado del deploy**:
   - Si sigue en **Crashed** o se reinicia solo, el contenedor se está cayendo; el motivo estará al final de los Deploy Logs.

3. **Variables en Railway**:
   - `NEXT_PUBLIC_APP_URL` = `https://prestamos-production-9fee.up.railway.app`
   - Las de Supabase y DB (DATABASE_URL, DIRECT_URL, etc.) deben seguir definidas.

---

## Si sigue sin funcionar

Copia y pega aquí **todo el final** de los Deploy Logs (desde "Starting Container" hasta la última línea), sobre todo:
- La línea con el puerto (`>>> Iniciando Next.js en puerto ...`).
- Cualquier mensaje de error que salga después.

Con eso se puede ver si Next.js llega a "Ready" o por qué se cae.
