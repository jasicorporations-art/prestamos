# ⚡ Configuración Rápida de Resend

## 🎯 Tu API Key

Tu API key de Resend tiene el formato: `re_xxxxxxxxx`

## ✅ Pasos Rápidos (2 minutos)

### 1. Configurar en Vercel

1. Ve a: [Vercel Dashboard](https://vercel.com/dashboard) → Tu Proyecto → **Settings** → **Environment Variables**

2. Agrega estas 2 variables:

   **Variable 1**:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxx` (tu API key real)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2**:
   - **Name**: `RESEND_FROM_EMAIL`
   - **Value**: `JASICORPORATIONS <onboarding@resend.dev>`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

3. Haz clic en **Save**

### 2. Agregar Campo Email a Clientes

Ejecuta en Supabase SQL Editor:

```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
```

O ejecuta el archivo: `supabase/agregar-email-clientes.sql`

### 3. Redeploy en Vercel

1. Ve a **Deployments**
2. Haz clic en **⋯** (tres puntos) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine

### 4. Probar

```bash
# Obtener recordatorios pendientes
curl https://sisi-seven.vercel.app/api/enviar-recordatorio

# Enviar correos a todos
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'
```

## ✅ Listo!

El sistema está configurado y listo para enviar correos.

## 📧 Formato del Correo

El correo incluirá:
- ✅ Logo de JasiCorporations
- ✅ Título: "Recordatorio de Pago: Tu cuota vence en 2 días"
- ✅ Tabla con: número de préstamo, nombre, apellido, teléfono, monto a pagar

## 🔄 Automatizar Envío

Para enviar correos automáticamente todos los días:

1. Ve a [cron-job.org](https://cron-job.org)
2. Crea un cron job:
   - **URL**: `https://sisi-seven.vercel.app/api/enviar-recordatorio`
   - **Método**: POST
   - **Body**: `{"enviarTodos": true}`
   - **Headers**: `Content-Type: application/json`
   - **Frecuencia**: Diario a las 9:00 AM

## ⚠️ Notas

- Resend tiene límite de 100 correos/día en plan gratuito
- Solo se envían correos a clientes con email válido
- El sistema filtra automáticamente cuotas que vencen en 2 días



