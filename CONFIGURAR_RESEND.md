# 📧 Configurar Resend para Envío de Correos

## 📋 Requisitos Previos

1. **Cuenta en Resend**: Crea una cuenta en [https://resend.com](https://resend.com)
2. **Dominio verificado**: Necesitas verificar un dominio en Resend (o usar el dominio de prueba)

## 🔧 Pasos de Configuración

### Paso 1: Obtener API Key de Resend

1. Ve a [https://resend.com/api-keys](https://resend.com/api-keys)
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ej: "JasiCorporations Production")
4. Copia la API Key (formato: `re_xxxxxxxxx`)

**Ejemplo de API Key**: `re_xxxxxxxxx` (tu key real)

### Paso 2: Configurar Variables de Entorno

#### En Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** → **Environment Variables**
3. Agrega estas variables:

   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxx` (tu API key de Resend - formato: `re_` seguido de caracteres)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

   - **Name**: `RESEND_FROM_EMAIL`
   - **Value**: `JASICORPORATIONS <onboarding@resend.dev>` (para pruebas)  
     O: `JASICORPORATIONS <noreply@tudominio.com>` (si tienes dominio verificado)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### En Local (.env.local):

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=JASICORPORATIONS <onboarding@resend.dev>
```

**Ejemplo basado en tu código**:
```typescript
// Tu API key tiene el formato: re_xxxxxxxxx
// El código ya está configurado para usarla desde variables de entorno:
const resend = new Resend(process.env.RESEND_API_KEY)
```

### Paso 3: Verificar Dominio (Opcional pero Recomendado)

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `jasicorporations.com`)
4. Agrega los registros DNS que Resend te proporciona
5. Espera a que se verifique (puede tardar hasta 24 horas)

**Nota**: Si no tienes un dominio, puedes usar `onboarding@resend.dev` para pruebas (limitado a 100 correos/día).

### Paso 4: Agregar Campo Email a Clientes

Ejecuta el script SQL en Supabase:

```sql
-- Ver archivo: supabase/agregar-email-clientes.sql
```

O ejecuta directamente en Supabase SQL Editor:

```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
```

## 🧪 Probar el Sistema

### Opción 1: Usar la API directamente

```bash
# Enviar a todos los recordatorios pendientes
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"enviarTodos": true}'

# Enviar a un email específico
curl -X POST https://sisi-seven.vercel.app/api/enviar-recordatorio \
  -H "Content-Type: application/json" \
  -d '{"email": "cliente@ejemplo.com"}'
```

### Opción 2: Desde el código

```typescript
const response = await fetch('/api/enviar-recordatorio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enviarTodos: true }),
})
```

## 📧 Plantilla de Correo

La plantilla incluye:
- ✅ Logo de JasiCorporations
- ✅ Título: "Recordatorio de Pago: Tu cuota vence en X días"
- ✅ Tabla con:
  - Número de préstamo
  - Nombre
  - Apellido
  - Teléfono
  - Monto a pagar (destacado)
- ✅ Diseño profesional con Tailwind CSS

## 🔄 Automatización con Cron Jobs

Puedes configurar un cron job para enviar correos automáticamente:

### Usando cron-job.org:

1. Ve a [https://cron-job.org](https://cron-job.org)
2. Crea una cuenta
3. Crea un nuevo cron job:
   - **URL**: `https://sisi-seven.vercel.app/api/enviar-recordatorio`
   - **Método**: POST
   - **Body**: `{"enviarTodos": true}`
   - **Headers**: `Content-Type: application/json`
   - **Frecuencia**: Diario a las 9:00 AM

### Usando Vercel Cron:

Agrega a `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/enviar-recordatorio",
    "schedule": "0 9 * * *"
  }]
}
```

## ✅ Verificación

1. Verifica que las variables de entorno estén configuradas
2. Verifica que el campo `email` existe en la tabla `clientes`
3. Prueba enviando un correo de prueba
4. Revisa los logs de Resend para ver el estado de los envíos

## 🐛 Solución de Problemas

### Error: "Resend no está configurado"
- Verifica que `RESEND_API_KEY` esté en las variables de entorno
- Haz un redeploy después de agregar las variables

### Error: "Invalid API key"
- Verifica que la API key sea correcta
- Asegúrate de que no tenga espacios al inicio o final

### Error: "Domain not verified"
- Verifica tu dominio en Resend
- O usa `onboarding@resend.dev` para pruebas

### Los correos no se envían
- Verifica que los clientes tengan email válido
- Revisa los logs de Resend
- Verifica que el formato del email sea correcto

## 📝 Notas

- Resend tiene un límite de 100 correos/día en el plan gratuito
- Para producción, considera actualizar a un plan de pago
- Los correos se envían solo a clientes que tienen email válido
- El sistema filtra automáticamente clientes sin email

